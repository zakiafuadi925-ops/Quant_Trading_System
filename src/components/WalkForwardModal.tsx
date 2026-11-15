import React, { useState, useMemo, useRef, useEffect } from 'react';
import { CandleData } from '../types';
import { StrategyModel, StrategyParams } from '../utils/strategy';
import { 
  runWalkForwardOptimization, 
  generateDefaultParamGrid, 
  WalkForwardResult,
  SweepCandidate 
} from '../utils/walkForward';
import { 
  X, 
  Sliders, 
  Play, 
  ShieldCheck, 
  ShieldAlert, 
  CheckCircle2, 
  TrendingUp, 
  Activity, 
  Cpu, 
  ArrowRight,
  Info,
  Layers,
  Sparkles
} from 'lucide-react';

interface WalkForwardModalProps {
  isOpen: boolean;
  onClose: () => void;
  candles: CandleData[];
  strategyModel: StrategyModel;
  onApplyParams: (params: StrategyParams & { stopLossPct?: number; takeProfitPct?: number }) => void;
}

export const WalkForwardModal: React.FC<WalkForwardModalProps> = ({
  isOpen,
  onClose,
  candles,
  strategyModel,
  onApplyParams,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [trainRatio, setTrainRatio] = useState<number>(0.70);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [result, setResult] = useState<WalkForwardResult | null>(null);

  // Sync React isOpen with native HTML dialog
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
        // Auto-run initial sweep when opened if not yet calculated
        if (!result) {
          handleRunOptimization();
        }
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen]);

  const handleCancel = (e: React.SyntheticEvent) => {
    e.preventDefault();
    onClose();
  };

  const handleDialogClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) {
      onClose();
    }
  };

  const handleRunOptimization = () => {
    setIsOptimizing(true);
    // Use timeout to allow UI to show loading indicator before sync calculation
    setTimeout(() => {
      const grid = generateDefaultParamGrid(strategyModel);
      const res = runWalkForwardOptimization(candles, strategyModel, grid, trainRatio);
      setResult(res);
      setIsOptimizing(false);
    }, 50);
  };

  const handleApply = (candidate: SweepCandidate) => {
    onApplyParams(candidate.params);
    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      onCancel={handleCancel}
      onClick={handleDialogClick}
      className="native-modal outline-none focus:outline-none"
      aria-labelledby="walk-forward-title"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl p-6 shadow-2xl relative space-y-6 max-h-[90vh] overflow-y-auto font-sans">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="walk-forward-title" className="text-base font-bold text-white flex items-center gap-2">
                  Walk-Forward Analysis &amp; Parameter Sweeper
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 text-[10px] font-mono border border-cyan-500/30">
                  ANTI-OVERFITTING
                </span>
              </div>
              <p className="text-xs text-slate-400">
                In-Sample Training vs Out-of-Sample Walk-Forward validation for <strong className="text-white uppercase">{strategyModel}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Configuration Controls Bar */}
        <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-mono text-xs">
          <div className="space-y-1">
            <span className="text-slate-400 block font-sans text-xs">In-Sample / Out-of-Sample Window Split:</span>
            <div className="flex items-center gap-3">
              <span className="text-emerald-400 font-bold">IS: {Math.round(trainRatio * 100)}%</span>
              <input
                type="range"
                min="0.50"
                max="0.85"
                step="0.05"
                value={trainRatio}
                onChange={(e) => setTrainRatio(Number(e.target.value))}
                className="w-32 sm:w-48 accent-amber-500 cursor-pointer"
              />
              <span className="text-cyan-400 font-bold">OOS: {Math.round((1 - trainRatio) * 100)}%</span>
            </div>
          </div>

          <button
            onClick={handleRunOptimization}
            disabled={isOptimizing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-slate-950 font-bold transition-all shadow-md shadow-amber-500/20 disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 ${isOptimizing ? 'animate-spin' : ''}`} />
            {isOptimizing ? 'Optimizing Grid...' : 'Run Parameter Sweep'}
          </button>
        </div>

        {/* Best Robust Candidate Highlight Card */}
        {result && result.bestCandidate && (
          <div className="p-5 bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/20 rounded-2xl border border-amber-500/30 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <div>
                  <h4 className="text-sm font-bold text-white">Recommended Robust Parameter Set</h4>
                  <p className="text-[11px] text-slate-400">
                    Highest Walk-Forward Efficiency (WFE) and Sharpe stability across {result.candidates.length} simulated configurations
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 border ${
                  result.bestCandidate.overfitRisk === 'LOW'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : result.bestCandidate.overfitRisk === 'MODERATE'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                }`}>
                  {result.bestCandidate.overfitRisk === 'LOW' ? (
                    <ShieldCheck className="w-3.5 h-3.5" />
                  ) : (
                    <ShieldAlert className="w-3.5 h-3.5" />
                  )}
                  {result.bestCandidate.overfitRisk} OVERFIT RISK
                </span>

                <button
                  onClick={() => handleApply(result.bestCandidate)}
                  className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-sm"
                >
                  Apply Parameters
                </button>
              </div>
            </div>

            {/* Metrics Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
              <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-sans">Robustness Score</span>
                <span className="text-base font-bold text-amber-400 mt-0.5 block">
                  {result.bestCandidate.robustnessScore} / 100
                </span>
              </div>

              <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-sans">Walk-Forward Efficiency</span>
                <span className={`text-base font-bold mt-0.5 block ${result.bestCandidate.wfe >= 50 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {result.bestCandidate.wfe}%
                </span>
              </div>

              <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-sans">In-Sample Sharpe</span>
                <span className="text-base font-bold text-cyan-400 mt-0.5 block">
                  {result.bestCandidate.inSample.sharpeRatio.toFixed(2)}
                </span>
                <span className="text-[10px] text-slate-500">Return: {result.bestCandidate.inSample.totalReturnPct.toFixed(1)}%</span>
              </div>

              <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-sans">Out-of-Sample Sharpe</span>
                <span className="text-base font-bold text-emerald-400 mt-0.5 block">
                  {result.bestCandidate.outOfSample.sharpeRatio.toFixed(2)}
                </span>
                <span className="text-[10px] text-slate-500">Return: {result.bestCandidate.outOfSample.totalReturnPct.toFixed(1)}%</span>
              </div>
            </div>

            {/* Selected Parameters Values */}
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 font-mono text-xs flex flex-wrap items-center gap-4 text-slate-300">
              <span className="text-slate-400">Parameters:</span>
              {Object.entries(result.bestCandidate.params).map(([k, v]) => (
                <span key={k} className="px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700">
                  {k}: <strong>{String(v)}</strong>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Sweep Candidate Leaderboard Table */}
        {result && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>Candidate Leaderboard (Ranked by Robustness &amp; Out-of-Sample Alpha)</span>
              <span>Total Configurations: {result.candidates.length}</span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Rank</th>
                    <th className="py-2.5 px-3">Parameters</th>
                    <th className="py-2.5 px-3 text-right">IS Return</th>
                    <th className="py-2.5 px-3 text-right">OOS Return</th>
                    <th className="py-2.5 px-3 text-right">OOS Sharpe</th>
                    <th className="py-2.5 px-3 text-center">WFE</th>
                    <th className="py-2.5 px-3 text-center">Risk</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                  {result.candidates.slice(0, 8).map((c, i) => (
                    <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2 px-3 font-bold text-slate-300">#{i + 1}</td>
                      <td className="py-2 px-3 text-slate-200">
                        {Object.entries(c.params).map(([k, v]) => `${k}:${v}`).join(', ')}
                      </td>
                      <td className="py-2 px-3 text-right text-cyan-400 font-bold">
                        {c.inSample.totalReturnPct.toFixed(1)}%
                      </td>
                      <td className={`py-2 px-3 text-right font-bold ${c.outOfSample.totalReturnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {c.outOfSample.totalReturnPct.toFixed(1)}%
                      </td>
                      <td className="py-2 px-3 text-right text-slate-200">
                        {c.outOfSample.sharpeRatio.toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${c.wfe >= 50 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                          {c.wfe}%
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className={`text-[10px] font-bold ${
                          c.overfitRisk === 'LOW' ? 'text-emerald-400' : c.overfitRisk === 'MODERATE' ? 'text-amber-400' : 'text-rose-400'
                        }`}>
                          {c.overfitRisk}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          onClick={() => handleApply(c)}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-[11px] transition-all"
                        >
                          Apply
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </dialog>
  );
};
