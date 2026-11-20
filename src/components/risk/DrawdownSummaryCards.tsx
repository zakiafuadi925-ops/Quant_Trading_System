import React from 'react';
import { TrendingDown, Clock, Target, Activity } from 'lucide-react';

export interface DrawdownSummaryCardsProps {
  metrics: {
    maxDrawdown: number;
    mddLossPosition: number;
    mddPeak: number;
    mddPeakDate: string;
    mddTrough: number;
    mddTroughDate: string;
    declineDays: number;
    recoveryDays: number | null;
    isRecovered: boolean;
    currentDdPct: number;
    currentDdUsd: number;
    athPrice: number;
    ulcerIndex: number;
    calmarRatio: number;
  };
  positionValueUsd: number;
}

export const DrawdownSummaryCards: React.FC<DrawdownSummaryCardsProps> = ({ metrics }) => (
  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
    {/* Card 1: Worst Historical Peak-to-Trough Decline */}
    <div className="bg-slate-900 border border-rose-500/30 rounded-2xl p-5 shadow-xl space-y-2 relative overflow-hidden">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-rose-400 flex items-center gap-1.5">
          <TrendingDown className="w-4 h-4 text-rose-500" />
          Maximum Drawdown (MDD)
        </span>
        <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 text-[10px] font-mono font-bold border border-rose-500/30">
          HISTORICAL WORST
        </span>
      </div>

      <div className="text-2xl font-bold font-mono text-rose-400">
        -{metrics.maxDrawdown.toFixed(2)}%
      </div>

      <div className="text-xs font-mono text-slate-300">
        -${metrics.mddLossPosition.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} on your position
      </div>

      <div className="pt-2 border-t border-slate-800 text-[11px] font-mono text-slate-400 space-y-0.5">
        <div>Peak: <strong className="text-white">${metrics.mddPeak.toLocaleString()}</strong> ({metrics.mddPeakDate})</div>
        <div>Trough: <strong className="text-rose-400">${metrics.mddTrough.toLocaleString()}</strong> ({metrics.mddTroughDate})</div>
      </div>
    </div>

    {/* Card 2: Decline & Recovery Duration */}
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-amber-400 flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-amber-400" />
          Drawdown Timeline
        </span>
        <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] font-mono">
          CYCLE DURATION
        </span>
      </div>

      <div className="text-2xl font-bold font-mono text-white">
        {metrics.declineDays} Days
      </div>

      <div className="text-xs text-slate-400">
        Peak to Valley Capitulation
      </div>

      <div className="pt-2 border-t border-slate-800 text-[11px] font-mono text-slate-300 flex items-center justify-between">
        <span>Recovery Status:</span>
        <span className={`font-bold ${metrics.isRecovered ? 'text-emerald-400' : 'text-amber-400'}`}>
          {metrics.isRecovered ? `Recovered in ${metrics.recoveryDays}d` : 'In Drawdown'}
        </span>
      </div>
    </div>

    {/* Card 3: Current Distance from All-Time High */}
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-cyan-400 flex items-center gap-1.5">
          <Target className="w-4 h-4 text-cyan-400" />
          Current Drop from Peak
        </span>
        <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 text-[10px] font-mono">
          REAL-TIME ATH
        </span>
      </div>

      <div className="text-2xl font-bold font-mono text-slate-100">
        -{metrics.currentDdPct.toFixed(2)}%
      </div>

      <div className="text-xs text-slate-400">
        ATH: ${metrics.athPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>

      <div className="pt-2 border-t border-slate-800 text-[11px] font-mono text-slate-400 flex items-center justify-between">
        <span>Gap to New ATH:</span>
        <span className="text-rose-400 font-bold">-${metrics.currentDdUsd.toFixed(2)} USD</span>
      </div>
    </div>

    {/* Card 4: Ulcer Index & Calmar Ratio */}
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-purple-400 flex items-center gap-1.5">
          <Activity className="w-4 h-4 text-purple-400" />
          Ulcer Index &amp; Calmar
        </span>
        <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 text-[10px] font-mono">
          STRESS SCORE
        </span>
      </div>

      <div className="text-2xl font-bold font-mono text-purple-400">
        {metrics.ulcerIndex.toFixed(2)}
      </div>

      <div className="text-xs text-slate-400">
        Ulcer Index (Depth × Duration)
      </div>

      <div className="pt-2 border-t border-slate-800 text-[11px] font-mono text-slate-300 flex items-center justify-between">
        <span>Calmar Ratio:</span>
        <span className="text-emerald-400 font-bold">{metrics.calmarRatio.toFixed(2)}x</span>
      </div>
    </div>
  </div>
);
