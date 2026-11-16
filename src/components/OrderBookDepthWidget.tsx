import React, { useState, useEffect } from 'react';
import { binanceWs, OrderBookDepth, DepthItem } from '../services/binanceWs';
import { 
  Layers, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  ArrowUpDown, 
  Scale, 
  ShieldCheck, 
  Radio, 
  RefreshCw 
} from 'lucide-react';

interface OrderBookDepthWidgetProps {
  symbol?: string;
  className?: string;
}

export const OrderBookDepthWidget: React.FC<OrderBookDepthWidgetProps> = ({ 
  symbol = 'BTC',
  className = '' 
}) => {
  const [depth, setDepth] = useState<OrderBookDepth | null>(null);
  const [depthLimit, setDepthLimit] = useState<number>(10); // 5, 10, or 20 rows
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Subscribe to real-time depth stream from WebSocket
  useEffect(() => {
    const unsubscribe = binanceWs.onDepth((newDepth) => {
      setDepth(newDepth);
    });

    // If WebSocket hasn't delivered depth yet, fetch via internal server proxy
    if (!depth) {
      fetchRestDepth();
    }

    return () => {
      unsubscribe();
    };
  }, [symbol]);

  const fetchRestDepth = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/crypto/depth?symbol=${symbol}&limit=20`);
      if (res.ok) {
        const d = await res.json();
        if (d && d.bids && d.asks) {
          let cumBid = 0;
          const bids: DepthItem[] = d.bids.map(([price, qty]: [number, number]) => {
            cumBid += qty;
            return { price, quantity: qty, total: cumBid, depthPercent: 0 };
          });

          let cumAsk = 0;
          const asks: DepthItem[] = d.asks.map(([price, qty]: [number, number]) => {
            cumAsk += qty;
            return { price, quantity: qty, total: cumAsk, depthPercent: 0 };
          });

          const maxVol = Math.max(cumBid, cumAsk, 1);
          bids.forEach((b) => (b.depthPercent = Math.min(100, (b.total / maxVol) * 100)));
          asks.forEach((a) => (a.depthPercent = Math.min(100, (a.total / maxVol) * 100)));

          const bestBid = bids[0]?.price || 0;
          const bestAsk = asks[0]?.price || 0;
          const spread = bestAsk > 0 && bestBid > 0 ? Number((bestAsk - bestBid).toFixed(2)) : 0;
          const mid = (bestBid + bestAsk) / 2 || 1;
          const spreadBps = Number(((spread / mid) * 10000).toFixed(2));
          const imbalanceRatio = (cumBid + cumAsk) > 0 ? Number(((cumBid - cumAsk) / (cumBid + cumAsk)).toFixed(3)) : 0;

          setDepth({
            symbol: `${symbol}/USDT`,
            bids,
            asks,
            bestBid,
            bestAsk,
            spread,
            spreadBps,
            totalBidVolume: Number(cumBid.toFixed(4)),
            totalAskVolume: Number(cumAsk.toFixed(4)),
            imbalanceRatio,
            timestamp: Date.now(),
          });
        }
      }
    } catch (e) {
      // Quiet failover
    } finally {
      setIsLoading(false);
    }
  };

  const displayedAsks = depth ? depth.asks.slice(0, depthLimit).reverse() : [];
  const displayedBids = depth ? depth.bids.slice(0, depthLimit) : [];

  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl font-sans flex flex-col justify-between ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
            Level-2 Order Book
          </h4>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            20L DEPTH
          </span>
        </div>

        <div className="flex items-center gap-1.5 font-mono text-[10px]">
          {[5, 10, 15].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setDepthLimit(lvl)}
              className={`px-2 py-0.5 rounded font-bold transition-all ${
                depthLimit === lvl
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:text-white bg-slate-950'
              }`}
            >
              {lvl}L
            </button>
          ))}
          <button
            onClick={fetchRestDepth}
            disabled={isLoading}
            className="p-1 rounded bg-slate-950 text-slate-400 hover:text-white"
            title="Refresh Depth"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Liquidity Imbalance Meter */}
      {depth && (
        <div className="my-2.5 p-2 bg-slate-950/70 rounded-xl border border-slate-800 space-y-1.5 font-mono text-xs">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-400 flex items-center gap-1">
              <Scale className="w-3 h-3 text-amber-400" />
              Liquidity Imbalance:
            </span>
            <span className={`font-bold ${depth.imbalanceRatio > 0.05 ? 'text-emerald-400' : depth.imbalanceRatio < -0.05 ? 'text-rose-400' : 'text-slate-300'}`}>
              {depth.imbalanceRatio > 0 ? '+' : ''}{(depth.imbalanceRatio * 100).toFixed(1)}% {depth.imbalanceRatio > 0.05 ? 'Bid Wall' : depth.imbalanceRatio < -0.05 ? 'Ask Overhang' : 'Neutral'}
            </span>
          </div>

          {/* Dual progress bar */}
          <div className="h-1.5 w-full bg-slate-800 rounded-full flex overflow-hidden">
            <div 
              className="bg-emerald-500 transition-all duration-300" 
              style={{ width: `${Math.max(5, Math.min(95, ((depth.imbalanceRatio + 1) / 2) * 100))}%` }}
              title={`Bid Weight: ${((depth.imbalanceRatio + 1) / 2 * 100).toFixed(1)}%`}
            />
            <div 
              className="bg-rose-500 transition-all duration-300 flex-1" 
              title={`Ask Weight: ${(100 - (depth.imbalanceRatio + 1) / 2 * 100).toFixed(1)}%`}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-500">
            <span>Bids: {depth.totalBidVolume.toFixed(2)} BTC</span>
            <span>Asks: {depth.totalAskVolume.toFixed(2)} BTC</span>
          </div>
        </div>
      )}

      {/* Ladder Table */}
      <div className="space-y-1 font-mono text-[11px] overflow-hidden">
        {/* Table Column Labels */}
        <div className="flex items-center justify-between text-[9px] uppercase tracking-wider text-slate-500 px-1 pb-1 border-b border-slate-800/60">
          <span>Price (USDT)</span>
          <span>Size (BTC)</span>
          <span>Total</span>
        </div>

        {/* Asks (Sells in Red) - displayed in reverse order so lowest ask is at bottom */}
        <div className="space-y-0.5">
          {displayedAsks.map((ask, idx) => (
            <div key={`ask-${idx}`} className="relative flex items-center justify-between px-1.5 py-0.5 rounded overflow-hidden">
              <div 
                className="absolute right-0 top-0 bottom-0 bg-rose-500/15 pointer-events-none transition-all duration-150"
                style={{ width: `${ask.depthPercent}%` }}
              />
              <span className="text-rose-400 font-bold z-10">
                {ask.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-slate-300 z-10">{ask.quantity.toFixed(4)}</span>
              <span className="text-slate-500 z-10 text-[10px]">{ask.total.toFixed(3)}</span>
            </div>
          ))}
        </div>

        {/* Mid-Market Price & Spread Divider */}
        {depth && (
          <div className="my-1.5 py-1.5 px-2 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-xs font-bold text-white">
                ${(((depth.bestBid + depth.bestAsk) / 2) || depth.bestBid).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex items-center gap-2 text-[10px]">
              <span className="text-slate-400">Spread:</span>
              <span className="text-amber-400 font-bold">
                ${depth.spread.toFixed(2)} ({depth.spreadBps} bps)
              </span>
            </div>
          </div>
        )}

        {/* Bids (Buys in Green) */}
        <div className="space-y-0.5">
          {displayedBids.map((bid, idx) => (
            <div key={`bid-${idx}`} className="relative flex items-center justify-between px-1.5 py-0.5 rounded overflow-hidden">
              <div 
                className="absolute right-0 top-0 bottom-0 bg-emerald-500/15 pointer-events-none transition-all duration-150"
                style={{ width: `${bid.depthPercent}%` }}
              />
              <span className="text-emerald-400 font-bold z-10">
                {bid.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-slate-300 z-10">{bid.quantity.toFixed(4)}</span>
              <span className="text-slate-500 z-10 text-[10px]">{bid.total.toFixed(3)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
