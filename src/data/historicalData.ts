import { CandleData } from "../types";
import { calculateIndicators } from "../utils/technicalIndicators";

/**
 * Compact seed OHLCV dataset for instant initial loading & offline resilience.
 * Full dynamic market datasets (BTC, ETH, SOL, BNB, ADA) are loaded dynamically
 * via fetchHistoricalCandles() from the server proxy / live exchanges / CSV archives.
 */
export const RAW_BTC_SEEDS = [
  { timestamp: "2026-01-15", open: 92450, high: 94100, low: 91800, close: 93850, volume: 28400000000 },
  { timestamp: "2026-01-16", open: 93850, high: 95500, low: 93200, close: 94900, volume: 31200000000 },
  { timestamp: "2026-01-17", open: 94900, high: 96200, low: 93900, close: 94100, volume: 29500000000 },
  { timestamp: "2026-01-18", open: 94100, high: 94400, low: 91200, close: 91800, volume: 34100000000 },
  { timestamp: "2026-01-19", open: 91800, high: 92600, low: 89500, close: 90200, volume: 38200000000 },
  { timestamp: "2026-01-20", open: 90200, high: 91400, low: 88900, close: 89400, volume: 36700000000 },
  { timestamp: "2026-01-21", open: 89400, high: 92100, low: 88700, close: 91500, volume: 41200000000 },
  { timestamp: "2026-01-22", open: 91500, high: 93400, low: 91100, close: 92800, volume: 33400000000 },
  { timestamp: "2026-01-23", open: 92800, high: 93200, low: 89900, close: 90400, volume: 35100000000 },
  { timestamp: "2026-01-24", open: 90400, high: 91800, low: 89200, close: 89950, volume: 27900000000 },
  { timestamp: "2026-01-25", open: 89950, high: 91200, low: 88400, close: 88700, volume: 30400000000 },
  { timestamp: "2026-01-26", open: 88700, high: 89600, low: 86500, close: 87100, volume: 38900000000 },
  { timestamp: "2026-01-27", open: 87100, high: 88900, low: 86100, close: 88400, volume: 36200000000 },
  { timestamp: "2026-01-28", open: 88400, high: 89200, low: 87300, close: 87800, volume: 29800000000 },
  { timestamp: "2026-01-29", open: 87800, high: 88600, low: 85200, close: 85600, volume: 43500000000 },
  { timestamp: "2026-01-30", open: 85600, high: 86400, low: 83900, close: 84200, volume: 48900000000 },
  { timestamp: "2026-01-31", open: 84200, high: 86100, low: 83500, close: 85800, volume: 44200000000 },
  { timestamp: "2026-02-01", open: 85800, high: 87400, low: 84900, close: 86900, volume: 37600000000 },
  { timestamp: "2026-02-02", open: 86900, high: 88200, low: 86100, close: 87600, volume: 35800000000 },
  { timestamp: "2026-02-03", open: 87600, high: 89500, low: 87000, close: 89100, volume: 39500000000 },
  { timestamp: "2026-02-04", open: 89100, high: 89800, low: 87500, close: 88200, volume: 33100000000 },
  { timestamp: "2026-02-05", open: 88200, high: 88700, low: 86400, close: 87100, volume: 31800000000 },
  { timestamp: "2026-02-06", open: 87100, high: 87900, low: 84800, close: 85300, volume: 37400000000 },
  { timestamp: "2026-02-07", open: 85300, high: 86200, low: 83200, close: 83900, volume: 41200000000 },
  { timestamp: "2026-02-08", open: 83900, high: 85100, low: 82100, close: 82800, volume: 46800000000 },
  { timestamp: "2026-02-09", open: 82800, high: 83600, low: 80800, close: 81200, volume: 52400000000 },
  { timestamp: "2026-02-10", open: 81200, high: 83900, low: 80400, close: 83400, volume: 56100000000 },
  { timestamp: "2026-02-11", open: 83400, high: 85200, low: 82800, close: 84700, volume: 43800000000 },
  { timestamp: "2026-02-12", open: 84700, high: 86800, low: 84100, close: 86200, volume: 41900000000 },
  { timestamp: "2026-02-13", open: 86200, high: 87500, low: 85000, close: 86800, volume: 38200000000 },
  { timestamp: "2026-02-14", open: 86800, high: 89400, low: 86200, close: 88900, volume: 45600000000 },
  { timestamp: "2026-02-15", open: 88900, high: 89600, low: 87200, close: 88400, volume: 36700000000 },
  { timestamp: "2026-02-16", open: 68782.4, high: 70067.2, low: 67301.6, close: 68843.2, volume: 33618145426 },
  { timestamp: "2026-02-17", open: 68843.1, high: 69201.9, low: 66615.3, close: 67494.2, volume: 34866936040 },
  { timestamp: "2026-02-18", open: 67488, high: 68434.4, low: 65845.9, close: 66425.3, volume: 33094301643 },
  { timestamp: "2026-02-19", open: 66425.6, high: 67277.1, low: 65637.4, close: 66957.5, volume: 31492987019 },
  { timestamp: "2026-02-20", open: 66957.5, high: 68900, low: 66400, close: 68420, volume: 36800000000 },
  { timestamp: "2026-02-21", open: 68420, high: 70200, low: 67900, close: 69850, volume: 38500000000 },
  { timestamp: "2026-02-22", open: 69850, high: 71400, low: 69100, close: 70950, volume: 35100000000 },
  { timestamp: "2026-02-23", open: 70950, high: 72800, low: 70200, close: 72400, volume: 42100000000 },
  { timestamp: "2026-02-24", open: 72400, high: 73500, low: 71600, close: 72850, volume: 38900000000 },
  { timestamp: "2026-02-25", open: 72850, high: 74200, low: 72100, close: 73900, volume: 41500000000 },
  { timestamp: "2026-02-26", open: 73900, high: 75800, low: 73400, close: 75200, volume: 46200000000 },
  { timestamp: "2026-02-27", open: 75200, high: 76400, low: 74300, close: 75800, volume: 39800000000 },
  { timestamp: "2026-02-28", open: 75800, high: 78100, low: 75400, close: 77600, volume: 51200000000 },
  { timestamp: "2026-03-01", open: 77600, high: 79500, low: 76800, close: 78900, volume: 48900000000 },
  { timestamp: "2026-03-02", open: 78900, high: 80800, low: 78200, close: 80200, volume: 53100000000 },
  { timestamp: "2026-03-03", open: 80200, high: 82400, low: 79600, close: 81900, volume: 56700000000 },
  { timestamp: "2026-03-04", open: 81900, high: 83500, low: 81100, close: 83100, volume: 51200000000 },
  { timestamp: "2026-03-05", open: 83100, high: 85900, low: 82700, close: 85263.08, volume: 59400000000 },
];

// Compute full technical indicators & signals dynamically
export const BTC_CANDLES: CandleData[] = calculateIndicators(RAW_BTC_SEEDS);
