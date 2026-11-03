import React, { useState, useMemo } from 'react';
import { GridLevel } from '../types';
import { 
  Grid3X3, 
  Play, 
  Pause, 
  RotateCcw, 
  Sliders, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Layers, 
  CheckCircle2, 
  ArrowUpRight, 
  ArrowDownRight 
} from 'lucide-react';

interface GridTradingTabProps {
  initialPrice: number;
}

export const GridTradingTab: React.FC<GridTradingTabProps> = ({ initialPrice }) => {
  const [symbol, setSymbol] = useState<string>('BTC/USDT');
  const [currentPrice, setCurrentPrice] = useState<number>(initialPrice);
  const [gridSpacingPct, setGridSpacingPct] = useState<number>(1.7); // 1.7%
  const [numGrids, setNumGrids] = useState<number>(10);
  const [budget, setBudget] = useState<number>(1000);
  const [accumulatedProfit, setAccumulatedProfit] = useState<number>(142.85);
  const [filledBuys, setFilledBuys] = useState<number>(12);
  const [filledSells, setFilledSells] = useState<number>(11);

  // Generate grid levels based on SimpleGridTrading class from grid_trading.py
  const gridLevels = useMemo(() => {
    const levels: GridLevel[] = [];
    const spacing = gridSpacingPct / 100;
    const amountPerGrid = budget / numGrids;

    // Half buy grids below, half sell grids above
    const half = Math.floor(numGrids / 2);

    // Sells above current price
    for (let i = half; i >= 1; i--) {
      const price = currentPrice * (1 + i * spacing);
      levels.push({
        level: i,
        price,
        type: 'SELL',
        distancePct: i * gridSpacingPct,
        status: 'PENDING',
        amount: amountPerGrid
      });
    }

    // Buys below current price
    for (let i = 1; i <= half; i++) {
      const price = currentPrice * (1 - i * spacing);
      levels.push({
        level: -i,
        price,
        type: 'BUY',
        distancePct: -i * gridSpacingPct,
        status: 'PENDING',
        amount: amountPerGrid
      });
    }

    return levels;
  }, [currentPrice, gridSpacingPct, numGrids, budget]);

  // Simulate tick price move
  const handlePriceTick = (deltaPct: number) => {
    const newPrice = currentPrice * (1 + deltaPct / 100);
    setCurrentPrice(newPrice);

    if (deltaPct > 0) {
      setFilledSells((prev) => prev + 1);
      const profitFromStep = (budget / numGrids) * (gridSpacingPct / 100);
      setAccumulatedProfit((prev) => prev + profitFromStep);
    } else {
      setFilledBuys((prev) => prev + 1);
    }
  };

  return (
    <div className="space-y-6">
      {/* Grid Bot Header & Parameters */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-2">
              <Grid3X3 className="w-3.5 h-3.5 text-amber-400" />
              Module 2.1: Long-Only Spot Grid Trading Engine
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Systematic Volatility Harvester (Grid Bot)
            </h2>
            <p className="text-xs text-slate-400">
              Captures non-directional crypto swings via geometric price ladders and auto-reinvesting limit orders
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handlePriceTick(-1.5)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-bold font-mono transition-all"
            >
              <ArrowDownRight className="w-4 h-4" />
              Tick Price Down (-1.5%)
            </button>
            <button
              onClick={() => handlePriceTick(1.5)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold font-mono transition-all"
            >
              <ArrowUpRight className="w-4 h-4" />
              Tick Price Up (+1.5%)
            </button>
          </div>
        </div>

        {/* Configuration Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 text-xs font-mono">
          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80">
            <span className="text-slate-400 block mb-1">Base Pair</span>
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white w-full focus:outline-none focus:border-amber-500"
            >
              <option value="BTC/USDT">BTC/USDT ($85,263)</option>
              <option value="ETH/USDT">ETH/USDT ($2,940)</option>
              <option value="SOL/USDT">SOL/USDT ($172)</option>
            </select>
          </div>

          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80">
            <div className="flex justify-between items-center mb-1">
              <span className="text-slate-400">Grid Spacing:</span>
              <span className="text-amber-400 font-bold">{gridSpacingPct.toFixed(2)}%</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="3.5"
              step="0.1"
              value={gridSpacingPct}
              onChange={(e) => setGridSpacingPct(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <span className="text-[10px] text-slate-500">Per grid profit: {(gridSpacingPct * 0.999).toFixed(2)}% net</span>
          </div>

          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80">
            <div className="flex justify-between items-center mb-1">
              <span className="text-slate-400">Number of Grids:</span>
              <span className="text-cyan-400 font-bold">{numGrids}</span>
            </div>
            <input
              type="range"
              min="4"
              max="20"
              step="2"
              value={numGrids}
              onChange={(e) => setNumGrids(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <span className="text-[10px] text-slate-500">{(numGrids / 2).toFixed(0)} Buys / {(numGrids / 2).toFixed(0)} Sells</span>
          </div>

          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80">
            <span className="text-slate-400 block mb-1">Allocated Budget ($)</span>
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(Math.max(100, Number(e.target.value)))}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white w-full focus:outline-none focus:border-amber-500 font-bold text-right"
            />
          </div>
        </div>

        {/* Live Performance Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-800/80 font-mono">
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[11px] text-slate-400 block">Current Market Price</span>
            <span className="text-lg font-bold text-white mt-0.5 block">
              ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-slate-400">Anchor: ${initialPrice.toLocaleString()}</span>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[11px] text-slate-400 block">Accumulated Grid Profit</span>
            <span className="text-lg font-bold text-emerald-400 mt-0.5 block">
              +${accumulatedProfit.toFixed(2)}
            </span>
            <span className="text-[10px] text-emerald-400 font-semibold">+{((accumulatedProfit / budget) * 100).toFixed(2)}% on budget</span>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[11px] text-slate-400 block">Filled Limit Orders</span>
            <span className="text-lg font-bold text-cyan-400 mt-0.5 block">
              {filledBuys + filledSells} Fills
            </span>
            <span className="text-[10px] text-slate-400">{filledBuys} Buys / {filledSells} Sells</span>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[11px] text-slate-400 block">Est. Annualized APR</span>
            <span className="text-lg font-bold text-purple-400 mt-0.5 block">
              34.8% APR
            </span>
            <span className="text-[10px] text-slate-400">Derived from 2.18% daily vol</span>
          </div>
        </div>
      </div>

      {/* Visual Grid Ladder */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-800">
          <Layers className="w-4 h-4 text-amber-400" />
          Active Grid Ladder &amp; Limit Order Book
        </h3>

        <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1 font-mono text-xs">
          {gridLevels.map((lvl) => {
            const isSell = lvl.type === 'SELL';
            return (
              <div
                key={lvl.level}
                className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                  isSell
                    ? 'bg-rose-950/20 border-rose-900/40 text-rose-300'
                    : 'bg-emerald-950/20 border-emerald-900/40 text-emerald-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isSell ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
                    }`}
                  >
                    {isSell ? `SELL TARGET ${lvl.level}` : `BUY LIMIT ${Math.abs(lvl.level)}`}
                  </span>
                  <span className="text-white font-bold">
                    ${lvl.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-slate-400">
                    {lvl.distancePct >= 0 ? '+' : ''}{lvl.distancePct.toFixed(2)}% from center
                  </span>
                  <span className="text-slate-300 font-semibold">
                    ${lvl.amount.toFixed(2)}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                    STANDBY
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
