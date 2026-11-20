import React from 'react';
import { Layers } from 'lucide-react';

export interface DrawdownPoint {
  date: string;
  price: number;
  peak: number;
  dd: number;
  lossUsd: number;
}

export interface DrawdownVisualizerProps {
  drawdownSeries: DrawdownPoint[];
  maxDrawdown: number;
  mddPeak: number;
  mddPeakIdx: number;
  mddTroughIdx: number;
  hoveredIdx: number | null;
  setHoveredIdx: (idx: number | null) => void;
}

export const DrawdownVisualizer: React.FC<DrawdownVisualizerProps> = ({
  drawdownSeries,
  maxDrawdown,
  mddPeak,
  mddPeakIdx,
  mddTroughIdx,
  hoveredIdx,
  setHoveredIdx,
}) => {
  const svgWidth = 920;
  const priceH = 170;
  const ddH = 140;
  const totalSvgH = priceH + ddH + 20;
  const padding = { top: 25, right: 65, bottom: 25, left: 60 };

  const pointsCount = drawdownSeries.length;
  const scaleX = (idx: number) => padding.left + (idx / (pointsCount - 1 || 1)) * (svgWidth - padding.left - padding.right);

  // Price scale
  const prices = drawdownSeries.map((d) => d.price);
  const rawMinP = prices.length > 0 ? Math.min(...prices) : 0;
  const rawMaxP = prices.length > 0 ? Math.max(...prices) : 100000;
  const span = rawMaxP - rawMinP || 1000;
  const minP = Math.max(0, rawMinP - span * 0.08);
  const maxP = rawMaxP + span * 0.08;

  const scalePriceY = (val: number) => {
    const effH = priceH - padding.top - 10;
    return priceH - 10 - ((val - minP) / (maxP - minP || 1)) * effH;
  };

  // Drawdown scale
  const minDd = -Math.max(10, maxDrawdown * 1.15);
  const scaleDdY = (val: number) => {
    const top = priceH + 15;
    const effH = ddH - padding.bottom;
    return top + ((0 - val) / (0 - minDd || 1)) * effH;
  };

  // Paths
  const priceLinePath = drawdownSeries.length === 0 ? '' :
    drawdownSeries.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i)},${scalePriceY(pt.price)}`).join(' ');

  const peakLinePath = drawdownSeries.length === 0 ? '' :
    drawdownSeries.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i)},${scalePriceY(pt.peak)}`).join(' ');

  let mddCorridorPath = '';
  if (mddPeakIdx < mddTroughIdx && drawdownSeries.length > 0) {
    const slice = drawdownSeries.slice(mddPeakIdx, mddTroughIdx + 1);
    const top = slice.map((_, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(mddPeakIdx + i)},${scalePriceY(mddPeak)}`).join(' ');
    const btm = slice.slice().reverse().map((pt) => `L ${scaleX(drawdownSeries.indexOf(pt))},${scalePriceY(pt.price)}`).join(' ');
    mddCorridorPath = `${top} ${btm} Z`;
  }

  const ddAreaPath = drawdownSeries.length === 0 ? '' : (() => {
    const top = drawdownSeries.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i)},${scaleDdY(pt.dd)}`).join(' ');
    const close = `L ${scaleX(pointsCount - 1)},${scaleDdY(0)} L ${scaleX(0)},${scaleDdY(0)} Z`;
    return `${top} ${close}`;
  })();

  const mddTrough = drawdownSeries[mddTroughIdx]?.price ?? 0;

  const activeHover = hoveredIdx !== null && drawdownSeries[hoveredIdx]
    ? drawdownSeries[hoveredIdx]
    : drawdownSeries[drawdownSeries.length - 1];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-rose-400" />
            Historical Peak-to-Trough Decline &amp; Underwater Drawdown Dual Visualizer
          </h3>
          <p className="text-xs text-slate-400">
            Corridor view showing the exact crash episode from peak to valley and the corresponding underwater drawdown depth
          </p>
        </div>

        {/* Interactive HUD */}
        {activeHover && (
          <div className="p-2 px-3 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono flex items-center gap-4">
            <span>Date: <strong className="text-white">{activeHover.date}</strong></span>
            <span>Price: <strong className="text-slate-200">${Math.round(activeHover.price).toLocaleString()}</strong></span>
            <span>Running Peak: <strong className="text-emerald-400">${Math.round(activeHover.peak).toLocaleString()}</strong></span>
            <span>Drawdown: <strong className="text-rose-400">{activeHover.dd.toFixed(2)}%</strong></span>
          </div>
        )}
      </div>

      {/* Dual SVG Canvas */}
      <div
        className="w-full overflow-x-auto relative cursor-crosshair select-none bg-slate-950/60 rounded-xl p-2 border border-slate-800/80"
        onMouseLeave={() => setHoveredIdx(null)}
      >
        <svg viewBox={`0 0 ${svgWidth} ${totalSvgH}`} className="w-full h-auto min-w-[760px]">
          <defs>
            <linearGradient id="mddCorridorGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="underwaterGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {/* TOP PANEL: BTC PRICE & RUNNING PEAK */}
          <g>
            <text x={padding.left + 5} y={padding.top - 8} fill="#94a3b8" fontSize="10" fontFamily="monospace" fontWeight="bold">
              BTC Price vs. All-Time Peak ($)
            </text>

            {/* Price Gridlines */}
            {[0, 0.5, 1].map((pct) => {
              const pVal = minP + pct * (maxP - minP);
              const yPos = scalePriceY(pVal);
              return (
                <g key={pct}>
                  <line x1={padding.left} y1={yPos} x2={svgWidth - padding.right} y2={yPos} stroke="#1e293b" strokeDasharray="3 3" />
                  <text x={padding.left - 8} y={yPos + 4} textAnchor="end" fill="#64748b" fontSize="10" fontFamily="monospace">
                    ${Math.round(pVal).toLocaleString()}
                  </text>
                </g>
              );
            })}

            {/* MDD Danger Corridor */}
            {mddCorridorPath && (
              <path d={mddCorridorPath} fill="url(#mddCorridorGrad)" stroke="#f43f5e" strokeWidth="1" strokeDasharray="3 3" opacity="0.8" />
            )}

            {/* Peak ATH Running Step Line */}
            <path d={peakLinePath} fill="none" stroke="#10b981" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.7" />

            {/* Price Line */}
            <path d={priceLinePath} fill="none" stroke="#38bdf8" strokeWidth="2" />

            {/* Peak Flag Marker */}
            {mddPeakIdx >= 0 && (
              <g transform={`translate(${scaleX(mddPeakIdx)}, ${scalePriceY(mddPeak)})`}>
                <circle r="5" fill="#10b981" stroke="#0f172a" strokeWidth="1.5" />
                <rect x="-40" y="-24" width="80" height="18" rx="4" fill="#0f172a" stroke="#10b981" strokeWidth="1" />
                <text y="-12" textAnchor="middle" fill="#10b981" fontSize="9" fontWeight="bold" fontFamily="monospace">
                  PEAK ${Math.round(mddPeak / 1000)}k
                </text>
              </g>
            )}

            {/* Trough Valley Flag Marker */}
            {mddTroughIdx >= 0 && (
              <g transform={`translate(${scaleX(mddTroughIdx)}, ${scalePriceY(mddTrough)})`}>
                <circle r="5" fill="#f43f5e" stroke="#0f172a" strokeWidth="1.5" />
                <rect x="-45" y="10" width="90" height="18" rx="4" fill="#0f172a" stroke="#f43f5e" strokeWidth="1" />
                <text y="22" textAnchor="middle" fill="#f43f5e" fontSize="9" fontWeight="bold" fontFamily="monospace">
                  TROUGH -{maxDrawdown.toFixed(1)}%
                </text>
              </g>
            )}
          </g>

          {/* SEPARATOR LINE */}
          <line x1={padding.left} y1={priceH + 5} x2={svgWidth - padding.right} y2={priceH + 5} stroke="#334155" strokeWidth="1" />

          {/* BOTTOM PANEL: UNDERWATER DRAWDOWN CURVE */}
          <g transform="translate(0, 0)">
            <text x={padding.left + 5} y={priceH + 20} fill="#f43f5e" fontSize="10" fontFamily="monospace" fontWeight="bold">
              Underwater Drawdown (%)
            </text>

            {/* 0% Line */}
            <line x1={padding.left} y1={scaleDdY(0)} x2={svgWidth - padding.right} y2={scaleDdY(0)} stroke="#64748b" strokeWidth="1" />
            <text x={padding.left - 8} y={scaleDdY(0) + 3} textAnchor="end" fill="#94a3b8" fontSize="10" fontFamily="monospace">
              0%
            </text>

            {/* Max Drawdown Cutoff Line */}
            <line x1={padding.left} y1={scaleDdY(-maxDrawdown)} x2={svgWidth - padding.right} y2={scaleDdY(-maxDrawdown)} stroke="#f43f5e" strokeDasharray="3 3" strokeWidth="1" opacity="0.8" />
            <text x={padding.left - 8} y={scaleDdY(-maxDrawdown) + 3} textAnchor="end" fill="#f43f5e" fontSize="10" fontFamily="monospace" fontWeight="bold">
              -{Math.round(maxDrawdown)}%
            </text>

            {/* Shaded Underwater Path */}
            <path d={ddAreaPath} fill="url(#underwaterGrad)" stroke="#f43f5e" strokeWidth="1.75" />
          </g>

          {/* Interactive Crosshair & Hover Triggers */}
          {drawdownSeries.map((_, i) => {
            const cx = scaleX(i);
            return (
              <rect
                key={i}
                x={cx - 10}
                y={padding.top}
                width="20"
                height={totalSvgH - padding.top - padding.bottom}
                fill="transparent"
                onMouseEnter={() => setHoveredIdx(i)}
              />
            );
          })}

          {/* Active Vertical Crosshair */}
          {hoveredIdx !== null && (
            <line
              x1={scaleX(hoveredIdx)}
              y1={padding.top}
              x2={scaleX(hoveredIdx)}
              y2={totalSvgH - 15}
              stroke="#94a3b8"
              strokeWidth="1"
              strokeDasharray="3 3"
              opacity="0.85"
            />
          )}
        </svg>
      </div>

      <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400 pt-1">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-cyan-400">
            <span className="w-3 h-0.5 bg-cyan-400 inline-block" />
            BTC Price
          </span>
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-3 h-0.5 bg-emerald-400 inline-block border-b border-dashed border-emerald-400" />
            Historical High Water Mark (ATH)
          </span>
          <span className="flex items-center gap-1.5 text-rose-400">
            <span className="w-3 h-3 bg-rose-500/20 border border-rose-500 rounded-sm inline-block" />
            Worst MDD Corridor (-{maxDrawdown.toFixed(1)}%)
          </span>
        </div>

        <span className="text-slate-500">Hover over any candle to inspect running drawdown depth</span>
      </div>
    </div>
  );
};
