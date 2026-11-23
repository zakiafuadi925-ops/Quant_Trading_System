import React from 'react';
import {
  AlertTriangle,
  Zap,
  ShieldAlert,
  X,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { VaultKeyItem } from '../../services/exchangeApi';

export interface LiveOrderDetails {
  symbol: string;
  side: 'BUY' | 'SELL';
  positionSide: 'LONG' | 'SHORT';
  type: 'MARKET' | 'LIMIT';
  quantity: number;
  price: number;
  notionalUsd: number;
  leverage: number;
  marginRequired: number;
}

interface LiveOrderConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  orderDetails: LiveOrderDetails | null;
  activeKey: VaultKeyItem | null;
  isExecuting: boolean;
}

export const LiveOrderConfirmModal: React.FC<LiveOrderConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  orderDetails,
  activeKey,
  isExecuting
}) => {
  if (!isOpen || !orderDetails) return null;

  const isBuy = orderDetails.side === 'BUY';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in font-sans">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header with High-Alert Warning */}
        <div className="p-5 border-b border-rose-500/30 bg-rose-950/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                Confirm Live Exchange Order
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold">
                  LIVE EXECUTION
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                This signed order will be transmitted directly to the exchange matching engine
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isExecuting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {/* Exchange Target Card */}
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-xs font-bold uppercase">
                {activeKey ? activeKey.exchange.slice(0, 3) : 'EXC'}
              </div>
              <div>
                <div className="text-xs font-bold text-white">
                  {activeKey ? activeKey.label : 'Default Exchange Account'}
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  {activeKey ? `Key: ${activeKey.maskedKey}` : 'Simulation Fallback Key'}
                </div>
              </div>
            </div>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
              activeKey?.isTestnet !== false
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
            }`}>
              {activeKey?.isTestnet !== false ? 'TESTNET' : 'MAINNET REAL FUNDS'}
            </span>
          </div>

          {/* Order Specification Summary */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5 font-mono text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <span className="text-slate-400 font-sans">Trading Pair</span>
              <span className="text-white font-bold">{orderDetails.symbol}/USDT</span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <span className="text-slate-400 font-sans">Direction & Type</span>
              <span className={`font-bold flex items-center gap-1 ${isBuy ? 'text-emerald-400' : 'text-rose-400'}`}>
                {orderDetails.side} ({orderDetails.positionSide}) • {orderDetails.type}
              </span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <span className="text-slate-400 font-sans">Order Size (Notional)</span>
              <span className="text-white font-bold">
                ${orderDetails.notionalUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                <span className="text-slate-400 text-[11px] ml-1">
                  (~{orderDetails.quantity.toFixed(4)} {orderDetails.symbol})
                </span>
              </span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <span className="text-slate-400 font-sans">Execution Price</span>
              <span className="text-white font-bold">
                ${orderDetails.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                {orderDetails.type === 'MARKET' && <span className="text-slate-400 text-[11px] ml-1">(Est. Market)</span>}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-sans">Leverage &amp; Req. Margin</span>
              <span className="text-amber-400 font-bold">
                {orderDetails.leverage}x Leverage • ${orderDetails.marginRequired.toLocaleString('en-US', { minimumFractionDigits: 2 })} Margin
              </span>
            </div>
          </div>

          {/* Caution Callout */}
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-2.5 text-xs text-rose-300">
            <ShieldAlert className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-200">Execution Responsibility Notice</p>
              <p className="text-[11px] text-rose-300/90 mt-0.5">
                Executing a live order will modify your exchange balance and positions. Make sure you have verified risk parameters and stop losses.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-5 border-t border-slate-800 bg-slate-950/40 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isExecuting}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isExecuting}
            className={`px-5 py-2 rounded-xl text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg cursor-pointer disabled:opacity-50 ${
              isBuy
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 shadow-emerald-500/20'
                : 'bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-400 hover:to-red-400 shadow-rose-500/20 text-white'
            }`}
          >
            <Zap className={`w-3.5 h-3.5 ${isExecuting ? 'animate-bounce' : ''}`} />
            <span>{isExecuting ? 'Transmitting to Exchange...' : 'Confirm & Transmit Order'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default LiveOrderConfirmModal;
