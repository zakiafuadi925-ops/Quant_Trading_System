import React, { useState, useMemo } from 'react';
import { CandleData } from '../types';
import { MODEL_V1_METADATA, MODEL_V5_METADATA, THRESHOLD_SWEEP_DATA } from '../data/modelsData';
import { runInferenceV5, FEATURE_NAMES_V5, ModelFeaturesV5, InferenceResult } from '../utils/featurePipeline';
import { 
  BrainCircuit, 
  Cpu, 
  Layers, 
  Gauge, 
  BarChart, 
  Target, 
  Sliders, 
  FileCode2, 
  ArrowRight,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Check,
  Zap,
  Activity,
  Sparkles,
  Radio
} from 'lucide-react';

interface LstmModelTabProps {
  candles: CandleData[];
}

export const LstmModelTab: React.FC<LstmModelTabProps> = ({ candles }) => {
  const [activeModel, setActiveModel] = useState<'v5' | 'v1'>('v5');
  const [selectedSweepIdx, setSelectedSweepIdx] = useState<number>(2); // 0.40 threshold by default
  const [inferenceThreshold, setInferenceThreshold] = useState<number>(0.015); // 1.5% default hurdle rate

  const sweep = THRESHOLD_SWEEP_DATA[selectedSweepIdx];

  // Real-time live inference on active market candles
  const liveInference = useMemo<InferenceResult>(() => {
    return runInferenceV5(candles, inferenceThreshold, 60);
  }, [candles, inferenceThreshold]);

  // Feature vector categories
  const featureCategories = [
    { name: 'Returns & Momentum', features: ['return_1d', 'return_3d', 'return_7d', 'rsi_14', 'volume_change'] },
    { name: 'Candle Structure & Volatility', features: ['range_pct', 'body_pct', 'atr_pct', 'bb_position', 'bb_width'] },
    { name: 'Trend & Moving Average Ratios', features: ['ema_9_ratio', 'ema_21_ratio', 'ema_50_ratio', 'ema_200_ratio'] },
    { name: 'MACD Divergence Wavelets', features: ['macd_pct', 'macd_signal_pct', 'macd_hist_pct'] }
  ];

  return (
    <div className="space-y-6">
      {/* Top Model Switcher & Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold mb-2">
              <BrainCircuit className="w-3.5 h-3.5 text-cyan-400" />
              Deep Learning Model Observatory
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              LSTM Neural Network Architecture &amp; Experiments
            </h2>
            <p className="text-xs text-slate-400">
              Evaluated using Keras/TensorFlow on normalized 60-period sequential sliding windows
            </p>
          </div>

          <div className="flex items-center gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveModel('v5')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeModel === 'v5'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              Model v5.2.1 (Bidirectional)
            </button>
            <button
              onClick={() => setActiveModel('v1')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeModel === 'v1'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Model v1 (Astronacci Hybrid)
            </button>
          </div>
        </div>

        {/* Model Spec Details */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80">
            <span className="text-[11px] text-slate-400 block">Neural Architecture</span>
            <span className="font-mono text-sm font-bold text-cyan-300 mt-1 block">
              {activeModel === 'v5' ? MODEL_V5_METADATA.architecture : MODEL_V1_METADATA.architecture}
            </span>
            <span className="text-[10px] text-slate-500">Lookback: 60 timesteps</span>
          </div>

          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80">
            <span className="text-[11px] text-slate-400 block">Training Hyperparams</span>
            <span className="font-mono text-sm font-bold text-slate-200 mt-1 block">
              {activeModel === 'v5' ? `${MODEL_V5_METADATA.epochs} Epochs | Batch 32` : `${MODEL_V1_METADATA.epochs} Epochs | Dropout 0.2`}
            </span>
            <span className="text-[10px] text-slate-500">Loss: MSE / Binary Crossentropy</span>
          </div>

          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80">
            <span className="text-[11px] text-slate-400 block">Target Definition</span>
            <span className="font-mono text-sm font-bold text-emerald-400 mt-1 block">
              {activeModel === 'v5' ? 'next_day_return (continuous)' : 'next_close > close*1.005'}
            </span>
            <span className="text-[10px] text-slate-500">MinMaxScaler fit on train split</span>
          </div>

          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80">
            <span className="text-[11px] text-slate-400 block">Overall Benchmark</span>
            <span className="font-mono text-sm font-bold text-purple-400 mt-1 block">
              {activeModel === 'v5' ? `MAE 1.65% (Dir 49.1%)` : `Accuracy 59.3% (+499% ROI)`}
            </span>
            <span className="text-[10px] text-slate-500">MaxDD: {activeModel === 'v5' ? '-1.68% (optimal)' : '60.56% (vs 83.4% B&H)'}</span>
          </div>
        </div>
      </div>

      {/* LIVE SEQUENTIAL INFERENCE CONSOLE (PHASE 3: v6.0.0) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                LIVE MODEL INFERENCE ACTIVE
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-[11px] font-bold">
                {liveInference.model}
              </span>
            </div>
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              Next-Period Directional Forecast &amp; Signal Generation
            </h3>
            <p className="text-xs text-slate-400">
              In-browser vectorized neural projection across the last {liveInference.lookbackBars} sequential market bars (Timestamp: {liveInference.timestamp})
            </p>
          </div>

          {/* Hurdle Threshold Controller */}
          <div className="flex items-center gap-3 bg-slate-950 p-2 rounded-xl border border-slate-800 font-mono text-xs">
            <span className="text-slate-400 text-[11px]">Hurdle Threshold:</span>
            <input
              type="range"
              min="0.005"
              max="0.040"
              step="0.0025"
              value={inferenceThreshold}
              onChange={(e) => setInferenceThreshold(parseFloat(e.target.value))}
              className="w-24 accent-cyan-500 cursor-pointer"
            />
            <span className="font-bold text-cyan-300 text-xs min-w-[45px]">
              {(inferenceThreshold * 100).toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Live Forecast HUD Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Signal Action Card */}
          <div className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
            liveInference.signal.includes('BUY')
              ? 'bg-emerald-950/20 border-emerald-500/40 shadow-lg shadow-emerald-500/10'
              : liveInference.signal.includes('SELL')
              ? 'bg-rose-950/20 border-rose-500/40 shadow-lg shadow-rose-500/10'
              : 'bg-slate-950/70 border-slate-800/80'
          }`}>
            <span className="text-xs text-slate-400 font-mono flex items-center justify-between">
              Recommended Signal
              <Zap className="w-3.5 h-3.5 text-amber-400" />
            </span>
            <div className="mt-2">
              <span className={`text-xl font-mono font-extrabold tracking-wider ${
                liveInference.signal.includes('BUY')
                  ? 'text-emerald-400'
                  : liveInference.signal.includes('SELL')
                  ? 'text-rose-400'
                  : 'text-amber-400'
              }`}>
                {liveInference.signal.replace('_', ' ')}
              </span>
              <p className="text-[10px] text-slate-400 mt-1 font-sans">
                {liveInference.signal === 'HOLD'
                  ? `Forecast within ±${(inferenceThreshold * 100).toFixed(1)}% hurdle band; hold current stance`
                  : `Conviction exceeds ${(inferenceThreshold * 100).toFixed(1)}% hurdle threshold`}
              </p>
            </div>
          </div>

          {/* Predicted Return */}
          <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 flex flex-col justify-between">
            <span className="text-xs text-slate-400 font-mono flex items-center justify-between">
              Predicted Next Return
              {liveInference.predictedReturn >= 0 ? (
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
              )}
            </span>
            <div className="mt-2 font-mono">
              <span className={`text-2xl font-extrabold ${
                liveInference.predictedReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {liveInference.predictedReturn >= 0 ? '+' : ''}
                {(liveInference.predictedReturn * 100).toFixed(2)}%
              </span>
              <div className="text-[10px] text-slate-500 mt-1">
                Calibrated Model MAE: ±{(liveInference.mae * 100).toFixed(2)}%
              </div>
            </div>
          </div>

          {/* Directional Confidence */}
          <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 flex flex-col justify-between">
            <span className="text-xs text-slate-400 font-mono flex items-center justify-between">
              Directional Confidence
              <Gauge className="w-3.5 h-3.5 text-cyan-400" />
            </span>
            <div className="mt-2 font-mono">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-cyan-300">
                  {(liveInference.directionConfidence * 100).toFixed(1)}%
                </span>
                <span className="text-xs text-slate-400 font-bold">
                  {liveInference.predictedDirection}
                </span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${liveInference.directionConfidence * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Input Tensor Dimensions */}
          <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 flex flex-col justify-between">
            <span className="text-xs text-slate-400 font-mono flex items-center justify-between">
              Input Tensor Vector
              <Cpu className="w-3.5 h-3.5 text-purple-400" />
            </span>
            <div className="mt-2 font-mono">
              <span className="text-2xl font-extrabold text-purple-300">
                [1, {liveInference.lookbackBars}, 17]
              </span>
              <p className="text-[10px] text-slate-400 mt-1 font-sans">
                17 real-time features synchronized per bar across {liveInference.lookbackBars} sequential lookback bars
              </p>
            </div>
          </div>
        </div>

        {/* Live 17-Feature Breakdown Grid */}
        <div className="pt-2">
          <h4 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            Active 17-Dimensional Feature Vector (Latest Bar)
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 font-mono text-xs">
            {FEATURE_NAMES_V5.map((name) => {
              const val = (liveInference.features as ModelFeaturesV5)[name] ?? 0;
              return (
                <div key={name} className="p-2.5 bg-slate-950 rounded-lg border border-slate-800/70 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 truncate" title={name}>
                    {name}
                  </span>
                  <span className={`text-xs font-bold mt-1 ${
                    val > 0 ? 'text-emerald-400' : val < 0 ? 'text-rose-400' : 'text-slate-300'
                  }`}>
                    {val > 0 ? '+' : ''}{typeof val === 'number' ? val.toFixed(4) : val}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Threshold Sweep Simulation (Key Finding from threshold_sweep.py) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              Threshold Sweep Optimization Curve (v5.2.1)
            </h3>
            <p className="text-xs text-slate-400">
              Sweep over probability thresholds (0.30 to 0.60) showing tradeoff between trade frequency, ROI, and drawdown
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-400">Selected Threshold:</span>
            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold">
              {sweep.threshold.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Sweep Slider Bar */}
        <div className="space-y-2">
          <input
            type="range"
            min="0"
            max={THRESHOLD_SWEEP_DATA.length - 1}
            step="1"
            value={selectedSweepIdx}
            onChange={(e) => setSelectedSweepIdx(Number(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer"
          />
          <div className="flex justify-between text-[11px] font-mono text-slate-500">
            {THRESHOLD_SWEEP_DATA.map((s, idx) => (
              <span
                key={s.threshold}
                onClick={() => setSelectedSweepIdx(idx)}
                className={`cursor-pointer hover:text-white ${selectedSweepIdx === idx ? 'text-amber-400 font-bold' : ''}`}
              >
                {s.threshold.toFixed(2)}
              </span>
            ))}
          </div>
        </div>

        {/* Current Selected Sweep Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-950/80 rounded-xl border border-slate-800 font-mono">
          <div>
            <span className="text-[11px] text-slate-400">Final Equity ($1,000 Initial):</span>
            <span className="text-base font-bold text-emerald-400 block mt-0.5">
              ${sweep.finalEquity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-slate-400">Cumulative Return:</span>
            <span className={`text-base font-bold block mt-0.5 ${sweep.returnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              +{sweep.returnPct.toFixed(2)}%
            </span>
          </div>
          <div>
            <span className="text-[11px] text-slate-400">Executed Buy Orders:</span>
            <span className="text-base font-bold text-cyan-400 block mt-0.5">
              {sweep.nBuys} orders
            </span>
          </div>
          <div>
            <span className="text-[11px] text-slate-400">Maximum Drawdown:</span>
            <span className="text-base font-bold text-rose-400 block mt-0.5">
              {sweep.maxDrawdownPct.toFixed(2)}%
            </span>
          </div>
        </div>

        <div className="text-xs text-slate-400 p-3 bg-slate-950/50 rounded-xl border border-slate-800/80 leading-relaxed">
          <span className="font-semibold text-slate-200">Sweep Conclusion:</span> While aggressive thresholds (0.30 - 0.35) yield higher nominal returns (+72% to +145%), they incur steep drawdowns exceeding -52%. A threshold between <span className="text-amber-400 font-semibold">0.45 and 0.50</span> delivers optimal risk-adjusted stability (under -1.7% to -30% drawdown with positive equity expansion).
        </div>
      </div>

      {/* 17 Input Features Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-800">
          <Layers className="w-4 h-4 text-cyan-400" />
          The 17-Dimensional Feature Vector (v5.2.1 Pipeline)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {featureCategories.map((cat) => (
            <div key={cat.name} className="bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 space-y-2">
              <h4 className="text-xs font-semibold text-cyan-400 border-b border-slate-800 pb-1.5">
                {cat.name}
              </h4>
              <ul className="space-y-1.5">
                {cat.features.map((feat) => (
                  <li key={feat} className="flex items-center justify-between text-[11px] font-mono text-slate-300">
                    <span className="text-slate-400">{feat}</span>
                    <span className="text-emerald-400 font-semibold">Normalized [0, 1]</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Model Predictions vs Actual Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-800">
          <Target className="w-4 h-4 text-purple-400" />
          Model Daily Prediction Feed vs Actual Prices
        </h3>

        <div className="overflow-x-auto mt-3">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2 px-3">Date</th>
                <th className="py-2 px-3 text-right">Actual Close</th>
                <th className="py-2 px-3 text-right">Model Forecast</th>
                <th className="py-2 px-3 text-right">Prediction Delta</th>
                <th className="py-2 px-3 text-right">Direction Probability</th>
                <th className="py-2 px-3 text-center">Inferred Signal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {candles.slice(-12).map((c) => {
                const delta = (c.predictedClose ?? c.close) - c.close;
                const deltaPct = (delta / c.close) * 100;
                const prob = c.directionProb ?? 0.5;

                return (
                  <tr key={c.timestamp} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2 px-3 text-slate-300">{c.timestamp}</td>
                    <td className="py-2 px-3 text-right text-slate-200">
                      ${c.close.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-cyan-300">
                      ${(c.predictedClose ?? c.close).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className={`py-2 px-3 text-right font-semibold ${delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {delta >= 0 ? '+' : ''}{delta.toFixed(2)} ({deltaPct >= 0 ? '+' : ''}{deltaPct.toFixed(2)}%)
                    </td>
                    <td className="py-2 px-3 text-right text-amber-400 font-bold">
                      {(prob * 100).toFixed(2)}%
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          prob >= 0.51
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {prob >= 0.51 ? 'BUY / HOLD' : 'NEUTRAL / CASH'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
