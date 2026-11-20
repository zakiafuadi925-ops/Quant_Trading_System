import React from 'react';
import { History } from 'lucide-react';

export interface DrawdownEpisode {
  rank: number;
  peakDate: string;
  peakPrice: number;
  troughDate: string;
  troughPrice: number;
  dropPct: number;
  dropUsd: number;
  declineDays: number;
  status: string;
}

export interface DrawdownEpisodesTableProps {
  episodes: DrawdownEpisode[];
}

export const DrawdownEpisodesTable: React.FC<DrawdownEpisodesTableProps> = ({ episodes }) => (
  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
    <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-2 border-b border-slate-800">
      <History className="w-4 h-4 text-amber-400" />
      Worst Historical Drawdown Episodes Breakdown
    </h3>

    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs font-mono">
        <thead>
          <tr className="border-b border-slate-800 text-slate-400">
            <th className="py-2.5 px-3">Episode Rank</th>
            <th className="py-2.5 px-3">Peak Date &amp; Price</th>
            <th className="py-2.5 px-3">Trough Date &amp; Price</th>
            <th className="py-2.5 px-3 text-right">Decline (%)</th>
            <th className="py-2.5 px-3 text-right">Holdings Loss ($)</th>
            <th className="py-2.5 px-3 text-right">Capitulation Duration</th>
            <th className="py-2.5 px-3 text-right">Recovery Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {episodes.map((ep) => (
            <tr key={ep.rank} className="hover:bg-slate-800/40 transition-colors">
              <td className="py-2.5 px-3 font-bold text-white flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center text-[10px]">
                  #{ep.rank}
                </span>
                <span>{ep.rank === 1 ? 'Global Maximum Drawdown' : 'Secondary Drawdown'}</span>
              </td>
              <td className="py-2.5 px-3 text-slate-300">
                <div>{ep.peakDate}</div>
                <div className="text-[10px] text-slate-500">${ep.peakPrice.toLocaleString()}</div>
              </td>
              <td className="py-2.5 px-3 text-rose-400">
                <div>{ep.troughDate}</div>
                <div className="text-[10px] text-slate-500">${ep.troughPrice.toLocaleString()}</div>
              </td>
              <td className="py-2.5 px-3 text-right font-bold text-rose-400">
                -{ep.dropPct.toFixed(2)}%
              </td>
              <td className="py-2.5 px-3 text-right font-bold text-rose-400">
                -${ep.dropUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
              <td className="py-2.5 px-3 text-right text-slate-300">
                {ep.declineDays} Days
              </td>
              <td className="py-2.5 px-3 text-right">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${ep.status.includes('Recovered') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                  {ep.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);
