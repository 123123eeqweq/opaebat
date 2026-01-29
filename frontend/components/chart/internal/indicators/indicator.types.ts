/**
 * indicator.types.ts - типы для индикаторов
 * 
 * FLOW G12: Indicator types
 */

export type IndicatorType = 'SMA' | 'EMA' | 'RSI' | 'Stochastic' | 'Momentum' | 'BollingerBands';

export type IndicatorConfig = {
  id: string;
  type: IndicatorType;
  period: number;
  color: string;
  enabled?: boolean; // Включен ли индикатор (по умолчанию false)
  /** Для Stochastic: период сглаживания %D (по умолчанию 3) */
  periodD?: number;
  /** Для Stochastic: цвет линии %D */
  colorD?: string;
  /** Для Bollinger Bands: множитель стандартного отклонения (по умолчанию 2) */
  stdDevMult?: number;
};

export type IndicatorPoint = {
  time: number;
  value: number;
};

export type IndicatorSeries = {
  id: string;
  type: IndicatorType;
  points: IndicatorPoint[];
};
