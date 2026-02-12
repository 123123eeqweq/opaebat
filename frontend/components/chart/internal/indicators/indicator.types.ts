/**
 * indicator.types.ts - типы для индикаторов
 * 
 * FLOW G12: Indicator types
 */

export type IndicatorType = 'SMA' | 'EMA' | 'RSI' | 'Stochastic' | 'Momentum' | 'AwesomeOscillator' | 'BollingerBands' | 'KeltnerChannels' | 'Ichimoku' | 'ATR' | 'ADX' | 'MACD';

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
  /** Для Keltner Channels: множитель ATR (по умолчанию 2) */
  atrMult?: number;
  /** Для Awesome Oscillator: быстрый период (по умолчанию 5). Медленный = period (34) */
  fastPeriod?: number;
  /** Для MACD */
  slowPeriod?: number;
  signalPeriod?: number;
  /** Для Ichimoku: период Kijun (по умолчанию 26) */
  basePeriod?: number;
  /** Для Ichimoku: период Senkou Span B (по умолчанию 52) */
  spanBPeriod?: number;
  /** Для Ichimoku: смещение вперёд/назад (по умолчанию 26) */
  displacement?: number;
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
