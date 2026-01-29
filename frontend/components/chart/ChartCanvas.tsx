/**
 * ChartCanvas - публичный React-компонент графика
 * 
 * Роль: только DOM + canvas
 * НЕ содержит логики
 */

'use client';

import { useRef, useImperativeHandle, forwardRef } from 'react';
import { useChart } from './useChart';
import type { TerminalSnapshot } from '@/types/terminal';
import type { CandleMode } from './internal/candleModes/candleMode.types';
import type { IndicatorConfig } from './internal/indicators/indicator.types';

interface ChartCanvasProps {
  className?: string;
  style?: React.CSSProperties;
  timeframe?: string; // например "5s"
  snapshot?: TerminalSnapshot | null;
  indicatorConfigs?: IndicatorConfig[]; // Конфигурация индикаторов
  drawingMode?: 'horizontal' | 'vertical' | 'trend' | 'rectangle' | 'fibonacci' | 'parallel-channel' | 'ray' | 'arrow' | null; // Режим рисования
}

export interface ChartCanvasRef {
  setCandleMode: (mode: CandleMode) => void;
  getCandleMode: () => CandleMode;
}

export const ChartCanvas = forwardRef<ChartCanvasRef, ChartCanvasProps>(
  ({ className, style, timeframe = '5s', snapshot, indicatorConfigs = [], drawingMode = null }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartApi = useChart({ canvasRef, timeframe, snapshot, indicatorConfigs, drawingMode });

    // Экспортируем API через ref
    useImperativeHandle(ref, () => ({
      setCandleMode: chartApi.setCandleMode,
      getCandleMode: chartApi.getCandleMode,
    }));

    return (
      <canvas
        ref={canvasRef}
        className={className}
        style={{ display: 'block', ...style }}
        onContextMenu={(e) => e.preventDefault()}
      />
    );
  }
);

ChartCanvas.displayName = 'ChartCanvas';
