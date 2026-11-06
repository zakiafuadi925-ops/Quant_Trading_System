import { calculateIndicators, calcATR, calcSupertrend } from '../src/utils/technicalIndicators';

describe('Technical Indicators & ATR / Supertrend', () => {
  const raw = [
    { timestamp: '2021-01-01', open: 100, high: 110, low: 90, close: 105, volume: 100 },
    { timestamp: '2021-01-02', open: 105, high: 120, low: 100, close: 115, volume: 150 },
    { timestamp: '2021-01-03', open: 115, high: 125, low: 110, close: 120, volume: 120 },
    { timestamp: '2021-01-04', open: 120, high: 130, low: 115, close: 118, volume: 130 },
    { timestamp: '2021-01-05', open: 118, high: 122, low: 95, close: 98, volume: 200 }
  ];

  test('calculateIndicators returns same length and attaches atr & supertrend', () => {
    const result = calculateIndicators(raw);
    expect(result.length).toBe(raw.length);
    expect(result[0].atr).toBeDefined();
    expect(result[0].supertrend).toBeDefined();
    expect(result[0].supertrendDirection).toBeDefined();
  });

  test('calcATR computes positive volatility values', () => {
    const atrs = calcATR(raw, 3);
    expect(atrs.length).toBe(raw.length);
    atrs.forEach((val) => {
      expect(val).toBeGreaterThan(0);
    });
  });

  test('calcSupertrend produces valid direction and bands', () => {
    const { supertrend, direction } = calcSupertrend(raw, 3, 2);
    expect(supertrend.length).toBe(raw.length);
    expect(direction.length).toBe(raw.length);
    direction.forEach((dir) => {
      expect([1, -1]).toContain(dir);
    });
  });
});

