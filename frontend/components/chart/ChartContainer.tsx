/**
 * ChartContainer - переключатель между типами графиков
 * 
 * FLOW L4: Chart type switcher
 * 
 * Простой переключатель без смешивания логики
 */

'use client';

import { useRef, useEffect } from 'react';
import { CandleChart, type CandleChartRef } from './candle/CandleChart';
import { LineChart, type LineChartRef } from './line/LineChart';
import { ChartErrorBoundary } from './ChartErrorBoundary';
import type { ChartType } from './chart.types';
import type { TerminalSnapshot } from '@/types/terminal';
import type { IndicatorConfig } from './internal/indicators/indicator.types';
import type { OverlayRegistryParams } from './useChart';
import type { CandleMode } from './internal/candleModes/candleMode.types';

interface ChartContainerProps {
  type: ChartType;
  /** Режим свечей (classic/heikin_ashi/bars) — восстанавливается из localStorage */
  candleMode?: CandleMode;
  className?: string;
  style?: React.CSSProperties;
  timeframe?: string;
  snapshot?: TerminalSnapshot | null;
  instrument?: string;
  /** Процент выплаты для overlay сделок (timer + payout) */
  payoutPercent?: number;
  digits?: number;
  activeInstrumentRef?: React.MutableRefObject<string>;
  indicatorConfigs?: IndicatorConfig[];
  drawingMode?: 'horizontal' | 'vertical' | 'trend' | 'rectangle' | 'fibonacci' | 'parallel-channel' | 'ray' | 'arrow' | null;
  /** FLOW O: Overlay Registry — getVisibleOverlayIds, onDrawingAdded */
  overlayRegistry?: OverlayRegistryParams;
  onCandleChartRef?: (ref: CandleChartRef | null) => void;
  onLineChartRef?: (ref: LineChartRef | null) => void;
  /** FLOW C-MARKET-ALTERNATIVES: Callback для переключения инструмента */
  onInstrumentChange?: (instrumentId: string) => void;
}

export function ChartContainer({
  type,
  candleMode = 'classic',
  className,
  style,
  timeframe,
  snapshot,
  instrument,
  payoutPercent = 75,
  digits,
  activeInstrumentRef,
  indicatorConfigs,
  drawingMode,
  overlayRegistry,
  onCandleChartRef,
  onLineChartRef,
  onInstrumentChange,
}: ChartContainerProps) {
  const candleChartRef = useRef<CandleChartRef>(null);
  const lineChartRef = useRef<LineChartRef>(null);

  useEffect(() => {
    if (onCandleChartRef) {
      onCandleChartRef(candleChartRef.current);
    }
  }, [onCandleChartRef, type]);

  useEffect(() => {
    if (onLineChartRef) {
      onLineChartRef(lineChartRef.current);
    }
  }, [onLineChartRef, type]);

  if (type === 'line') {
    return (
      <div className={className} style={style}>
        <ChartErrorBoundary>
          <LineChart
            ref={lineChartRef}
            className="w-full h-full"
            style={{ display: 'block' }}
            instrument={instrument}
            payoutPercent={payoutPercent}
            activeInstrumentRef={activeInstrumentRef}
            digits={digits}
            drawingMode={drawingMode}
            indicatorConfigs={indicatorConfigs}
            overlayRegistry={overlayRegistry}
          />
        </ChartErrorBoundary>
      </div>
    );
  }

  return (
    <div className={className} style={style}>
      <ChartErrorBoundary>
        <CandleChart
          ref={candleChartRef}
          className="w-full h-full"
          style={{ display: 'block' }}
          timeframe={timeframe}
          snapshot={snapshot}
          instrument={instrument}
          payoutPercent={payoutPercent}
          digits={digits}
          activeInstrumentRef={activeInstrumentRef}
          indicatorConfigs={indicatorConfigs}
          drawingMode={drawingMode}
          overlayRegistry={overlayRegistry}
          onInstrumentChange={onInstrumentChange}
          candleMode={candleMode}
        />
      </ChartErrorBoundary>
    </div>
  );
}
