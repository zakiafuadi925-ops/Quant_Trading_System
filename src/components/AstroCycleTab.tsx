import React, { useState } from 'react';
import { CandleData } from '../types';
import { APOGEE_WINDOW_ANALYSIS } from '../data/modelsData';
import { Orbit, Sparkles, Moon, Sun, CheckCircle2, AlertTriangle, Compass, TrendingUp, BarChart2 } from 'lucide-react';

interface AstroCycleTabProps {
  candles: CandleData[];
}

export const AstroCycleTab: React.FC<AstroCycleTabProps> = ({ candles }) => {
  const [selectedWindow, setSelectedWindow] = useState<number>(2);
  const [filterConfluence, setFilterConfluence] = useState<'all' | 'apogee' | 'retrograde' | 'rsi_confluence'>('all');

  // Filtered celestial events
  const celestialCandles = candles.filter((c) => {
    if (filterConfluence === 'apogee') return c.isApogee;
    if (filterConfluence === 'retrograde') return c.retrograde;
    if (filterConfluence === 'rsi_confluence') return c.isApogee && (c.rsi < 40 || c.rsi > 60);
    return c.isApogee || c.retrograde;
  });

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-900/40 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Astronacci Financial Astrology &amp; Cycle Intelligence
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Astronomical Cycle &amp; Apogee Statistical Lab
            </h2>
            <p className="text-sm text-slate-300 mt-1 leading-relaxed">
              Synthesizing astronomical turning points (Apogee/Perigee windows, Mercury/Venus Retrogrades, Jupiter &amp; Saturn harmonics) with quantitative technical confluences (RSI, MACD, Bollinger Bands) to identify high-probability trend reversals.
            </p>
          </div>

          <div className="flex flex-col gap-2 bg-slate-950/80 border border-indigo-800/50 p-4 rounded-xl font-mono text-xs text-right">
            <div>
              <span className="text-slate-400">Primary Hypothesis:</span>
              <span className="text-emerald-400 font-bold block">p &lt; 0.05 on ±1 to ±2d</span>
            </div>
            <div>
              <span className="text-slate-400">Astro-Quant Edge:</span>
              <span className="text-indigo-300 font-bold block">+0.395% Return inside Apogee</span>
            </div>
          </div>
        </div>
      </div>

      {/* Statistical Significance Table: Apogee Window ±N Hari */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Compass className="w-4 h-4 text-indigo-400" />
              Empirical Apogee Window Analysis (T-Test &amp; Return Spread)
            </h3>
            <p className="text-xs text-slate-400">
              Evaluated on full Astronacci dataset across ±1 to ±5 days window around lunar orbital apogee
            </p>
          </div>

          <div className="flex items-center gap-2">
            {[1, 2, 3, 5].map((w) => (
              <button
                key={w}
                onClick={() => setSelectedWindow(w)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  selectedWindow === w
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                ±{w} Days
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2.5 px-3">Window Offset</th>
                <th className="py-2.5 px-3">In-Window Distribution</th>
                <th className="py-2.5 px-3 text-right">Mean Return (Inside)</th>
                <th className="py-2.5 px-3 text-right">Mean Return (Outside)</th>
                <th className="py-2.5 px-3 text-right">T-Statistic</th>
                <th className="py-2.5 px-3 text-right">P-Value</th>
                <th className="py-2.5 px-3 text-center">Statistical Alpha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {APOGEE_WINDOW_ANALYSIS.map((row) => (
                <tr
                  key={row.window}
                  className={`hover:bg-slate-800/40 transition-colors ${
                    row.window.includes(String(selectedWindow)) ? 'bg-indigo-950/30' : ''
                  }`}
                >
                  <td className="py-2.5 px-3 font-bold text-indigo-300 flex items-center gap-2">
                    <Moon className="w-3.5 h-3.5 text-indigo-400" />
                    {row.window}
                  </td>
                  <td className="py-2.5 px-3 text-slate-300">
                    {row.inPct} Inside / {row.outPct} Outside
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
                    {row.returnIn}
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-400">
                    {row.returnOut}
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-300">
                    {row.tStat.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-amber-400">
                    {row.pValue.toFixed(3)}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {row.significant ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                        <CheckCircle2 className="w-3 h-3" />
                        Significant (p &lt; 0.05)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px]">
                        Null Margin
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs text-slate-400 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-slate-200">Key Research Finding:</span> Lunar Apogee creates statistically significant mean reversion windows within ±1 to ±2 days (p=0.033 and p=0.045), where mean returns (+0.395% to +0.482%) are more than 3x higher than non-apogee periods.
          </div>
        </div>
      </div>

      {/* Astro Confluence Matrix & Astronomical Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Astronomical & Technical Confluence Strategy */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Orbit className="w-4 h-4 text-purple-400" />
                Astronacci Confluence Strategy Engine
              </h3>
              <p className="text-xs text-slate-400">Three-tier confirmation rules: Astro Cycle + Technical Indicators</p>
            </div>
            <div className="flex items-center gap-1.5">
              {(['all', 'apogee', 'retrograde', 'rsi_confluence'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setFilterConfluence(filter)}
                  className={`px-2 py-1 rounded text-[11px] font-semibold capitalize ${
                    filterConfluence === filter
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {filter.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-xl flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 border border-emerald-500/20">
                L1
              </div>
              <div className="text-xs space-y-1">
                <div className="font-semibold text-slate-200">Tier 1: Celestial Timing Anchor (Cycle Trigger)</div>
                <div className="text-slate-400">
                  Lunar Apogee window active (±2 days) or planetary turning point (Venus/Mercury retrograde stationary point). Flags potential market turning windows.
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-xl flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold text-xs shrink-0 border border-cyan-500/20">
                L2
              </div>
              <div className="text-xs space-y-1">
                <div className="font-semibold text-slate-200">Tier 2: Momentum &amp; Mean Reversion (RSI 14 &amp; MACD)</div>
                <div className="text-slate-400">
                  RSI oversold &lt; 35 for Long reversal, or RSI overbought &gt; 65 for Short taking. MACD histogram inflection or bullish line crossover confirms momentum shifting.
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-xl flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0 border border-amber-500/20">
                L3
              </div>
              <div className="text-xs space-y-1">
                <div className="font-semibold text-slate-200">Tier 3: Volatility Envelope (Bollinger Bands Squeeze &amp; Breakout)</div>
                <div className="text-slate-400">
                  Bollinger Band squeeze (BB_Width &lt; 0.15) precedes cyclical expansion. Confluence triggers execution when price breaks out of the lower or upper band.
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-3">
            <h4 className="text-xs font-semibold text-slate-300 mb-2">Recent Celestial &amp; Technical Confluence Events</h4>
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {celestialCandles.map((c) => (
                <div
                  key={c.timestamp}
                  className="p-2 bg-slate-950/50 rounded-lg border border-slate-800/60 flex items-center justify-between text-xs font-mono"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">{c.timestamp}</span>
                    {c.isApogee && (
                      <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] border border-indigo-500/30">
                        Apogee
                      </span>
                    )}
                    {c.retrograde && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] border border-amber-500/30">
                        Retrograde
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-slate-300">${c.close.toLocaleString()}</span>
                    <span className="text-slate-400">RSI: {c.rsi.toFixed(1)}</span>
                    <span className={c.macdHist >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      MACD: {c.macdHist.toFixed(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Celestial Harmonizer & Planetary Resonance */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-800">
            <Sun className="w-4 h-4 text-amber-400" />
            Planetary Resonance Harmonic
          </h3>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Jupiter Harmonic (sin):</span>
                <span className="font-mono font-bold text-amber-400">+0.784 (Bullish Phase)</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full rounded-full" style={{ width: '78%' }} />
              </div>
              <p className="text-[11px] text-slate-500">Cycle duration: ~11.86 Earth years (Macro Liquidity cycle)</p>
            </div>

            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Saturn Harmonic (sin):</span>
                <span className="font-mono font-bold text-indigo-400">-0.342 (Resistance Phase)</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-500 to-rose-400 h-full rounded-full" style={{ width: '42%' }} />
              </div>
              <p className="text-[11px] text-slate-500">Cycle duration: ~29.4 Earth years (Macro Structural support)</p>
            </div>

            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Lunar Distance Phase:</span>
                <span className="font-mono font-bold text-cyan-400">406,200 km (Near Apogee)</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-cyan-500 h-full rounded-full" style={{ width: '92%' }} />
              </div>
              <p className="text-[11px] text-slate-500">Orbital eccentricity: 0.0549 (Heightened Volatility window)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
