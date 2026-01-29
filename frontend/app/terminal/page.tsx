'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { History, Newspaper, TrendingUp, Wallet, PieChart, Users } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useTerminalSnapshot } from '@/lib/hooks/useTerminalSnapshot';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { ChartContainer } from '@/components/chart/ChartContainer';
import { IndicatorMenu } from '@/components/chart/IndicatorMenu';
import { DrawingMenu } from '@/components/chart/DrawingMenu';
import { OverlayPanel } from '@/components/chart/OverlayPanel';
import { useOverlayRegistry } from '@/components/chart/internal/overlay/useOverlayRegistry';
import { INSTRUMENTS, DEFAULT_INSTRUMENT_ID, getInstrumentOrDefault } from '@/lib/instruments';
import type { ChartType } from '@/components/chart/chart.types';
import type { CandleChartRef } from '@/components/chart/candle/CandleChart';
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

// 🔥 FLOW T1: Поддерживаемые таймфреймы
type Timeframe = '5s' | '10s' | '15s' | '30s' | '1m' | '2m' | '3m' | '5m' | '10m' | '15m' | '30m' | '1h' | '4h' | '1d';
const TIMEFRAMES: Timeframe[] = [
  '5s', '10s', '15s', '30s', '1m',
  '2m', '3m', '5m', '10m', '15m',
  '30m', '1h', '4h', '1d'
];

export default function TerminalPage() {
  const router = useRouter();
  const { logout } = useAuth();
  // FLOW P7: activeInstrument — один терминал один актив; смена = hard reset
  const [instrument, setInstrument] = useState<string>(DEFAULT_INSTRUMENT_ID);
  const activeInstrumentRef = useRef<string>(instrument);
  useEffect(() => {
    activeInstrumentRef.current = instrument;
  }, [instrument]);

  const [timeframe, setTimeframe] = useState<Timeframe>('5s');
  const { data, loading, error } = useTerminalSnapshot(instrument, timeframe);
  const [accountType, setAccountType] = useState<'demo' | 'real'>('demo');
  const [activeMenu, setActiveMenu] = useState<string>('торговля');
  const [time, setTime] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [candleMode, setCandleMode] = useState<CandleMode>('classic');
  const [indicatorConfigs, setIndicatorConfigs] = useState<IndicatorConfig[]>(() => 
    getAllIndicators() // Инициализируем все индикаторы как выключенные
  );
  const [drawingMode, setDrawingMode] = useState<'horizontal' | 'vertical' | 'trend' | 'rectangle' | 'fibonacci' | 'parallel-channel' | 'ray' | 'arrow' | null>(null);
  const [chartType, setChartType] = useState<ChartType>('candles');
  const [followMode, setFollowMode] = useState<boolean>(true);
  const candleChartRef = useRef<CandleChartRef | null>(null);
  // FLOW F8: показывать кнопку «Вернуться к текущим», когда пользователь уехал влево
  const [showReturnToLatest, setShowReturnToLatest] = useState<boolean>(false);

  // FLOW H1: Trades history modal state
  type TradeHistoryItem = {
    id: string;
    direction: 'CALL' | 'PUT';
    amount: string;
    entryPrice: string;
    exitPrice: string | null;
    status: 'OPEN' | 'WIN' | 'LOSS';
    openedAt: string;
    expiresAt: string;
    closedAt: string | null;
  };

  const [showTradesHistory, setShowTradesHistory] = useState<boolean>(false);
  const [tradesHistory, setTradesHistory] = useState<TradeHistoryItem[] | null>(null);
  const [tradesHistoryLoading, setTradesHistoryLoading] = useState<boolean>(false);
  const [tradesHistoryError, setTradesHistoryError] = useState<string | null>(null);

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
    timeframe: '5s',
    indicators: [],
    drawings: [],
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
    setInstrument(layout.instrument);
    setTimeframe(layout.timeframe as Timeframe);
    
    // 2. Восстанавливаем индикаторы
    const allIndicators = getAllIndicators();
    const restoredConfigs = allIndicators.map((indicator) => {
      const layoutIndicator = layout.indicators.find((li: { id: string }) => li.id === indicator.id);
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
        layout.drawings.forEach((layoutDrawing: TerminalLayout['drawings'][number]) => {
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
      applyLayout(savedLayout);
    } else {
      // Применяем дефолтный layout
      applyLayout(terminalLayoutRef.current);
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

  const fetchTradesHistory = async () => {
    try {
      setTradesHistoryLoading(true);
      setTradesHistoryError(null);
      const res = await api<{ trades: TradeHistoryItem[] }>('/api/trades');
      setTradesHistory(res.trades);
    } catch (e: any) {
      setTradesHistoryError(e?.message ?? 'Не удалось загрузить историю сделок');
    } finally {
      setTradesHistoryLoading(false);
    }
  };

  // Get balance from terminal data
  const balance = data?.activeAccount?.balance || '10.000';
  const currency = data?.activeAccount?.currency || 'USD';

  // Sync account type with terminal data
  useEffect(() => {
    if (data?.activeAccount?.type) {
      setAccountType(data.activeAccount.type);
    }
  }, [data?.activeAccount?.type]);

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

  // Handle candle mode change
  const handleCandleModeChange = (mode: CandleMode) => {
    setCandleMode(mode);
    candleChartRef.current?.setCandleMode(mode);
  };

  // Вспомогательная функция: выбрать ID активного счёта
  const getActiveAccountId = (): string | null => {
    if (!data) return null;
    // 1) если бэкенд уже отдал activeAccount — используем его
    if (data.activeAccount?.id) return data.activeAccount.id;
    // 2) пробуем найти активный счёт нужного типа
    const byTypeAndActive = data.accounts.find(
      (a) => a.isActive && a.type === accountType,
    );
    if (byTypeAndActive?.id) return byTypeAndActive.id;
    // 3) любой счёт нужного типа
    const byType = data.accounts.find((a) => a.type === accountType);
    if (byType?.id) return byType.id;
    // 4) fallback: первый счёт вообще
    return data.accounts[0]?.id ?? null;
  };

  // 🔥 FLOW F1: Handle follow mode toggle
  const handleFollowModeToggle = () => {
    const newFollowMode = !followMode;
    setFollowMode(newFollowMode);
    candleChartRef.current?.setFollowMode(newFollowMode);
  };

  const menuItems = [
    { id: 'история', label: 'История', icon: History },
    { id: 'новости', label: 'Новости', icon: Newspaper },
    { id: 'торговля', label: 'Торговля', icon: TrendingUp },
    { id: 'кошелек', label: 'Кошелек', icon: Wallet },
    { id: 'акции', label: 'Акции', icon: PieChart },
    { id: 'партнеры', label: 'Партнеры', icon: Users },
  ];

  return (
    <AuthGuard requireAuth>
      <div className="min-h-screen bg-[#061230] flex flex-col">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="px-6 py-4 flex items-center justify-between">
          {/* Left: Logo and Name */}
          <div className="flex items-center gap-3">
            <Image 
              src="/images/logo.png" 
              alt="ComforTrade" 
              width={40} 
              height={40} 
              className="h-10 w-auto object-contain" 
            />
            <span className="text-xl font-semibold text-white uppercase">ComforTrade</span>
          </div>

          {/* Right: Instrument Switcher (FLOW P7), Balance, Profile */}
          <div className="flex items-center gap-4">
            {/* FLOW P7: Instrument Switcher — выпадающий список (много пар) */}
            <div className="flex items-center gap-2">
              <label htmlFor="instrument-select" className="text-sm text-gray-400 shrink-0">
                Пара:
              </label>
              <select
                id="instrument-select"
                value={instrument}
                onChange={(e) => setInstrument(e.target.value)}
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm font-medium text-white cursor-pointer hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50 min-w-[140px]"
                title="Выбрать валютную пару"
              >
                {INSTRUMENTS.map((inst) => (
                  <option key={inst.id} value={inst.id} className="bg-[#061230] text-white">
                    {inst.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Balance with Account Type Switch */}
            <div className="flex items-center gap-3">
              {/* Account Type Toggle */}
              <div className="flex items-center bg-white/10 rounded-lg p-1">
                <button
                  onClick={() => setAccountType('demo')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    accountType === 'demo'
                      ? 'bg-[#3347ff] text-white'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  Демо
                </button>
                <button
                  onClick={() => setAccountType('real')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    accountType === 'real'
                      ? 'bg-[#3347ff] text-white'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  Реальный
                </button>
              </div>

              {/* Balance */}
              <div className="text-white">
                <span className="text-2xl font-bold">
                  {loading ? '...' : balance}
                </span>
                {!loading && <span className="text-sm text-gray-400 ml-2">{currency}</span>}
              </div>

              {/* Кнопка создания демо-счёта (если вдруг нет) */}
              <button
                type="button"
                className="ml-2 px-3 py-1.5 rounded-md text-xs font-medium bg-white/10 text-gray-200 hover:bg-white/20 transition-colors"
                onClick={async () => {
                  try {
                    const res = await api<{ account: { id: string; type: 'demo' | 'real'; balance: string } }>(
                      '/api/accounts/create',
                      {
                        method: 'POST',
                        body: JSON.stringify({ type: 'demo' }),
                      },
                    );
                    alert(
                      `Демо-счёт создан\n\nID: ${res.account.id}\nБаланс: ${res.account.balance} ${currency}`,
                    );
                    // Обновляем снапшот целиком, чтобы подтянуть новый счёт и баланс
                    window.location.reload();
                  } catch (e: any) {
                    alert(`Ошибка создания демо-счёта: ${e?.message ?? 'unknown error'}`);
                  }
                }}
              >
                Создать демо-счёт
              </button>
            </div>

            {/* Profile Icon */}
            <div className="relative">
              <div 
                onClick={() => setShowProfileModal(!showProfileModal)}
                className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center cursor-pointer hover:bg-white/30 transition-colors"
              >
                <svg 
                  className="w-6 h-6 text-white" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
                  />
                </svg>
              </div>

              {/* Profile Modal */}
              {showProfileModal && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowProfileModal(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-40 bg-[#061230] border border-white/20 rounded-lg shadow-lg z-50 overflow-hidden">
                    <Link
                      href="/profile"
                      onClick={() => setShowProfileModal(false)}
                      className="block w-full px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors text-left"
                    >
                      Профиль
                    </Link>
                    <Link
                      href="/profile?tab=wallet"
                      onClick={() => setShowProfileModal(false)}
                      className="block w-full px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors text-left border-t border-white/10"
                    >
                      Кошелёк
                    </Link>
                    <button
                      onClick={() => {
                        setShowProfileModal(false);
                        handleLogout();
                      }}
                      className="w-full px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors text-left border-t border-white/10"
                    >
                      Выйти
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area with Sidebar */}
      <div className="flex-1 flex min-h-0">
        {/* Left Sidebar */}
        <aside className="w-20 shrink-0 border-r border-white/10 flex flex-col items-center py-4 gap-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isTrade = item.id === 'торговля';
            const isActive = isTrade ? false : activeMenu === item.id;

            if (isTrade) {
              return (
                <Link
                  key={item.id}
                  href="/profile?tab=trade"
                  className="flex flex-col items-center gap-1.5 w-full py-3 px-2 rounded-lg transition-colors text-gray-400 hover:text-white hover:bg-white/5"
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{item.label}</span>
                </Link>
              );
            }

            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveMenu(item.id);
                  if (item.id === 'история') {
                    setShowTradesHistory(true);
                    if (!tradesHistory && !tradesHistoryLoading) {
                      void fetchTradesHistory();
                    }
                  }
                }}
                className={`flex flex-col items-center gap-1.5 w-full py-3 px-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-[#3347ff]/20 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          })}
        </aside>

        {/* Page Content */}
        <main className="flex-1 min-h-0 relative">
          {/* Chart Controls (поверх графика) */}
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-[#061230]/90 backdrop-blur-sm border border-white/20 rounded-lg p-1">
            {/* FLOW O4: Панель активных объектов — слева сверху, глаз / крест */}
            {overlayVersion >= 0 && overlayRegistry.getOverlays().length > 0 && (
              <>
                <OverlayPanel
                  overlays={overlayRegistry.getOverlays()}
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
                <div className="shrink-0 w-px self-stretch bg-white/20 min-h-[24px]" aria-hidden />
              </>
            )}
            {/* Chart Type Switch */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setChartType('candles')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  chartType === 'candles'
                    ? 'bg-[#3347ff] text-white'
                    : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`}
              >
                Свечи
              </button>
              <button
                onClick={() => setChartType('line')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  chartType === 'line'
                    ? 'bg-[#3347ff] text-white'
                    : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`}
              >
                Линия
              </button>
            </div>

            {/* Candle Chart Controls (только для свечного графика) */}
            {chartType === 'candles' && (
              <div className="ml-2 pl-2 border-l border-white/20">
                <button
                  onClick={() => handleCandleModeChange('classic')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    candleMode === 'classic'
                      ? 'bg-[#3347ff] text-white'
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  Classic
                </button>
                <button
                  onClick={() => handleCandleModeChange('heikin_ashi')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    candleMode === 'heikin_ashi'
                      ? 'bg-[#3347ff] text-white'
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  Heikin Ashi
                </button>
                <button
                  onClick={() => handleCandleModeChange('bars')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    candleMode === 'bars'
                      ? 'bg-[#3347ff] text-white'
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  Bars
                </button>
              </div>
            )}

            {/* Indicators Menu (для обоих типов графиков) */}
            <div className="ml-2 pl-2 border-l border-white/20">
              <IndicatorMenu
                indicatorConfigs={indicatorConfigs}
                onConfigChange={setIndicatorConfigs}
              />
            </div>

            {/* Drawing Tools — выпадающее меню (как у индикаторов) */}
            <div className="ml-2 pl-2 border-l border-white/20">
              <DrawingMenu
                drawingMode={drawingMode}
                onDrawingModeChange={setDrawingMode}
              />
            </div>

            {/* 🔥 FLOW T1: Timeframe Selector */}
            <div className="ml-2 pl-2 border-l border-white/20">
              <div className="grid grid-cols-5 gap-1">
                {TIMEFRAMES.map((tf) => {
                  // Форматируем отображение: 5s -> S5, 1m -> M1, 1h -> H1, 1d -> D1
                  const displayText = tf.replace(/(\d+)([smhd])/i, (_, num, unit) => {
                    const unitUpper = unit.toUpperCase();
                    return unitUpper === 'S' ? `S${num}` : unitUpper === 'M' ? `M${num}` : unitUpper === 'H' ? `H${num}` : `D${num}`;
                  });
                  return (
                    <button
                      key={tf}
                      onClick={() => setTimeframe(tf)}
                      className={`px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        timeframe === tf
                          ? 'bg-[#3347ff] text-white'
                          : 'text-gray-300 hover:text-white hover:bg-white/10'
                      }`}
                      title={`Таймфрейм ${tf}`}
                    >
                      {displayText}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 🔥 FLOW F1: Follow Mode Button */}
            {chartType === 'candles' && (
              <div className="ml-2 pl-2 border-l border-white/20 flex items-center gap-1">
                {showReturnToLatest && (
                  <button
                    onClick={() => {
                      candleChartRef.current?.followLatest();
                      setFollowMode(true);
                    }}
                    className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors bg-amber-500/90 hover:bg-amber-500 text-[#061230]"
                    title="Вернуться к актуальным свечам"
                  >
                    Вернуться к текущим
                  </button>
                )}
                <button
                  onClick={handleFollowModeToggle}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    followMode
                      ? 'bg-[#3347ff] text-white'
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                  title={followMode ? 'Follow Mode: ON' : 'Follow Mode: OFF'}
                >
                  Follow
                </button>
              </div>
            )}

            {/* 🔥 FLOW Y1: Reset Y-Scale Button */}
            {chartType === 'candles' && (
              <div className="ml-2 pl-2 border-l border-white/20">
                <button
                  onClick={() => candleChartRef.current?.resetYScale()}
                  className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors text-gray-300 hover:text-white hover:bg-white/10"
                  title="Reset Y-Scale (Auto-fit)"
                >
                  Auto Y
                </button>
              </div>
            )}
          </div>

          {/* Обёртка графика с явными размерами под ресайз — заполняет main по inset-0 */}
          <div className="absolute inset-0 min-w-0 min-h-0 overflow-hidden">
            <ChartContainer
              type={chartType}
              className="w-full h-full"
              style={{ display: 'block' }}
              snapshot={data}
              timeframe={timeframe}
              instrument={instrument}
              digits={getInstrumentOrDefault(instrument).digits}
              activeInstrumentRef={chartType === 'candles' ? activeInstrumentRef : undefined}
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
            />
          </div>
        </main>

        {/* Right Sidebar */}
        <aside className="w-64 shrink-0 border-l border-white/10 p-4 flex flex-col gap-4">
          {/* Time Input */}
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-400">Время (секунд)</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={5}
                max={60}
                step={5}
                value={Number.parseInt(time || '60', 10)}
                onChange={(e) => {
                  const v = Number(e.target.value) || 60;
                  setTime(String(v));
                  // FLOW E1: обновляем только ref на графике — линия экспирации смещается сама
                  candleChartRef.current?.setExpirationSeconds(v);
                }}
                className="flex-1 accent-[#3347ff]"
              />
              <span className="w-10 text-right text-sm text-white">
                {Number.parseInt(time || '60', 10)}
              </span>
            </div>
          </div>

          {/* Amount Input */}
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-400">Сумма</label>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Введите сумму"
              className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50 focus:border-[#3347ff]/50 transition-colors"
            />
          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-3 mt-auto">
            {/* Green Button (Top) */}
            <button
              className="w-full py-3 px-4 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors"
              onClick={async () => {
                try {
                  const accountId = getActiveAccountId();
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
                    }),
                  });

                  // FLOW T-OVERLAY: сразу добавляем overlay по Trade DTO
                  (candleChartRef.current as any)?.addTradeOverlayFromDTO(res.trade);
                } catch (e: any) {
                  alert(`Ошибка открытия сделки: ${e?.message ?? 'unknown error'}`);
                }
              }}
            >
              Выше
            </button>

            {/* Red Button (Bottom) */}
            <button
              className="w-full py-3 px-4 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors"
              onClick={async () => {
                try {
                  const accountId = getActiveAccountId();
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
                    }),
                  });

                  // FLOW T-OVERLAY: сразу добавляем overlay по Trade DTO
                  (candleChartRef.current as any)?.addTradeOverlayFromDTO(res.trade);
                } catch (e: any) {
                  alert(`Ошибка открытия сделки: ${e?.message ?? 'unknown error'}`);
                }
              }}
            >
              Ниже
            </button>
          </div>
        </aside>
      </div>
    </div>

    {/* Trades History Modal */}
    {showTradesHistory && (
      <>
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={() => setShowTradesHistory(false)}
        />
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="w-full max-w-4xl max-h-[80vh] bg-[#061230] border border-white/20 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">История сделок</h2>
                <p className="text-xs text-gray-400">
                  Последние сделки по аккаунту
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void fetchTradesHistory()}
                  className="px-3 py-1.5 rounded-md text-xs font-medium bg-white/10 text-gray-200 hover:bg-white/20 transition-colors disabled:opacity-60"
                  disabled={tradesHistoryLoading}
                >
                  Обновить
                </button>
                <button
                  type="button"
                  onClick={() => setShowTradesHistory(false)}
                  className="px-3 py-1.5 rounded-md text-xs font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                >
                  Закрыть
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              {tradesHistoryLoading && (
                <div className="flex items-center justify-center py-10 text-sm text-gray-400">
                  Загрузка...
                </div>
              )}

              {!tradesHistoryLoading && tradesHistoryError && (
                <div className="px-5 py-4 text-sm text-red-400">
                  {tradesHistoryError}
                </div>
              )}

              {!tradesHistoryLoading &&
                !tradesHistoryError &&
                (tradesHistory == null || tradesHistory.length === 0) && (
                  <div className="flex items-center justify-center py-10 text-sm text-gray-400">
                    Сделок пока нет
                  </div>
                )}

              {!tradesHistoryLoading && !tradesHistoryError && tradesHistory && tradesHistory.length > 0 && (
                <table className="min-w-full text-xs text-gray-200">
                  <thead className="sticky top-0 bg-[#050b1a] border-b border-white/10">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-400">Время</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-400">Направление</th>
                      <th className="px-4 py-2 text-right font-medium text-gray-400">Сумма</th>
                      <th className="px-4 py-2 text-right font-medium text-gray-400">Цена входа</th>
                      <th className="px-4 py-2 text-right font-medium text-gray-400">Цена выхода</th>
                      <th className="px-4 py-2 text-center font-medium text-gray-400">Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...tradesHistory].reverse().map((t) => {
                      const opened = new Date(t.openedAt);
                      const timeLabel = opened.toLocaleTimeString();
                      const isWin = t.status === 'WIN';
                      const isLoss = t.status === 'LOSS';
                      const dirLabel = t.direction === 'CALL' ? 'ВЫШЕ' : 'НИЖЕ';
                      const dirColor =
                        t.direction === 'CALL' ? 'text-emerald-400' : 'text-red-400';
                      const statusColor = isWin
                        ? 'text-emerald-400'
                        : isLoss
                          ? 'text-red-400'
                          : 'text-yellow-300';

                      return (
                        <tr key={t.id} className="border-b border-white/5 last:border-0">
                          <td className="px-4 py-2 whitespace-nowrap text-gray-300">
                            {timeLabel}
                          </td>
                          <td className={`px-4 py-2 whitespace-nowrap font-medium ${dirColor}`}>
                            {dirLabel}
                          </td>
                          <td className="px-4 py-2 text-right whitespace-nowrap">
                            {t.amount}
                          </td>
                          <td className="px-4 py-2 text-right whitespace-nowrap">
                            {t.entryPrice}
                          </td>
                          <td className="px-4 py-2 text-right whitespace-nowrap">
                            {t.exitPrice ?? '—'}
                          </td>
                          <td className={`px-4 py-2 text-center font-semibold ${statusColor}`}>
                            {t.status === 'OPEN'
                              ? 'ОТКРЫТА'
                              : t.status === 'WIN'
                                ? 'WIN'
                                : 'LOSS'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </>
    )}
  </AuthGuard>
  );
}
