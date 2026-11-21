import { seedCandlesFromCsv, SUPPORTED_SYMBOLS } from '../src/controllers/candleController';
import { CandleModel } from '../src/db/models/Candle';

describe('Multi-Asset Database Seeding & Pipeline (Phase 1)', () => {
  it('defines 5 supported institutional crypto universe assets', () => {
    expect(SUPPORTED_SYMBOLS).toEqual(['BTC', 'ETH', 'SOL', 'BNB', 'ADA']);
  });

  it('verifies CSV parser gracefully handles missing files', async () => {
    const seeded = await seedCandlesFromCsv('NON_EXISTENT_COIN');
    expect(seeded).toBe(0);
  });

  it('validates Candle schema indexes for compound query optimization', () => {
    const indexes = CandleModel.schema.indexes();
    // Verify compound unique index
    const uniqueIndex = indexes.find(
      (idx) => idx[0].symbol === 1 && idx[0].interval === 1 && idx[0].openTime === 1
    );
    expect(uniqueIndex).toBeDefined();
    expect(uniqueIndex?.[1]?.unique).toBe(true);

    // Verify reverse chronological index for ultra-fast time-series slicing
    const reverseIndex = indexes.find(
      (idx) => idx[0].symbol === 1 && idx[0].interval === 1 && idx[0].openTime === -1
    );
    expect(reverseIndex).toBeDefined();
  });
});
