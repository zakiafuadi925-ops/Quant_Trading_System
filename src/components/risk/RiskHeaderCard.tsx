import React from 'react';
import { ShieldAlert, Calendar, Coins } from 'lucide-react';

export interface RiskHeaderCardProps {
  positionValueUsd: number;
  btcAmount: number;
  setBtcAmount: (v: number) => void;
  currentPrice: number;
  confidenceLevel: 90 | 95 | 99;
  setConfidenceLevel: (v: 90 | 95 | 99) => void;
  holdingPeriodDays: number;
  setHoldingPeriodDays: (v: number) => void;
  isCustomHorizon: boolean;
  setIsCustomHorizon: (v: boolean) => void;
  annualRiskFreeRate: number;
  setAnnualRiskFreeRate: (v: number) => void;
  lookbackMode: 'all' | '14d' | '30d' | 'custom';
  setLookbackMode: (v: 'all' | '14d' | '30d' | 'custom') => void;
  customStartDate: string;
  setCustomStartDate: (v: string) => void;
  customEndDate: string;
  setCustomEndDate: (v: string) => void;
  minDate: string;
  maxDate: string;
  activeCandles: Array<{ timestamp: string }>;
}

export const RiskHeaderCard: React.FC<RiskHeaderCardProps> = ({
  positionValueUsd,
  btcAmount,
  setBtcAmount,
  currentPrice,
  confidenceLevel,
  setConfidenceLevel,
  holdingPeriodDays,
  setHoldingPeriodDays,
  isCustomHorizon,
  setIsCustomHorizon,
  annualRiskFreeRate,
  setAnnualRiskFreeRate,
  lookbackMode,
  setLookbackMode,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
  minDate,
  maxDate,
  activeCandles,
}) => (
  <div className="bg-gradient-to-r from-slate-900 via-rose-950/20 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
      <div className="max-w-2xl">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold mb-2 font-mono">
          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          Maximum Drawdown, VaR &amp; Correlation Analytics
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight">
          Value at Risk (VaR), Maximum Drawdown &amp; Volatility Correlation
        </h2>
        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
          Analyze historical peak-to-trough capital declines, empirical tail risk (VaR &amp; CVaR), and quantify how Bitcoin price momentum correlates with volatility regime shifts.
        </p>
      </div>

      <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl font-mono text-xs text-right space-y-1">
        <span className="text-slate-400">Position Value:</span>
        <div className="text-lg font-bold text-emerald-400">
          ${positionValueUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className="text-[11px] text-slate-400">
          {btcAmount.toFixed(4)} BTC @ ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>
    </div>

    {/* Custom Historical Analysis Period Filter Toolbar */}
    <div className="mt-5 pt-4 border-t border-slate-800/80 space-y-3 font-mono text-xs">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-slate-200">Historical Lookback Window:</span>
        </div>

        {/* Presets + Custom Button */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'all', label: 'All History' },
            { id: '14d', label: 'Last 14d' },
            { id: '30d', label: 'Last 30d' },
            { id: 'custom', label: 'Custom Date Range' }
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => setLookbackMode(p.id as 'all' | '14d' | '30d' | 'custom')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                lookbackMode === p.id
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Date Pickers when 'custom' is active */}
      {lookbackMode === 'custom' && (
        <div className="p-3 bg-slate-950/90 rounded-xl border border-amber-500/30 flex flex-wrap items-center gap-4 animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-xs">Start Date:</span>
            <input
              type="date"
              min={minDate}
              max={customEndDate}
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white font-mono text-xs focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-xs">End Date:</span>
            <input
              type="date"
              min={customStartDate}
              max={maxDate}
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white font-mono text-xs focus:border-amber-500 focus:outline-none"
            />
          </div>

          <span className="text-amber-400 text-[11px] ml-auto">
            Evaluating {activeCandles.length} candles in range
          </span>
        </div>
      )}

      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
        <span>
          Active Data Scope: <strong className="text-slate-300">{activeCandles[0]?.timestamp?.split(' ')[0]}</strong> to <strong className="text-slate-300">{activeCandles[activeCandles.length - 1]?.timestamp?.split(' ')[0]}</strong>
        </span>
        <span className="text-cyan-400 font-semibold">
          Sample Size: {activeCandles.length} trading sessions
        </span>
      </div>
    </div>

    {/* Holdings and Risk Controls Row */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4 mt-3 border-t border-slate-800/80 font-mono text-xs">
      {/* BTC Holdings Input */}
      <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
        <span className="text-slate-400 block mb-1">BTC Holdings</span>
        <div className="flex items-center gap-2">
          <input
            type="number"
            step="0.01"
            min="0.001"
            value={btcAmount}
            onChange={(e) => setBtcAmount(Math.max(0.001, Number(e.target.value)))}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white font-bold w-full text-right focus:border-rose-500 focus:outline-none"
          />
          <span className="text-slate-400 font-semibold">BTC</span>
        </div>
      </div>

      {/* Confidence Level */}
      <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
        <div className="flex justify-between items-center mb-1">
          <span className="text-slate-400">Confidence Level:</span>
          <span className="text-rose-400 font-bold">{confidenceLevel}%</span>
        </div>
        <div className="flex gap-1">
          {([90, 95, 99] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setConfidenceLevel(lvl)}
              className={`flex-1 py-1 rounded text-xs font-bold transition-all ${
                confidenceLevel === lvl
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              {lvl}%
            </button>
          ))}
        </div>
      </div>

      {/* Custom Holding Horizon Days */}
      <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
        <div className="flex justify-between items-center mb-1">
          <span className="text-slate-400">Forward Horizon (VaR):</span>
          <span className="text-cyan-400 font-bold">{holdingPeriodDays}d Horizon</span>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="flex flex-1 gap-1">
            {[1, 7, 14, 30].map((days) => (
              <button
                key={days}
                onClick={() => {
                  setHoldingPeriodDays(days);
                  setIsCustomHorizon(false);
                }}
                className={`flex-1 py-1 rounded text-[11px] font-bold transition-all ${
                  holdingPeriodDays === days && !isCustomHorizon
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                {days}d
              </button>
            ))}
          </div>

          <div className="w-20 relative">
            <input
              type="number"
              min="1"
              max="365"
              value={holdingPeriodDays}
              onChange={(e) => {
                const val = Math.max(1, Math.min(365, Number(e.target.value) || 1));
                setHoldingPeriodDays(val);
                setIsCustomHorizon(true);
              }}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white font-bold w-full text-right focus:border-cyan-500 focus:outline-none text-[11px]"
              placeholder="Custom"
            />
            <span className="absolute right-6 top-1 text-[10px] text-slate-500 pointer-events-none">
              d
            </span>
          </div>
        </div>
      </div>

      {/* Risk-Free Rate */}
      <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
        <div className="flex justify-between items-center mb-1">
          <span className="text-slate-400">Risk-Free Rate:</span>
          <span className="text-amber-400 font-bold">{annualRiskFreeRate.toFixed(1)}% p.a.</span>
        </div>
        <input
          type="range"
          min="0.0"
          max="10.0"
          step="0.5"
          value={annualRiskFreeRate}
          onChange={(e) => setAnnualRiskFreeRate(Number(e.target.value))}
          className="w-full accent-amber-500 cursor-pointer"
        />
      </div>
    </div>
  </div>
);
