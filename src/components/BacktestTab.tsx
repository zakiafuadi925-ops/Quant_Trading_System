import React, { useState, useMemo } from 'react';
import { CandleData } from '../types';
import { 
  Play, 
  RotateCcw, 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck, 
  Zap, 
  DollarSign, 
  Sliders, 
  Clock, 
  ChevronRight,
  Info
} from 'lucide-react';

interface BacktestTabProps {
  candles: CandleData[];
}

export const BacktestTab: React.FC<BacktestTabProps> = ({ candles }) => {
  const [initialCapital, setInitialCapital] = useState<number>(1000);
  const [feeRate, setFeeRate] = useState<number>(0.001); // 0.1%
  const [threshold, setThreshold] = useState<number>(0.51);
  const [selectedOverlay, setSelectedOverlay] = useState<'all' | 'ema' | 'bb'>('all');
  const [filterTradeType, setFilterTradeType] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');

  // Run backtesting logic faithfully reproducing run_backtest from backtest_from_python.py
  const backtestResults = useMemo(() => {
    let balance = initialCapital;
    let position = 0; // BTC held
    let peakEquity = initialCapital;
    let maxDrawdown = 0;
    let winningTrades = 0;
    let losingTrades = 0;
    let grossProfit = 0;
    let grossLoss = 0;
    let lastBuyPrice = 0;

    const trades: Array<{
      id: string;
      date: string;
      type: 'BUY' | 'SELL';
      price: number;
      units: number;
      value: number;
      balanceAfter: number;
      pnl: number;
      pnlPct: number;
    }> = [];

    const curve: Array<{
      date: string;
      close: number;
      strategyEquity: number;
      buyHoldEquity: number;
      signal: number;
      position: number;
    }> = [];

    const firstPrice = candles[0]?.close || 1;

    candles.forEach((c, idx) => {
      // Signal logic: direction probability > threshold
      const prob = c.directionProb ?? 0.5;
      const isBuySignal = prob >= threshold;
      const currentPrice = c.close;

      if (isBuySignal && position === 0) {
        // Buy full balance
        const buyUnits = (balance * (1 - feeRate)) / currentPrice;
        position = buyUnits;
        balance = 0;
        lastBuyPrice = currentPrice;

        trades.push({
          id: `trade-${idx}-buy`,
          date: c.timestamp,
          type: 'BUY',
          price: currentPrice,
          units: buyUnits,
          value: buyUnits * currentPrice,
          balanceAfter: 0,
          pnl: 0,
          pnlPct: 0
        });
      } else if (!isBuySignal && position > 0) {
        // Sell all position
        const sellProceeds = position * currentPrice * (1 - feeRate);
        const costBasis = position * lastBuyPrice;
        const tradePnl = sellProceeds - costBasis;
        const tradePnlPct = ((currentPrice - lastBuyPrice) / lastBuyPrice) * 100;

        if (tradePnl > 0) {
          winningTrades++;
          grossProfit += tradePnl;
        } else {
          losingTrades++;
          grossLoss += Math.abs(tradePnl);
        }

        balance = sellProceeds;
        trades.push({
          id: `trade-${idx}-sell`,
          date: c.timestamp,
          type: 'SELL',
          price: currentPrice,
          units: position,
          value: sellProceeds,
          balanceAfter: balance,
          pnl: tradePnl,
          pnlPct: tradePnlPct
        });

        position = 0;
      }

      const currentEquity = balance + position * currentPrice;
      if (currentEquity > peakEquity) {
        peakEquity = currentEquity;
      }
      const currentDD = ((peakEquity - currentEquity) / peakEquity) * 100;
      if (currentDD > maxDrawdown) {
        maxDrawdown = currentDD;
      }

      const buyHold = (currentPrice / firstPrice) * initialCapital;

      curve.push({
        date: c.timestamp,
        close: currentPrice,
        strategyEquity: currentEquity,
        buyHoldEquity: buyHold,
        signal: isBuySignal ? 1 : 0,
        position
      });
    });

    const finalEquity = curve[curve.length - 1]?.strategyEquity || initialCapital;
    const buyHoldFinal = curve[curve.length - 1]?.buyHoldEquity || initialCapital;
    const totalReturnPct = ((finalEquity - initialCapital) / initialCapital) * 100;
    const buyHoldReturnPct = ((buyHoldFinal - initialCapital) / initialCapital) * 100;
    const totalTrades = winningTrades + losingTrades;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99.9 : 1.0;

    return {
      curve,
      trades,
      finalEquity,
      buyHoldFinal,
      totalReturnPct,
      buyHoldReturnPct,
      maxDrawdown,
      totalTrades,
      winRate,
      profitFactor
    };
  }, [candles, initialCapital, feeRate, threshold]);

  const filteredTrades = useMemo(() => {
    if (filterTradeType === 'ALL') return backtestResults.trades;
    return backtestResults.trades.filter((t) => t.type === filterTradeType);
  }, [backtestResults.trades, filterTradeType]);

  // Chart coordinate calculations
  const chartHeight = 280;
  const chartWidth = 900;
  const padding = { top: 20, right: 30, bottom: 30, left: 60 };

  const { minEq, maxEq } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    backtestResults.curve.forEach((pt) => {
      if (pt.strategyEquity < min) min = pt.strategyEquity;
      if (pt.buyHoldEquity < min) min = pt.buyHoldEquity;
      if (pt.strategyEquity > max) max = pt.strategyEquity;
      if (pt.buyHoldEquity > max) max = pt.buyHoldEquity;
    });
    return { minEq: Math.max(0, min * 0.95), maxEq: max * 1.05 };
  }, [backtestResults.curve]);

  const pointsCount = backtestResults.curve.length;
  const scaleX = (idx: number) => padding.left + (idx / (pointsCount - 1)) * (chartWidth - padding.left - padding.right);
  const scaleY = (val: number) => chartHeight - padding.bottom - ((val - minEq) / (maxEq - minEq || 1)) * (chartHeight - padding.top - padding.bottom);

  const strategyPath = useMemo(() => {
    return backtestResults.curve
      .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${scaleX(idx)},${scaleY(pt.strategyEquity)}`)
      .join(' ');
  }, [backtestResults.curve, minEq, maxEq]);

  const buyHoldPath = useMemo(() => {
    return backtestResults.curve
      .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${scaleX(idx)},${scaleY(pt.buyHoldEquity)}`)
      .join(' ');
  }, [backtestResults.curve, minEq, maxEq]);

  return (
    <div className="space-y-6">
      {/* Top Parameter & Backtest Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              Algorithmic Backtesting Lab
            </h2>
            <p className="text-xs text-slate-400">
              Simulate quantitative LSTM signal generation and compare with benchmark Buy &amp; Hold
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
            <div>
              <span className="text-slate-400 block mb-1">Capital ($)</span>
              <input
                type="number"
                value={initialCapital}
                onChange={(e) => setInitialCapital(Math.max(100, Number(e.target.value)))}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white w-24 text-right focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <span className="text-slate-400 block mb-1">Fee (0.1% = 0.001)</span>
              <input
                type="number"
                step="0.0005"
                value={feeRate}
                onChange={(e) => setFeeRate(Number(e.target.value))}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white w-24 text-right focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-slate-400">Signal Threshold:</span>
                <span className="text-amber-400 font-bold ml-2">{threshold.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.30"
                max="0.65"
                step="0.01"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-36 accent-amber-500 cursor-pointer"
              />
            </div>

            <button
              onClick={() => {
                setInitialCapital(1000);
                setFeeRate(0.001);
                setThreshold(0.51);
              }}
              className="mt-4 lg:mt-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          </div>
        </div>

        {/* Metric Cards Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-4">
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
            <span className="text-[11px] font-medium text-slate-400 block">Final Strategy Balance</span>
            <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
              ${backtestResults.finalEquity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className={`text-[11px] font-mono flex items-center gap-1 ${backtestResults.totalReturnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {backtestResults.totalReturnPct >= 0 ? '+' : ''}{backtestResults.totalReturnPct.toFixed(2)}% ROI
            </span>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
            <span className="text-[11px] font-medium text-slate-400 block">Buy &amp; Hold Return</span>
            <div className="text-lg font-bold font-mono text-slate-200 mt-0.5">
              ${backtestResults.buyHoldFinal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className={`text-[11px] font-mono ${backtestResults.buyHoldReturnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {backtestResults.buyHoldReturnPct >= 0 ? '+' : ''}{backtestResults.buyHoldReturnPct.toFixed(2)}% B&amp;H
            </span>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
            <span className="text-[11px] font-medium text-slate-400 block">Strategy Max DD</span>
            <div className="text-lg font-bold font-mono text-amber-400 mt-0.5">
              -{backtestResults.maxDrawdown.toFixed(2)}%
            </div>
            <span className="text-[10px] text-slate-400">Protection edge vs crash</span>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
            <span className="text-[11px] font-medium text-slate-400 block">Win Rate</span>
            <div className="text-lg font-bold font-mono text-cyan-400 mt-0.5">
              {backtestResults.winRate.toFixed(1)}%
            </div>
            <span className="text-[10px] text-slate-400">{backtestResults.totalTrades} completed trades</span>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
            <span className="text-[11px] font-medium text-slate-400 block">Profit Factor</span>
            <div className="text-lg font-bold font-mono text-purple-400 mt-0.5">
              {backtestResults.profitFactor.toFixed(2)}x
            </div>
            <span className="text-[10px] text-slate-400">Gross Win / Gross Loss</span>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
            <span className="text-[11px] font-medium text-slate-400 block">Alpha Spread</span>
            <div className={`text-lg font-bold font-mono mt-0.5 ${backtestResults.totalReturnPct - backtestResults.buyHoldReturnPct >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {(backtestResults.totalReturnPct - backtestResults.buyHoldReturnPct).toFixed(2)}%
            </div>
            <span className="text-[10px] text-slate-400">Risk-adjusted Alpha</span>
          </div>
        </div>
      </div>

      {/* Main Equity Comparison Chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Equity Growth Comparison: Strategy vs Buy &amp; Hold
            </h3>
            <p className="text-xs text-slate-400">Interactive trajectory on test dataset starting at $1,000</p>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-3 h-0.5 bg-emerald-400 inline-block" />
              <span className="text-slate-300 font-medium">Model Strategy Equity</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-0.5 bg-slate-500 border-b border-dashed border-slate-400 inline-block" />
              <span className="text-slate-400">Buy &amp; Hold Benchmark</span>
            </div>
          </div>
        </div>

        {/* SVG Equity Chart */}
        <div className="w-full overflow-x-auto py-2">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto min-w-[700px]">
            {/* Grid Lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
              const yVal = minEq + pct * (maxEq - minEq);
              const yPos = scaleY(yVal);
              return (
                <g key={pct}>
                  <line
                    x1={padding.left}
                    y1={yPos}
                    x2={chartWidth - padding.right}
                    y2={yPos}
                    stroke="#1e293b"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={padding.left - 8}
                    y={yPos + 4}
                    textAnchor="end"
                    fill="#64748b"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    ${Math.round(yVal).toLocaleString()}
                  </text>
                </g>
              );
            })}

            {/* Benchmark Path */}
            <path
              d={buyHoldPath}
              fill="none"
              stroke="#64748b"
              strokeWidth="2"
              strokeDasharray="4 4"
              opacity="0.8"
            />

            {/* Strategy Equity Path */}
            <path
              d={strategyPath}
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
            />

            {/* Trade Markers */}
            {backtestResults.trades.map((t) => {
              const ptIdx = backtestResults.curve.findIndex((c) => c.date === t.date);
              if (ptIdx === -1) return null;
              const pt = backtestResults.curve[ptIdx];
              const cx = scaleX(ptIdx);
              const cy = scaleY(pt.strategyEquity);

              return (
                <g key={t.id}>
                  <circle
                    cx={cx}
                    cy={cy}
                    r="4"
                    fill={t.type === 'BUY' ? '#10b981' : '#f43f5e'}
                    stroke="#0f172a"
                    strokeWidth="1.5"
                  />
                </g>
              );
            })}
          </svg>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-2 border-t border-slate-800/60">
          <span>Start: {candles[0]?.timestamp}</span>
          <span>Window Size: 60 periods lookback</span>
          <span>End: {candles[candles.length - 1]?.timestamp}</span>
        </div>
      </div>

      {/* Trade Execution Ledger */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              Backtest Trade Execution History
            </h3>
            <p className="text-xs text-slate-400">Order fills with exchange fees and profit realization</p>
          </div>

          <div className="flex items-center gap-2">
            {(['ALL', 'BUY', 'SELL'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setFilterTradeType(filter)}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                  filterTradeType === filter
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto mt-3">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Side</th>
                <th className="py-2.5 px-3 text-right">Execution Price</th>
                <th className="py-2.5 px-3 text-right">Position Units</th>
                <th className="py-2.5 px-3 text-right">Order Value</th>
                <th className="py-2.5 px-3 text-right">Trade Return</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredTrades.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No trades executed with threshold {threshold.toFixed(2)}. Adjust threshold to generate signals.
                  </td>
                </tr>
              ) : (
                filteredTrades.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2 px-3 text-slate-300">{t.date}</td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          t.type === 'BUY'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {t.type}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right text-slate-200">
                      ${t.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-300">{t.units.toFixed(5)} BTC</td>
                    <td className="py-2 px-3 text-right text-slate-300">
                      ${t.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-3 text-right">
                      {t.type === 'SELL' ? (
                        <span className={t.pnlPct >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                          {t.pnlPct >= 0 ? '+' : ''}{t.pnlPct.toFixed(2)}% (${t.pnl.toFixed(2)})
                        </span>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
