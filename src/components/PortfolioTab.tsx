import React, { useState, useMemo } from 'react';
import { AssetAllocation } from '../types';
import { INITIAL_PORTFOLIO_ASSETS, INITIAL_TRADES, PORTFOLIO_CONFIG, WATCHED_COINS } from '../data/portfolioData';
import { 
  PieChart, 
  ArrowRightLeft, 
  ShieldAlert, 
  Bell, 
  Clock, 
  Wallet, 
  TrendingUp, 
  RefreshCw,
  PlusCircle,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface PortfolioTabProps {
  btcPrice?: number;
}

export const PortfolioTab: React.FC<PortfolioTabProps> = ({ btcPrice }) => {
  const [assets, setAssets] = useState<AssetAllocation[]>(() => {
    if (!btcPrice) return INITIAL_PORTFOLIO_ASSETS;
    return INITIAL_PORTFOLIO_ASSETS.map((a) => (a.symbol === 'BTC' ? { ...a, price: btcPrice } : a));
  });

  // Keep BTC price synchronized when live feed updates
  React.useEffect(() => {
    if (btcPrice) {
      setAssets((prev) => prev.map((a) => (a.symbol === 'BTC' ? { ...a, price: btcPrice } : a)));
    }
  }, [btcPrice]);
  const [selectedAsset, setSelectedAsset] = useState<string>('BTC');
  const [rebalanceExecuted, setRebalanceExecuted] = useState<boolean>(false);

  // Calculate portfolio totals
  const portfolioStats = useMemo(() => {
    let totalValue = 0;
    const assetsWithValue = assets.map((a) => {
      const val = a.currentHolding * a.price;
      totalValue += val;
      return { ...a, val };
    });

    const breakdown = assetsWithValue.map((a) => {
      const currentPct = totalValue > 0 ? (a.val / totalValue) * 100 : 0;
      const targetVal = totalValue * (a.targetPct / 100);
      const diffVal = targetVal - a.val;
      const diffUnits = a.price > 0 ? diffVal / a.price : 0;
      const action = diffVal > 1 ? 'BUY' : diffVal < -1 ? 'SELL' : 'BALANCED';

      return {
        ...a,
        currentPct,
        targetVal,
        diffVal,
        diffUnits,
        action
      };
    });

    return { totalValue, breakdown };
  }, [assets]);

  // Execute Rebalance Simulation
  const handleExecuteRebalance = () => {
    const total = portfolioStats.totalValue;
    const newAssets = assets.map((a) => {
      const targetVal = total * (a.targetPct / 100);
      const newHolding = a.price > 0 ? targetVal / a.price : a.currentHolding;
      return { ...a, currentHolding: newHolding };
    });
    setAssets(newAssets);
    setRebalanceExecuted(true);
    setTimeout(() => setRebalanceExecuted(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Top Portfolio Summary Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-2">
              <Wallet className="w-3.5 h-3.5 text-indigo-400" />
              Dynamic Multi-Asset Allocation Engine
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Portfolio Holdings &amp; Automated Rebalancer
            </h2>
            <p className="text-xs text-slate-400">
              Exchange: {PORTFOLIO_CONFIG.exchange} • Managed via CCXT &amp; Dynamic Allocation Strategy
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-xs text-slate-400 block font-mono">Net Portfolio Value</span>
              <div className="text-2xl font-bold font-mono text-emerald-400">
                ${portfolioStats.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <button
              onClick={handleExecuteRebalance}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 transition-all"
            >
              <ArrowRightLeft className="w-4 h-4" />
              Auto Rebalance to Target
            </button>
          </div>
        </div>

        {rebalanceExecuted && (
          <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4" />
            <span>Portfolio rebalanced successfully. Current allocations now match target weights!</span>
          </div>
        )}

        {/* Assets Allocation Bars */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
          {portfolioStats.breakdown.map((item) => {
            const isOverweight = item.currentPct > item.targetPct + 1;
            const isUnderweight = item.currentPct < item.targetPct - 1;

            return (
              <div key={item.symbol} className="bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 space-y-3 font-mono">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="font-bold text-sm text-white">{item.symbol}</span>
                    <span className="text-[11px] text-slate-400">({item.name})</span>
                  </div>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      item.action === 'BUY'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : item.action === 'SELL'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {item.action}
                  </span>
                </div>

                <div>
                  <div className="text-base font-bold text-slate-200">
                    ${item.val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-slate-400">
                    {item.currentHolding.toFixed(4)} {item.symbol} @ ${item.price.toLocaleString()}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">Allocation:</span>
                    <span className="text-slate-200">
                      {item.currentPct.toFixed(1)}% / <span className="text-amber-400">{item.targetPct}%</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden flex">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, item.currentPct)}%`,
                        backgroundColor: item.color
                      }}
                    />
                  </div>
                </div>

                {item.action !== 'BALANCED' && (
                  <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/80 flex items-center justify-between">
                    <span>Rebalance Order:</span>
                    <span className={item.action === 'BUY' ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                      {item.action} {Math.abs(item.diffUnits).toFixed(4)} {item.symbol} (${Math.abs(item.diffVal).toFixed(2)})
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Risk Rules & Price Alerts from portofolio_config.json */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-800">
            <Bell className="w-4 h-4 text-amber-400" />
            Configured Price &amp; Portfolio Alerts
          </h3>

          <div className="space-y-2.5">
            {PORTFOLIO_CONFIG.alerts.map((alert, idx) => (
              <div
                key={idx}
                className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between text-xs font-mono"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-bold text-slate-200 uppercase">
                    {alert.type} ALERT: {alert.coin ? `${alert.coin} ` : 'PORTFOLIO '}
                    {alert.condition.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-amber-400 font-bold">${alert.value.toLocaleString()}</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] border border-emerald-500/20">
                    ACTIVE MONITOR
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2 text-xs">
            <h4 className="font-semibold text-slate-300 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-purple-400" />
              Automated Risk Limits (Configured Rules)
            </h4>
            <div className="grid grid-cols-3 gap-3 font-mono text-center pt-1">
              <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Max Drawdown Limit</span>
                <span className="text-amber-400 font-bold">20.0%</span>
              </div>
              <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Stop Loss Hard Stop</span>
                <span className="text-rose-400 font-bold">10.0%</span>
              </div>
              <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Take Profit Target</span>
                <span className="text-emerald-400 font-bold">25.0%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Monitored Crypto Watchlist */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-2 border-b border-slate-800">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            Monitored Universe (coin_analysis.csv)
          </h3>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {WATCHED_COINS.map((c) => (
              <div
                key={c.symbol}
                className="p-2.5 bg-slate-950/70 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs font-mono"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-white">{c.symbol}</span>
                    <span className="text-[10px] text-slate-500 font-sans">{c.category}</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    ${c.price < 1 ? c.price.toFixed(4) : c.price.toLocaleString()}
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`block text-[11px] font-bold ${
                      c.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {c.change24h >= 0 ? '+' : ''}{c.change24h}%
                  </span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                      c.signal === 'BUY'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : c.signal === 'HOLD'
                        ? 'bg-amber-500/10 text-amber-400'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {c.signal}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Historical Real Trade History from trade_history.csv */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-800">
          <Clock className="w-4 h-4 text-amber-400" />
          Real Trade Log (trade_history.csv &amp; Modul 5 Portfolio)
        </h3>

        <div className="overflow-x-auto mt-3">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Symbol</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3 text-right">Amount</th>
                <th className="py-2.5 px-3 text-right">Price</th>
                <th className="py-2.5 px-3 text-right">Total USD</th>
                <th className="py-2.5 px-3 text-right">Fee</th>
                <th className="py-2.5 px-3 text-right">Profit / Loss</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {INITIAL_TRADES.map((t) => (
                <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-2 px-3 text-slate-300">{t.timestamp}</td>
                  <td className="py-2 px-3 font-bold text-white">{t.symbol}</td>
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
                  <td className="py-2 px-3 text-right text-slate-200">{t.amount}</td>
                  <td className="py-2 px-3 text-right text-slate-200">${t.price.toLocaleString()}</td>
                  <td className="py-2 px-3 text-right font-bold text-slate-100">${t.total.toLocaleString()}</td>
                  <td className="py-2 px-3 text-right text-slate-400">${t.fee.toFixed(2)}</td>
                  <td className="py-2 px-3 text-right">
                    {t.pnl !== undefined ? (
                      <span className={t.pnl >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                        {t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)} ({t.pnlPct?.toFixed(1)}%)
                      </span>
                    ) : (
                      <span className="text-slate-500">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
