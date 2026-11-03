import { getSignal } from '../src/utils/strategy';
import { CandleData } from '../src/types';

describe('MACD Cross strategy signal', () => {
  const baseCandle: CandleData = {
    timestamp: '2021-01-01',
    open: 1,
    high: 2,
    low: 0.5,
    close: 1.5,
    volume: 100,
    rsi: 50,
    macd: 0,
    macdSignal: 0,
    macdHist: 0,
    ema9: 0,
    ema21: 0,
    ema50: 0,
    ema200: 0,
    bbUpper: 0,
    bbLower: 0,
    bbMid: 0,
    bbPosition: 0,
  };

  test('bullish when macd > signal', () => {
    const candle = { ...baseCandle, macd: 1.2, macdSignal: 0.8 };
    const { buy, sell } = getSignal(candle, 'macd_cross');
    expect(buy).toBe(true);
    expect(sell).toBe(false);
  });

  test('bearish when macd < signal', () => {
    const candle = { ...baseCandle, macd: -0.4, macdSignal: 0.1 };
    const { buy, sell } = getSignal(candle, 'macd_cross');
    expect(buy).toBe(false);
    expect(sell).toBe(true);
  });

  test('neutral when macd equals signal', () => {
    const candle = { ...baseCandle, macd: 0.5, macdSignal: 0.5 };
    const { buy, sell } = getSignal(candle, 'macd_cross');
    expect(buy).toBe(false);
    expect(sell).toBe(false);
  });
});

