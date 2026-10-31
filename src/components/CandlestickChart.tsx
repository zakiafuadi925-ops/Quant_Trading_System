import React, { useState, useMemo, useEffect, useRef } from 'react';
import { CandleData } from '../types';
import { calculateIndicators } from '../utils/technicalIndicators';
import { 
  BarChart2, 
  Orbit, 
  Layers, 
  Maximize2, 
  Sliders, 
  TrendingUp, 
  Calendar, 
  RefreshCw,
  Sparkles,
  Info,
  Eye,
  EyeOff
} from 'lucide-react';

interface CandlestickChartProps {
  initialCandles: CandleData[];
  currentPrice?: number;
}

export const CandlestickChart: React.FC<CandlestickChartProps> = ({ initialCandles, currentPrice }) => {
  const [timeframe, setTimeframe] = useState<'1h' | '4h' | '1d' | '1w'>('1d');
  const [candles, setCandles] = useState<CandleData[]>(initialCandles);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Indicator Toggles
  const [showEma9, setShowEma9] = useState<boolean>(true);
  const [showEma21, setShowEma21] = useState<boolean>(true);
  const [showEma50, setShowEma50] = useState<boolean>(false);
  const [showEma200, setShowEma200] = useState<boolean>(false);
  const [showBollinger, setShowBollinger] = useState<boolean>(true);
  const [showApogee, setShowApogee] = useState<boolean>(true);
  const [showVolume, setShowVolume] = useState<boolean>(true);
  const [activeSubplot, setActiveSubplot] = useState<'rsi' | 'macd' | 'none'>('rsi');

  // Visible window range slider
  const [visibleCount, setVisibleCount] = useState<number>(35);

  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch timeframe candles
  const fetchTimeframeCandles = async (tf: '1h' | '4h' | '1d' | '1w') => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/crypto/klines?interval=${tf}&limit=60`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.candles && data.candles.length > 0) {
          const processed = calculateIndicators(data.candles);
          setCandles(processed);
          setIsLoading(false);
          return;
        }
      }
    } catch (e) {
      console.warn('Failed to fetch live klines for timeframe', tf, e);
    }

    // Fallback: use initialCandles with modified timestamps or synthesized intervals
    const processed = calculateIndicators(initialCandles);
    setCandles(processed);
    setIsLoading(false);
  };

  const handleTimeframeChange = (tf: '1h' | '4h' | '1d' | '1w') => {
    setTimeframe(tf);
    fetchTimeframeCandles(tf);
  };

  // Slice visible candles
  const visibleCandles = useMemo(() => {
    const count = Math.min(candles.length, Math.max(15, visibleCount));
    return candles.slice(-count);
  }, [candles, visibleCount]);

  // Selected or latest candle for HUD
  const activeCandle = useMemo(() => {
    if (hoveredIdx !== null && visibleCandles[hoveredIdx]) {
      return visibleCandles[hoveredIdx];
    }
    return visibleCandles[visibleCandles.length - 1] || candles[0];
  }, [hoveredIdx, visibleCandles, candles]);

  // Chart dimensions
  const svgWidth = 960;
  const mainHeight = 360;
  const subplotHeight = activeSubplot !== 'none' ? 100 : 0;
  const totalHeight = mainHeight + subplotHeight;
  const padding = { top: 25, right: 65, bottom: 25, left: 15 };

  // Price Extents for Main Chart
  const { minPrice, maxPrice } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;

    visibleCandles.forEach((c) => {
      if (c.low < min) min = c.low;
      if (c.high > max) max = c.high;
      if (showBollinger) {
        if (c.bbLower < min) min = c.bbLower;
        if (c.bbUpper > max) max = c.bbUpper;
      }
      if (showEma200 && c.ema200 > 0) {
        if (c.ema200 < min) min = c.ema200;
        if (c.ema200 > max) max = c.ema200;
      }
    });

    const span = max - min || 1000;
    return {
      minPrice: Math.max(0, min - span * 0.05),
      maxPrice: max + span * 0.05
    };
  }, [visibleCandles, showBollinger, showEma200]);

  // Max Volume for bottom histogram
  const maxVolume = useMemo(() => {
    return Math.max(...visibleCandles.map((c) => c.volume || 1), 1);
  }, [visibleCandles]);

  // Scaling helpers
  const count = visibleCandles.length;
  const plotWidth = svgWidth - padding.left - padding.right;
  const candleStep = plotWidth / (count || 1);
  const candleBodyWidth = Math.max(3, Math.min(18, candleStep * 0.65));

  const getX = (idx: number) => padding.left + (idx + 0.5) * candleStep;
  const getY = (price: number) => {
    const effH = mainHeight - padding.top - padding.bottom;
    return mainHeight - padding.bottom - ((price - minPrice) / (maxPrice - minPrice || 1)) * effH;
  };

  // Subplot RSI / MACD Scaling
  const getSubplotY = (val: number, minVal: number, maxVal: number) => {
    const top = mainHeight + 15;
    const h = subplotHeight - 25;
    return top + h - ((val - minVal) / (maxVal - minVal || 1)) * h;
  };

  // SVG Paths for Overlays
  const ema9Path = useMemo(() => {
    return visibleCandles.map((c, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)},${getY(c.ema9)}`).join(' ');
  }, [visibleCandles, minPrice, maxPrice]);

  const ema21Path = useMemo(() => {
    return visibleCandles.map((c, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)},${getY(c.ema21)}`).join(' ');
  }, [visibleCandles, minPrice, maxPrice]);

  const ema50Path = useMemo(() => {
    return visibleCandles.map((c, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)},${getY(c.ema50)}`).join(' ');
  }, [visibleCandles, minPrice, maxPrice]);

  const ema200Path = useMemo(() => {
    return visibleCandles.map((c, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)},${getY(c.ema200)}`).join(' ');
  }, [visibleCandles, minPrice, maxPrice]);

  const bbAreaPath = useMemo(() => {
    const top = visibleCandles.map((c, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)},${getY(c.bbUpper)}`).join(' ');
    const btm = visibleCandles.slice().reverse().map((c) => `L ${getX(visibleCandles.indexOf(c))},${getY(c.bbLower)}`).join(' ');
    return `${top} ${btm} Z`;
  }, [visibleCandles, minPrice, maxPrice]);

  const bbMidPath = useMemo(() => {
    return visibleCandles.map((c, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)},${getY(c.bbMid)}`).join(' ');
  }, [visibleCandles, minPrice, maxPrice]);

  // RSI Subplot Path
  const rsiPath = useMemo(() => {
    return visibleCandles.map((c, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)},${getSubplotY(c.rsi, 0, 100)}`).join(' ');
  }, [visibleCandles, subplotHeight]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4 font-sans">
      {/* Top Toolbar: Timeframe, Indicator Toggles & Actions */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex flex-wrap items-center gap-3">
          {/* Title & Badge */}
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-emerald-400" />
              Interactive Pro Candlestick Terminal
            </h3>
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-bold">
              {timeframe.toUpperCase()}
            </span>
          </div>

          {/* Timeframe Selector Buttons */}
          <div className="flex items-center p-0.5 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs">
            {(['1h', '4h', '1d', '1w'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => handleTimeframeChange(tf)}
                className={`px-2.5 py-1 rounded text-xs font-bold transition-all uppercase ${
                  timeframe === tf
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Refresh Timeframe Button */}
          <button
            onClick={() => fetchTimeframeCandles(timeframe)}
            disabled={isLoading}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Refresh candlestick data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>

        {/* Indicator Overlays Controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <button
            onClick={() => setShowBollinger(!showBollinger)}
            className={`px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${
              showBollinger
                ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                : 'bg-slate-950 border-slate-800 text-slate-500'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            BB (20,2)
          </button>

          <button
            onClick={() => setShowEma9(!showEma9)}
            className={`px-2 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${
              showEma9
                ? 'bg-teal-500/15 border-teal-500/40 text-teal-300'
                : 'bg-slate-950 border-slate-800 text-slate-500'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-teal-400" />
            EMA 9
          </button>

          <button
            onClick={() => setShowEma21(!showEma21)}
            className={`px-2 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${
              showEma21
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                : 'bg-slate-950 border-slate-800 text-slate-500'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            EMA 21
          </button>

          <button
            onClick={() => setShowEma50(!showEma50)}
            className={`px-2 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${
              showEma50
                ? 'bg-purple-500/15 border-purple-500/40 text-purple-300'
                : 'bg-slate-950 border-slate-800 text-slate-500'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            EMA 50
          </button>

          <button
            onClick={() => setShowEma200(!showEma200)}
            className={`px-2 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${
              showEma200
                ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                : 'bg-slate-950 border-slate-800 text-slate-500'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            EMA 200
          </button>

          <button
            onClick={() => setShowApogee(!showApogee)}
            className={`px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${
              showApogee
                ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300 font-bold'
                : 'bg-slate-950 border-slate-800 text-slate-500'
            }`}
          >
            <Orbit className="w-3.5 h-3.5 text-indigo-400" />
            Apogee/Retro
          </button>

          {/* Subplot Toggle */}
          <div className="flex items-center p-0.5 bg-slate-950 rounded-lg border border-slate-800 ml-1">
            {(['rsi', 'macd', 'none'] as const).map((sub) => (
              <button
                key={sub}
                onClick={() => setActiveSubplot(sub)}
                className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                  activeSubplot === sub
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Floating HUD Info Bar */}
      {activeCandle && (
        <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-slate-400">Date: <strong className="text-slate-200">{activeCandle.timestamp}</strong></span>
            <span>O: <strong className="text-white">${activeCandle.open.toLocaleString()}</strong></span>
            <span>H: <strong className="text-emerald-400">${activeCandle.high.toLocaleString()}</strong></span>
            <span>L: <strong className="text-rose-400">${activeCandle.low.toLocaleString()}</strong></span>
            <span>C: <strong className="text-amber-400">${activeCandle.close.toLocaleString()}</strong></span>
            <span>Chg: <strong className={activeCandle.close >= activeCandle.open ? 'text-emerald-400' : 'text-rose-400'}>
              {(((activeCandle.close - activeCandle.open) / activeCandle.open) * 100).toFixed(2)}%
            </strong></span>
          </div>

          <div className="flex items-center gap-3 text-[11px]">
            {activeCandle.rsi !== undefined && (
              <span className="text-slate-400">RSI(14): <strong className={activeCandle.rsi < 35 ? 'text-emerald-400' : activeCandle.rsi > 65 ? 'text-rose-400' : 'text-slate-200'}>{activeCandle.rsi.toFixed(1)}</strong></span>
            )}
            {activeCandle.bbMid !== undefined && showBollinger && (
              <span className="text-slate-400">BB Mid: <strong className="text-cyan-400">${Math.round(activeCandle.bbMid).toLocaleString()}</strong></span>
            )}
            {activeCandle.isApogee && (
              <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                🌙 LUNAR APOGEE
              </span>
            )}
            {activeCandle.retrograde && (
              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                🪐 RETROGRADE
              </span>
            )}
          </div>
        </div>
      )}

      {/* Main SVG Candlestick Canvas */}
      <div 
        ref={containerRef}
        className="w-full overflow-x-auto relative cursor-crosshair select-none bg-slate-950/60 rounded-xl p-1 border border-slate-800/80"
        onMouseLeave={() => setHoveredIdx(null)}
      >
        <svg 
          viewBox={`0 0 ${svgWidth} ${totalHeight}`} 
          className="w-full h-auto min-w-[750px]"
        >
          <defs>
            <linearGradient id="bbGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="volGradBull" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="volGradBear" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid Lines & Price Labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
            const pVal = minPrice + pct * (maxPrice - minPrice);
            const yPos = getY(pVal);
            return (
              <g key={pct}>
                <line
                  x1={padding.left}
                  y1={yPos}
                  x2={svgWidth - padding.right}
                  y2={yPos}
                  stroke="#1e293b"
                  strokeDasharray="4 4"
                />
                <text
                  x={svgWidth - padding.right + 8}
                  y={yPos + 4}
                  fill="#64748b"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  ${Math.round(pVal).toLocaleString()}
                </text>
              </g>
            );
          })}

          {/* Bollinger Bands Shaded Area */}
          {showBollinger && (
            <>
              <path d={bbAreaPath} fill="url(#bbGrad)" />
              <path d={bbMidPath} fill="none" stroke="#06b6d4" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
            </>
          )}

          {/* EMA Overlays */}
          {showEma9 && <path d={ema9Path} fill="none" stroke="#2dd4bf" strokeWidth="1.5" opacity="0.9" />}
          {showEma21 && <path d={ema21Path} fill="none" stroke="#f59e0b" strokeWidth="1.75" opacity="0.9" />}
          {showEma50 && <path d={ema50Path} fill="none" stroke="#a855f7" strokeWidth="1.75" opacity="0.9" />}
          {showEma200 && <path d={ema200Path} fill="none" stroke="#f43f5e" strokeWidth="2" opacity="0.9" />}

          {/* Candlesticks & Volume Bars */}
          {visibleCandles.map((c, i) => {
            const isBull = c.close >= c.open;
            const candleColor = isBull ? '#10b981' : '#f43f5e';
            const cx = getX(i);
            const yHigh = getY(c.high);
            const yLow = getY(c.low);
            const yOpen = getY(c.open);
            const yClose = getY(c.close);
            const bodyTop = Math.min(yOpen, yClose);
            const bodyHeight = Math.max(2, Math.abs(yClose - yOpen));

            // Volume bar calculations
            const volBarHeight = showVolume ? Math.min(60, (c.volume / maxVolume) * 60) : 0;
            const volY = mainHeight - padding.bottom - volBarHeight;

            return (
              <g 
                key={c.timestamp + i}
                onMouseEnter={() => setHoveredIdx(i)}
                className="transition-opacity"
              >
                {/* Volume bar at bottom */}
                {showVolume && (
                  <rect
                    x={cx - candleBodyWidth / 2}
                    y={volY}
                    width={candleBodyWidth}
                    height={volBarHeight}
                    fill={isBull ? 'url(#volGradBull)' : 'url(#volGradBear)'}
                    stroke={candleColor}
                    strokeWidth="0.5"
                    opacity="0.75"
                  />
                )}

                {/* High/Low Wick */}
                <line
                  x1={cx}
                  y1={yHigh}
                  x2={cx}
                  y2={yLow}
                  stroke={candleColor}
                  strokeWidth="1.5"
                />

                {/* Open/Close Body */}
                <rect
                  x={cx - candleBodyWidth / 2}
                  y={bodyTop}
                  width={candleBodyWidth}
                  height={bodyHeight}
                  fill={isBull ? '#10b981' : '#f43f5e'}
                  rx="1.5"
                />

                {/* Celestial Apogee Marker */}
                {showApogee && c.isApogee && (
                  <g transform={`translate(${cx}, ${yHigh - 12})`}>
                    <circle r="6" fill="#6366f1" opacity="0.9" />
                    <text y="3" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold">🌙</text>
                  </g>
                )}

                {/* Celestial Retrograde Marker */}
                {showApogee && c.retrograde && !c.isApogee && (
                  <g transform={`translate(${cx}, ${yHigh - 12})`}>
                    <circle r="5" fill="#f59e0b" opacity="0.9" />
                    <text y="3" textAnchor="middle" fill="#ffffff" fontSize="7" fontWeight="bold">🪐</text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Current Live Price Horizontal Tracker Line */}
          {currentPrice && currentPrice >= minPrice && currentPrice <= maxPrice && (
            <g>
              <line
                x1={padding.left}
                y1={getY(currentPrice)}
                x2={svgWidth - padding.right}
                y2={getY(currentPrice)}
                stroke="#10b981"
                strokeWidth="1.5"
                strokeDasharray="2 2"
              />
              <rect
                x={svgWidth - padding.right + 2}
                y={getY(currentPrice) - 9}
                width="60"
                height="18"
                fill="#10b981"
                rx="3"
              />
              <text
                x={svgWidth - padding.right + 32}
                y={getY(currentPrice) + 4}
                textAnchor="middle"
                fill="#0f172a"
                fontSize="10"
                fontWeight="bold"
                fontFamily="monospace"
              >
                ${Math.round(currentPrice).toLocaleString()}
              </text>
            </g>
          )}

          {/* Hovered Crosshair Vertical & Horizontal Line */}
          {hoveredIdx !== null && visibleCandles[hoveredIdx] && (
            <g>
              <line
                x1={getX(hoveredIdx)}
                y1={padding.top}
                x2={getX(hoveredIdx)}
                y2={totalHeight - 10}
                stroke="#94a3b8"
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.8"
              />
              <line
                x1={padding.left}
                y1={getY(visibleCandles[hoveredIdx].close)}
                x2={svgWidth - padding.right}
                y2={getY(visibleCandles[hoveredIdx].close)}
                stroke="#94a3b8"
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.8"
              />
            </g>
          )}

          {/* Subplot: RSI Panel */}
          {activeSubplot === 'rsi' && (
            <g transform={`translate(0, ${mainHeight})`}>
              <line x1={padding.left} y1="0" x2={svgWidth - padding.right} y2="0" stroke="#334155" strokeWidth="1" />
              <text x={padding.left + 5} y="15" fill="#a855f7" fontSize="10" fontFamily="monospace" fontWeight="bold">
                RSI (14)
              </text>

              {/* 70 Overbought & 30 Oversold references */}
              <line x1={padding.left} y1={getSubplotY(70, 0, 100) - mainHeight} x2={svgWidth - padding.right} y2={getSubplotY(70, 0, 100) - mainHeight} stroke="#f43f5e" strokeDasharray="3 3" opacity="0.6" />
              <text x={svgWidth - padding.right + 8} y={getSubplotY(70, 0, 100) - mainHeight + 3} fill="#f43f5e" fontSize="9" fontFamily="monospace">70</text>

              <line x1={padding.left} y1={getSubplotY(30, 0, 100) - mainHeight} x2={svgWidth - padding.right} y2={getSubplotY(30, 0, 100) - mainHeight} stroke="#10b981" strokeDasharray="3 3" opacity="0.6" />
              <text x={svgWidth - padding.right + 8} y={getSubplotY(30, 0, 100) - mainHeight + 3} fill="#10b981" fontSize="9" fontFamily="monospace">30</text>

              {/* RSI Wave Line */}
              <path
                d={visibleCandles.map((c, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)},${getSubplotY(c.rsi, 0, 100) - mainHeight}`).join(' ')}
                fill="none"
                stroke="#c084fc"
                strokeWidth="1.5"
              />
            </g>
          )}

          {/* Subplot: MACD Panel */}
          {activeSubplot === 'macd' && (
            <g transform={`translate(0, ${mainHeight})`}>
              <line x1={padding.left} y1="0" x2={svgWidth - padding.right} y2="0" stroke="#334155" strokeWidth="1" />
              <text x={padding.left + 5} y="15" fill="#38bdf8" fontSize="10" fontFamily="monospace" fontWeight="bold">
                MACD (12, 26, 9)
              </text>

              {/* Zero line */}
              <line x1={padding.left} y1="50" x2={svgWidth - padding.right} y2="50" stroke="#475569" strokeDasharray="2 2" />

              {/* MACD Histograms */}
              {visibleCandles.map((c, i) => {
                const hist = c.macdHist || 0;
                const hHeight = Math.min(35, Math.abs(hist) * 0.05);
                const isPos = hist >= 0;
                return (
                  <rect
                    key={i}
                    x={getX(i) - 2}
                    y={isPos ? 50 - hHeight : 50}
                    width="4"
                    height={Math.max(1, hHeight)}
                    fill={isPos ? '#10b981' : '#f43f5e'}
                    opacity="0.85"
                  />
                );
              })}
            </g>
          )}
        </svg>
      </div>

      {/* Bottom Range Slider & Zoom Control */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs font-mono text-slate-400">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span>Candles Count:</span>
          <input
            type="range"
            min="15"
            max={Math.min(60, candles.length)}
            step="5"
            value={visibleCount}
            onChange={(e) => setVisibleCount(Number(e.target.value))}
            className="w-36 accent-amber-500 cursor-pointer"
          />
          <span className="text-amber-400 font-bold">{visibleCount}</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Bullish
          </span>
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            Bearish
          </span>
          <span className="flex items-center gap-1.5 text-indigo-300">
            <Orbit className="w-3.5 h-3.5 text-indigo-400" />
            Apogee Window (±2d)
          </span>
        </div>
      </div>
    </div>
  );
};
