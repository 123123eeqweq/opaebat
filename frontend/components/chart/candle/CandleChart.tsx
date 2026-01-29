/**
 * CandleChart - свечной график
 * 
 * FLOW L4: Candle chart component
 * 
 * Содержит всю логику свечного графика
 */

'use client';

import { useRef, useImperativeHandle, forwardRef } from 'react';
import { useChart } from '../useChart';
import { useCanvasInfrastructure } from '../internal/useCanvasInfrastructure';
import type { TerminalSnapshot } from '@/types/terminal';
import type { CandleMode } from '../internal/candleModes/candleMode.types';
import type { IndicatorConfig } from '../internal/indicators/indicator.types';
import type { OverlayRegistryParams } from '../useChart';

interface CandleChartProps {
  className?: string;
  style?: React.CSSProperties;
  timeframe?: string;
  snapshot?: TerminalSnapshot | null;
  instrument?: string;
  digits?: number;
  activeInstrumentRef?: React.MutableRefObject<string>;
  indicatorConfigs?: IndicatorConfig[];
  drawingMode?: 'horizontal' | 'vertical' | 'trend' | 'rectangle' | 'fibonacci' | 'parallel-channel' | 'ray' | 'arrow' | null;
  /** FLOW O: Overlay Registry — visibility и onDrawingAdded */
  overlayRegistry?: OverlayRegistryParams;
}

export interface CandleChartRef {
  setCandleMode: (mode: CandleMode) => void;
  getCandleMode: () => CandleMode;
  setFollowMode: (on: boolean) => void;
  getFollowMode: () => boolean;
  toggleFollowMode: () => void;
  /** FLOW F5/F6: вернуться к актуальным свечам, включить follow */
  followLatest: () => void;
  /** FLOW F8: показывать кнопку «Вернуться к текущим» */
  shouldShowReturnToLatest: () => boolean;
  resetYScale: () => void;
  /** FLOW O6: удалить drawing по id (панель оверлеев) */
  removeDrawing: (id: string) => void;
  /** Получить все drawings */
  getDrawings: () => import('../internal/drawings/drawing.types').Drawing[];
  /** Добавить drawing (для восстановления из layout) */
  addDrawing: (drawing: import('../internal/drawings/drawing.types').Drawing) => void;
  /** Очистить все drawings */
  clearDrawings: () => void;
  /** FLOW E1: управление временем экспирации (через ref, не state) */
  setExpirationSeconds: (seconds: number) => void;
  /** FLOW T-OVERLAY: добавить overlay по Trade DTO (HTTP) */
  addTradeOverlayFromDTO: (trade: {
    id: string;
    direction: 'CALL' | 'PUT';
    entryPrice: string;
    openedAt: string;
    expiresAt: string;
  }) => void;
  /** FLOW T-OVERLAY: удалить trade по id */
  removeTrade: (id: string) => void;
}

export const CandleChart = forwardRef<CandleChartRef, CandleChartProps>(
  ({ className, style, timeframe = '5s', snapshot, instrument, digits, activeInstrumentRef, indicatorConfigs = [], drawingMode = null, overlayRegistry }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartApi = useChart({ canvasRef, timeframe, snapshot, instrument, digits, activeInstrumentRef, indicatorConfigs, drawingMode, overlayRegistry });

    // Canvas infrastructure
    useCanvasInfrastructure({ canvasRef });

    // Экспортируем API через ref
    useImperativeHandle(ref, () => ({
      setCandleMode: chartApi.setCandleMode,
      getCandleMode: chartApi.getCandleMode,
      setFollowMode: chartApi.setFollowMode,
      getFollowMode: chartApi.getFollowMode,
      toggleFollowMode: chartApi.toggleFollowMode,
      followLatest: chartApi.followLatest,
      shouldShowReturnToLatest: chartApi.shouldShowReturnToLatest,
      resetYScale: chartApi.resetYScale,
      removeDrawing: chartApi.removeDrawing,
      getDrawings: chartApi.getDrawings,
      addDrawing: chartApi.addDrawing,
      clearDrawings: chartApi.clearDrawings,
      setExpirationSeconds: chartApi.setExpirationSeconds,
      addTradeOverlayFromDTO: chartApi.addTradeOverlayFromDTO,
      removeTrade: chartApi.removeTrade,
    }));

    return (
      <canvas
        ref={canvasRef}
        className={className}
        style={style}
        onContextMenu={(e) => e.preventDefault()}
      />
    );
  }
);

CandleChart.displayName = 'CandleChart';
