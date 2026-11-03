import React, { useState } from 'react';
import { LiveTicker } from '../services/cryptoApi';
import { 
  X, 
  RefreshCw, 
  Download, 
  Terminal, 
  CheckCircle2, 
  Zap, 
  Clock, 
  Globe, 
  Database,
  Code
} from 'lucide-react';

interface LiveFeedModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticker: LiveTicker;
  isAutoSync: boolean;
  setIsAutoSync: (val: boolean) => void;
  syncInterval: number;
  setSyncInterval: (sec: number) => void;
  onManualFetch: () => void;
  isFetching: boolean;
}

export const LiveFeedModal: React.FC<LiveFeedModalProps> = ({
  isOpen,
  onClose,
  ticker,
  isAutoSync,
  setIsAutoSync,
  syncInterval,
  setSyncInterval,
  onManualFetch,
  isFetching
}) => {
  if (!isOpen) return null;

  const handleDownloadCsv = () => {
    const csvContent = `timestamp,symbol,price,change_24h,high_24h,low_24h,volume_24h,source\n${new Date().toISOString()},${ticker.symbol},${ticker.price},${ticker.change24h},${ticker.high24h},${ticker.low24h},${ticker.volume24h},${ticker.source}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `btc_live_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Automated Live Market Feed &amp; Ingestion
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono border border-emerald-500/30">
                  REAL-TIME
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Direct integration with Binance REST API (No API keys required)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Status Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block">Latest Price</span>
            <span className="text-base font-bold text-emerald-400 mt-0.5 block">
              ${ticker.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block">24h Change</span>
            <span className={`text-base font-bold mt-0.5 block ${ticker.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {ticker.change24h >= 0 ? '+' : ''}{ticker.change24h.toFixed(2)}%
            </span>
          </div>

          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block">Source Provider</span>
            <span className="text-xs font-bold text-cyan-300 mt-1 block">
              {ticker.source}
            </span>
          </div>

          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block">Last Synced</span>
            <span className="text-xs font-bold text-slate-200 mt-1 block">
              {ticker.lastUpdated}
            </span>
          </div>
        </div>

        {/* Controls: Auto-Sync & Interval */}
        <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-white block">Auto-Sync Polling</span>
              <p className="text-[11px] text-slate-400">
                Automatically fetch live ticker ticks in the background while viewing the app
              </p>
            </div>

            <button
              onClick={() => setIsAutoSync(!isAutoSync)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-1.5 ${
                isAutoSync
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${isAutoSync ? 'bg-slate-950 animate-ping' : 'bg-slate-500'}`} />
              {isAutoSync ? 'AUTO-SYNC ACTIVE' : 'PAUSED'}
            </button>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-800/60 font-mono text-xs">
            <span className="text-slate-400">Interval:</span>
            {[5, 10, 30, 60].map((sec) => (
              <button
                key={sec}
                onClick={() => setSyncInterval(sec)}
                className={`px-2.5 py-1 rounded text-[11px] ${
                  syncInterval === sec
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {sec}s
              </button>
            ))}

            <button
              onClick={onManualFetch}
              disabled={isFetching}
              className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              Fetch Now
            </button>
          </div>
        </div>

        {/* Python CCXT Automation Reference */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Code className="w-3.5 h-3.5 text-cyan-400" />
              Python Automation Equivalent (Modul 3 &amp; Modul 5)
            </span>
            <button
              onClick={handleDownloadCsv}
              className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 font-mono"
            >
              <Download className="w-3 h-3" />
              Export Live Snapshot (.csv)
            </button>
          </div>

          <pre className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto">
            <code>{`# Cara fetch otomatis di Python (Modul 3 / 5):
import ccxt
import time

exchange = ccxt.binance()
while True:
    ticker = exchange.fetch_ticker('BTC/USDT')
    print(f"BTC Price: \${ticker['last']:,.2f} | 24h Vol: {ticker['quoteVolume']:,.0f}")
    time.sleep(${syncInterval})  # interval ${syncInterval} detik`}</code>
          </pre>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            Endpoint: api.binance.com/api/v3/ticker/24hr
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
