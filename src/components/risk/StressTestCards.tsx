import React from 'react';
import { ShieldCheck } from 'lucide-react';

export interface StressTestCardsProps {
  currentPrice: number;
  positionValueUsd: number;
  btcAmount: number;
}

export const StressTestCards: React.FC<StressTestCardsProps> = ({ currentPrice, positionValueUsd, btcAmount }) => (
  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
    <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-800">
      <ShieldCheck className="w-4 h-4 text-cyan-400" />
      Portfolio Scenario Stress Testing (Shock Analysis)
    </h3>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
      <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
        <div className="flex justify-between items-center">
          <span className="font-bold text-rose-400">Flash Crash (-10%)</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
            Severe Dip
          </span>
        </div>
        <div className="text-slate-300">
          BTC Price: ${Math.round(currentPrice * 0.90).toLocaleString()}
        </div>
        <div className="text-base font-bold text-rose-400">
          -${(positionValueUsd * 0.10).toFixed(2)} USD
        </div>
        <p className="text-[10px] text-slate-500 font-sans">
          Expected loss on {btcAmount} BTC holding during rapid liquidity drain.
        </p>
      </div>

      <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
        <div className="flex justify-between items-center">
          <span className="font-bold text-rose-500">Black Swan (-25%)</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
            Extreme Shock
          </span>
        </div>
        <div className="text-slate-300">
          BTC Price: ${Math.round(currentPrice * 0.75).toLocaleString()}
        </div>
        <div className="text-base font-bold text-rose-500">
          -${(positionValueUsd * 0.25).toFixed(2)} USD
        </div>
        <p className="text-[10px] text-slate-500 font-sans">
          Historical macro capitulation shock (e.g. Luna / FTX collapse magnitude).
        </p>
      </div>

      <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
        <div className="flex justify-between items-center">
          <span className="font-bold text-emerald-400">Bull Expansion (+20%)</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Breakout Surge
          </span>
        </div>
        <div className="text-slate-300">
          BTC Price: ${Math.round(currentPrice * 1.20).toLocaleString()}
        </div>
        <div className="text-base font-bold text-emerald-400">
          +${(positionValueUsd * 0.20).toFixed(2)} USD
        </div>
        <p className="text-[10px] text-slate-500 font-sans">
          Upside equity expansion if BTC breaks resistance.
        </p>
      </div>
    </div>
  </div>
);
