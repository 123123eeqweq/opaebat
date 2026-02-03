'use client';

import { useState, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { api } from '@/lib/api/api';
import { getInstrument } from '@/lib/instruments';

interface BalancePoint {
  date: string;
  balance: number;
}

interface TradeStatistics {
  totalTrades: number;
  winRate: number;
  totalVolume: number;
  netProfit: number;
  winCount: number;
  lossCount: number;
  tieCount: number;
  maxTrade: { amount: number; date: string } | null;
  minTrade: { amount: number; date: string } | null;
  bestProfit: { profit: number; date: string } | null;
}

interface TradeAnalytics {
  byInstrument: Array<{ instrument: string; count: number; volume: number; winCount: number }>;
  byDirection: {
    call: { count: number; winCount: number };
    put: { count: number; winCount: number };
  };
}

const PRESET_INTERVALS = [
  { id: '24h', label: '24 часа', days: 1 },
  { id: '3d', label: '3 дня', days: 3 },
  { id: '7d', label: '7 дней', days: 7 },
  { id: '14d', label: '14 дней', days: 14 },
  { id: '30d', label: '1 месяц', days: 30 },
  { id: 'all', label: 'Всё время', days: null },
];

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function formatBalance(v: number): string {
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
}

function StatLabel({ label, hint }: { label: string; hint: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-2">
      <span className="text-xs font-medium text-white/50 uppercase tracking-wider">{label}</span>
      <span className="group/tip relative inline-flex cursor-help">
        <HelpCircle className="w-3.5 h-3.5 text-white/40 hover:text-white/60 transition-colors" strokeWidth={2} />
        <span className="absolute left-0 bottom-full mb-1.5 px-2.5 py-1.5 bg-[#0f1a2e] border border-white/10 rounded-lg text-xs text-white/80 max-w-[200px] opacity-0 invisible group-hover/tip:opacity-100 group-hover/tip:visible transition-all z-20 shadow-xl pointer-events-none">
          {hint}
        </span>
      </span>
    </div>
  );
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function instrumentLabel(id: string): string {
  const info = getInstrument(id) || getInstrument(`${id}_REAL`);
  return info?.label ?? id.replace(/_REAL$/, '').replace(/([A-Z]{3})([A-Z]{3})/, '$1/$2');
}

export function TradeProfileTab() {
  const today = new Date();
  const defaultEnd = toDateStr(today);
  const defaultStart = toDateStr(new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000));

  const [interval, setInterval] = useState<string>('30d');
  const [customStart, setCustomStart] = useState(defaultStart);
  const [customEnd, setCustomEnd] = useState(defaultEnd);
  const [history, setHistory] = useState<BalancePoint[]>([]);
  const [stats, setStats] = useState<TradeStatistics | null>(null);
  const [analytics, setAnalytics] = useState<TradeAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  const isCustom = interval === 'custom';

  useEffect(() => {
    let startStr: string;
    let endStr: string;

    if (isCustom) {
      startStr = customStart;
      endStr = customEnd;
    } else {
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      endStr = toDateStr(end);

      const preset = PRESET_INTERVALS.find((i) => i.id === interval);
      if (preset?.days === null) {
        startStr = '2020-01-01';
      } else {
        const days = preset?.days ?? 30;
        const start = new Date();
        start.setDate(start.getDate() - days);
        start.setHours(0, 0, 0, 0);
        startStr = toDateStr(start);
      }
    }

    setChartLoading(true);
    setAnalyticsLoading(true);
    Promise.all([
      api<{ history: BalancePoint[] }>(
        `/api/trades/balance-history?startDate=${startStr}&endDate=${endStr}`
      ).then((res) => setHistory(res.history || [])).catch(() => setHistory([])),
      api<{ analytics: TradeAnalytics }>(
        `/api/trades/analytics?startDate=${startStr}&endDate=${endStr}`
      ).then((res) => setAnalytics(res.analytics || null)).catch(() => setAnalytics(null)),
    ]).finally(() => {
      setChartLoading(false);
      setAnalyticsLoading(false);
    });
  }, [interval, customStart, customEnd]);

  useEffect(() => {
    setLoading(true);
    api<{ statistics: TradeStatistics }>('/api/trades/statistics')
      .then((res) => setStats(res.statistics))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  const chartData = history.map((p) => ({
    ...p,
    displayDate: formatDate(p.date),
  }));

  return (
    <div className="flex w-full min-h-[calc(100vh-3.5rem)] relative">
      {/* Фоновый градиент */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_120%_80%_at_20%_0%,rgba(51,71,255,0.06),transparent_50%)]" />

      {/* Основная часть */}
      <div className="flex-1 min-w-0 p-3 sm:p-6 md:p-8 overflow-auto relative">
        <div className="w-full">
          <div className="mb-4 sm:mb-10">
            <h1 className="text-lg sm:text-3xl font-bold text-white tracking-tight">Торговый профиль</h1>
            <p className="text-sm text-white/50 mt-1">
              Статистика и динамика баланса
            </p>
          </div>

          {/* Статистика */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-10">
            <div className="group rounded-lg sm:rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 sm:p-5 hover:bg-white/[0.04] hover:border-white/[0.08] transition-all duration-300 hover:shadow-[0_8px_30px_-10px_rgba(51,71,255,0.15)]">
              <StatLabel label="Макс. прибыль" hint="Максимальная прибыль от одной сделки за выбранный период" />
              {loading ? (
                <div className="h-8 w-20 bg-white/10 rounded animate-pulse" />
              ) : (
                <p className="text-base sm:text-xl font-bold text-white tabular-nums">
                  {stats?.bestProfit ? formatBalance(stats.bestProfit.profit) : '0.00'} UAH
                </p>
              )}
            </div>

            <div className="group rounded-lg sm:rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 sm:p-5 hover:bg-white/[0.04] hover:border-white/[0.08] transition-all duration-300 hover:shadow-[0_8px_30px_-10px_rgba(51,71,255,0.15)]">
              <StatLabel label="Объём торгов" hint="Суммарный объём всех сделок за период" />
              {loading ? (
                <div className="h-8 w-20 bg-white/10 rounded animate-pulse" />
              ) : (
                <p className="text-base sm:text-xl font-bold text-white tabular-nums">
                  {stats ? formatBalance(stats.totalVolume) : '0.00'} UAH
                </p>
              )}
            </div>

            <div className="group rounded-lg sm:rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 sm:p-5 hover:bg-white/[0.04] hover:border-white/[0.08] transition-all duration-300 hover:shadow-[0_8px_30px_-10px_rgba(51,71,255,0.15)]">
              <StatLabel label="Сделок" hint="Количество закрытых сделок за период" />
              {loading ? (
                <div className="h-8 w-20 bg-white/10 rounded animate-pulse" />
              ) : (
                <p className="text-base sm:text-xl font-bold text-white tabular-nums">
                  {stats?.totalTrades ?? 0}
                </p>
              )}
            </div>

            <div className="group rounded-lg sm:rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 sm:p-5 hover:bg-white/[0.04] hover:border-white/[0.08] transition-all duration-300 hover:shadow-[0_8px_30px_-10px_rgba(51,71,255,0.15)]">
              <StatLabel label="% успешных" hint="Win rate — процент прибыльных сделок от общего числа" />
              {loading ? (
                <div className="h-8 w-20 bg-white/10 rounded animate-pulse" />
              ) : (
                <p className="text-base sm:text-xl font-bold text-white tabular-nums">
                  {stats ? `${stats.winRate}%` : '0%'}
                </p>
              )}
            </div>
          </div>

          {/* График баланса */}
          <div className="rounded-xl sm:rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-white/[0.01] p-3 sm:p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)_inset]">
            <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6">
              <h2 className="text-base font-semibold text-white">Динамика баланса</h2>
              <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
                <div className="flex gap-1 p-1 rounded-lg bg-white/[0.04] border border-white/[0.06] overflow-x-auto">
                  {PRESET_INTERVALS.map((i) => (
                    <button
                      key={i.id}
                      type="button"
                      onClick={() => setInterval(i.id)}
                      className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                        interval === i.id && !isCustom
                          ? 'bg-[#3347ff]/30 text-white'
                          : 'text-white/50 hover:text-white/80'
                      }`}
                    >
                      {i.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setInterval('custom')}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                      isCustom ? 'bg-[#3347ff]/30 text-white' : 'text-white/50 hover:text-white/80'
                    }`}
                  >
                    Свой период
                  </button>
                </div>
                {isCustom && (
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      max={customEnd}
                      className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50"
                    />
                    <span className="text-white/40 text-sm">—</span>
                    <input
                      type="date"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      min={customStart}
                      max={toDateStr(new Date())}
                      className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="h-[220px] sm:h-[280px]">
              {chartLoading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="w-10 h-10 border-2 border-white/20 border-t-[#3347ff] rounded-full animate-spin" />
                </div>
              ) : chartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-white/40 text-sm">
                  Нет данных за выбранный период
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3347ff" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#3347ff" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis
                      dataKey="displayDate"
                      stroke="rgba(255,255,255,0.3)"
                      tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="rgba(255,255,255,0.3)"
                      tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `${v} UAH`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f1a2e',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                      }}
                      labelStyle={{ color: 'rgba(255,255,255,0.7)' }}
                      formatter={(value: number | undefined) => [value != null ? `${formatBalance(value)} UAH` : '', 'Баланс']}
                      labelFormatter={(label) => label}
                    />
                    <Area
                      type="monotone"
                      dataKey="balance"
                      stroke="#3347ff"
                      strokeWidth={2}
                      fill="url(#balanceGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Аналитика: распределение по активам */}
          <div className="mt-4 sm:mt-6">
            <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-white/[0.01] p-4 sm:p-6">
              <h3 className="text-base font-semibold text-white mb-4">Распределение по активам</h3>
              {analyticsLoading ? (
                <div className="h-[220px] flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-white/20 border-t-[#3347ff] rounded-full animate-spin" />
                </div>
              ) : !analytics?.byInstrument?.length ? (
                <div className="h-[220px] flex items-center justify-center text-white/40 text-sm">
                  Нет сделок за период
                </div>
              ) : (
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={analytics.byInstrument.slice(0, 8).map((i) => ({
                        name: instrumentLabel(i.instrument),
                        count: i.count,
                        volume: i.volume,
                        winRate: i.count > 0 ? Math.round((i.winCount / i.count) * 100) : 0,
                      }))}
                      layout="vertical"
                      margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
                    >
                      <XAxis type="number" stroke="rgba(255,255,255,0.3)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={80}
                        stroke="rgba(255,255,255,0.3)"
                        tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 11 }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f1a2e',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '12px',
                        }}
                        formatter={(value: number | undefined) => [value != null ? `${value} сделок` : '', 'Количество']}
                      />
                      <Bar dataKey="count" fill="#3347ff" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
