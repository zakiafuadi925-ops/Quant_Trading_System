import { calculateIndicators } from '../src/utils/technicalIndicators';

test('calculateIndicators returns same length as input', () => {
  const raw = [
    { timestamp: '2021-01-01', open: 1, high: 2, low: 0.5, close: 1.5, volume: 100 },
    { timestamp: '2021-01-02', open: 1.5, high: 2.5, low: 1, close: 2, volume: 150 },
    { timestamp: '2021-01-03', open: 2, high: 3, low: 1.5, close: 2.5, volume: 120 }
  ];
  const result = calculateIndicators(raw);
  expect(result.length).toBe(raw.length);
});

