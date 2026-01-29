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
import type { ChartType } from './chart.types';
import type { TerminalSnapshot } from '@/types/terminal';
import type { IndicatorConfig } from './internal/indicators/indicator.types';
import type { OverlayRegistryParams } from './useChart';

interface ChartContainerProps {
  type: ChartType;
  className?: string;
  style?: React.CSSProperties;
  timeframe?: string;
  snapshot?: TerminalSnapshot | null;
  instrument?: string;
  digits?: number;
  activeInstrumentRef?: React.MutableRefObject<string>;
  indicatorConfigs?: IndicatorConfig[];
  drawingMode?: 'horizontal' | 'vertical' | 'trend' | 'rectangle' | 'fibonacci' | 'parallel-channel' | 'ray' | 'arrow' | null;
  /** FLOW O: Overlay Registry — getVisibleOverlayIds, onDrawingAdded */
  overlayRegistry?: OverlayRegistryParams;
  onCandleChartRef?: (ref: CandleChartRef | null) => void;
}

export function ChartContainer({
  type,
  className,
  style,
  timeframe,
  snapshot,
  instrument,
  digits,
  activeInstrumentRef,
  indicatorConfigs,
  drawingMode,
  overlayRegistry,
  onCandleChartRef,
}: ChartContainerProps) {
  const candleChartRef = useRef<CandleChartRef>(null);

  useEffect(() => {
    if (onCandleChartRef) {
      onCandleChartRef(candleChartRef.current);
    }
  }, [onCandleChartRef, type]);

  if (type === 'line') {
    return (
      <div className={className} style={style} aria-hidden>
        <div className="flex items-center justify-center w-full h-full min-h-[200px] bg-[#0a0e1a] text-gray-400 text-sm">
          Скоро тут будет линейный график
        </div>
      </div>
    );
  }

  return (
    <CandleChart
      ref={candleChartRef}
      className={className}
      style={style}
      timeframe={timeframe}
      snapshot={snapshot}
      instrument={instrument}
      digits={digits}
      activeInstrumentRef={activeInstrumentRef}
      indicatorConfigs={indicatorConfigs}
      drawingMode={drawingMode}
      overlayRegistry={overlayRegistry}
    />
  );
}
