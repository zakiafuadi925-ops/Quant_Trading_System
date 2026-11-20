import React from 'react';
import { BarChart3 } from 'lucide-react';

export interface HistogramBucket {
  min: number;
  max: number;
  mid: number;
  count: number;
}

export interface ReturnDistributionProps {
  histogramBuckets: HistogramBucket[];
  maxBucketCount: number;
  historicalVaRPct: number;
  returns: number[];
  activeCandles: Array<{ timestamp: string }>;
}

export const ReturnDistribution: React.FC<ReturnDistributionProps> = ({
  histogramBuckets,
  maxBucketCount,
  historicalVaRPct,
  returns,
  activeCandles,
}) => (
  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
      <div>
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-rose-400" />
          Daily Return Distribution &amp; Value at Risk Thresholds
        </h3>
        <p className="text-xs text-slate-400">
          Histogram of daily returns evaluated over active {activeCandles.length} candles ({activeCandles[0]?.timestamp?.split(' ')[0]} to {activeCandles[activeCandles.length - 1]?.timestamp?.split(' ')[0]})
        </p>
      </div>

      <div className="flex items-center gap-3 text-xs font-mono">
        <span className="flex items-center gap-1.5 text-rose-400 font-semibold">
          <span className="w-2.5 h-2.5 bg-rose-500 rounded-sm" />
          VaR Left-Tail (Loss Region)
        </span>
        <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm" />
          Normal / Profit Region
        </span>
      </div>
    </div>

    {/* Histogram Bar Graphic */}
    <div className="grid grid-cols-16 gap-1.5 h-44 items-end pt-4 px-2 pb-2 bg-slate-950/70 rounded-xl border border-slate-800/80">
      {histogramBuckets.map((b, idx) => {
        const heightPct = (b.count / maxBucketCount) * 100;
        const isTail = b.mid < -(historicalVaRPct / 100);
        const isPositive = b.mid >= 0;

        return (
          <div
            key={idx}
            className="flex flex-col items-center gap-1 h-full justify-end group relative"
          >
            <div
              className={`w-full rounded-t transition-all ${
                isTail
                  ? 'bg-rose-500 group-hover:bg-rose-400 shadow-sm shadow-rose-500/30'
                  : isPositive
                  ? 'bg-emerald-500/80 group-hover:bg-emerald-400'
                  : 'bg-amber-500/80 group-hover:bg-amber-400'
              }`}
              style={{ height: `${Math.max(4, heightPct)}%` }}
            />

            {/* Tooltip on hover */}
            <div className="absolute -top-12 z-20 hidden group-hover:flex flex-col items-center bg-slate-900 border border-slate-700 p-1.5 rounded text-[10px] text-white font-mono whitespace-nowrap shadow-xl">
              <span>Return: {(b.mid * 100).toFixed(1)}%</span>
              <span className="text-slate-400">{b.count} days</span>
            </div>
          </div>
        );
      })}
    </div>

    <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 px-2">
      <span>Worst Loss in Period: {((Math.min(...returns, 0)) * 100).toFixed(2)}%</span>
      <span>Zero Line (0.00%)</span>
      <span>Best Gain in Period: {((Math.max(...returns, 0)) * 100).toFixed(2)}%</span>
    </div>
  </div>
);
