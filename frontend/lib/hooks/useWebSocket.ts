/**
 * useWebSocket - hook для подключения к WebSocket
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';

/** FLOW P5: price/candle events include instrument (BTCUSD, EURUSD, …) */
type WsEvent =
  | { instrument?: string; type: 'price:update'; data: { asset: string; price: number; timestamp: number } }
  | { instrument?: string; type: 'candle:update'; data: { timeframe: string; candle: any } }
  | { instrument?: string; type: 'candle:close'; data: { timeframe: string; candle: any } }
  | { type: 'trade:open'; data: any }
  | { type: 'trade:close'; data: any }
  | { type: 'trade:countdown'; data: any }
  | { type: 'server:time'; data: { timestamp: number } };

interface UseWebSocketParams {
  activeInstrumentRef?: React.MutableRefObject<string>;
  onPriceUpdate?: (price: number, timestamp: number) => void;
  onCandleClose?: (candle: any, timeframe: string) => void;
  /** FLOW T3: серверное время — источник истины, обновление ref без setInterval */
  onServerTime?: (timestamp: number) => void;
  enabled?: boolean;
}

export function useWebSocket({ activeInstrumentRef, onPriceUpdate, onCandleClose, onServerTime, enabled = true }: UseWebSocketParams) {
  const { isAuthenticated } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY = 3000;

  const onPriceUpdateRef = useRef(onPriceUpdate);
  const onCandleCloseRef = useRef(onCandleClose);
  const onServerTimeRef = useRef(onServerTime);
  const activeInstrumentRefRef = useRef(activeInstrumentRef);
  const lastSubscribedInstrumentRef = useRef<string | null>(null);

  useEffect(() => {
    onPriceUpdateRef.current = onPriceUpdate;
    onCandleCloseRef.current = onCandleClose;
    onServerTimeRef.current = onServerTime;
    activeInstrumentRefRef.current = activeInstrumentRef;
  }, [onPriceUpdate, onCandleClose, onServerTime, activeInstrumentRef]);

  const connect = useCallback(() => {
    if (!enabled || !isAuthenticated) return;

    // Закрываем существующее соединение если есть
    if (wsRef.current) {
      wsRef.current.close();
    }

    // Определяем WebSocket URL
    // Используем тот же базовый URL что и для API
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const wsUrl = apiBaseUrl.replace(/^http/, 'ws') + '/ws';

    console.log('[WebSocket] Connecting to:', wsUrl);

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WebSocket] Connected');
        reconnectAttemptsRef.current = 0;

        // FLOW WS-SUBSCRIBE: сразу подписываемся на текущий актив, если он есть
        const activeId = activeInstrumentRefRef.current?.current;
        if (activeId && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'subscribe', instrument: activeId }));
          lastSubscribedInstrumentRef.current = activeId;
        }

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

          if (process.env.NODE_ENV === 'development') {
            console.log('[WebSocket] Received event:', message.type, 'instrument' in message ? message.instrument : '-', message);
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

          switch (message.type) {
            case 'price:update':
              if (onPriceUpdateRef.current) {
                onPriceUpdateRef.current(message.data.price, message.data.timestamp);
              }
              break;

            case 'candle:close':
              if (onCandleCloseRef.current) {
                onCandleCloseRef.current(message.data.candle, message.data.timeframe);
              }
              break;

            case 'trade:open': {
              const t: any = message.data;
              alert(
                `Сделка ОТКРЫТА (WS)\n\nID: ${t.id}\nНаправление: ${t.direction}\nСумма: ${t.amount}\nЦена входа: ${t.entryPrice}\nЭкспирация: ${new Date(t.expiresAt).toLocaleTimeString()}`,
              );
              break;
            }

            case 'trade:close': {
              const t: any = message.data;
              alert(
                `Сделка ЗАКРЫТА (WS)\n\nID: ${t.id}\nСтатус: ${t.status} (${t.result})\nСумма: ${t.amount}\nЦена выхода: ${t.exitPrice}\nВыплата: ${t.payout}`,
              );
              break;
            }

            case 'server:time':
              if (onServerTimeRef.current && message.data?.timestamp != null) {
                onServerTimeRef.current(message.data.timestamp);
              }
              break;

            default:
              break;
          }
        } catch (err) {
          console.error('[WebSocket] Failed to parse message:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
      };

      ws.onclose = () => {
        console.log('[WebSocket] Disconnected');
        wsRef.current = null;

        // Переподключение
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++;
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, RECONNECT_DELAY);
        }
      };
    } catch (error) {
      console.error('[WebSocket] Failed to create connection:', error);
    }
  }, [enabled, isAuthenticated]);

  /**
   * FLOW WS-SUBSCRIBE:
   * следим за сменой activeInstrumentRef и при необходимости шлём новое subscribe.
   * Т.к. ref не триггерит эффект сам по себе, делаем лёгкий polling.
   */
  useEffect(() => {
    if (!enabled || !isAuthenticated) return;

    const interval = setInterval(() => {
      const currentInstrument = activeInstrumentRefRef.current?.current;
      const ws = wsRef.current;

      if (!ws || ws.readyState !== WebSocket.OPEN) {
        return;
      }
      if (!currentInstrument) {
        return;
      }
      if (currentInstrument === lastSubscribedInstrumentRef.current) {
        return;
      }

      ws.send(
        JSON.stringify({
          type: 'subscribe',
          instrument: currentInstrument,
        }),
      );
      lastSubscribedInstrumentRef.current = currentInstrument;
    }, 500);

    return () => {
      clearInterval(interval);
    };
  }, [enabled, isAuthenticated]);

  useEffect(() => {
    if (enabled && isAuthenticated) {
      connect();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        // Очищаем ping interval если есть
        if ((wsRef.current as any).pingInterval) {
          clearInterval((wsRef.current as any).pingInterval);
        }
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [enabled, isAuthenticated, connect]);

  return {
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
  };
}
