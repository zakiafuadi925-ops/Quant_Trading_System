import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { connectToDatabase } from '../db/mongodb.js';
import { CandleModel, ICandle } from '../db/models/Candle.js';

// Cross-environment project root resolver (CJS Jest & ESM compatible)
const projectRoot = process.cwd();

export const SUPPORTED_SYMBOLS = ['BTC', 'ETH', 'SOL', 'BNB', 'ADA'];

const INTERVAL_MS_MAP: Record<string, number> = {
  '1m': 60 * 1000,
  '5m': 5 * 60 * 1000,
  '15m': 15 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '4h': 4 * 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000,
};

// Throttle exchange sync attempts to avoid hammering the exchange and slowing down responses
const lastSyncAttemptMap = new Map<string, number>();
const SYNC_COOLDOWN_MS = 60 * 1000; // 1 minute cooldown between exchange sync attempts
let isInitialRun = true;

// In-memory LRU-like Cache Tier for sub-millisecond query returns
interface CacheEntry {
  data: {
    source: string;
    candles: Array<{ timestamp: string; open: number; high: number; low: number; close: number; volume: number }>;
  };
  cachedAt: number;
}
const memoryKlinesCache = new Map<string, CacheEntry>();
const MEMORY_CACHE_TTL_MS = 15 * 1000; // 15 seconds fast tier

async function fetchWithTimeout(url: string, ms = 2500) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

/**
 * Seed historical candles from local CSV if exists
 */
export async function seedCandlesFromCsv(symbol: string, interval = '1d'): Promise<number> {
  const normSymbol = symbol.toUpperCase().replace('USDT', '').replace('/USDT', '').replace('-USD', '');
  const csvPath = path.resolve(projectRoot, `trading_data/${normSymbol}_trading_data.csv`);
  if (!fs.existsSync(csvPath)) return 0;

  try {
    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = fileContent.trim().split('\n');
    if (lines.length <= 1) return 0;

    const rows = lines.slice(1);
    const docs: Array<Partial<ICandle>> = [];

    for (const line of rows) {
      const cols = line.split(',');
      const dateStr = cols[0]?.trim();
      const open = parseFloat(cols[1]);
      const high = parseFloat(cols[2]);
      const low = parseFloat(cols[3]);
      const close = parseFloat(cols[4]);
      const volume = parseFloat(cols[5]) || 0;

      if (!dateStr || isNaN(close) || close <= 0) continue;

      const openTime = new Date(`${dateStr}T00:00:00.000Z`).getTime();
      if (isNaN(openTime)) continue;

      docs.push({
        symbol: normSymbol,
        interval,
        openTime,
        timestamp: dateStr,
        open: open || close,
        high: high || close,
        low: low || close,
        close,
        volume
      });
    }

    if (docs.length === 0) return 0;

    // Use bulkWrite with upsert to prevent duplicates
    const operations = docs.map((doc) => ({
      updateOne: {
        filter: { symbol: doc.symbol, interval: doc.interval, openTime: doc.openTime },
        update: { $set: doc },
        upsert: true
      }
    }));

    const result = await CandleModel.bulkWrite(operations, { ordered: false });
    return (result.upsertedCount || 0) + (result.modifiedCount || 0);
  } catch (err) {
    console.warn(`[CandleSync] CSV seed warning for ${normSymbol}:`, err);
    return 0;
  }
}

/**
 * Bulk seed all supported crypto assets into MongoDB
 */
export async function seedAllSupportedAssets(interval = '1d'): Promise<Record<string, number>> {
  await connectToDatabase();
  const summary: Record<string, number> = {};

  for (const sym of SUPPORTED_SYMBOLS) {
    const count = await CandleModel.countDocuments({ symbol: sym, interval });
    if (count === 0) {
      const seeded = await seedCandlesFromCsv(sym, interval);
      summary[sym] = seeded;
    } else {
      summary[sym] = count;
    }
  }

  return summary;
}

/**
 * Fetch new/missing candles from Binance API incrementally
 */
export async function fetchLatestCandlesFromExchange(
  symbol: string,
  interval = '1d',
  startTime?: number
): Promise<number> {
  const normSymbol = symbol.toUpperCase().replace('USDT', '').replace('/USDT', '').replace('-USD', '');
  try {
    const binancePair = `${normSymbol}USDT`;
    let url = `https://api.binance.com/api/v3/klines?symbol=${binancePair}&interval=${interval}&limit=500`;
    if (startTime && startTime > 0) {
      url += `&startTime=${startTime}`;
    }

    const res = await fetchWithTimeout(url, 3000);
    if (!res.ok) return 0;

    const raw = await res.json();
    if (!Array.isArray(raw) || raw.length === 0) return 0;

    const operations = raw.map((k: any) => {
      const openTime = Number(k[0]);
      const iso = new Date(openTime).toISOString();
      const timestamp =
        iso.split('T')[0] +
        (interval === '1h' || interval === '4h' ? ' ' + iso.split('T')[1].slice(0, 5) : '');

      const doc: Partial<ICandle> = {
        symbol: normSymbol,
        interval,
        openTime,
        timestamp,
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5]) || 0
      };

      return {
        updateOne: {
          filter: { symbol: normSymbol, interval, openTime },
          update: { $set: doc },
          upsert: true
        }
      };
    });

    const result = await CandleModel.bulkWrite(operations, { ordered: false });
    return (result.upsertedCount || 0) + (result.modifiedCount || 0);
  } catch (err) {
    console.warn(`[CandleSync] Binance incremental fetch warning for ${normSymbol}:`, (err as any)?.message || err);
    return 0;
  }
}

/**
 * Sync background worker across all supported assets
 */
export async function syncAllAssetsIncremental(interval = '1d'): Promise<Record<string, { latest: string | null; synced: number }>> {
  await connectToDatabase();
  const report: Record<string, { latest: string | null; synced: number }> = {};
  const intervalMs = INTERVAL_MS_MAP[interval] || 24 * 60 * 60 * 1000;
  const now = Date.now();

  for (const sym of SUPPORTED_SYMBOLS) {
    const latest = await CandleModel.findOne({ symbol: sym, interval }).sort({ openTime: -1 }).lean();
    if (!latest) {
      // First-time seed if empty
      const seeded = await seedCandlesFromCsv(sym, interval);
      report[sym] = { latest: null, synced: seeded };
    } else {
      let synced = 0;
      if (now - latest.openTime > intervalMs) {
        synced = await fetchLatestCandlesFromExchange(sym, interval, latest.openTime + 1);
      }
      report[sym] = { latest: latest.timestamp, synced };
    }
  }

  // Clear memory cache to ensure fresh state
  memoryKlinesCache.clear();
  return report;
}

/**
 * Primary function: Get candles from MongoDB with auto-incremental sync & LRU cache
 */
export async function getCachedOrSyncCandles(
  symbol: string,
  interval = '1d',
  limit = 90
): Promise<{ source: string; candles: Array<{ timestamp: string; open: number; high: number; low: number; close: number; volume: number }> }> {
  const normSymbol = symbol.toUpperCase().replace('USDT', '').replace('/USDT', '').replace('-USD', '');
  const cacheKey = `${normSymbol}_${interval}_${limit}`;
  const now = Date.now();

  // Tier 1: Check In-Memory Fast Cache
  const memoryHit = memoryKlinesCache.get(cacheKey);
  if (memoryHit && now - memoryHit.cachedAt < MEMORY_CACHE_TTL_MS) {
    return {
      source: `${memoryHit.data.source} (In-Memory Tier)`,
      candles: memoryHit.data.candles
    };
  }
  
  // 1. Connect to MongoDB
  const conn = await connectToDatabase();

  // If MongoDB is unavailable, return empty to trigger fallback
  if (!conn) {
    return { source: 'database_unavailable', candles: [] };
  }

  try {
    // 2. Check if we already have candles in MongoDB
    const count = await CandleModel.countDocuments({ symbol: normSymbol, interval });

    if (count === 0) {
      // First-time seed: Try local CSV first for fast population of years of data
      console.log(`[CandleSync] Seeding initial database klines for ${normSymbol} (${interval})...`);
      const seeded = await seedCandlesFromCsv(normSymbol, interval);
      console.log(`[CandleSync] Seeded ${seeded} historical records from CSV.`);
      
      // Also fetch recent candles from exchange
      await fetchLatestCandlesFromExchange(normSymbol, interval);
    } else {
      // Incremental sync: check latest candle
      const latest = await CandleModel.findOne({ symbol: normSymbol, interval }).sort({ openTime: -1 }).lean();
      if (latest) {
        const intervalMs = INTERVAL_MS_MAP[interval] || 24 * 60 * 60 * 1000;
        const syncKey = `${normSymbol}_${interval}`;
        const lastAttempt = lastSyncAttemptMap.get(syncKey) || 0;

        // If latest candle is older than the interval AND cooldown has passed, trigger background non-blocking sync
        if (now - latest.openTime > intervalMs && now - lastAttempt > SYNC_COOLDOWN_MS) {
          lastSyncAttemptMap.set(syncKey, now);
          const startTime = latest.openTime + 1;
          // Non-blocking asynchronous sync so user queries return instantly from MongoDB
          fetchLatestCandlesFromExchange(normSymbol, interval, startTime)
            .then((synced) => {
              if (synced > 0) {
                console.log(`[CandleSync] Incrementally added ${synced} fresh candles for ${normSymbol}.`);
                memoryKlinesCache.delete(cacheKey);
              }
            })
            .catch(() => {});
        }
      }
    }

    // 3. Query the requested limit of candles from MongoDB sorted chronologically
    const docs = await CandleModel.find({ symbol: normSymbol, interval })
      .sort({ openTime: -1 })
      .limit(limit)
      .lean();

    // Reverse to chronological order (oldest to newest)
    const candles = docs.reverse().map((d) => ({
      timestamp: d.timestamp,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
      volume: d.volume
    }));

    const result = {
      source: 'MongoDB Historical Database (Incremental Sync)',
      candles
    };

    // Store in memory cache tier
    memoryKlinesCache.set(cacheKey, { data: result, cachedAt: now });

    return result;
  } catch (err) {
    console.warn(`[CandleSync] Error querying MongoDB for ${normSymbol}:`, err);
    return { source: 'database_error', candles: [] };
  }
}
