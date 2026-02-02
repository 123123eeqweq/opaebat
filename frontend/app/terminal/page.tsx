'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { TrendingUp, Wallet, GraduationCap, UserCircle, Bell, PlusCircle, Plus, Minus, ChevronDown, X, ArrowUp, ArrowDown, RefreshCw, CheckCircle2, XCircle, Clock, History, Newspaper, Repeat, MessageCircle } from 'lucide-react';
import { useTerminalSnapshot } from '@/lib/hooks/useTerminalSnapshot';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useAuth } from '@/lib/hooks/useAuth';
import { ChartContainer } from '@/components/chart/ChartContainer';
import { SentimentBar } from '@/components/chart/SentimentBar';
import { IndicatorMenu } from '@/components/chart/IndicatorMenu';
import { DrawingMenu } from '@/components/chart/DrawingMenu';
import { ChartTypeMenu } from '@/components/chart/ChartTypeMenu';
import { TimeframeMenu } from '@/components/chart/TimeframeMenu';
import { InstrumentMenu } from '@/components/chart/InstrumentMenu';
import { OverlayPanel } from '@/components/chart/OverlayPanel';
import { useOverlayRegistry } from '@/components/chart/internal/overlay/useOverlayRegistry';
import { INSTRUMENTS, DEFAULT_INSTRUMENT_ID, getInstrumentOrDefault } from '@/lib/instruments';
import ReactCountryFlag from 'react-country-flag';
import type { ChartType } from '@/components/chart/chart.types';
import type { CandleChartRef } from '@/components/chart/candle/CandleChart';
import type { LineChartRef } from '@/components/chart/line/LineChart';
import type { CandleMode } from '@/components/chart/internal/candleModes/candleMode.types';
import type { IndicatorConfig } from '@/components/chart/internal/indicators/indicator.types';
import { getAllIndicators } from '@/components/chart/internal/indicators/indicatorRegistry';
import { api } from '@/lib/api/api';
import {
  type TerminalLayout,
  saveLayoutToLocalStorage,
  loadLayoutFromLocalStorage,
  indicatorConfigToLayout,
  layoutIndicatorToConfig,
  drawingToLayout,
  layoutDrawingToDrawing,
} from '@/lib/terminalLayout';
import { debounce } from 'es-toolkit';
import { useAccountStore } from '@/stores/account.store';
import type { AccountSnapshot } from '@/types/account';
import { formatServerTime } from '@/components/chart/internal/utils/formatServerTime';
import { loadChartSettings, saveChartSettings, type ChartSettings } from '@/lib/chartSettings';

// 🔥 FLOW T1: Поддерживаемые таймфреймы
type Timeframe = '5s' | '10s' | '15s' | '30s' | '1m' | '2m' | '3m' | '5m' | '10m' | '15m' | '30m' | '1h' | '4h' | '1d';

// Функция для форматирования времени в формат ЧЧ:ММ:СС
function formatTimeDisplay(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// Конвертация секунд в HH:MM:SS
function secondsToTime(seconds: number): { hours: number; minutes: number; secs: number } {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return { hours, minutes, secs };
}

// Конвертация HH:MM:SS в секунды
function timeToSeconds(hours: number, minutes: number, secs: number): number {
  return hours * 3600 + minutes * 60 + secs;
}

export default function TerminalPage() {
  const router = useRouter();
  const { logout, user } = useAuth();
  // FLOW P7: activeInstrument — один терминал один актив; смена = hard reset
  // FLOW R-FIX: Инициализируем instrument из localStorage синхронно, чтобы избежать лишних запросов
  const [instrument, setInstrument] = useState<string>(() => {
    // Загружаем layout синхронно при инициализации state
    try {
      const raw = localStorage.getItem('terminal.layout.v1');
      if (raw) {
        const layout = JSON.parse(raw) as { instrument?: string };
        if (layout.instrument && typeof layout.instrument === 'string') {
          return layout.instrument;
        }
      }
    } catch (error) {
      // Игнорируем ошибки парсинга, используем дефолт
    }
    return DEFAULT_INSTRUMENT_ID;
  });
  const activeInstrumentRef = useRef<string>(instrument);
  useEffect(() => {
    // Логирование только для AUDCHF
    if (instrument === 'AUDCHF') {
      console.log('[AUDCHF] [Terminal] Instrument changed to:', instrument);
    }
    activeInstrumentRef.current = instrument;
  }, [instrument]);

  const [timeframe, setTimeframe] = useState<Timeframe>('5s');
  // 🔥 FLOW I-PAYOUT: Загружаем payoutPercent для инструментов
  const [instrumentsData, setInstrumentsData] = useState<Array<{ id: string; payoutPercent: number }>>([]);
  const [payoutPercent, setPayoutPercent] = useState<number>(75); // Дефолт 75%

  // Загружаем данные инструментов с payoutPercent
  useEffect(() => {
    const loadInstruments = async () => {
      try {
        const data = await api<Array<{ id: string; payoutPercent: number }>>('/api/instruments');
        setInstrumentsData(data);
        const currentInst = data.find((inst) => inst.id === instrument);
        if (currentInst) {
          setPayoutPercent(currentInst.payoutPercent);
        }
      } catch (error) {
        console.error('Failed to load instruments:', error);
      }
    };
    loadInstruments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Обновляем payoutPercent при смене инструмента
  useEffect(() => {
    const currentInst = instrumentsData.find((inst) => inst.id === instrument);
    if (currentInst) {
      setPayoutPercent(currentInst.payoutPercent);
    }
  }, [instrument, instrumentsData]);

  // 🔥 FLOW T-LS1.3: Инициализация chartType из localStorage
  const [chartType, setChartType] = useState<ChartType>(() => {
    const raw = localStorage.getItem('terminal.layout.v1');
    if (!raw) return 'candles';

    try {
      const layout = JSON.parse(raw);
      return layout.chartType === 'line' ? 'line' : 'candles';
    } catch {
      return 'candles';
    }
  });
  // 🔥 FLOW C-CHART-TYPE-RESET: Передаем chartType для принудительной перезагрузки snapshot при смене типа графика
  const { data, loading, error } = useTerminalSnapshot(instrument, timeframe, chartType);
  const [accountType, setAccountType] = useState<'demo' | 'real'>('demo');
  const [activeMenu, setActiveMenu] = useState<string>('торговля');
  const [time, setTime] = useState<string>('60');
  const [amount, setAmount] = useState<string>('100');
  const [showTimeModal, setShowTimeModal] = useState<boolean>(false);
  const [showAmountModal, setShowAmountModal] = useState<boolean>(false);
  const timeFieldRef = useRef<HTMLDivElement>(null);
  const amountFieldRef = useRef<HTMLDivElement>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [showChartSettingsModal, setShowChartSettingsModal] = useState<boolean>(false);
  const [showAccountModal, setShowAccountModal] = useState<boolean>(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState<boolean>(false);
  const [hideBalance, setHideBalance] = useState<boolean>(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  
  // 🔥 FLOW A-ACCOUNT: Используем Zustand store вместо useState
  const snapshot = useAccountStore((s) => s.snapshot);
  // 🔥 FLOW T-LS1.4: Инициализация candleMode из localStorage
  const [candleMode, setCandleMode] = useState<CandleMode>(() => {
    const raw = localStorage.getItem('terminal.layout.v1');
    if (!raw) return 'classic';

    try {
      const layout = JSON.parse(raw);
      const allowed = ['classic', 'heikin_ashi', 'bars'];
      return allowed.includes(layout.candleMode)
        ? layout.candleMode
        : 'classic';
    } catch {
      return 'classic';
    }
  });
  const [indicatorConfigs, setIndicatorConfigs] = useState<IndicatorConfig[]>(() => 
    getAllIndicators() // Инициализируем все индикаторы как выключенные
  );
  const [drawingMode, setDrawingMode] = useState<'horizontal' | 'vertical' | 'trend' | 'rectangle' | 'fibonacci' | 'parallel-channel' | 'ray' | 'arrow' | null>(null);
  const [followMode, setFollowMode] = useState<boolean>(true);
  const candleChartRef = useRef<CandleChartRef | null>(null);
  const lineChartRef = useRef<LineChartRef | null>(null);
  // FLOW F8: показывать кнопку «Вернуться к текущим», когда пользователь уехал влево
  const [showReturnToLatest, setShowReturnToLatest] = useState<boolean>(false);

  // 🔥 FLOW C-CHART-TYPE-RESET: Принудительная перезагрузка snapshot при смене типа графика
  // Используем key для полного пересоздания компонента (как F5)
  const previousChartTypeRef = useRef<ChartType>(chartType);
  useEffect(() => {
    if (previousChartTypeRef.current !== chartType) {
      previousChartTypeRef.current = chartType;
      // При смене chartType key в ChartContainer меняется, что вызывает полное пересоздание компонента
      // Это гарантирует полную перезагрузку данных (как F5)
    }
  }, [chartType]);

  // Модалка истории сделок
  const [showTradesHistory, setShowTradesHistory] = useState<boolean>(false);
  // Модалка новостей
  const [showNews, setShowNews] = useState<boolean>(false);

  useEffect(() => {
    if (chartType !== 'candles') return;
    const t = setInterval(() => {
      setShowReturnToLatest(!!candleChartRef.current?.shouldShowReturnToLatest?.());
    }, 400);
    return () => clearInterval(t);
  }, [chartType]);

  // FLOW O3/O4: Overlay Registry — data layer, onMutate форсит ре-рендер панели
  const [overlayVersion, setOverlayVersion] = useState(0);
  const overlayRegistry = useOverlayRegistry({ onMutate: () => setOverlayVersion((v) => v + 1) });

  // 🧠 TERMINAL LAYOUT PERSISTENCE: Single source of truth
  const terminalLayoutRef = useRef<TerminalLayout>({
    instrument: DEFAULT_INSTRUMENT_ID,
    timeframe: timeframe,
    indicators: [],
    drawings: [],
    chartType: chartType,
    candleMode: candleMode,
  });

  // Debounced save function
  const saveLayoutDebounced = useRef(
    debounce(() => {
      saveLayoutToLocalStorage(terminalLayoutRef.current);
    }, 1000)
  ).current;

  // Save on unload (страховка)
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveLayoutToLocalStorage(terminalLayoutRef.current);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      saveLayoutDebounced.cancel?.();
    };
  }, [saveLayoutDebounced]);

  // Apply layout function
  const applyLayout = (layout: TerminalLayout) => {
    // 1. Устанавливаем instrument и timeframe
    setInstrument(layout.instrument || DEFAULT_INSTRUMENT_ID);
    // Валидируем timeframe - если не поддерживается, используем '5s'
    const validTimeframes: Timeframe[] = ['5s', '10s', '15s', '30s', '1m', '2m', '3m', '5m', '10m', '15m', '30m', '1h', '4h', '1d'];
    const validTimeframe: Timeframe = layout.timeframe && validTimeframes.includes(layout.timeframe as Timeframe)
      ? layout.timeframe as Timeframe 
      : '5s';
    setTimeframe(validTimeframe);
    
    // 🔥 FLOW T-LS1.5: Восстанавливаем chartType и candleMode
    if (layout.chartType === 'line' || layout.chartType === 'candles') {
      setChartType(layout.chartType);
    }
    if (layout.candleMode && ['classic', 'heikin_ashi', 'bars'].includes(layout.candleMode)) {
      setCandleMode(layout.candleMode);
    }
    
    // 2. Восстанавливаем индикаторы
    const allIndicators = getAllIndicators();
    const restoredConfigs = allIndicators.map((indicator) => {
      const layoutIndicator = layout.indicators?.find((li: { id: string }) => li.id === indicator.id);
      if (layoutIndicator) {
        const restored = layoutIndicatorToConfig(layoutIndicator, indicator.type);
        return {
          ...indicator,
          ...restored,
        };
      }
      return indicator;
    });
    setIndicatorConfigs(restoredConfigs);
    
    // 3. Восстанавливаем drawings (после того как chart готов)
    // Используем несколько попыток, так как chart может быть не готов сразу
    let attempts = 0;
    const maxAttempts = 10;
    const restoreDrawings = () => {
      attempts++;
      if (candleChartRef.current) {
        candleChartRef.current.clearDrawings();
        layout.drawings?.forEach((layoutDrawing) => {
          const drawing = layoutDrawingToDrawing(layoutDrawing);
          if (drawing) {
            candleChartRef.current?.addDrawing(drawing);
          }
        });
      } else if (attempts < maxAttempts) {
        // Повторяем попытку через 100ms
        setTimeout(restoreDrawings, 100);
      }
    };
    
    // Первая попытка через небольшую задержку
    setTimeout(restoreDrawings, 100);
  };

  // Load layout on mount
  useEffect(() => {
    const savedLayout = loadLayoutFromLocalStorage();
    if (savedLayout) {
      terminalLayoutRef.current = savedLayout;
      // FLOW R-FIX: Применяем layout только если instrument отличается от текущего
      // Это предотвращает лишние запросы при первой загрузке
      if (savedLayout.instrument !== instrument) {
        applyLayout(savedLayout);
      } else {
        // Если instrument совпадает, применяем только остальные настройки
        const validTimeframes: Timeframe[] = ['5s', '10s', '15s', '30s', '1m', '2m', '3m', '5m', '10m', '15m', '30m', '1h', '4h', '1d'];
        const validTimeframe: Timeframe = validTimeframes.includes(savedLayout.timeframe as Timeframe)
          ? savedLayout.timeframe as Timeframe 
          : '5s';
        if (validTimeframe !== timeframe) {
          setTimeframe(validTimeframe);
        }
        // 🔥 FLOW T-LS1.5: Восстанавливаем chartType и candleMode
        if (savedLayout.chartType === 'line' || savedLayout.chartType === 'candles') {
          if (savedLayout.chartType !== chartType) {
            setChartType(savedLayout.chartType);
          }
        }
        if (savedLayout.candleMode && ['classic', 'heikin_ashi', 'bars'].includes(savedLayout.candleMode)) {
          if (savedLayout.candleMode !== candleMode) {
            setCandleMode(savedLayout.candleMode);
          }
        }
        // Восстанавливаем индикаторы и drawings без изменения instrument
        const allIndicators = getAllIndicators();
        const restoredConfigs = allIndicators.map((indicator) => {
          const layoutIndicator = savedLayout.indicators?.find((li: { id: string }) => li.id === indicator.id);
          if (layoutIndicator) {
            const restored = layoutIndicatorToConfig(layoutIndicator, indicator.type);
            return {
              ...indicator,
              ...restored,
            };
          }
          return indicator;
        });
        setIndicatorConfigs(restoredConfigs);
        // Восстанавливаем drawings
        let attempts = 0;
        const maxAttempts = 10;
        const restoreDrawings = () => {
          attempts++;
          if (candleChartRef.current) {
            candleChartRef.current.clearDrawings();
            savedLayout.drawings?.forEach((layoutDrawing) => {
              const drawing = layoutDrawingToDrawing(layoutDrawing);
              if (drawing) {
                candleChartRef.current?.addDrawing(drawing);
              }
            });
          } else if (attempts < maxAttempts) {
            setTimeout(restoreDrawings, 100);
          }
        };
        setTimeout(restoreDrawings, 100);
      }
    } else {
      // Применяем дефолтный layout только если instrument отличается
      if (terminalLayoutRef.current.instrument !== instrument) {
        applyLayout(terminalLayoutRef.current);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Только при монтировании

  // Update layoutRef and save when instrument changes
  useEffect(() => {
    terminalLayoutRef.current.instrument = instrument;
    saveLayoutDebounced();
  }, [instrument, saveLayoutDebounced]);

  // Update layoutRef and save when timeframe changes
  useEffect(() => {
    terminalLayoutRef.current.timeframe = timeframe;
    saveLayoutDebounced();
  }, [timeframe, saveLayoutDebounced]);

  // Update layoutRef and save when indicators change
  useEffect(() => {
    terminalLayoutRef.current.indicators = indicatorConfigs
      .filter((c) => c.enabled)
      .map(indicatorConfigToLayout);
    saveLayoutDebounced();
  }, [indicatorConfigs, saveLayoutDebounced]);

  // Update layoutRef and save when drawings change (через overlayRegistry)
  useEffect(() => {
    if (candleChartRef.current) {
      const drawings = candleChartRef.current.getDrawings();
      terminalLayoutRef.current.drawings = drawings.map(drawingToLayout);
      saveLayoutDebounced();
    }
  }, [overlayVersion, saveLayoutDebounced]); // overlayVersion меняется при изменении drawings

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  // 🔥 FLOW A-ACCOUNT: Первичная инициализация snapshot через HTTP
  useEffect(() => {
    const initSnapshot = async () => {
      try {
        const snap = await api<AccountSnapshot>('/api/account/snapshot');
        useAccountStore.getState().setSnapshot(snap);
      } catch (error) {
        console.error('Failed to load account snapshot:', error);
      }
    };
    initSnapshot();
  }, []);

  // Загрузка профиля пользователя с аватаркой
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const response = await api<{ user: { avatarUrl?: string | null } }>('/api/user/profile');
        setAvatarUrl(response.user.avatarUrl || null);
      } catch (error) {
        console.error('Failed to load user profile:', error);
      }
    };
    loadUserProfile();
  }, []);

  // 🔥 FLOW A-ACCOUNT: Синхронизируем accountType с snapshot
  useEffect(() => {
    if (snapshot) {
      const newAccountType = snapshot.type === 'DEMO' ? 'demo' : 'real';
      if (accountType !== newAccountType) {
        setAccountType(newAccountType);
      }
    }
  }, [snapshot, accountType]);

  const [resetDemoLoading, setResetDemoLoading] = useState<boolean>(false);
  const [buyPercentage, setBuyPercentage] = useState<number>(50);
  const [sellPercentage, setSellPercentage] = useState<number>(50);
  const mainRef = useRef<HTMLElement | null>(null);
  const chartContainerRef = useRef<HTMLDivElement | null>(null);

  // 🔥 FLOW A-ACCOUNT: Анимация баланса при изменении
  const [balanceAnimation, setBalanceAnimation] = useState<'increase' | 'decrease' | null>(null);
  const [displayedBalance, setDisplayedBalance] = useState<string>('0.00');
  const previousBalanceRef = useRef<number | null>(null);

  // Отслеживаем изменения баланса для анимации
  useEffect(() => {
    if (!snapshot) {
      setDisplayedBalance('0.00');
      previousBalanceRef.current = null;
      return;
    }
    const currentBalance = snapshot.balance;
    const previousBalance = previousBalanceRef.current;

    if (previousBalance !== null && previousBalance !== currentBalance) {
      if (currentBalance > previousBalance) setBalanceAnimation('increase');
      else if (currentBalance < previousBalance) setBalanceAnimation('decrease');

      const startBalance = previousBalance;
      const endBalance = currentBalance;
      const duration = 500;
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOutCubic = 1 - Math.pow(1 - progress, 3);
        const current = startBalance + (endBalance - startBalance) * easeOutCubic;
        setDisplayedBalance(current.toFixed(2));
        if (progress < 1) requestAnimationFrame(animate);
        else setDisplayedBalance(endBalance.toFixed(2));
      };
      requestAnimationFrame(animate);
      setTimeout(() => setBalanceAnimation(null), 1000);
    } else {
      setDisplayedBalance(currentBalance.toFixed(2));
    }
    previousBalanceRef.current = currentBalance;
  }, [snapshot?.balance, snapshot?.accountId]);

  // 🔥 FLOW D-RESET-DEMO: Сброс демо-счета до $10,000
  const handleResetDemoAccount = async () => {
    if (!snapshot || snapshot.type !== 'DEMO') return;
    if (snapshot.balance >= 1000) return;
    try {
      setResetDemoLoading(true);
      await api('/api/accounts/demo/reset', { method: 'POST' });
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      const msg = err.response?.data?.message || err.message || '';
      if (msg.includes('high enough') || msg.includes('not allowed')) {
        alert('Баланс демо-счета должен быть меньше $1,000 для сброса');
      } else if (msg.includes('not found')) {
        alert('Демо-счет не найден');
      } else {
        alert(`Ошибка сброса демо-счета: ${msg}`);
      }
    } finally {
      setResetDemoLoading(false);
    }
  };

  const getCurrentBalance = () => {
    if (!snapshot) return { balance: '0.00', currency: 'UAH' };
    return { balance: snapshot.balance.toFixed(2), currency: snapshot.currency };
  };

  const [modalBalances, setModalBalances] = useState<{
    demo: { balance: string; currency: string } | null;
    real: { balance: string; currency: string } | null;
  }>({ demo: null, real: null });

  const loadAllBalances = async () => {
    try {
      const accountsResponse = await api<{ accounts: Array<{ type: string; balance: string; currency: string; isActive: boolean }> }>('/api/accounts');
      const demoAccount = accountsResponse.accounts.find((a) => a.type === 'demo' && a.isActive) || accountsResponse.accounts.find((a) => a.type === 'demo');
      if (demoAccount) {
        setModalBalances((prev) => ({
          ...prev,
          demo: { balance: parseFloat(demoAccount.balance).toFixed(2), currency: demoAccount.currency },
        }));
      }
      try {
        const realResponse = await api<{ currency: string; balance: number }>('/api/wallet/balance');
        setModalBalances((prev) => ({
          ...prev,
          real: { balance: realResponse.balance.toFixed(2), currency: realResponse.currency },
        }));
      } catch {
        setModalBalances((prev) => ({ ...prev, real: null }));
      }
    } catch (error) {
      console.error('Failed to load balances:', error);
    }
  };

  // 🔥 FLOW W1: Синхронизируем accountType с данными из терминала при первой загрузке
  const accountTypeInitializedRef = useRef(false);
  useEffect(() => {
    if (data?.activeAccount?.type && !accountTypeInitializedRef.current) {
      setAccountType(data.activeAccount.type);
      accountTypeInitializedRef.current = true;
    }
  }, [data?.activeAccount?.type]);

  // Закрытие модалки выбора счета при клике вне её
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showAccountModal && !target.closest('[data-account-modal]')) {
        setShowAccountModal(false);
      }
    };
    if (showAccountModal) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showAccountModal]);

  // FLOW O7: синхрон indicatorConfigs ↔ Overlay Registry (включённые индикаторы → overlays)
  useEffect(() => {
    indicatorConfigs.forEach((c) => {
      if (c.enabled) {
        const name =
          c.type === 'Stochastic'
            ? `Stochastic(${c.period},${c.periodD ?? 3})`
            : c.type === 'BollingerBands'
              ? `Боллинджер(${c.period}, ${c.stdDevMult ?? 2})`
              : `${c.type}(${c.period})`;
        const params =
          c.type === 'Stochastic'
            ? { period: c.period, periodD: c.periodD ?? 3 }
            : c.type === 'BollingerBands'
              ? { period: c.period, stdDevMult: c.stdDevMult ?? 2 }
              : { period: c.period };
        overlayRegistry.addOverlay({
          id: c.id,
          type: 'indicator',
          name,
          visible: true,
          indicatorId: c.type,
          params,
        });
      } else {
        overlayRegistry.removeOverlay(c.id);
      }
    });
  }, [indicatorConfigs]);

  // 🔥 FLOW T-LS1.1: Сохранение chartType в localStorage
  const handleChartTypeChange = (type: ChartType) => {
    setChartType(type);
    terminalLayoutRef.current.chartType = type;
    saveLayoutDebounced();
  };

  // 🔥 FLOW T-LS1.2: Сохранение candleMode в localStorage
  const handleCandleModeChange = (mode: CandleMode) => {
    setCandleMode(mode);
    candleChartRef.current?.setCandleMode(mode);
    terminalLayoutRef.current.candleMode = mode;
    saveLayoutDebounced();
  };

  // 🔥 FLOW W1: Вспомогательная функция: выбрать ID активного счёта нужного типа
  const getActiveAccountId = async (): Promise<string | null> => {
    try {
      // Получаем аккаунты напрямую из API
      const accountsResponse = await api<{ accounts: Array<{ id: string; type: string; isActive: boolean }> }>('/api/accounts');
      
      // Ищем активный счёт нужного типа
      const activeAccount = accountsResponse.accounts.find(
        (a) => a.isActive && a.type === accountType,
      );
      if (activeAccount?.id) return activeAccount.id;
      
      // Если нет активного счёта нужного типа, ищем любой счёт этого типа
      const accountByType = accountsResponse.accounts.find((a) => a.type === accountType);
      if (accountByType?.id) {
        // Переключаемся на этот счёт
        await api('/api/accounts/switch', {
          method: 'POST',
          body: JSON.stringify({ accountId: accountByType.id }),
        });
        return accountByType.id;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get active account ID:', error);
      return null;
    }
  };

  // 🔥 FLOW F1: Handle follow mode toggle
  const handleFollowModeToggle = () => {
    const newFollowMode = !followMode;
    setFollowMode(newFollowMode);
    candleChartRef.current?.setFollowMode(newFollowMode);
  };

  const toggleFullscreen = async () => {
    const el = fullscreenContainerRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } else {
        await el.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch {
      setIsFullscreen(!!document.fullscreenElement);
    }
  };

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const menuItems = [
    { id: 'торговый-профиль', label: 'Торговый профиль', icon: TrendingUp },
    { id: 'кошелек', label: 'Кошелек', icon: Wallet },
    { id: 'обучение', label: 'Обучение', icon: GraduationCap },
    { id: 'личный-профиль', label: 'Личный профиль', icon: UserCircle },
  ];

  return (
    <AuthGuard requireAuth>
      <div ref={fullscreenContainerRef} className="min-h-screen bg-[#061230] flex flex-col">
      {/* Header */}
      <header className="bg-[#05122a] border-b border-white/10 shrink-0">
        <div className="px-3 sm:px-6 py-2.5 sm:py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <Image src="/images/logo.png" alt="ComforTrade" width={40} height={40} className="h-8 sm:h-10 w-auto object-contain" />
            <span className="hidden sm:inline text-base sm:text-xl font-semibold text-white uppercase truncate max-w-[140px] sm:max-w-none">ComforTrade</span>
            <button type="button" className="hidden sm:flex w-9 h-9 sm:w-10 sm:h-10 rounded-lg items-center justify-center text-white hover:bg-white/10 transition-colors shrink-0">
              <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="relative">
              <div className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-[#3347ff]/50 via-[#5b6bff]/30 to-[#3347ff]/50 blur-sm opacity-60 pointer-events-none" />
              <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#05122a] z-10 pointer-events-none ${accountType === 'demo' ? 'bg-sky-400' : 'bg-emerald-500'}`} title={accountType === 'demo' ? 'Демо-счёт' : 'Реальный счёт'} />
              <div onClick={() => setShowProfileModal(!showProfileModal)} className="relative w-10 h-10 rounded-full flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity overflow-hidden ring-2 ring-white/20 ring-offset-2 ring-offset-[#05122a] shadow-lg">
                {avatarUrl ? (
                  <img src={`${process.env.NEXT_PUBLIC_API_URL || ''}${avatarUrl}`} alt="" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-[#3347ff] via-[#3d52ff] to-[#1f2a45] flex items-center justify-center text-sm font-bold text-white">
                    {(user?.email || '?').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {showProfileModal && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowProfileModal(false)} />
                  <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-72 bg-[#1a2438] border border-white/5 rounded-lg shadow-xl z-50 overflow-hidden">
                    <div className="p-3 space-y-2.5">
                      <div className="flex items-center gap-2.5 p-2.5 rounded-lg">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 ring-2 ring-white/20 ring-offset-2 ring-offset-[#1a2438] bg-gradient-to-br from-[#3347ff]/30 to-[#1f2a45]">
                          {avatarUrl ? <img src={`${process.env.NEXT_PUBLIC_API_URL || ''}${avatarUrl}`} alt="" className="w-full h-full object-cover rounded-full" /> : <span className="text-sm font-bold text-white">{(user?.email || '?').charAt(0).toUpperCase()}</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-medium text-sm truncate">{user?.email || 'Пользователь'}</div>
                          <div className="text-white/60 text-xs">{accountType === 'demo' ? 'Демо-счёт' : 'Реальный счёт'}</div>
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white/5">
                        <div className="text-white/60 text-xs mb-1">Баланс</div>
                        <div className={`text-white font-semibold text-base ${hideBalance ? '' : balanceAnimation === 'increase' ? 'text-green-400' : balanceAnimation === 'decrease' ? 'text-red-400' : ''}`}>
                          {hideBalance ? '••••••' : snapshot ? `${displayedBalance} ${snapshot.currency === 'USD' ? 'USD' : snapshot.currency === 'RUB' ? '₽' : snapshot.currency === 'UAH' ? 'UAH' : snapshot.currency}` : '...'}
                        </div>
                      </div>
                    </div>
                    <div className="border-t border-white/10 p-3 space-y-1">
                      <button type="button" onClick={() => { setShowProfileModal(false); setShowAccountModal(true); }} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-white hover:bg-white/10 transition-colors text-sm text-left">
                        <Repeat className="w-4 h-4" />
                        <span>Переключить счёт</span>
                      </button>
                      {accountType === 'real' && (
                        <Link href="/profile?tab=wallet" onClick={() => setShowProfileModal(false)} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-white hover:bg-white/10 transition-colors text-sm">
                          <PlusCircle className="w-4 h-4" />
                          <span>Пополнить счёт</span>
                        </Link>
                      )}
                      <Link href="/profile" onClick={() => setShowProfileModal(false)} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-white hover:bg-white/10 transition-colors text-sm">
                        <UserCircle className="w-4 h-4" />
                        <span>Профиль</span>
                      </Link>
                      <Link href="/profile?tab=wallet" onClick={() => setShowProfileModal(false)} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-white hover:bg-white/10 transition-colors text-sm">
                        <Wallet className="w-4 h-4" />
                        <span>Кошелёк</span>
                      </Link>
                      <Link href="/profile?tab=education" onClick={() => setShowProfileModal(false)} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-white hover:bg-white/10 transition-colors text-sm">
                        <GraduationCap className="w-4 h-4" />
                        <span>Обучение</span>
                      </Link>
                      <Link href="/profile?tab=support" onClick={() => setShowProfileModal(false)} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-white hover:bg-white/10 transition-colors text-sm">
                        <MessageCircle className="w-4 h-4" />
                        <span>Поддержка</span>
                      </Link>
                    </div>
                    <div className="border-t border-white/10 p-3">
                      <button onClick={() => { setShowProfileModal(false); handleLogout(); }} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors text-sm">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        <span>Выйти</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              {(snapshot?.type === 'DEMO' && snapshot && snapshot.balance < 1000) && (
                <button type="button" className="w-9 h-9 rounded-xl border border-white/20 flex items-center justify-center hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" onClick={handleResetDemoAccount} disabled={resetDemoLoading} title="Reset demo balance">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                </button>
              )}
              <div className="flex flex-col relative pr-3" data-account-modal>
                <div className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity" data-account-modal onClick={async () => { await loadAllBalances(); setShowAccountModal(true); }}>
                  <span className="text-xs text-white font-medium">{accountType === 'demo' ? 'Демо-счёт' : 'Реальный счёт'}</span>
                  <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
                <div className={`text-base font-semibold transition-all duration-500 ${hideBalance ? 'text-white' : balanceAnimation === 'increase' ? 'text-green-400 scale-105' : balanceAnimation === 'decrease' ? 'text-red-400 scale-105' : 'text-white'}`} style={{ transition: 'color 0.5s ease, transform 0.3s ease' }}>
                  {hideBalance ? '••••••' : snapshot ? `${displayedBalance} ${snapshot.currency === 'USD' ? 'USD' : snapshot.currency === 'RUB' ? '₽' : snapshot.currency === 'UAH' ? 'UAH' : snapshot.currency}` : '...'}
                </div>
                {showAccountModal && (
                  <>
                    <div className="fixed inset-0 z-[140]" onClick={() => setShowAccountModal(false)} />
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 bg-[#1a2438] border border-white/5 rounded-lg shadow-xl z-[150]" data-account-modal>
                      <div className="p-3 space-y-2.5">
                        <div className={`flex items-start gap-2.5 p-2.5 rounded-lg cursor-pointer transition-colors ${accountType === 'real' ? 'bg-white/10' : 'hover:bg-white/5'}`} onClick={async () => { try { const r = await api<{ accounts: Array<{ id: string; type: string }> }>('/api/accounts'); const a = r.accounts.find(x => x.type === 'real'); if (a) { await api('/api/accounts/switch', { method: 'POST', body: JSON.stringify({ accountId: a.id }) }); } setShowAccountModal(false); } catch (e) { console.error(e); alert('Не удалось переключить аккаунт'); } }}>
                          <div className="mt-0.5">{accountType === 'real' ? <div className="w-4 h-4 rounded-full bg-[#3347ff] flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-[#061230]" /></div> : <div className="w-4 h-4 rounded-full border-2 border-[#3347ff]" />}</div>
                          <div className="flex-1">
                            <div className="text-white font-medium mb-0.5 text-sm">Реальный счёт</div>
                            <div className="text-white/60 text-xs">{hideBalance ? '••••••' : (modalBalances.real ? `${modalBalances.real.balance} ${modalBalances.real.currency === 'USD' ? 'USD' : modalBalances.real.currency === 'RUB' ? '₽' : modalBalances.real.currency === 'UAH' ? 'UAH' : modalBalances.real.currency}` : (snapshot?.type === 'REAL' ? `${getCurrentBalance().balance} ${getCurrentBalance().currency === 'USD' ? 'USD' : getCurrentBalance().currency === 'RUB' ? '₽' : getCurrentBalance().currency === 'UAH' ? 'UAH' : getCurrentBalance().currency}` : '...'))}</div>
                            <Link href="/profile?tab=wallet" onClick={(e) => e.stopPropagation()} className="mt-2 inline-block px-2.5 py-1 rounded-lg bg-[#3347ff] text-white text-xs font-medium hover:bg-[#3347ff]/90 transition-colors">Пополнить счёт</Link>
                          </div>
                        </div>
                        <div className={`flex items-start gap-2.5 p-2.5 rounded-lg cursor-pointer transition-colors ${accountType === 'demo' ? 'bg-white/10' : 'hover:bg-white/5'}`} onClick={async () => { try { const r = await api<{ accounts: Array<{ id: string; type: string }> }>('/api/accounts'); const a = r.accounts.find(x => x.type === 'demo'); if (a) { await api('/api/accounts/switch', { method: 'POST', body: JSON.stringify({ accountId: a.id }) }); } setShowAccountModal(false); } catch (e) { console.error(e); alert('Не удалось переключить аккаунт'); } }}>
                          <div className="mt-0.5">{accountType === 'demo' ? <div className="w-4 h-4 rounded-full bg-[#3347ff] flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-[#061230]" /></div> : <div className="w-4 h-4 rounded-full border-2 border-[#3347ff]" />}</div>
                          <div className="flex-1">
                            <div className="text-white font-medium mb-0.5 text-sm">Демо-счёт</div>
                            <div className="text-white/60 text-xs">{hideBalance ? '••••••' : (modalBalances.demo ? `${modalBalances.demo.balance} ${modalBalances.demo.currency === 'USD' ? 'USD' : modalBalances.demo.currency === 'RUB' ? '₽' : modalBalances.demo.currency === 'UAH' ? 'UAH' : modalBalances.demo.currency}` : (snapshot?.type === 'DEMO' ? `${getCurrentBalance().balance} ${getCurrentBalance().currency === 'USD' ? 'USD' : getCurrentBalance().currency === 'RUB' ? '₽' : getCurrentBalance().currency === 'UAH' ? 'UAH' : getCurrentBalance().currency}` : '...'))}</div>
                          </div>
                        </div>
                      </div>
                      <div className="border-t border-white/10 p-3">
                        <div className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setHideBalance(!hideBalance)}>
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">{hideBalance ? <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></> : <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>}</svg>
                          <span className="text-white text-xs">Скрыть баланс</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <Link href="/profile?tab=wallet" className="px-3 sm:px-5 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold bg-gradient-to-r from-[#3347ff] to-[#1e2fcc] text-white hover:from-[#3347ff]/90 hover:to-[#1e2fcc]/90 transition-all flex items-center gap-1.5 sm:gap-2 uppercase">
              <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="sm:hidden">Пополнить</span>
              <span className="hidden sm:inline">Пополнить счёт</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area with Sidebar — pb-20 на мобилке под нижнюю навигацию */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden pb-20 md:pb-0">
        {/* Left Sidebar — скрыт на мобилке, на десктопе слева */}
        <aside className="hidden md:flex w-[88px] shrink-0 bg-[#05122a] border-r border-white/10 flex-col items-center py-2.5 gap-2">
          <div className="flex-1 flex flex-col items-center gap-2 w-full min-h-0">
            {/* Кнопка истории сделок */}
            <button
              onClick={() => setShowTradesHistory((prev) => !prev)}
              className={`flex flex-col items-center justify-center gap-1 w-full h-14 px-1.5 rounded-lg transition-colors ${
                showTradesHistory
                  ? 'bg-[#3347ff]/20 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <History className="w-5 h-5 stroke-[3]" />
              <span className="text-[10px] font-semibold leading-tight text-center">История сделок</span>
            </button>
            
            {/* Кнопка новостей */}
            <button
              onClick={() => setShowNews(true)}
              className={`flex flex-col items-center justify-center gap-1 w-full h-14 px-1.5 rounded-lg transition-colors ${
                showNews
                  ? 'bg-[#3347ff]/20 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Newspaper className="w-5 h-5 stroke-[3]" />
              <span className="text-[10px] font-semibold leading-tight text-center">Новости</span>
            </button>

            {/* Кнопка обучения */}
            <button
              onClick={() => {
                setActiveMenu('обучение');
                window.location.href = '/profile?tab=education';
              }}
              className={`flex flex-col items-center justify-center gap-1 w-full h-14 px-1.5 rounded-lg transition-colors ${
                activeMenu === 'обучение'
                  ? 'bg-[#3347ff]/20 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <GraduationCap className="w-5 h-5 stroke-[3]" />
              <span className="text-[10px] font-semibold leading-tight text-center">Обучение</span>
            </button>

            {/* Кнопка торгового профиля */}
            <Link
              href="/profile?tab=trade"
              className={`flex flex-col items-center justify-center gap-1 w-full h-14 px-1.5 rounded-lg transition-colors ${
                activeMenu === 'торговый-профиль'
                  ? 'text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <TrendingUp className="w-5 h-5 stroke-[3]" />
              <span className="text-[10px] font-semibold leading-tight text-center">Торговый профиль</span>
            </Link>

            {/* Кнопка кошелька */}
            <Link
              href="/profile?tab=wallet"
              className={`flex flex-col items-center justify-center gap-1 w-full h-14 px-1.5 rounded-lg transition-colors ${
                activeMenu === 'кошелек'
                  ? 'text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Wallet className="w-5 h-5 stroke-[3]" />
              <span className="text-[10px] font-semibold leading-tight text-center">Кошелек</span>
            </Link>

            {/* Кнопка личного профиля */}
            <Link
              href="/profile"
              className={`flex flex-col items-center justify-center gap-1 w-full h-14 px-1.5 rounded-lg transition-colors ${
                activeMenu === 'личный-профиль'
                  ? 'text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <UserCircle className="w-5 h-5 stroke-[3]" />
              <span className="text-[10px] font-semibold leading-tight text-center">Личный профиль</span>
            </Link>

            {/* Остальные элементы из menuItems */}
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeMenu === item.id;

              // Пропускаем уже отрендеренные элементы
              if (['торговый-профиль', 'личный-профиль', 'обучение', 'кошелек'].includes(item.id)) {
                return null;
              }

              // Остальные кнопки - обычные кнопки
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveMenu(item.id);
                  }}
                  className={`flex flex-col items-center justify-center gap-1 w-full h-14 px-1.5 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-[#3347ff]/20 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-5 h-5 stroke-[3]" />
                  <span className="text-[10px] font-semibold leading-tight text-center">{item.label}</span>
                </button>
              );
            })}
          </div>
          <a
            href="https://t.me/your_support_channel"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center gap-1 w-[72px] h-12 px-1.5 rounded-lg bg-white/10 transition-colors text-gray-400 hover:text-white hover:bg-white/15 mt-1 mx-auto"
          >
            <Image src="/images/support.png" alt="Поддержка" width={20} height={20} className="w-5 h-5 object-contain" />
            <span className="text-[9px] font-semibold leading-tight text-center">Поддержка</span>
          </a>
        </aside>

        {/* Trades History Panel - часть layout, слева от графика */}
        {showTradesHistory && (
          <>
            <div
              className="fixed left-0 md:left-[88px] top-0 right-0 bottom-0 z-40"
              onClick={() => setShowTradesHistory(false)}
              aria-hidden
            />
            <div onClick={(e) => e.stopPropagation()}>
              <TradesHistoryModal onClose={() => setShowTradesHistory(false)} />
            </div>
          </>
        )}

        {/* Page Content — на мобилке первый (выше сайдбара) */}
        <main ref={mainRef} className="flex-1 min-h-0 min-w-0 relative order-1">
          {/* Chart Controls (поверх графика) */}
          <div className="absolute top-2 left-2 sm:top-3 sm:left-3 z-10 flex flex-wrap items-center gap-1 max-w-[calc(100%-0.5rem)]">
            {/* 1. Валютная пара */}
            <div className="bg-gradient-to-b from-[#24304d] to-[#1f2a45] rounded-lg">
              <InstrumentMenu
                instrument={instrument}
                onInstrumentChange={setInstrument}
              />
            </div>

            {/* 2. Тип графика */}
            <div className="bg-gradient-to-b from-[#24304d] to-[#1f2a45] rounded-lg">
              <ChartTypeMenu
                chartType={chartType}
                candleMode={candleMode}
                onChartTypeChange={handleChartTypeChange}
                onCandleModeChange={handleCandleModeChange}
              />
            </div>

            {/* 3. Таймфрейм */}
            <div className="bg-gradient-to-b from-[#24304d] to-[#1f2a45] rounded-lg">
              <TimeframeMenu
                timeframe={timeframe}
                onTimeframeChange={setTimeframe}
              />
            </div>

            {/* 4. Индикаторы */}
            <div className="bg-gradient-to-b from-[#24304d] to-[#1f2a45] rounded-lg">
              <IndicatorMenu
                indicatorConfigs={indicatorConfigs}
                onConfigChange={setIndicatorConfigs}
              />
            </div>

            {/* 5. Рисование */}
            <div className="bg-gradient-to-b from-[#24304d] to-[#1f2a45] rounded-lg">
              <DrawingMenu
                drawingMode={drawingMode}
                onDrawingModeChange={setDrawingMode}
              />
            </div>

          </div>

          {/* FLOW O4: Панель активных объектов — ниже шапки, отдельный элемент */}
          {overlayVersion >= 0 && (() => {
            const allOverlays = overlayRegistry.getOverlays();
            const nonTradeOverlays = allOverlays.filter((o) => o.type !== 'trade');
            return nonTradeOverlays.length > 0;
          })() && (
            <div className="absolute top-24 left-4 z-10">
              <OverlayPanel
                overlays={overlayRegistry.getOverlays().filter((o) => o.type !== 'trade')}
                onToggleVisibility={overlayRegistry.toggleVisibility}
                onRemove={(id) => {
                  const list = overlayRegistry.getOverlays();
                  const o = list.find((x) => x.id === id);
                  if (o?.type === 'drawing') candleChartRef.current?.removeDrawing(id);
                  if (o?.type === 'indicator') setIndicatorConfigs((prev) => prev.map((c) => (c.id === id ? { ...c, enabled: false } : c)));
                  if (o?.type === 'trade') candleChartRef.current?.removeTrade(id);
                  overlayRegistry.removeOverlay(id);
                }}
                className="max-h-[260px]"
              />
            </div>
          )}

          {/* Обёртка графика с явными размерами под ресайз — заполняет main по inset-0 */}
          <div ref={chartContainerRef} className="absolute inset-0 min-w-0 min-h-0 overflow-hidden flex flex-col md:flex-row">
            {/* График */}
            <div className="flex-1 min-w-0 min-h-0 relative">
              {/* 🔥 FLOW: Hard Chart Reinitialization on Timeframe/ChartType Change
                  Используем key для полного пересоздания графика при смене ТФ или типа графика
                  Это гарантирует полный reset как при reload страницы */}
              <ChartContainer
                key={`${instrument}_${timeframe}_${chartType}`}
                type={chartType}
                candleMode={candleMode}
                className="w-full h-full"
                style={{ display: 'block' }}
                snapshot={data}
                timeframe={timeframe}
                instrument={instrument}
                payoutPercent={payoutPercent}
                digits={getInstrumentOrDefault(instrument).digits}
                activeInstrumentRef={activeInstrumentRef}
                indicatorConfigs={indicatorConfigs}
                drawingMode={drawingMode}
                overlayRegistry={{
                  getVisibleOverlayIds: overlayRegistry.getVisibleOverlayIds,
                  onDrawingAdded: (o) => {
                    overlayRegistry.addOverlay(o);
                    // Обновляем layoutRef при добавлении drawing
                    if (candleChartRef.current) {
                      const drawings = candleChartRef.current.getDrawings();
                      terminalLayoutRef.current.drawings = drawings.map(drawingToLayout);
                      saveLayoutDebounced();
                    }
                  },
                  onTradeAdded: (o) => {
                    overlayRegistry.addOverlay(o);
                  },
                }}
                onCandleChartRef={(ref) => {
                  candleChartRef.current = ref;
                }}
                onLineChartRef={(ref) => {
                  lineChartRef.current = ref;
                }}
                onInstrumentChange={setInstrument} // FLOW C-MARKET-ALTERNATIVES: Переключение инструмента
              />
            </div>
            
            {/* SentimentBar — на мобилке горизонтально под графиком, на десктопе вертикально справа */}
            <div className="shrink-0 flex flex-row md:flex-col items-center md:items-stretch gap-1.5 sm:gap-2 px-2 sm:px-3 md:px-2 py-1.5 sm:py-2 md:py-3 bg-[#05122a]/80 border-t md:border-t-0 md:border-l border-white/5 md:w-12">
              {/* На мобилке: горизонтальная компоновка */}
              <div className="md:hidden flex items-center gap-1.5 sm:gap-2 w-full">
                <span className="text-[9px] sm:text-[10px] font-medium text-white/50 shrink-0" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                  {buyPercentage}%
                </span>
                <div className="flex-1 min-w-0 h-2 md:h-3">
                  <SentimentBar
                    orientation="horizontal"
                    onPercentagesChange={(buy, sell) => {
                      setBuyPercentage(buy);
                      setSellPercentage(sell);
                    }}
                  />
                </div>
                <span className="text-[9px] sm:text-[10px] font-medium text-white/50 shrink-0" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                  {sellPercentage}%
                </span>
              </div>
              
              {/* На десктопе: вертикальная компоновка */}
              <div className="hidden md:flex flex-col items-center justify-center gap-2 h-full py-3">
                <span className="text-[10px] font-medium text-white/50 shrink-0" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                  {buyPercentage}%
                </span>
                <div className="flex-1 min-w-0 w-full flex items-center justify-center min-h-0" style={{ height: '100%' }}>
                  <SentimentBar
                    orientation="vertical"
                    height={400}
                    width={12}
                    onPercentagesChange={(buy, sell) => {
                      setBuyPercentage(buy);
                      setSellPercentage(sell);
                    }}
                  />
                </div>
                <span className="text-[10px] font-medium text-white/50 shrink-0" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                  {sellPercentage}%
                </span>
              </div>
            </div>
          </div>
        </main>

        {/* Right Sidebar — на мобилке внизу под графиком, на десктопе справа */}
        <aside className="w-full md:w-48 shrink-0 bg-[#06122c] border-t md:border-t-0 md:border-l border-white/10 p-3 flex flex-col gap-3 order-2">
          {/* Time + Amount — на мобилке в ряд */}
          <div className="flex flex-row md:flex-col gap-3">
          {/* Time Input */}
          <div className="flex flex-col gap-1.5 relative flex-1 md:flex-none" ref={timeFieldRef}>
            <label className="text-xs text-gray-400">Время</label>
            <div className="flex items-center gap-0 bg-white/10 rounded-lg overflow-hidden px-1">
              {/* Minus Button */}
              <button
                type="button"
                onClick={() => {
                  const current = Number.parseInt(time || '60', 10);
                  const newValue = Math.max(5, current - 5);
                  setTime(String(newValue));
                  candleChartRef.current?.setExpirationSeconds(newValue);
                  lineChartRef.current?.setExpirationSeconds(newValue);
                }}
                className="w-9 h-10 shrink-0 flex items-center justify-center text-white"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <div className="w-px h-4 bg-white/25 rounded-full self-center shrink-0" />
              {/* Time Display - кликабельное поле */}
              <div 
                className="flex-1 px-2 py-2 text-white text-center text-sm font-medium cursor-pointer hover:bg-white/5 transition-colors flex items-center justify-center min-w-0"
                onClick={() => setShowTimeModal(true)}
              >
                <span>{formatTimeDisplay(Number.parseInt(time || '60', 10))}</span>
              </div>
              <div className="w-px h-4 bg-white/25 rounded-full self-center shrink-0" />
              {/* Plus Button */}
              <button
                type="button"
                onClick={() => {
                  const current = Number.parseInt(time || '60', 10);
                  const newValue = Math.min(300, current + 5);
                  setTime(String(newValue));
                  candleChartRef.current?.setExpirationSeconds(newValue);
                  lineChartRef.current?.setExpirationSeconds(newValue);
                }}
                className="w-9 h-10 shrink-0 flex items-center justify-center text-white"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Time Selection Modal */}
            {showTimeModal && (
              <>
                <div 
                  className="fixed inset-0 z-40"
                  onClick={() => setShowTimeModal(false)}
                />
                <div 
                  className="absolute right-full mr-2 top-0 z-50 w-48 bg-[#1a2438] rounded-lg shadow-xl p-3 border border-white/5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <TimeSelectionModal
                  currentSeconds={Number.parseInt(time || '60', 10)}
                  onSelect={(seconds) => {
                    setTime(String(seconds));
                    candleChartRef.current?.setExpirationSeconds(seconds);
                    lineChartRef.current?.setExpirationSeconds(seconds);
                  }}
                  onClose={() => setShowTimeModal(false)}
                />
                </div>
              </>
            )}
          </div>

          {/* Amount Input */}
          <div className="flex flex-col gap-1.5 relative flex-1 md:flex-none" ref={amountFieldRef}>
            <label className="text-xs text-gray-400">Сумма</label>
            <div className="flex items-center gap-0 bg-white/10 rounded-lg overflow-hidden px-1">
              {/* Minus Button */}
              <button
                type="button"
                onClick={() => {
                  const current = Number.parseFloat(amount || '100');
                  const newValue = Math.max(1, current - 10);
                  setAmount(String(newValue));
                }}
                className="w-9 h-10 shrink-0 flex items-center justify-center text-white"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <div className="w-px h-4 bg-white/25 rounded-full self-center shrink-0" />
              {/* Amount Display - кликабельное поле */}
              <div 
                className="flex-1 px-2 py-2 text-white text-center text-sm font-medium cursor-pointer hover:bg-white/5 transition-colors flex items-center justify-center min-w-0"
                onClick={() => setShowAmountModal(true)}
              >
                <span>{Number.parseFloat(amount || '100').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="w-px h-4 bg-white/25 rounded-full self-center shrink-0" />
              {/* Plus Button */}
              <button
                type="button"
                onClick={() => {
                  const current = Number.parseFloat(amount || '100');
                  const newValue = current + 10;
                  setAmount(String(newValue));
                }}
                className="w-9 h-10 shrink-0 flex items-center justify-center text-white"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Amount Calculator Modal */}
            {showAmountModal && (
              <>
                <div 
                  className="fixed inset-0 z-40"
                  onClick={() => setShowAmountModal(false)}
                />
                <div 
                  className="absolute right-full mr-2 top-0 z-50 w-48 bg-[#1a2438] rounded-lg shadow-xl overflow-hidden p-3 border border-white/5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <AmountCalculatorModal
                    currentAmount={Number.parseFloat(amount || '100')}
                    onSelect={(newAmount) => {
                      setAmount(String(newAmount));
                      setShowAmountModal(false);
                    }}
                    onClose={() => setShowAmountModal(false)}
                    payoutPercent={payoutPercent}
                  />
              </div>
            </>
            )}
          </div>
          </div>

          {/* 🔥 FLOW I-PAYOUT: Доходность и потенциальный выигрыш */}
          <div className="flex flex-row md:flex-col gap-2 md:gap-1.5 items-center justify-center py-2 md:py-3">
            <div className="text-xl md:text-2xl font-bold text-green-400">
              +{payoutPercent}%
            </div>
            <div className="text-sm md:text-base text-gray-400">
              +{((Number.parseFloat(amount || '100') * payoutPercent) / 100).toFixed(2)} UAH
            </div>
          </div>

          {/* Buttons — на мобилке в ряд */}
          <div className="flex flex-row md:flex-col gap-2 md:gap-2.5">
            {/* Купить */}
            <button
              className="flex-1 md:flex-none w-full py-3 md:py-3.5 px-3 md:px-4 text-white font-semibold text-sm md:text-base rounded-lg transition-all flex items-center justify-center tracking-wide shadow-lg shadow-green-500/20"
              style={{ background: 'linear-gradient(135deg, #4fc63f 0%, #45b833 50%, #3aa028 100%)' }}
              onMouseEnter={() => {
                candleChartRef.current?.setHoverAction('CALL');
                lineChartRef.current?.setHoverAction('CALL');
              }}
              onMouseLeave={() => {
                candleChartRef.current?.setHoverAction(null);
                lineChartRef.current?.setHoverAction(null);
              }}
              onClick={async () => {
                try {
                  const accountId = await getActiveAccountId();
                  if (!accountId) {
                    alert('Нет доступного счёта');
                    return;
                  }
                  const amountNum = parseFloat(amount.replace(',', '.'));
                  if (!Number.isFinite(amountNum) || amountNum <= 0) {
                    alert('Введите корректную сумму');
                    return;
                  }
                  let expiration = parseInt(time, 10);
                  if (!Number.isFinite(expiration)) expiration = 60;
                  expiration = Math.min(300, Math.max(5, expiration));
                  // кратность 5 секунд, как в схеме бэкенда
                  expiration = Math.round(expiration / 5) * 5;

                  const res = await api<{
                    trade: {
                      id: string;
                      direction: 'CALL' | 'PUT';
                      amount: string;
                      entryPrice: string;
                      openedAt: string;
                      expiresAt: string;
                    };
                  }>('/api/trades/open', {
                    method: 'POST',
                    body: JSON.stringify({
                      accountId,
                      direction: 'CALL',
                      amount: amountNum,
                      expirationSeconds: expiration,
                      instrument: instrument, // ✅ Передаем текущий инструмент
                    }),
                  });

                  // FLOW T-OVERLAY: сразу добавляем overlay по Trade DTO
                  candleChartRef.current?.addTradeOverlayFromDTO(res.trade);
                  lineChartRef.current?.addTradeOverlayFromDTO(res.trade);
                  
                  // 🔥 FLOW A-ACCOUNT: Баланс обновится автоматически через WebSocket
                } catch (e: any) {
                  alert(`Ошибка открытия сделки: ${e?.message ?? 'unknown error'}`);
                }
              }}
            >
              Купить
            </button>

            {/* Продать */}
            <button
              className="flex-1 md:flex-none w-full py-3 md:py-3.5 px-3 md:px-4 text-white font-semibold text-sm md:text-base rounded-lg transition-all flex items-center justify-center tracking-wide shadow-lg shadow-red-500/20"
              style={{ background: 'linear-gradient(135deg, #ff5d3f 0%, #ff3d1f 50%, #e63515 100%)' }}
              onMouseEnter={() => {
                candleChartRef.current?.setHoverAction('PUT');
                lineChartRef.current?.setHoverAction('PUT');
              }}
              onMouseLeave={() => {
                candleChartRef.current?.setHoverAction(null);
                lineChartRef.current?.setHoverAction(null);
              }}
              onClick={async () => {
                try {
                  const accountId = await getActiveAccountId();
                  if (!accountId) {
                    alert('Нет доступного счёта');
                    return;
                  }
                  const amountNum = parseFloat(amount.replace(',', '.'));
                  if (!Number.isFinite(amountNum) || amountNum <= 0) {
                    alert('Введите корректную сумму');
                    return;
                  }
                  let expiration = parseInt(time, 10);
                  if (!Number.isFinite(expiration)) expiration = 60;
                  expiration = Math.min(300, Math.max(5, expiration));
                  expiration = Math.round(expiration / 5) * 5;

                  const res = await api<{
                    trade: {
                      id: string;
                      direction: 'CALL' | 'PUT';
                      amount: string;
                      entryPrice: string;
                      openedAt: string;
                      expiresAt: string;
                    };
                  }>('/api/trades/open', {
                    method: 'POST',
                    body: JSON.stringify({
                      accountId,
                      direction: 'PUT',
                      amount: amountNum,
                      expirationSeconds: expiration,
                      instrument: instrument, // ✅ Передаем текущий инструмент
                    }),
                  });

                  // FLOW T-OVERLAY: сразу добавляем overlay по Trade DTO
                  candleChartRef.current?.addTradeOverlayFromDTO(res.trade);
                  lineChartRef.current?.addTradeOverlayFromDTO(res.trade);
                  
                  // 🔥 FLOW A-ACCOUNT: Баланс обновится автоматически через WebSocket
                } catch (e: any) {
                  alert(`Ошибка открытия сделки: ${e?.message ?? 'unknown error'}`);
                }
              }}
            >
              Продать
            </button>
          </div>

          {/* Совет от трейдера + кнопки внизу сайдбара — скрыто на мобилке */}
          <div className="hidden md:flex mt-auto flex-col gap-3">
          <div className="rounded-lg bg-white/10 p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <Image
                src="/images/44.jpg"
                alt="Трейдер"
                width={32}
                height={32}
                className="w-8 h-8 rounded-full object-cover shrink-0"
              />
              <div className="text-xs font-semibold text-white">Совет от трейдера</div>
            </div>
            <p className="text-[11px] font-medium text-gray-400 leading-relaxed">
              Не рискуйте суммой больше той, которую готовы потерять. Фиксируйте прибыль по частям и не держите одну сделку «до упора».
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSoundEnabled((v) => !v)}
              className="flex-1 h-8 flex items-center justify-center rounded-lg bg-gradient-to-b from-[#24304d] to-[#1f2a45] text-gray-300 hover:text-white hover:opacity-90 transition-colors relative"
              title={soundEnabled ? 'Выключить звук' : 'Включить звук'}
            >
              <span className="relative inline-block">
                <Image src="/images/sound.png" alt="Звук" width={20} height={20} className="w-4 h-4 object-contain" />
                {!soundEnabled && (
                  <span
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    aria-hidden
                  >
                    <span className="w-[130%] h-0.5 bg-red-400/90 rotate-[-45deg] rounded-full" />
                  </span>
                )}
              </span>
            </button>
            <button
              type="button"
              onClick={toggleFullscreen}
              className="flex-1 h-8 flex items-center justify-center rounded-lg bg-gradient-to-b from-[#24304d] to-[#1f2a45] text-gray-300 hover:text-white hover:opacity-90 transition-colors"
              title={isFullscreen ? 'Выйти из полноэкранного режима' : 'Полноэкранный режим'}
            >
              <Image src="/images/fullscreen.png" alt="Fullscreen" width={20} height={20} className="w-4 h-4 object-contain" />
            </button>
            <button
              type="button"
              onClick={() => setShowChartSettingsModal(true)}
              className="flex-1 h-8 flex items-center justify-center rounded-lg bg-gradient-to-b from-[#24304d] to-[#1f2a45] text-gray-300 hover:text-white hover:opacity-90 transition-colors"
              title="Настройки графика"
            >
              <Image src="/images/settings.png" alt="Настройки" width={20} height={20} className="w-4 h-4 object-contain" />
            </button>
          </div>
          </div>
        </aside>

      </div>

      {/* Нижняя навигация — только на мобилке (кнопки слева перенесены вниз) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around py-2 px-2 bg-[#05122a] border-t border-white/10">
        <button
          onClick={() => setShowTradesHistory((prev) => !prev)}
          className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg min-w-[56px] transition-colors ${
            showTradesHistory ? 'text-[#7b8fff] bg-[#3347ff]/15' : 'text-white/50 hover:text-white/80 hover:bg-white/5'
          }`}
        >
          <History className="w-5 h-5 stroke-[3]" />
          <span className="text-[9px] font-semibold leading-tight">История</span>
        </button>
        <button
          onClick={() => setShowNews(true)}
          className="flex flex-col items-center gap-1 px-2 py-2 rounded-lg min-w-[56px] text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors"
        >
          <Newspaper className="w-5 h-5 stroke-[3]" />
          <span className="text-[9px] font-semibold leading-tight">Новости</span>
        </button>
        <Link
          href="/profile?tab=wallet"
          className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg min-w-[56px] transition-colors ${
            activeMenu === 'кошелек' ? 'text-[#7b8fff] bg-[#3347ff]/15' : 'text-white/50 hover:text-white/80 hover:bg-white/5'
          }`}
        >
          <Wallet className="w-5 h-5 stroke-[3]" />
          <span className="text-[9px] font-semibold leading-tight">Кошелёк</span>
        </Link>
        <Link
          href="/profile"
          className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg min-w-[56px] transition-colors ${
            activeMenu === 'личный-профиль' ? 'text-[#7b8fff] bg-[#3347ff]/15' : 'text-white/50 hover:text-white/80 hover:bg-white/5'
          }`}
        >
          <UserCircle className="w-5 h-5 stroke-[3]" />
          <span className="text-[9px] font-semibold leading-tight">Профиль</span>
        </Link>
        <a
          href="https://t.me/your_support_channel"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center gap-1 px-2 py-2 rounded-lg min-w-[56px] text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors"
        >
          <Image src="/images/support.png" alt="Поддержка" width={20} height={20} className="w-5 h-5 object-contain" />
          <span className="text-[9px] font-semibold leading-tight">Поддержка</span>
        </a>
      </nav>

      {/* Chart Settings Modal */}
      {showChartSettingsModal && (
        <ChartSettingsModal onClose={() => setShowChartSettingsModal(false)} />
      )}

      {/* News Modal */}
      {showNews && (
        <NewsModal onClose={() => setShowNews(false)} />
      )}
    </div>
  </AuthGuard>
  );
}

const TRADES_PAGE_SIZE = 25;

// Модалка истории сделок
function TradesHistoryModal({ onClose }: { onClose: () => void }) {
  const [filter, setFilter] = useState<'active' | 'closed'>('closed');
  const [expandedTradeId, setExpandedTradeId] = useState<string | null>(null);
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tradesCountRef = useRef<number>(0);
  tradesCountRef.current = trades.length;

  const loadTrades = useCallback(async (offset: number, append: boolean) => {
    const status = filter === 'active' ? 'open' : 'closed';
    try {
      if (offset === 0) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      const response = await api<{ trades: any[]; hasMore: boolean }>(
        `/api/trades?limit=${TRADES_PAGE_SIZE}&offset=${offset}&status=${status}`
      );
      const newTrades = response.trades || [];
      setTrades((prev) => (append ? [...prev, ...newTrades] : newTrades));
      setHasMore(response.hasMore ?? false);
    } catch (error) {
      console.error('Failed to fetch trades:', error);
      if (!append) setTrades([]);
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filter]);

  useEffect(() => {
    setTrades([]);
    setHasMore(true);
    loadTrades(0, false);
  }, [loadTrades]);

  // Обновляем время каждую секунду для активных сделок
  useEffect(() => {
    if (filter === 'active') {
      const interval = setInterval(() => {
        setCurrentTime(new Date());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [filter]);

  // Обработка скролла: показ скроллбара + подгрузка при прокрутке вниз
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      setIsScrolling(true);
      scrollContainer.classList.add('scrolling');
      
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
        scrollContainer.classList.remove('scrolling');
      }, 1000);

      // Подгрузка при приближении к низу (за 100px до конца)
      if (!loading && !loadingMore && hasMore) {
        const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
        if (scrollHeight - scrollTop - clientHeight < 100) {
          loadTrades(tradesCountRef.current, true);
        }
      }
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [loading, loadingMore, hasMore, loadTrades]);

  // API возвращает уже отфильтрованные и отсортированные сделки
  const sortedTrades = trades;

  // Группируем по дате открытия, заголовок в формате "02 02 26" (DD MM YY)
  const getDateKey = (dateStr: string) => {
    const d = new Date(dateStr);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const formatDateDisplay = (dateKey: string) => {
    const [y, m, d] = dateKey.split('-');
    return `${d}.${m}.${y!.slice(-2)}`;
  };
  const groupedByDate = sortedTrades.reduce<Record<string, typeof sortedTrades>>((acc, trade) => {
    const dateStr = trade.openedAt || trade.closedAt || '';
    const key = getDateKey(dateStr);
    if (!acc[key]) acc[key] = [];
    acc[key].push(trade);
    return acc;
  }, {});
  const dateKeys = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  return (
    <div
      className="fixed left-0 md:left-[88px] top-[65px] z-50 h-[calc(100vh-65px)] w-full md:w-[340px] bg-[#0a1635] border-r border-white/10 shadow-2xl flex flex-col"
    >
        {/* Filter Tabs */}
        <div className="px-5 pt-3 shrink-0 border-b border-white/10">
          <div className="flex">
            <button
              type="button"
              onClick={() => setFilter('active')}
              className={`flex-1 pb-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                filter === 'active'
                  ? 'text-white border-[#3347ff]'
                  : 'text-gray-400 border-transparent hover:text-white'
              }`}
            >
              Активные
            </button>
            <button
              type="button"
              onClick={() => setFilter('closed')}
              className={`flex-1 pb-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                filter === 'closed'
                  ? 'text-white border-[#3347ff]'
                  : 'text-gray-400 border-transparent hover:text-white'
              }`}
            >
              Закрытые
            </button>
          </div>
        </div>

        {/* Content */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-5 scrollbar-hide-on-idle"
        >
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-400">Загрузка...</div>
            </div>
          ) : sortedTrades.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-400 text-sm">
                {filter === 'active' ? 'Нет активных сделок' : 'Нет закрытых сделок'}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {dateKeys.map((dateKey) => (
                <div key={dateKey} className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 py-1">
                    <span className="flex-1 h-px bg-white/20" />
                    <span className="text-xs text-gray-400 shrink-0">{formatDateDisplay(dateKey)}</span>
                    <span className="flex-1 h-px bg-white/20" />
                  </div>
                  {groupedByDate[dateKey].map((trade) => (
                    <TradeCard
                      key={trade.id}
                      trade={trade}
                      currentTime={currentTime}
                      isExpanded={expandedTradeId === trade.id}
                      onToggle={() => setExpandedTradeId((id) => (id === trade.id ? null : trade.id))}
                    />
                  ))}
                </div>
              ))}
              {loadingMore && (
                <div className="flex justify-center py-3">
                  <div className="text-xs text-gray-400">Загрузка...</div>
                </div>
              )}
            </div>
          )}
        </div>
    </div>
  );
}

// Модалка новостей
function NewsModal({ onClose }: { onClose: () => void }) {
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Обработка скролла для показа скроллбара
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      setIsScrolling(true);
      scrollContainer.classList.add('scrolling');
      
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
        scrollContainer.classList.remove('scrolling');
      }, 1000);
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Dummy данные новостей
  const newsItems = [
    {
      id: '1',
      title: 'Рынок EUR/USD демонстрирует рост на фоне позитивных данных по инфляции',
      date: '2026-02-01T10:30:00Z',
      category: 'Форекс',
      excerpt: 'Европейская валюта укрепилась после публикации данных по инфляции в еврозоне, которые оказались лучше ожиданий аналитиков.',
    },
    {
      id: '2',
      title: 'Bitcoin достиг нового максимума: эксперты прогнозируют дальнейший рост',
      date: '2026-02-01T09:15:00Z',
      category: 'Криптовалюты',
      excerpt: 'Крупнейшая криптовалюта продолжает показывать впечатляющие результаты, привлекая внимание институциональных инвесторов.',
    },
    {
      id: '3',
      title: 'ФРС сохраняет текущую процентную ставку: влияние на валютные пары',
      date: '2026-02-01T08:00:00Z',
      category: 'Экономика',
      excerpt: 'Решение Федеральной резервной системы США оказало значительное влияние на динамику основных валютных пар.',
    },
    {
      id: '4',
      title: 'Нефть Brent: анализ технических уровней и прогнозы на неделю',
      date: '2026-01-31T16:45:00Z',
      category: 'Товары',
      excerpt: 'Аналитики рассматривают ключевые уровни поддержки и сопротивления для нефти марки Brent.',
    },
    {
      id: '5',
      title: 'Золото: безопасная гавань в условиях геополитической неопределенности',
      date: '2026-01-31T14:20:00Z',
      category: 'Товары',
      excerpt: 'Цены на золото продолжают расти на фоне усиления геополитической напряженности.',
    },
    {
      id: '6',
      title: 'GBP/USD: влияние Brexit на волатильность валютной пары',
      date: '2026-01-31T12:10:00Z',
      category: 'Форекс',
      excerpt: 'Британский фунт демонстрирует повышенную волатильность в связи с новыми переговорами по Brexit.',
    },
    {
      id: '7',
      title: 'Технический анализ: ключевые паттерны на графике USD/JPY',
      date: '2026-01-31T10:30:00Z',
      category: 'Анализ',
      excerpt: 'Эксперты выделяют важные технические уровни и паттерны для торговой пары USD/JPY.',
    },
    {
      id: '8',
      title: 'Криптовалютный рынок: обзор альткоинов и их потенциала роста',
      date: '2026-01-31T08:15:00Z',
      category: 'Криптовалюты',
      excerpt: 'Анализ перспективных альткоинов и их потенциала для инвестиций в текущем рыночном цикле.',
    },
  ];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day}.${month} ${hours}:${minutes}`;
  };

  return (
    <div
      className="fixed left-0 md:left-[88px] top-[65px] z-50 h-[calc(100vh-65px)] w-full md:w-[340px] bg-[#0a1635] border-r border-white/10 shadow-2xl flex flex-col"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-xl font-bold text-white">Новости</h2>
          <p className="text-xs text-gray-400 mt-0.5">Актуальные события финансового рынка</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          title="Закрыть"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-5 scrollbar-hide-on-idle"
      >
        <div className="flex flex-col gap-4">
          {newsItems.map((news) => (
            <NewsCard key={news.id} news={news} formatDate={formatDate} />
          ))}
        </div>
      </div>
    </div>
  );
}

// Компонент карточки новости
function NewsCard({ news, formatDate }: { news: any; formatDate: (date: string) => string }) {
  return (
    <div className="bg-[#1A253A] rounded-lg p-4 flex flex-col gap-3 hover:bg-[#1f2d47] transition-colors cursor-pointer">
      {/* Категория и дата */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[#3347ff]">{news.category}</span>
        <span className="text-xs text-gray-400">{formatDate(news.date)}</span>
      </div>

      {/* Заголовок */}
      <h3 className="text-sm font-semibold text-white leading-tight">{news.title}</h3>

      {/* Краткое описание */}
      <p className="text-xs text-gray-300 leading-relaxed">{news.excerpt}</p>
    </div>
  );
}

// Компонент карточки сделки
function TradeCard({
  trade,
  currentTime,
  isExpanded,
  onToggle,
}: {
  trade: any;
  currentTime?: Date;
  isExpanded?: boolean;
  onToggle?: () => void;
}) {
  const instrumentInfo = getInstrumentInfo(trade.instrument);
  const amount = parseFloat(trade.amount);
  const payout = parseFloat(trade.payout);
  const payoutAmount = amount * payout;
  const isWin = trade.status === 'WIN';
  const isLoss = trade.status === 'LOSS';
  const isOpen = trade.status === 'OPEN';
  const entryPrice = trade.entryPrice ? parseFloat(String(trade.entryPrice)) : null;
  const exitPrice = trade.exitPrice ? parseFloat(String(trade.exitPrice)) : null;

  // Форматируем время
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  // Для активных сделок показываем время до истечения
  const getTimeDisplay = () => {
    if (isOpen) {
      const expiresAt = new Date(trade.expiresAt);
      const now = currentTime || new Date();
      const diffMs = expiresAt.getTime() - now.getTime();
      if (diffMs > 0) {
        const totalSeconds = Math.floor(diffMs / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }
      return '00:00:00';
    }
    return formatTime(trade.closedAt || trade.openedAt);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onToggle?.()}
      className="bg-[#1f2a45] rounded-lg p-4 flex flex-col gap-3 cursor-pointer transition-all hover:bg-[#1f2a45]/90"
    >
      {/* Первая строка: Инструмент и время */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Флаги валютной пары */}
          {(() => {
            const displayName = instrumentInfo?.displayName || trade.instrument;
            const pair = displayName.split(' ')[0]; // Берем только валютную пару без "OTC" или "Real"
            const [country1, country2] = getCurrencyCountryCodes(pair);
            return (
              <div className="flex items-center">
                {country1 && (
                  <div className="w-5 h-5 rounded-full overflow-hidden border border-white/60 flex-shrink-0 flex items-center justify-center relative z-0">
                    <ReactCountryFlag
                      countryCode={country1}
                      svg
                      style={{
                        width: '20px',
                        height: '20px',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                      title={country1}
                    />
                  </div>
                )}
                {country2 && (
                  <div className="w-5 h-5 rounded-full overflow-hidden border border-white/60 flex-shrink-0 flex items-center justify-center relative z-10 -ml-2.5">
                    <ReactCountryFlag
                      countryCode={country2}
                      svg
                      style={{
                        width: '20px',
                        height: '20px',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                      title={country2}
                    />
                  </div>
                )}
              </div>
            );
          })()}
          <span className="text-sm text-white font-medium">
            {instrumentInfo?.displayName || trade.instrument} {instrumentInfo?.isOTC ? 'OTC' : ''}
          </span>
        </div>
        <span className="text-sm text-gray-300 font-mono">{getTimeDisplay()}</span>
      </div>

      {/* Вторая строка: Процент и сумма */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-300">{Math.round(payout * 100)}%</span>
        <span className="text-sm text-white">-{amount.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false })}</span>
      </div>

      {/* Разделитель */}
      <div className="h-px bg-[#3B4657]" />

      {/* Итоговая строка: Сумма и направление */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-white">
          {isOpen ? '0.00' : (isWin ? payoutAmount.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false }) : '0.00')} UAH
        </span>
        <div className="flex items-center gap-1">
          {trade.direction === 'CALL' ? (
            <ArrowUp className="w-4 h-4 text-green-400" />
          ) : (
            <ArrowDown className="w-4 h-4 text-red-400" />
          )}
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      {/* Раскрывающаяся детальная информация */}
      {isExpanded && (
        <div className="pt-3 mt-1 border-t border-white/10 flex flex-col gap-2">
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Точка входа</span>
            <span className="text-white font-medium">{entryPrice?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 5 }) ?? '—'}</span>
          </div>
          {!isOpen && (
            <>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Точка выхода</span>
                <span className="text-white font-medium">{exitPrice?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 5 }) ?? '—'}</span>
              </div>
              {entryPrice != null && exitPrice != null && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Разница пунктов</span>
                  <span className={`font-medium ${exitPrice >= entryPrice ? 'text-green-400' : 'text-red-400'}`}>
                    {exitPrice >= entryPrice ? '+' : ''}{(exitPrice - entryPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 5 })}
                  </span>
                </div>
              )}
            </>
          )}
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Доходность</span>
            <span className="text-white">{Math.round(payout * 100)}%</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Сумма</span>
            <span className="text-white">{amount.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Направление</span>
            <span className={trade.direction === 'CALL' ? 'text-green-400' : 'text-red-400'}>
              {trade.direction === 'CALL' ? 'Вверх' : 'Вниз'}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Открыта</span>
            <span className="text-white">{trade.openedAt ? new Date(trade.openedAt).toLocaleString('ru-RU') : '—'}</span>
          </div>
          {!isOpen && trade.closedAt && (
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Закрыта</span>
              <span className="text-white">{new Date(trade.closedAt).toLocaleString('ru-RU')}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Получает коды стран для валютной пары (ISO 3166-1 alpha-2)
 * Возвращает массив из двух кодов стран
 */
function getCurrencyCountryCodes(pair: string): [string | null, string | null] {
  // Извлекаем валюты из пары (например, "EUR/USD" -> ["EUR", "USD"])
  const parts = pair.split('/');
  if (parts.length !== 2) return [null, null];
  
  const [base, quote] = parts;
  
  // Маппинг валют на коды стран (ISO 3166-1 alpha-2)
  const currencyToCountry: Record<string, string> = {
    'EUR': 'EU', // Европейский союз
    'USD': 'US', // США
    'GBP': 'GB', // Великобритания
    'JPY': 'JP', // Япония
    'AUD': 'AU', // Австралия
    'CAD': 'CA', // Канада
    'CHF': 'CH', // Швейцария
    'NZD': 'NZ', // Новая Зеландия
    'NOK': 'NO', // Норвегия
    'UAH': 'UA', // Украина
    'BTC': 'US', // Bitcoin (используем США как условный)
    'ETH': 'US', // Ethereum (используем США как условный)
    'SOL': 'US', // Solana (используем США как условный)
    'BNB': 'US', // BNB (используем США как условный)
  };
  
  return [
    currencyToCountry[base] || null,
    currencyToCountry[quote] || null,
  ];
}

// Вспомогательная функция для получения информации об инструменте
function getInstrumentInfo(instrument: string): { displayName: string; isOTC?: boolean } | null {
  // Используем данные из INSTRUMENTS
  const instrumentData = getInstrumentOrDefault(instrument);
  const label = instrumentData.label;
  
  // Извлекаем displayName из label (убираем " OTC" или " Real")
  const displayName = label.replace(' OTC', '').replace(' Real', '');
  const upperInstrument = instrument.toUpperCase();
  
  return { 
    displayName, 
    isOTC: !upperInstrument.includes('_REAL') 
  };
}

// Компонент модалки настроек графика
function ChartSettingsModal({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = useState<ChartSettings>(() => loadChartSettings());
  const [backgroundImageFile, setBackgroundImageFile] = useState<File | null>(null);
  const [backgroundImagePreview, setBackgroundImagePreview] = useState<string | null>(settings.backgroundImage);

  // Обработка загрузки фонового изображения
  const handleBackgroundImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        setBackgroundImageFile(file);
        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string;
          setBackgroundImagePreview(dataUrl);
          setSettings(prev => ({ ...prev, backgroundImage: dataUrl }));
        };
        reader.readAsDataURL(file);
      } else {
        alert('Пожалуйста, выберите файл изображения');
      }
    }
  };

  // Удаление фонового изображения
  const handleRemoveBackgroundImage = () => {
    setBackgroundImageFile(null);
    setBackgroundImagePreview(null);
    setSettings(prev => ({ ...prev, backgroundImage: null }));
  };

  // Сохранение настроек
  const handleSave = () => {
    saveChartSettings(settings);
    // Перезагружаем страницу для применения настроек
    window.location.reload();
  };

  // Сброс к значениям по умолчанию
  const handleReset = () => {
    const defaultSettings: ChartSettings = {
      bullishColor: '#45b833',
      bearishColor: '#ff3d1f',
      backgroundImage: null,
      backgroundOpacity: 0.3,
      showCountdown: true,
      showGrid: true,
      timezoneOffset: 2,
    };
    setSettings(defaultSettings);
    setBackgroundImagePreview(null);
    setBackgroundImageFile(null);
    saveChartSettings(defaultSettings);
    window.location.reload();
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-gradient-to-b from-[#24304d] to-[#1f2a45] rounded-xl shadow-2xl w-full max-w-[400px] overflow-hidden border border-white/5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Настройки графика</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-5 max-h-[65vh] overflow-y-auto">
          {/* Цвета свечей */}
          <div>
            <h3 className="text-xs font-medium text-gray-300 mb-3">Цвета свечей</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-20">Бычья</span>
                <input
                  type="color"
                  value={settings.bullishColor}
                  onChange={(e) => setSettings(prev => ({ ...prev, bullishColor: e.target.value }))}
                  className="w-10 h-8 rounded-lg cursor-pointer border-0 bg-transparent p-0"
                />
                <input
                  type="text"
                  value={settings.bullishColor}
                  onChange={(e) => setSettings(prev => ({ ...prev, bullishColor: e.target.value }))}
                  className="flex-1 px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white text-xs focus:outline-none focus:ring-1 focus:ring-[#3347ff] focus:border-[#3347ff]"
                />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-20">Медвежья</span>
                <input
                  type="color"
                  value={settings.bearishColor}
                  onChange={(e) => setSettings(prev => ({ ...prev, bearishColor: e.target.value }))}
                  className="w-10 h-8 rounded-lg cursor-pointer border-0 bg-transparent p-0"
                />
                <input
                  type="text"
                  value={settings.bearishColor}
                  onChange={(e) => setSettings(prev => ({ ...prev, bearishColor: e.target.value }))}
                  className="flex-1 px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white text-xs focus:outline-none focus:ring-1 focus:ring-[#3347ff] focus:border-[#3347ff]"
                />
              </div>
            </div>
          </div>

          {/* Фоновое изображение */}
          <div>
            <h3 className="text-xs font-medium text-gray-300 mb-3">Фоновое изображение</h3>
            <div className="flex items-center gap-3">
              <label className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBackgroundImageChange}
                  className="hidden"
                />
                <span className="block px-4 py-2.5 rounded-lg bg-white/10 text-xs text-gray-300 hover:bg-white/15 cursor-pointer text-center border border-white/5 transition-colors">
                  {backgroundImagePreview ? 'Сменить изображение' : 'Загрузить изображение'}
                </span>
              </label>
              {backgroundImagePreview && (
                <button
                  type="button"
                  onClick={handleRemoveBackgroundImage}
                  className="px-3 py-2.5 rounded-lg bg-red-500/20 text-red-400 text-xs hover:bg-red-500/30 transition-colors"
                >
                  Удалить
                </button>
              )}
            </div>
            {backgroundImagePreview && (
              <div className="mt-3 flex items-center gap-3">
                <img src={backgroundImagePreview} alt="" className="w-16 h-12 object-cover rounded-lg shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-400 mb-1">Прозрачность {Math.round(settings.backgroundOpacity * 100)}%</div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={settings.backgroundOpacity}
                    onChange={(e) => setSettings(prev => ({ ...prev, backgroundOpacity: parseFloat(e.target.value) }))}
                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#3347ff]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Отображение */}
          <div>
            <h3 className="text-xs font-medium text-gray-300 mb-3">Отображение</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-white/5 hover:bg-white/8 transition-colors">
                <span className="text-xs text-gray-300">Таймер и отсчёт до закрытия свечи</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.showCountdown}
                  onClick={() => setSettings(prev => ({ ...prev, showCountdown: !prev.showCountdown }))}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${
                    settings.showCountdown ? 'bg-[#3347ff]' : 'bg-white/20'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      settings.showCountdown ? 'translate-x-6 left-0.5' : 'translate-x-0 left-0.5'
                    }`}
                  />
                </button>
              </div>
              <div className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-white/5 hover:bg-white/8 transition-colors">
                <span className="text-xs text-gray-300">Сетка на графике</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.showGrid}
                  onClick={() => setSettings(prev => ({ ...prev, showGrid: !prev.showGrid }))}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${
                    settings.showGrid ? 'bg-[#3347ff]' : 'bg-white/20'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      settings.showGrid ? 'translate-x-6 left-0.5' : 'translate-x-0 left-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Часовой пояс */}
          <div>
            <h3 className="text-xs font-medium text-gray-300 mb-3">
              Часовой пояс — UTC{settings.timezoneOffset >= 0 ? '+' : ''}{settings.timezoneOffset}
            </h3>
            <input
              type="range"
              min="-12"
              max="14"
              step="1"
              value={settings.timezoneOffset}
              onChange={(e) => setSettings(prev => ({ ...prev, timezoneOffset: parseInt(e.target.value) }))}
              className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#3347ff]"
            />
            <div className="flex justify-between text-[10px] text-gray-500 mt-1">
              <span>UTC-12</span>
              <span>UTC+14</span>
            </div>
          </div>
        </div>

        <div className="px-4 py-3 border-t border-white/10 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 rounded-lg bg-white/10 text-xs text-gray-400 hover:text-white hover:bg-white/15 transition-colors"
          >
            Сбросить
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-white/10 text-xs text-gray-400 hover:text-white hover:bg-white/15 transition-colors"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 rounded-lg bg-[#3347ff] text-xs text-white font-medium hover:bg-[#3347ff]/90 transition-colors"
            >
              Сохранить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Компонент модалки выбора времени
function TimeSelectionModal({
  currentSeconds,
  onSelect,
  onClose,
}: {
  currentSeconds: number;
  onSelect: (seconds: number) => void;
  onClose: () => void;
}) {
  const { hours, minutes, secs } = secondsToTime(currentSeconds);
  const [timeHours, setTimeHours] = useState<string>(String(hours).padStart(2, '0'));
  const [timeMinutes, setTimeMinutes] = useState<string>(String(minutes).padStart(2, '0'));
  const [timeSeconds, setTimeSeconds] = useState<string>(String(secs).padStart(2, '0'));

  const adjustTime = (field: 'hours' | 'minutes' | 'seconds', delta: number) => {
    let h = Number.parseInt(timeHours || '0', 10);
    let m = Number.parseInt(timeMinutes || '0', 10);
    let s = Number.parseInt(timeSeconds || '0', 10);

    if (field === 'hours') {
      h = Math.max(0, Math.min(23, h + delta));
    } else if (field === 'minutes') {
      m = Math.max(0, Math.min(59, m + delta));
    } else {
      s = Math.max(0, Math.min(59, s + delta));
    }

    const newHours = String(h).padStart(2, '0');
    const newMinutes = String(m).padStart(2, '0');
    const newSecs = String(s).padStart(2, '0');
    
    setTimeHours(newHours);
    setTimeMinutes(newMinutes);
    setTimeSeconds(newSecs);
    
    const totalSeconds = timeToSeconds(h, m, s);
    onSelect(totalSeconds);
  };

  const presetTimes = [
    { label: 'S3', seconds: 3 },
    { label: 'S15', seconds: 15 },
    { label: 'S30', seconds: 30 },
    { label: 'M1', seconds: 60 },
    { label: 'M3', seconds: 180 },
    { label: 'M5', seconds: 300 },
    { label: 'M30', seconds: 1800 },
    { label: 'H1', seconds: 3600 },
    { label: 'H4', seconds: 14400 },
  ];

  return (
    <div className="flex flex-col gap-3">
      {/* Ручной ввод времени */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5 justify-center">
          {/* Часы */}
          <div className="flex flex-col items-center gap-0.5">
            <button
              type="button"
              onClick={() => adjustTime('hours', 1)}
              className="w-10 h-5 flex items-center justify-center text-white hover:bg-white/20 rounded transition-colors bg-white/10"
            >
              <Plus className="w-2.5 h-2.5" />
            </button>
            <div className="w-10 h-8 bg-white/10 rounded-lg text-white text-center text-xs flex items-center justify-center font-medium">
              {timeHours}
            </div>
            <button
              type="button"
              onClick={() => adjustTime('hours', -1)}
              className="w-10 h-5 flex items-center justify-center text-white hover:bg-white/20 rounded transition-colors bg-white/10"
            >
              <Minus className="w-2.5 h-2.5" />
            </button>
          </div>

          <span className="text-white text-base font-semibold px-0.5">:</span>

          {/* Минуты */}
          <div className="flex flex-col items-center gap-0.5">
            <button
              type="button"
              onClick={() => adjustTime('minutes', 1)}
              className="w-10 h-5 flex items-center justify-center text-white hover:bg-white/20 rounded transition-colors bg-white/10"
            >
              <Plus className="w-2.5 h-2.5" />
            </button>
            <div className="w-10 h-8 bg-white/10 rounded-lg text-white text-center text-xs flex items-center justify-center font-medium">
              {timeMinutes}
            </div>
            <button
              type="button"
              onClick={() => adjustTime('minutes', -1)}
              className="w-10 h-5 flex items-center justify-center text-white hover:bg-white/20 rounded transition-colors bg-white/10"
            >
              <Minus className="w-2.5 h-2.5" />
            </button>
          </div>

          <span className="text-white text-base font-semibold px-0.5">:</span>

          {/* Секунды */}
          <div className="flex flex-col items-center gap-0.5">
            <button
              type="button"
              onClick={() => adjustTime('seconds', 1)}
              className="w-10 h-5 flex items-center justify-center text-white hover:bg-white/20 rounded transition-colors bg-white/10"
            >
              <Plus className="w-2.5 h-2.5" />
            </button>
            <div className="w-10 h-8 bg-white/10 rounded-lg text-white text-center text-xs flex items-center justify-center font-medium">
              {timeSeconds}
            </div>
            <button
              type="button"
              onClick={() => adjustTime('seconds', -1)}
              className="w-10 h-5 flex items-center justify-center text-white hover:bg-white/20 rounded transition-colors bg-white/10"
            >
              <Minus className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Кнопки быстрого выбора */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] text-gray-400">Быстрый выбор</label>
        <div className="grid grid-cols-3 gap-1.5">
          {presetTimes.map((preset) => {
            const isSelected = currentSeconds === preset.seconds;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  onSelect(preset.seconds);
                  const newTime = secondsToTime(preset.seconds);
                  setTimeHours(String(newTime.hours).padStart(2, '0'));
                  setTimeMinutes(String(newTime.minutes).padStart(2, '0'));
                  setTimeSeconds(String(newTime.secs).padStart(2, '0'));
                }}
                className={`px-2 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${
                  isSelected
                    ? 'bg-[#3347ff] text-white border border-[#3347ff]'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Компонент модалки калькулятора суммы
function AmountCalculatorModal({
  currentAmount,
  onSelect,
  onClose,
  payoutPercent,
}: {
  currentAmount: number;
  onSelect: (amount: number) => void;
  onClose: () => void;
  payoutPercent: number;
}) {
  const [display, setDisplay] = useState<string>(String(currentAmount));
  const [multiplier] = useState<number>(2);
  const [isFirstInput, setIsFirstInput] = useState<boolean>(true);

  const handleNumber = (num: string) => {
    if (isFirstInput) {
      setDisplay(num);
      setIsFirstInput(false);
    } else if (display === '0' || display === '0.00') {
      setDisplay(num);
    } else {
      setDisplay(display + num);
    }
  };

  const handleDecimal = () => {
    if (isFirstInput) {
      setDisplay('0.');
      setIsFirstInput(false);
    } else if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  const handleBackspace = () => {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
    }
  };

  const handleMultiply = () => {
    const current = Number.parseFloat(display);
    const result = current * multiplier;
    setDisplay(String(result.toFixed(2)));
  };

  const handleDivide = () => {
    const current = Number.parseFloat(display);
    if (multiplier !== 0) {
      const result = current / multiplier;
      setDisplay(String(result.toFixed(2)));
    }
  };

  const handleApply = () => {
    const finalAmount = Number.parseFloat(display);
    if (finalAmount >= 1) {
      onSelect(finalAmount);
    }
  };

  const formatDisplay = (value: string): string => {
    const num = Number.parseFloat(value || '0');
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Display */}
      <div className="bg-white/10 rounded-lg px-2 py-1">
        <div className="text-right text-sm font-bold text-white">
          {formatDisplay(display)}
        </div>
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-0.5">
        <button
          type="button"
          onClick={() => handleNumber('7')}
          className="h-7 bg-white/10 hover:bg-white/20 rounded text-white text-xs font-medium transition-colors"
        >
          7
        </button>
        <button
          type="button"
          onClick={() => handleNumber('8')}
          className="h-7 bg-white/10 hover:bg-white/20 rounded text-white text-xs font-medium transition-colors"
        >
          8
        </button>
        <button
          type="button"
          onClick={() => handleNumber('9')}
          className="h-7 bg-white/10 hover:bg-white/20 rounded text-white text-xs font-medium transition-colors"
        >
          9
        </button>
        <button
          type="button"
          onClick={() => handleNumber('4')}
          className="h-7 bg-white/10 hover:bg-white/20 rounded text-white text-xs font-medium transition-colors"
        >
          4
        </button>
        <button
          type="button"
          onClick={() => handleNumber('5')}
          className="h-7 bg-white/10 hover:bg-white/20 rounded text-white text-xs font-medium transition-colors"
        >
          5
        </button>
        <button
          type="button"
          onClick={() => handleNumber('6')}
          className="h-7 bg-white/10 hover:bg-white/20 rounded text-white text-xs font-medium transition-colors"
        >
          6
        </button>
        <button
          type="button"
          onClick={() => handleNumber('1')}
          className="h-7 bg-white/10 hover:bg-white/20 rounded text-white text-xs font-medium transition-colors"
        >
          1
        </button>
        <button
          type="button"
          onClick={() => handleNumber('2')}
          className="h-7 bg-white/10 hover:bg-white/20 rounded text-white text-xs font-medium transition-colors"
        >
          2
        </button>
        <button
          type="button"
          onClick={() => handleNumber('3')}
          className="h-7 bg-white/10 hover:bg-white/20 rounded text-white text-xs font-medium transition-colors"
        >
          3
        </button>
        <button
          type="button"
          onClick={handleDecimal}
          className="h-7 bg-white/10 hover:bg-white/20 rounded text-white text-xs font-medium transition-colors"
        >
          .
        </button>
        <button
          type="button"
          onClick={() => handleNumber('0')}
          className="h-7 bg-white/10 hover:bg-white/20 rounded text-white text-xs font-medium transition-colors"
        >
          0
        </button>
        <button
          type="button"
          onClick={handleBackspace}
          className="h-7 bg-red-500/20 hover:bg-red-500/30 rounded text-red-400 hover:text-red-300 flex items-center justify-center text-lg font-medium transition-colors"
        >
          ⌫
        </button>
      </div>

      {/* Apply Button */}
      <button
        type="button"
        onClick={handleApply}
        className="w-full py-1 bg-[#3347ff] hover:bg-[#3347ff]/90 text-white text-xs font-semibold rounded transition-colors"
      >
        Применить
      </button>
    </div>
  );
}
