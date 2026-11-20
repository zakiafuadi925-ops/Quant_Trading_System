import React from 'react';
import { Network, Sliders, Coins } from 'lucide-react';

interface CorrVariable {
  id: string;
  label: string;
  desc: string;
  data: number[];
}

interface CorrData {
  variables: CorrVariable[];
  matrix: number[][];
}

interface CrossAssetData {
  assets: string[];
  matrix: number[][];
  averageCorrelation: number;
  diversificationScore: number;
  window: number;
}

interface SelectedInsight {
  v1: CorrVariable;
  v2: CorrVariable;
  r: number;
  r2: number;
  relationship: string;
  explanation: string;
}

interface CrossAssetInsight {
  a1: string;
  a2: string;
  r: number;
  r2: number;
  relationship: string;
  explanation: string;
}

export interface CorrelationMatrixProps {
  corrData: CorrData | null;
  crossAssetData: CrossAssetData | null;
  isLoadingCrossAsset: boolean;
  matrixMode: 'cross-asset' | 'factor';
  setMatrixMode: (v: 'cross-asset' | 'factor') => void;
  crossAssetWindow: 30 | 90;
  setCrossAssetWindow: (v: 30 | 90) => void;
  selectedCorrPair: { row: number; col: number } | null;
  setSelectedCorrPair: (v: { row: number; col: number } | null) => void;
  selectedAssetPair: { row: number; col: number };
  setSelectedAssetPair: (v: { row: number; col: number }) => void;
  selectedInsight: SelectedInsight | null;
  selectedCrossAssetInsight: CrossAssetInsight | null;
}

const getCorrColor = (val: number) => {
  if (val >= 0.7) return 'bg-emerald-500/35 text-emerald-200 border-emerald-500/50 font-bold';
  if (val >= 0.3) return 'bg-teal-500/20 text-teal-300 border-teal-500/30';
  if (val > -0.3 && val < 0.3) return 'bg-slate-950/70 text-slate-400 border-slate-800';
  if (val <= -0.7) return 'bg-rose-500/35 text-rose-200 border-rose-500/50 font-bold';
  return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
};

export const CorrelationMatrix: React.FC<CorrelationMatrixProps> = ({
  corrData,
  crossAssetData,
  isLoadingCrossAsset,
  matrixMode,
  setMatrixMode,
  crossAssetWindow,
  setCrossAssetWindow,
  selectedCorrPair,
  setSelectedCorrPair,
  selectedAssetPair,
  setSelectedAssetPair,
  selectedInsight,
  selectedCrossAssetInsight,
}) => (
  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-mono font-bold">
            <Network className="w-3.5 h-3.5 text-cyan-400" />
            Multi-Asset Correlation Matrix
          </span>
          {matrixMode === 'cross-asset' && crossAssetData && (
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono font-bold">
              Diversification Score: {crossAssetData.diversificationScore}/100
            </span>
          )}
        </div>
        <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
          {matrixMode === 'cross-asset'
            ? 'Cross-Asset Universe Dynamic Correlation Matrix'
            : 'Pearson Correlation Matrix: BTC Returns vs. Volatility Regimes'}
        </h3>
        <p className="text-xs text-slate-400">
          {matrixMode === 'cross-asset'
            ? `Rolling Pearson correlation ($r \\in [-1, 1]$) across liquid crypto universe (${crossAssetData?.window || 90} trading days)`
            : 'Measures linear dependency ($r \\in [-1, 1]$) between daily Bitcoin price returns and key market volatility indicators'}
        </p>
      </div>

      {/* Mode Switcher & Timeframe Window */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center p-1 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono">
          <button
            onClick={() => setMatrixMode('cross-asset')}
            className={`px-3 py-1 rounded text-xs font-bold transition-all flex items-center gap-1.5 ${
              matrixMode === 'cross-asset'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            Cross-Asset Universe
          </button>
          <button
            onClick={() => setMatrixMode('factor')}
            className={`px-3 py-1 rounded text-xs font-bold transition-all flex items-center gap-1.5 ${
              matrixMode === 'factor'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Factor Metrics
          </button>
        </div>

        {matrixMode === 'cross-asset' && (
          <div className="flex items-center p-1 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono">
            <button
              onClick={() => setCrossAssetWindow(30)}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                crossAssetWindow === 30
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              30D Window
            </button>
            <button
              onClick={() => setCrossAssetWindow(90)}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                crossAssetWindow === 90
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              90D Window
            </button>
          </div>
        )}
      </div>
    </div>

    {/* Heatmap Legend */}
    <div className="flex items-center justify-end gap-3 text-xs font-mono">
      <span className="flex items-center gap-1 text-rose-400">
        <span className="w-3 h-3 bg-rose-500/40 border border-rose-500 rounded-sm" />
        Inverse (-1.0 to -0.6)
      </span>
      <span className="flex items-center gap-1 text-slate-400">
        <span className="w-3 h-3 bg-slate-800 border border-slate-700 rounded-sm" />
        Neutral (~0.0)
      </span>
      <span className="flex items-center gap-1 text-emerald-400">
        <span className="w-3 h-3 bg-emerald-500/40 border border-emerald-500 rounded-sm" />
        Coupled (+0.6 to +1.0)
      </span>
    </div>

    {/* CROSS-ASSET UNIVERSE HEATMAP */}
    {matrixMode === 'cross-asset' && (
      <div className="space-y-4">
        {isLoadingCrossAsset && !crossAssetData ? (
          <div className="p-8 text-center text-slate-400 font-mono text-xs">
            Loading cross-asset return matrices...
          </div>
        ) : crossAssetData ? (
          <div className="overflow-x-auto">
            <table className="w-full text-center border-collapse text-xs font-mono">
              <thead>
                <tr>
                  <th className="p-2.5 text-left text-slate-500 text-[11px] font-semibold">
                    Crypto Asset Pair
                  </th>
                  {crossAssetData.assets.map((asset) => (
                    <th key={asset} className="p-2.5 text-slate-200 text-xs font-bold min-w-[80px]">
                      {asset}/USDT
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {crossAssetData.assets.map((rowAsset, rIdx) => (
                  <tr key={rowAsset} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-2.5 text-left font-bold text-slate-100 text-xs whitespace-nowrap bg-slate-950/40 border-r border-slate-800/80">
                      {rowAsset}/USDT
                    </td>
                    {crossAssetData.assets.map((colAsset, cIdx) => {
                      const val = crossAssetData.matrix[rIdx]?.[cIdx] ?? (rIdx === cIdx ? 1.0 : 0.7);
                      const isSelected = selectedAssetPair.row === rIdx && selectedAssetPair.col === cIdx;
                      return (
                        <td
                          key={colAsset}
                          onClick={() => setSelectedAssetPair({ row: rIdx, col: cIdx })}
                          className={`p-2.5 cursor-pointer transition-all border border-slate-800/50 ${getCorrColor(val)} ${
                            isSelected ? 'ring-2 ring-cyan-400 shadow-lg scale-105 z-10' : 'hover:scale-102'
                          }`}
                          title={`${rowAsset} ↔ ${colAsset}: ${val.toFixed(2)}`}
                        >
                          <div className="font-bold text-xs">
                            {val >= 0 ? '+' : ''}{val.toFixed(2)}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {/* Selected Cross-Asset Quantitative Insight */}
        {selectedCrossAssetInsight && (
          <div className="p-4 bg-slate-950/90 rounded-xl border border-slate-800 space-y-2 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                <span className="font-bold text-white text-xs font-mono">
                  {selectedCrossAssetInsight.a1}/USDT <span className="text-slate-500">↔</span> {selectedCrossAssetInsight.a2}/USDT
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-[10px] font-bold">
                  r = {selectedCrossAssetInsight.r >= 0 ? '+' : ''}{selectedCrossAssetInsight.r.toFixed(3)}
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-400">
                Co-Movement Variance ($R^2$): <strong className="text-amber-400">{selectedCrossAssetInsight.r2.toFixed(1)}%</strong>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs pt-1">
              <div>
                <span className="text-slate-400 block font-semibold text-[11px]">Diversification Assessment:</span>
                <span className="text-cyan-300 font-bold">{selectedCrossAssetInsight.relationship}</span>
              </div>
              <div className="text-slate-300 text-xs md:max-w-xl font-sans leading-relaxed">
                {selectedCrossAssetInsight.explanation}
              </div>
            </div>
          </div>
        )}
      </div>
    )}

    {/* FACTOR RISK DIMENSIONS HEATMAP */}
    {matrixMode === 'factor' && corrData && (
      <div className="space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse text-xs font-mono">
            <thead>
              <tr>
                <th className="p-2 text-left text-slate-500 text-[11px] font-semibold">
                  Variable / Metric
                </th>
                {corrData.variables.map((v) => (
                  <th key={v.id} className="p-2 text-slate-300 text-[11px] font-bold min-w-[90px]">
                    {v.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {corrData.variables.map((rowVar, rIdx) => (
                <tr key={rowVar.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-2.5 text-left font-bold text-slate-200 text-xs whitespace-nowrap bg-slate-950/40 border-r border-slate-800/80">
                    {rowVar.label}
                  </td>
                  {corrData.variables.map((colVar, cIdx) => {
                    const val = corrData.matrix[rIdx][cIdx];
                    const isSelected = selectedCorrPair?.row === rIdx && selectedCorrPair?.col === cIdx;
                    return (
                      <td
                        key={colVar.id}
                        onClick={() => setSelectedCorrPair({ row: rIdx, col: cIdx })}
                        className={`p-2 cursor-pointer transition-all border border-slate-800/50 ${getCorrColor(val)} ${isSelected ? 'ring-2 ring-cyan-400 shadow-lg scale-105 z-10' : 'hover:scale-102'}`}
                        title={`${rowVar.label} ↔ ${colVar.label}: ${val.toFixed(2)}`}
                      >
                        <div className="font-bold text-xs">
                          {val >= 0 ? '+' : ''}{val.toFixed(2)}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selectedInsight && (
          <div className="p-4 bg-slate-950/90 rounded-xl border border-slate-800 space-y-2 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                <span className="font-bold text-white text-xs font-mono">
                  {selectedInsight.v1.label} <span className="text-slate-500">↔</span> {selectedInsight.v2.label}
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-[10px] font-bold">
                  r = {selectedInsight.r >= 0 ? '+' : ''}{selectedInsight.r.toFixed(3)}
                </span>
              </div>

              <div className="text-[11px] font-mono text-slate-400">
                Coefficient of Determination ($R^2$): <strong className="text-amber-400">{selectedInsight.r2.toFixed(1)}%</strong>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs pt-1">
              <div>
                <span className="text-slate-400 block font-semibold text-[11px]">Relationship Regime:</span>
                <span className="text-cyan-300 font-bold">{selectedInsight.relationship}</span>
              </div>
              <div className="text-slate-300 text-xs md:max-w-xl font-sans leading-relaxed">
                {selectedInsight.explanation}
              </div>
            </div>
          </div>
        )}
      </div>
    )}

    {/* Macro Risk Coupling Takeaways */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs pt-2">
      <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-1">
        <span className="text-slate-400 text-[10px] block">Asymmetric Leverage Effect</span>
        <span className="text-rose-400 font-bold block">Negative Return ↔ Volatility</span>
        <p className="text-[10px] text-slate-500 font-sans">
          Realized volatility expands substantially during sharp downward price corrections due to automated liquidations.
        </p>
      </div>

      <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-1">
        <span className="text-slate-400 text-[10px] block">Cross-Asset Portfolio Penalty</span>
        <span className="text-amber-400 font-bold block">High Co-Movement Cluster</span>
        <p className="text-[10px] text-slate-500 font-sans">
          Crypto-native assets correlate tightly (avg $r \approx 0.74$). True diversification requires holding uncorrelated defensive assets.
        </p>
      </div>

      <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-1">
        <span className="text-slate-400 text-[10px] block">Volume Confirmation</span>
        <span className="text-emerald-400 font-bold block">Volume ↔ Drawdown Depth</span>
        <p className="text-[10px] text-slate-500 font-sans">
          High turnover volume clusters during local market capitulation troughs, forming reliable exhaustion bottoms.
        </p>
      </div>
    </div>
  </div>
);
