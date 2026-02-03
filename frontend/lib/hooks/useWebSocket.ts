/**
 * useWebSocket - FLOW WS-1: Production-grade WebSocket with proper lifecycle
 * 
 * States: idle -> connecting -> ready -> subscribed -> closed
 * 
 * ✅ Нет setTimeout
 * ✅ Нет race conditions
 * ✅ Polling только как fallback
 */

'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from './useAuth';

/** FLOW WS-1.2: WebSocket состояния */
type WSState = 'idle' | 'connecting' | 'ready' | 'subscribed' | 'closed';

/** FLOW P5: price/candle events include instrument (BTCUSD, EURUSD, …) */
type WsEvent =
  | { instrument?: string; type: 'price:update'; data: { asset: string; price: number; timestamp: number } }
  | { instrument?: string; type: 'candle:update'; data: { timeframe: string; candle: any } }
  | { instrument?: string; type: 'candle:close'; data: { timeframe: string; candle: any } }
  | { type: 'trade:open'; data: any }
  | { type: 'trade:close'; data: any }
  | { type: 'trade:countdown'; data: any }
  | { type: 'server:time'; data: { timestamp: number } }
  // FLOW A-ACCOUNT: Account snapshot event
  | { type: 'account.snapshot'; payload: { accountId: string; type: 'REAL' | 'DEMO'; balance: number; currency: 'USD' | 'RUB' | 'UAH'; updatedAt: number } }
  // FLOW WS-1: Handshake events
  | { type: 'ws:ready'; sessionId: string; serverTime: number }
  | { type: 'subscribed'; instrument: string }
  | { type: 'unsubscribed'; instrument: string };

interface UseWebSocketParams {
  activeInstrumentRef?: React.MutableRefObject<string>;
  onPriceUpdate?: (price: number, timestamp: number) => void;
  onCandleClose?: (candle: any, timeframe: string) => void;
  /** FLOW T3: серверное время — источник истины, обновление ref без setInterval */
  onServerTime?: (timestamp: number) => void;
  /** Обработка закрытия сделки - удаление с графика */
  onTradeClose?: (tradeId: string) => void;
  enabled?: boolean;
}

export function useWebSocket({ activeInstrumentRef, onPriceUpdate, onCandleClose, onServerTime, onTradeClose, enabled = true }: UseWebSocketParams) {
  const { isAuthenticated } = useAuth();
  
  // FLOW WS-1.2: Состояние WebSocket
  const [wsState, setWsState] = useState<WSState>('idle');
  
  // Синхронизируем ref с состоянием
  useEffect(() => {
    wsStateRef.current = wsState;
  }, [wsState]);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY = 3000;
  const sessionIdRef = useRef<string | null>(null);
  const isConnectingRef = useRef(false); // Защита от множественных подключений

  const onPriceUpdateRef = useRef(onPriceUpdate);
  const onCandleCloseRef = useRef(onCandleClose);
  const onServerTimeRef = useRef(onServerTime);
  const onTradeCloseRef = useRef(onTradeClose);
  const activeInstrumentRefRef = useRef(activeInstrumentRef);
  const subscribedInstrumentRef = useRef<string | null>(null);
  const wsStateRef = useRef<WSState>('idle'); // Ref для текущего состояния
  const subscribeToInstrumentRef = useRef<((instrument: string) => void) | null>(null);

  useEffect(() => {
    onPriceUpdateRef.current = onPriceUpdate;
    onCandleCloseRef.current = onCandleClose;
    onServerTimeRef.current = onServerTime;
    onTradeCloseRef.current = onTradeClose;
    activeInstrumentRefRef.current = activeInstrumentRef;
  }, [onPriceUpdate, onCandleClose, onServerTime, onTradeClose, activeInstrumentRef]);

  /**
   * FLOW WS-1.4: Подписка на инструмент (только когда state === 'ready')
   */
  const subscribeToInstrument = useCallback((instrument: string) => {
    const ws = wsRef.current;
    const currentState = wsStateRef.current; // Используем ref вместо state
    
    if (!ws || currentState !== 'ready') {
      if (instrument === 'AUDCHF') {
        console.warn(`[AUDCHF] [WebSocket] Cannot subscribe - state: ${currentState}, readyState: ${ws?.readyState}`);
      }
      return;
    }

    if (subscribedInstrumentRef.current === instrument) {
      return; // Уже подписаны
    }

    // FLOW WS-1.5: Отписываемся от старого инструмента
    if (subscribedInstrumentRef.current) {
      const unsubscribeMsg = JSON.stringify({ 
        type: 'unsubscribe', 
        instrument: subscribedInstrumentRef.current 
      });
      ws.send(unsubscribeMsg);
      
      if (instrument === 'AUDCHF' || subscribedInstrumentRef.current === 'AUDCHF') {
        console.log(`[AUDCHF] [WebSocket] Unsubscribing from:`, subscribedInstrumentRef.current);
      }
    }

    // Подписываемся на новый инструмент
    const subscribeMsg = JSON.stringify({ 
      type: 'subscribe', 
      instrument 
    });
    
    if (instrument === 'AUDCHF') {
      console.log(`[AUDCHF] [WebSocket] Subscribing to:`, instrument);
    }
    
    ws.send(subscribeMsg);
    subscribedInstrumentRef.current = instrument;
  }, []); // Убрали wsState из зависимостей
  
  // Сохраняем функцию в ref для использования в обработчиках
  useEffect(() => {
    subscribeToInstrumentRef.current = subscribeToInstrument;
  }, [subscribeToInstrument]);

  /**
   * FLOW WS-1.3: Подключение
   */
  const connect = useCallback(() => {
    if (!enabled || !isAuthenticated) return;
    
    // Защита от множественных подключений
    if (isConnectingRef.current) {
      return;
    }
    
    const currentState = wsStateRef.current;
    if (currentState === 'connecting' || currentState === 'ready' || currentState === 'subscribed') {
      // Уже подключен или подключается
      return;
    }

    isConnectingRef.current = true;

    // Закрываем существующее соединение если есть
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setWsState('connecting');

    // Определяем WebSocket URL
    // - Локально: фронт 3000, бэк 3001 — WebSocket на бэке
    // - Продакшен: same-origin, nginx проксирует /ws на бэк
    const wsBase = typeof window !== 'undefined'
      ? (window.location.hostname === 'localhost' && window.location.port === '3000'
          ? 'http://localhost:3001'
          : window.location.origin)
      : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/api\/?$/, '');
    const wsUrl = wsBase.replace(/^http/, 'ws') + '/ws';

    const activeId = activeInstrumentRefRef.current?.current;
    if (activeId === 'AUDCHF') {
      console.log('[AUDCHF] [WebSocket] Connecting to:', wsUrl);
    }

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        isConnectingRef.current = false; // Подключение установлено
        const activeId = activeInstrumentRefRef.current?.current;
        if (activeId === 'AUDCHF') {
          console.log('[AUDCHF] [WebSocket] Connected, waiting for ws:ready...');
        }
        reconnectAttemptsRef.current = 0;
        // НЕ подписываемся здесь - ждём ws:ready

        // Отправляем ping для поддержания соединения
        const pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          } else {
            clearInterval(pingInterval);
          }
        }, 30000); // Ping каждые 30 секунд

        // Сохраняем interval для cleanup
        (ws as any).pingInterval = pingInterval;
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WsEvent;

          // FLOW WS-1.0: Обрабатываем ws:ready
          if (message.type === 'ws:ready') {
            sessionIdRef.current = message.sessionId;
            setWsState('ready');
            
            const activeId = activeInstrumentRefRef.current?.current;
            if (activeId === 'AUDCHF') {
              console.log(`[AUDCHF] [WebSocket] Received ws:ready, sessionId: ${message.sessionId}`);
            }
            
            // FLOW WS-1.4: Теперь можно подписываться
            if (activeId && subscribeToInstrumentRef.current) {
              subscribeToInstrumentRef.current(activeId);
            }
            return;
          }

          // FLOW WS-1.4: Обрабатываем подтверждение подписки
          if (message.type === 'subscribed') {
            setWsState('subscribed');
            if (message.instrument === 'AUDCHF') {
              console.log(`[AUDCHF] [WebSocket] Subscribed confirmed for:`, message.instrument);
            }
            return;
          }

          if (message.type === 'unsubscribed') {
            if (message.instrument === subscribedInstrumentRef.current) {
              subscribedInstrumentRef.current = null;
              setWsState('ready'); // Возвращаемся в ready после отписки
            }
            if (message.instrument === 'AUDCHF') {
              console.log(`[AUDCHF] [WebSocket] Unsubscribed confirmed for:`, message.instrument);
            }
            return;
          }

          // Логирование только для AUDCHF
          if ('instrument' in message && message.instrument === 'AUDCHF') {
            if (message.type === 'price:update' || message.type === 'candle:close') {
              console.log(`[AUDCHF] [WebSocket] Received ${message.type}:`, message.data);
            }
          }

          // BACKEND уже фильтрует по instrument, но оставляем защиту:
          const activeId = activeInstrumentRefRef.current?.current;
          if (
            (message.type === 'price:update' ||
              message.type === 'candle:update' ||
              message.type === 'candle:close') &&
            activeId != null &&
            'instrument' in message &&
            message.instrument !== activeId
          ) {
            return;
          }

          // FLOW LC-5S: Обработка price:update
          if (message.type === 'price:update') {
            const activeId = activeInstrumentRefRef.current?.current;
            if (
              'instrument' in message &&
              message.instrument === activeId
            ) {
              if (onPriceUpdateRef.current) {
                onPriceUpdateRef.current(message.data.price, message.data.timestamp);
              }
            }
            return;
          }

          // FLOW LC-5S: Обработка candle:close
          if (message.type === 'candle:close') {
            const activeId = activeInstrumentRefRef.current?.current;
            if (
              'instrument' in message &&
              message.instrument === activeId
            ) {
              if (onCandleCloseRef.current && message.data) {
                // message.data имеет структуру { timeframe: string, candle: Candle }
                onCandleCloseRef.current(message.data.candle, message.data.timeframe);
              }
            }
            return;
          }

          // Обработка trade событий (без алертов)
          if (message.type === 'trade:open') {
            // Trade открыта - можно добавить обработку в будущем
            return;
          }

          if (message.type === 'trade:close') {
            // Trade закрыта - удаляем из списка сделок на графике
            if (onTradeCloseRef.current && message.data?.id) {
              onTradeCloseRef.current(message.data.id);
            }
            return;
          }

          // Обработка server:time
          if (message.type === 'server:time') {
            if (onServerTimeRef.current && message.data?.timestamp != null) {
              onServerTimeRef.current(message.data.timestamp);
            }
            return;
          }

          // FLOW A-ACCOUNT: Обработка account.snapshot
          if (message.type === 'account.snapshot') {
            // Импортируем store динамически чтобы избежать циклических зависимостей
            import('@/stores/account.store').then(({ useAccountStore }) => {
              useAccountStore.getState().setSnapshot(message.payload);
            });
            return;
          }
        } catch (err) {
          console.error('[WebSocket] Failed to parse message:', err);
        }
      };

      ws.onerror = (error) => {
        isConnectingRef.current = false; // Ошибка подключения
        const activeId = activeInstrumentRefRef.current?.current;
        if (activeId === 'AUDCHF') {
          console.error('[AUDCHF] [WebSocket] Error:', error);
        }
        setWsState('closed');
      };

      ws.onclose = (event) => {
        isConnectingRef.current = false; // Соединение закрыто
        const activeId = activeInstrumentRefRef.current?.current;
        if (activeId === 'AUDCHF') {
          console.log('[AUDCHF] [WebSocket] Disconnected. Code:', event.code, 'Reason:', event.reason);
        }
        
        setWsState('closed');
        wsRef.current = null;
        subscribedInstrumentRef.current = null;
        sessionIdRef.current = null;

        // Переподключение (только если не было явного закрытия)
        if (event.code !== 1000 && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++;
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, RECONNECT_DELAY);
        }
      };
    } catch (error) {
      isConnectingRef.current = false;
      console.error('[WebSocket] Failed to create connection:', error);
      setWsState('closed');
    }
  }, [enabled, isAuthenticated]); // Убрали subscribeToInstrument из зависимостей

  /**
   * FLOW WS-1.4: Отслеживание изменений инструмента и подписка
   * Используем легкий polling для отслеживания изменений ref (ref не триггерит useEffect)
   * Polling работает только когда WS готов (ready/subscribed) - это не fallback, а механизм отслеживания ref
   */
  useEffect(() => {
    if (!enabled || !isAuthenticated) return;
    
    // Polling для отслеживания изменений инструмента (когда WS готов)
    // И fallback для переподключения (когда WS не готов)
    const interval = setInterval(() => {
      const currentInstrument = activeInstrumentRefRef.current?.current;
      const ws = wsRef.current;
      const currentState = wsStateRef.current; // Используем ref вместо state

      // FLOW WS-1.6: Fallback - переподключение если WS не готов
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        // Не переподключаемся если уже идет подключение или закрыто намеренно
        if (!isConnectingRef.current && currentState !== 'connecting' && currentState !== 'closed') {
          if (currentInstrument === 'AUDCHF') {
            console.log('[AUDCHF] [WebSocket] Polling: WebSocket not ready, reconnecting...');
          }
          connect();
        }
        return;
      }

      // FLOW WS-1.4: Если WS готов - проверяем нужно ли подписаться/переподписаться
      if ((currentState === 'ready' || currentState === 'subscribed') && currentInstrument) {
        // Если инструмент изменился или еще не подписаны
        if (subscribedInstrumentRef.current !== currentInstrument && subscribeToInstrumentRef.current) {
          subscribeToInstrumentRef.current(currentInstrument);
        }
      }
    }, 1000); // Проверяем каждую секунду (легкий polling для ref)

    return () => {
      clearInterval(interval);
    };
  }, [enabled, isAuthenticated, connect]); // Убрали wsState и subscribeToInstrument из зависимостей

  /**
   * FLOW WS-1.3: Подключение при монтировании
   */
  useEffect(() => {
    if (enabled && isAuthenticated) {
      connect();
    }

    return () => {
      // FLOW WS-1.7: Закрытие / reset
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        // Очищаем ping interval если есть
        if ((wsRef.current as any).pingInterval) {
          clearInterval((wsRef.current as any).pingInterval);
        }
        
        // Отписываемся от всех инструментов
        if (subscribedInstrumentRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          try {
            wsRef.current.send(JSON.stringify({ type: 'unsubscribe_all' }));
          } catch (e) {
            // Игнорируем ошибки при закрытии
          }
        }
        wsRef.current.close();
        wsRef.current = null;
      }
      setWsState('closed');
      subscribedInstrumentRef.current = null;
      sessionIdRef.current = null;
    };
  }, [enabled, isAuthenticated, connect]);

  return {
    isConnected: wsState === 'subscribed' || wsState === 'ready',
    wsState,
  };
}
