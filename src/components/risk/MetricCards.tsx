import React from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  TrendingDown,
  Zap,
  Activity,
} from 'lucide-react';

// Helper Icon component for Calmar
const AwardIcon = () => (
  <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="8" r="6" />
    <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
  </svg>
);

export interface MetricCardsProps {
  metrics: {
    parametricVaRUsd: number;
    parametricVaRPct: number;
    historicalVaRUsd: number;
    historicalVaRPct: number;
    cvarUsd: number;
    cvarPct: number;
    sharpeRatio: number;
    sortinoRatio: number;
    calmarRatio: number;
  };
  confidenceLevel: number;
  holdingPeriodDays: number;
}

export const MetricCards: React.FC<MetricCardsProps> = ({ metrics, confidenceLevel, holdingPeriodDays }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
    {/* Parametric VaR Card */}
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-1">
      <div className="flex items-center justify-between text-slate-400 text-xs">
        <span>Parametric VaR ({confidenceLevel}%)</span>
        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
      </div>
      <div className="text-lg font-bold font-mono text-rose-400 mt-0.5">
        ${metrics.parametricVaRUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
      <div className="text-[11px] font-mono text-slate-400">
        -{metrics.parametricVaRPct.toFixed(2)}% over {holdingPeriodDays}d
      </div>
    </div>

    {/* Historical VaR Card */}
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-1">
      <div className="flex items-center justify-between text-slate-400 text-xs">
        <span>Historical VaR ({confidenceLevel}%)</span>
        <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
      </div>
      <div className="text-lg font-bold font-mono text-amber-400 mt-0.5">
        ${metrics.historicalVaRUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
      <div className="text-[11px] font-mono text-slate-400">
        -{metrics.historicalVaRPct.toFixed(2)}% quantile cutoff
      </div>
    </div>

    {/* Expected Shortfall (CVaR) */}
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-1">
      <div className="flex items-center justify-between text-slate-400 text-xs">
        <span>Expected Shortfall (CVaR)</span>
        <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
      </div>
      <div className="text-lg font-bold font-mono text-rose-500 mt-0.5">
        ${metrics.cvarUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
      <div className="text-[11px] font-mono text-slate-400">
        -{metrics.cvarPct.toFixed(2)}% tail average
      </div>
    </div>

    {/* Sharpe Ratio Card */}
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-1">
      <div className="flex items-center justify-between text-slate-400 text-xs">
        <span>Annualized Sharpe</span>
        <Zap className="w-3.5 h-3.5 text-emerald-400" />
      </div>
      <div className={`text-lg font-bold font-mono mt-0.5 ${metrics.sharpeRatio >= 1.0 ? 'text-emerald-400' : metrics.sharpeRatio >= 0 ? 'text-amber-400' : 'text-rose-400'}`}>
        {metrics.sharpeRatio.toFixed(2)}x
      </div>
      <div className="text-[10px] text-slate-400">
        {metrics.sharpeRatio >= 2.0 ? 'Exceptional' : metrics.sharpeRatio >= 1.0 ? 'Good risk-adjusted' : 'Sub-optimal'}
      </div>
    </div>

    {/* Sortino Ratio Card */}
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-1">
      <div className="flex items-center justify-between text-slate-400 text-xs">
        <span>Sortino Ratio</span>
        <Activity className="w-3.5 h-3.5 text-cyan-400" />
      </div>
      <div className="text-lg font-bold font-mono text-cyan-400 mt-0.5">
        {metrics.sortinoRatio.toFixed(2)}x
      </div>
      <div className="text-[10px] text-slate-400">
        Downside penalization only
      </div>
    </div>

    {/* Calmar Ratio */}
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-1">
      <div className="flex items-center justify-between text-slate-400 text-xs">
        <span>Calmar Ratio</span>
        <AwardIcon />
      </div>
      <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
        {metrics.calmarRatio.toFixed(2)}x
      </div>
      <div className="text-[10px] text-slate-400">
        Annual Return / MDD
      </div>
    </div>
  </div>
);
