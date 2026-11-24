import {
  calculateKellyPositionSize,
  getBotConfig,
  updateBotConfig,
  getBotTelemetry,
  evaluateAndExecuteStrategy
} from '../src/services/autoTradingBotService';
import { CandleData } from '../src/types';

describe('Auto Trading Bot Execution Service (Phase 1)', () => {
  beforeEach(() => {
    updateBotConfig('test_bot_user', {
      enabled: false,
      symbol: 'BTC',
      tradingMode: 'paper',
      leverage: 3,
      entryScoreThreshold: 75,
      exitScoreThreshold: 40,
      autoBreakEvenPct: 1.5,
      trailingAtrMultiplier: 2.0,
      maxRiskPerTradePct: 5.0,
    });
  });

  describe('Kelly Criterion & Position Sizing', () => {
    test('calculates correct Half-Kelly position fraction for standard parameters', () => {
      const equity = 10000;
      const currentPrice = 50000;
      const res = calculateKellyPositionSize(equity, currentPrice, 0.55, 1.8, 1000, 0.10);

      expect(res.quantity).toBeGreaterThan(0);
      expect(res.allocatedMargin).toBeLessThanOrEqual(equity * 0.10);
      expect(res.kellyFraction).toBeLessThanOrEqual(0.10);
    });

    test('reduces position size when ATR volatility is exceptionally high', () => {
      const equity = 10000;
      const currentPrice = 50000;
      // High ATR: 3000 USD (6% of price) vs Normal ATR: 500 USD (1% of price)
      const normalRes = calculateKellyPositionSize(equity, currentPrice, 0.55, 1.8, 500, 0.10);
      const volatileRes = calculateKellyPositionSize(equity, currentPrice, 0.55, 1.8, 3000, 0.10);

      expect(volatileRes.allocatedMargin).toBeLessThan(normalRes.allocatedMargin);
    });

    test('safely handles zero equity and zero price', () => {
      const res = calculateKellyPositionSize(0, 0);
      expect(res.quantity).toBe(0);
      expect(res.allocatedMargin).toBe(0);
    });
  });

  describe('Bot Configuration and State Management', () => {
    test('initializes default configuration properly', () => {
      const config = getBotConfig('test_bot_user');
      expect(config.accountId).toBe('test_bot_user');
      expect(config.enabled).toBe(false);
      expect(config.symbol).toBe('BTC');
      expect(config.leverage).toBe(3);
    });

    test('updates configuration correctly', () => {
      const updated = updateBotConfig('test_bot_user', {
        enabled: true,
        leverage: 5,
        entryScoreThreshold: 80,
      });

      expect(updated.enabled).toBe(true);
      expect(updated.leverage).toBe(5);
      expect(updated.entryScoreThreshold).toBe(80);
    });

    test('retrieves telemetry initialized for account', () => {
      const telemetry = getBotTelemetry('test_bot_user');
      expect(telemetry.accountId).toBe('test_bot_user');
      expect(telemetry.totalAutomatedTrades).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Signal-to-Execution Cycle', () => {
    const mockCandles: CandleData[] = Array.from({ length: 40 }, (_, i) => ({
      timestamp: Date.now() - (40 - i) * 60000,
      open: 50000 + i * 10,
      high: 50100 + i * 10,
      low: 49950 + i * 10,
      close: 50050 + i * 10,
      volume: 10000,
      ema9: 50020 + i * 10,
      ema21: 49980 + i * 10,
      ema200: 48000,
      rsi: 60,
      macd: 50,
      macdSignal: 30,
      macdHist: 20,
      supertrendDirection: 1,
      supertrend: 49000,
      atr: 250,
    }));

    test('returns HOLD if bot is disabled', async () => {
      updateBotConfig('test_bot_user', { enabled: false });
      const res = await evaluateAndExecuteStrategy('test_bot_user', mockCandles, 50500);

      expect(res.executed).toBe(false);
      expect(res.action).toBe('HOLD');
      expect(res.reason).toContain('disabled');
    });

    test('returns HOLD if market candle depth is insufficient', async () => {
      updateBotConfig('test_bot_user', { enabled: true });
      const res = await evaluateAndExecuteStrategy('test_bot_user', mockCandles.slice(0, 10), 50500);

      expect(res.executed).toBe(false);
      expect(res.action).toBe('HOLD');
      expect(res.reason).toContain('Insufficient');
    });

    test('executes BUY when High Conviction Confluence is met and bot is enabled', async () => {
      // @ts-ignore - increase timeout for async DB fallback path
      updateBotConfig('test_bot_user', {
        enabled: true,
        entryScoreThreshold: 60, // set achievable threshold
        tradingMode: 'paper',
      });

      const res = await evaluateAndExecuteStrategy('test_bot_user', mockCandles, 50500);

      expect(res.executed).toBe(true);
      expect(res.action).toBe('BUY');
      expect(res.reason).toContain('High Conviction');

      const telemetry = getBotTelemetry('test_bot_user');
      expect(telemetry.status).toBe('ORDER_PLACED');
      expect(telemetry.totalAutomatedTrades).toBeGreaterThanOrEqual(1);
    }, 15000);
  });
});
