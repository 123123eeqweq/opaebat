import {
  DEFAULT_PAYOUT_PERCENT,
  MAX_CANDLES,
  TRADE_DURATION_PRESETS,
  LINE_CHART_TIMEFRAME_SECONDS,
} from '../constants';

describe('constants', () => {
  it('DEFAULT_PAYOUT_PERCENT is a number', () => {
    expect(typeof DEFAULT_PAYOUT_PERCENT).toBe('number');
    expect(DEFAULT_PAYOUT_PERCENT).toBeGreaterThan(0);
  });

  it('MAX_CANDLES is positive', () => {
    expect(MAX_CANDLES).toBeGreaterThan(0);
  });

  it('TRADE_DURATION_PRESETS has label and seconds', () => {
    TRADE_DURATION_PRESETS.forEach((p) => {
      expect(p).toHaveProperty('label');
      expect(p).toHaveProperty('seconds');
      expect(typeof p.seconds).toBe('number');
    });
  });

  it('LINE_CHART_TIMEFRAME_SECONDS maps correctly', () => {
    expect(LINE_CHART_TIMEFRAME_SECONDS['30m']).toBe(1800);
    expect(LINE_CHART_TIMEFRAME_SECONDS['1h']).toBe(3600);
    expect(LINE_CHART_TIMEFRAME_SECONDS['1d']).toBe(86400);
  });
});
