/**
 * useTerminalSnapshot hook - fetches terminal snapshot
 * FLOW P4: instrument = instrumentId (BTCUSD, EURUSD, …), default BTCUSD
 */

'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api/api';
import type { TerminalSnapshot } from '@/types/terminal';
import { DEFAULT_INSTRUMENT_ID } from '@/lib/instruments';

export function useTerminalSnapshot(
  instrument: string = DEFAULT_INSTRUMENT_ID,
  timeframe: string = '5s',
  chartType?: 'candles' | 'line', // 🔥 FLOW C-CHART-TYPE-RESET: Добавляем chartType для принудительной перезагрузки
) {
  const [data, setData] = useState<TerminalSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    api<TerminalSnapshot>(
      `/api/terminal/snapshot?instrument=${encodeURIComponent(instrument)}&timeframe=${encodeURIComponent(timeframe)}`,
    )
      .then((res) => {
        if (!cancelled) {
          setData(res);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e.message ?? 'Failed to load snapshot');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [instrument, timeframe, chartType]); // 🔥 FLOW C-CHART-TYPE-RESET: Добавляем chartType в зависимости

  return { data, loading, error };
}
