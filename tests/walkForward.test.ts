import { 
  simulateBacktestSlice, 
  generateDefaultParamGrid, 
  runWalkForwardOptimization 
} from '../src/utils/walkForward';
import { CandleData } from '../src/types';

describe('Walk-Forward Analysis & Parameter Sweeper', () => {
  const mockCandles: CandleData[] = Array.from({ length: 100 }, (_, i) => ({
    timestamp: `2024-01-${String(i + 1).padStart(2, '0')}`,
    open: 100 + i * 2,
    high: 105 + i * 2,
    low: 98 + i * 2,
    close: 102 + i * 2,
    volume: 1000,
    rsi: 45 + (i % 20),
    macd: 1.5,
    macdSignal: 1.0,
    macdHist: 0.5,
    ema9: 100 + i * 2,
    ema21: 95 + i * 2,
    ema50: 90 + i * 2,
    ema200: 80 + i * 2,
    bbUpper: 110 + i * 2,
    bbLower: 90 + i * 2,
    bbMid: 100 + i * 2,
    bbPosition: 0.6,
    supertrend: 92 + i * 2,
    supertrendDirection: 1,
    directionProb: 0.55,
  }));

  describe('simulateBacktestSlice', () => {
    it('handles empty or single candle gracefully without crashing', () => {
      const res = simulateBacktestSlice([], 'supertrend');
      expect(res.finalEquity).toBe(1000);
      expect(res.totalReturnPct).toBe(0);
      expect(res.tradesCount).toBe(0);
    });

    it('executes trades and returns valid financial metrics', () => {
      const res = simulateBacktestSlice(mockCandles, 'supertrend', {}, 1000, 0.001);
      expect(res.finalEquity).toBeGreaterThan(0);
      expect(Number.isFinite(res.sharpeRatio)).toBe(true);
      expect(res.maxDrawdown).toBeGreaterThanOrEqual(0);
    });
  });

  describe('generateDefaultParamGrid', () => {
    it('generates customized grid for ensemble model', () => {
      const grid = generateDefaultParamGrid('ensemble');
      expect(grid.length).toBeGreaterThan(0);
      expect(grid[0]).toHaveProperty('scoreThreshold');
      expect(grid[0]).toHaveProperty('exitScoreThreshold');
    });

    it('generates customized grid for lstm model', () => {
      const grid = generateDefaultParamGrid('lstm');
      expect(grid.length).toBeGreaterThan(0);
      expect(grid[0]).toHaveProperty('threshold');
    });

    it('generates stop-loss and take-profit grid for technical models', () => {
      const grid = generateDefaultParamGrid('macd_cross');
      expect(grid.length).toBeGreaterThan(0);
      expect(grid[0]).toHaveProperty('stopLossPct');
    });
  });

  describe('runWalkForwardOptimization', () => {
    it('splits candles into IS and OOS portions and computes WFE', () => {
      const grid = [
        { scoreThreshold: 70, exitScoreThreshold: 40, stopLossPct: 0 },
        { scoreThreshold: 60, exitScoreThreshold: 35, stopLossPct: 3 },
      ];

      const result = runWalkForwardOptimization(mockCandles, 'ensemble', grid, 0.70);

      expect(result.totalBars).toBe(100);
      expect(result.inSampleBars).toBe(70);
      expect(result.outOfSampleBars).toBe(30);
      expect(result.candidates.length).toBe(2);
      expect(result.bestCandidate).toBeDefined();
      expect(result.bestCandidate.robustnessScore).toBeGreaterThanOrEqual(0);
      expect(['LOW', 'MODERATE', 'HIGH']).toContain(result.bestCandidate.overfitRisk);
    });
  });
});
