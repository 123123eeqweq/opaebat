import type { IndicatorConfig } from '@/components/chart/internal/indicators/indicator.types';

/**
 * Terminal Layout Persistence
 * 
 * Сохранение и восстановление состояния терминала через localStorage
 * 
 * Сохраняем:
 * - instrument (валютная пара)
 * - timeframe (таймфрейм)
 * - indicators (список индикаторов с параметрами)
 * - drawings (нарисованные объекты)
 * 
 * НЕ сохраняем:
 * - live-свечи
 * - viewport pan/zoom
 * - hover/mouse state
 * - animator state
 * - WebSocket данные
 */

// График удален - импорты удалены

export type TerminalLayout = {
  instrument?: string;
  timeframe?: string;
  indicators?: {
    id: string;
    params: Record<string, any>;
    visible: boolean;
  }[];
  drawings?: {
    id: string;
    type: 'horizontal' | 'vertical' | 'trend' | 'rectangle' | 'fibonacci' | 'parallel-channel' | 'ray' | 'arrow';
    points: { time: number; price: number }[];
    color?: string;
    offset?: number; // для parallel-channel
  }[];
  // 🆕 FLOW T-LS1: ChartType & CandleMode persistence
  chartType?: 'candles' | 'line';
  candleMode?: 'classic' | 'heikin_ashi' | 'bars';
};

export const TERMINAL_LAYOUT_KEY = 'terminal.layout.v1';

/**
 * Сохранить layout в localStorage
 */
export function saveLayoutToLocalStorage(layout: TerminalLayout): void {
  try {
    localStorage.setItem(TERMINAL_LAYOUT_KEY, JSON.stringify(layout));
  } catch (error) {
    console.error('[TerminalLayout] Failed to save layout:', error);
  }
}

/**
 * Загрузить layout из localStorage
 */
export function loadLayoutFromLocalStorage(): TerminalLayout | null {
  try {
    const raw = localStorage.getItem(TERMINAL_LAYOUT_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as TerminalLayout;
    
    // Валидация структуры (опциональные поля)
    if (
      (parsed.instrument === undefined || typeof parsed.instrument === 'string') &&
      (parsed.timeframe === undefined || typeof parsed.timeframe === 'string') &&
      (parsed.indicators === undefined || Array.isArray(parsed.indicators)) &&
      (parsed.drawings === undefined || Array.isArray(parsed.drawings)) &&
      (parsed.chartType === undefined || (parsed.chartType === 'candles' || parsed.chartType === 'line')) &&
      (parsed.candleMode === undefined || ['classic', 'heikin_ashi', 'bars'].includes(parsed.candleMode))
    ) {
      return parsed;
    }
    
    return null;
  } catch (error) {
    console.error('[TerminalLayout] Failed to load layout:', error);
    return null;
  }
}

/**
 * Конвертировать IndicatorConfig в формат для сохранения
 * График удален - функция оставлена для совместимости, но не используется
 */
export function indicatorConfigToLayout(config: any): NonNullable<TerminalLayout['indicators']>[number] {
  const params: Record<string, any> = {
    period: config.period,
  };
  
  if (config.type === 'Stochastic' && config.periodD !== undefined) {
    params.periodD = config.periodD;
  }
  
  if (config.type === 'BollingerBands' && config.stdDevMult !== undefined) {
    params.stdDevMult = config.stdDevMult;
  }
  
  if (config.type === 'MACD') {
    if (config.fastPeriod !== undefined) params.fastPeriod = config.fastPeriod;
    if (config.slowPeriod !== undefined) params.slowPeriod = config.slowPeriod;
    if (config.signalPeriod !== undefined) params.signalPeriod = config.signalPeriod;
  }
  
  return {
    id: config.id,
    params,
    visible: config.enabled ?? false,
  };
}

/**
 * Конвертировать layout indicator в IndicatorConfig
 */
export function layoutIndicatorToConfig(
  layoutIndicator: NonNullable<TerminalLayout['indicators']>[number],
  indicatorType: string
): Partial<IndicatorConfig> {
  const config: Partial<IndicatorConfig> = {
    id: layoutIndicator.id,
    enabled: layoutIndicator.visible,
    period: layoutIndicator.params.period,
  };
  
  if (indicatorType === 'Stochastic' && layoutIndicator.params.periodD !== undefined) {
    config.periodD = layoutIndicator.params.periodD;
  }
  
  if (indicatorType === 'BollingerBands' && layoutIndicator.params.stdDevMult !== undefined) {
    config.stdDevMult = layoutIndicator.params.stdDevMult;
  }
  
  if (indicatorType === 'MACD') {
    if (layoutIndicator.params.fastPeriod !== undefined) config.fastPeriod = layoutIndicator.params.fastPeriod;
    if (layoutIndicator.params.slowPeriod !== undefined) config.slowPeriod = layoutIndicator.params.slowPeriod;
    if (layoutIndicator.params.signalPeriod !== undefined) config.signalPeriod = layoutIndicator.params.signalPeriod;
  }
  
  return config;
}

/**
 * Конвертировать Drawing в формат для сохранения
 * График удален - функция оставлена для совместимости, но не используется
 */
export function drawingToLayout(drawing: any): TerminalLayout['drawings'][0] {
  const base = {
    id: drawing.id,
    type: drawing.type,
    color: drawing.color,
  };
  
  if (drawing.type === 'horizontal') {
    return {
      ...base,
      points: [{ time: 0, price: drawing.price }],
    };
  }
  
  if (drawing.type === 'vertical') {
    return {
      ...base,
      points: [{ time: drawing.time, price: 0 }],
    };
  }
  
  if (
    drawing.type === 'trend' ||
    drawing.type === 'rectangle' ||
    drawing.type === 'fibonacci' ||
    drawing.type === 'ray' ||
    drawing.type === 'arrow'
  ) {
    return {
      ...base,
      points: [drawing.start, drawing.end],
    };
  }
  
  if (drawing.type === 'parallel-channel') {
    return {
      ...base,
      points: [drawing.start, drawing.end],
      offset: drawing.offset,
    };
  }
  
  // Fallback
  return {
    ...base,
    points: [],
  };
}

/**
 * Конвертировать layout drawing в Drawing
 */
export function layoutDrawingToDrawing(
  layoutDrawing: TerminalLayout['drawings'][0]
): any | null {
  const { id, type, points, color = '#3347ff', offset } = layoutDrawing;
  
  if (type === 'horizontal' && points.length > 0) {
    return {
      id,
      type: 'horizontal',
      price: points[0].price,
      color,
    } as Drawing;
  }
  
  if (type === 'vertical' && points.length > 0) {
    return {
      id,
      type: 'vertical',
      time: points[0].time,
      color,
    } as Drawing;
  }
  
  if (
    (type === 'trend' || type === 'rectangle' || type === 'fibonacci' || type === 'ray' || type === 'arrow') &&
    points.length >= 2
  ) {
    if (type === 'trend') {
      return {
        id,
        type: 'trend',
        start: points[0],
        end: points[1],
        color,
      } as Drawing;
    }
    
    if (type === 'rectangle') {
      return {
        id,
        type: 'rectangle',
        start: points[0],
        end: points[1],
        color,
      } as Drawing;
    }
    
    if (type === 'fibonacci') {
      return {
        id,
        type: 'fibonacci',
        start: points[0],
        end: points[1],
        color,
      } as Drawing;
    }
    
    if (type === 'ray') {
      return {
        id,
        type: 'ray',
        start: points[0],
        end: points[1],
        color,
      } as Drawing;
    }
    
    if (type === 'arrow') {
      return {
        id,
        type: 'arrow',
        start: points[0],
        end: points[1],
        color,
      } as Drawing;
    }
  }
  
  if (type === 'parallel-channel' && points.length >= 2 && offset !== undefined) {
    return {
      id,
      type: 'parallel-channel',
      start: points[0],
      end: points[1],
      offset,
      color,
    } as Drawing;
  }
  
  return null;
}
