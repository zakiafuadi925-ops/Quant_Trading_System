import { extractFeaturesV5, runInferenceV5, FEATURE_NAMES_V5 } from '../src/utils/featurePipeline';
import { CandleData } from '../src/types';
import { calculateIndicators } from '../src/utils/technicalIndicators';

describe('FeaturePipeline & ML Inference Engine', () => {
  // Generate synthetic sequence of 65 candles
  const mockCandles: CandleData[] = Array.from({ length: 70 }, (_, i) => {
    const base = 50000 + i * 250 + Math.sin(i / 5) * 600;
    return {
      timestamp: `2026-01-${String(i + 1).padStart(2, '0')}`,
      open: base - 50,
      high: base + 150,
      low: base - 100,
      close: base + 80,
      volume: 15000 + (i % 5) * 2000,
    };
  });

  const enrichedCandles = calculateIndicators(mockCandles);

  it('extracts all 17 features correctly according to LSTM v5.2.1 specification', () => {
    const features = extractFeaturesV5(enrichedCandles, enrichedCandles.length - 1);

    expect(FEATURE_NAMES_V5).toHaveLength(17);
    FEATURE_NAMES_V5.forEach((name) => {
      expect(typeof features[name]).toBe('number');
      expect(isNaN(features[name])).toBe(false);
    });

    // Check boundary ranges
    expect(features.rsi_14).toBeGreaterThanOrEqual(0);
    expect(features.rsi_14).toBeLessThanOrEqual(1);
    expect(features.range_pct).toBeGreaterThan(0);
    expect(features.body_pct).toBeGreaterThanOrEqual(0);
  });

  it('runs calibrated inference and generates structured ML signal', () => {
    const result = runInferenceV5(enrichedCandles, 0.015, 60);

    expect(result.model).toBe('v5.2.1');
    expect(['UP', 'DOWN']).toContain(result.predictedDirection);
    expect(result.directionConfidence).toBeGreaterThanOrEqual(0);
    expect(result.directionConfidence).toBeLessThanOrEqual(1);
    expect(['STRONG_BUY', 'BUY', 'HOLD', 'SELL', 'STRONG_SELL']).toContain(result.signal);
    expect(result.lookbackBars).toBe(60);
    expect(result.featureVector).toHaveLength(17);
    expect(result.mae).toBe(0.0165);
  });

  it('respects hurdle rate threshold when generating signals', () => {
    // With ultra-high threshold (e.g. 50%), the signal MUST be HOLD
    const conservative = runInferenceV5(enrichedCandles, 0.50, 60);
    expect(conservative.signal).toBe('HOLD');

    // With tiny threshold (0.0001%), it should generate a trade action
    const aggressive = runInferenceV5(enrichedCandles, 0.0001, 60);
    expect(['STRONG_BUY', 'BUY', 'STRONG_SELL', 'SELL']).toContain(aggressive.signal);
  });
});
