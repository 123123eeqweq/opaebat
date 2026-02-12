import { calculateSMA } from '../sma';

describe('calculateSMA', () => {
  const makeCandle = (close: number, endTime: number) => ({
    open: close - 1,
    high: close + 1,
    low: close - 1,
    close,
    startTime: endTime - 1000,
    endTime,
  });

  it('returns empty when candles < period', () => {
    const candles = [makeCandle(1, 1), makeCandle(2, 2)];
    expect(calculateSMA(candles, 5)).toEqual([]);
  });

  it('calculates SMA for period 2', () => {
    const candles = [
      makeCandle(10, 1),
      makeCandle(20, 2),
      makeCandle(30, 3),
    ];
    const result = calculateSMA(candles, 2);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ time: 2, value: 15 });
    expect(result[1]).toEqual({ time: 3, value: 25 });
  });

  it('calculates SMA for period 3', () => {
    const candles = [
      makeCandle(10, 1),
      makeCandle(20, 2),
      makeCandle(30, 3),
      makeCandle(40, 4),
    ];
    const result = calculateSMA(candles, 3);
    expect(result).toHaveLength(2);
    expect(result[0].value).toBeCloseTo(20);
    expect(result[1].value).toBeCloseTo(30);
  });
});
