import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertOctagon,
  RefreshCw,
  X,
  Zap,
  RotateCcw,
  Clock,
  TrendingDown,
  Activity,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  CircuitBreakerState,
  fetchCircuitBreaker,
  triggerEmergencyKill,
  resetCircuitBreakerApi
} from '../../services/exchangeApi';

interface CircuitBreakerModalProps {
  isOpen: boolean;
  onClose: () => void;
  circuitBreaker: CircuitBreakerState | null;
  onUpdateStatus?: (status: CircuitBreakerState) => void;
}

export const CircuitBreakerModal: React.FC<CircuitBreakerModalProps> = ({
  isOpen,
  onClose,
  circuitBreaker: initialStatus,
  onUpdateStatus
}) => {
  const { authFetch } = useAuth();
  const [status, setStatus] = useState<CircuitBreakerState | null>(initialStatus);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isExecutingKill, setIsExecutingKill] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [confirmKill, setConfirmKill] = useState<boolean>(false);
  const [killReason, setKillReason] = useState<string>('MANUAL_PANIC_KILL_SWITCH');
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const refreshStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchCircuitBreaker(authFetch);
      if (data) {
        setStatus(data);
        if (onUpdateStatus) onUpdateStatus(data);
      }
    } finally {
      setIsLoading(false);
    }
  }, [authFetch, onUpdateStatus]);

  useEffect(() => {
    if (isOpen) {
      refreshStatus();
      setConfirmKill(false);
      setActionMessage(null);
    }
  }, [isOpen, refreshStatus]);

  if (!isOpen) return null;

  const currentStatus = status || initialStatus || {
    status: 'NORMAL' as const,
    tradingAllowed: true,
    consecutiveLosses: 0,
    hourlyDrawdownPct: 0,
    dailyDrawdownPct: 0,
    triggerReason: null,
    haltedAt: null
  };

  const isHalted = currentStatus.status === 'HALTED' || !currentStatus.tradingAllowed;

  const handleKillSwitch = async () => {
    setIsExecutingKill(true);
    setActionMessage(null);
    try {
      const res = await triggerEmergencyKill(killReason, authFetch);
      if (res.success) {
        setActionMessage({
          type: 'success',
          text: 'EMERGENCY KILL-SWITCH EXECUTED: All open orders cancelled, active positions liquidated, trading halted.'
        });
        setConfirmKill(false);
        await refreshStatus();
      } else {
        setActionMessage({ type: 'error', text: res.message || 'Failed to trigger kill switch' });
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err?.message || 'Error executing kill switch' });
    } finally {
      setIsExecutingKill(false);
    }
  };

  const handleReset = async () => {
    setIsResetting(true);
    setActionMessage(null);
    try {
      const res = await resetCircuitBreakerApi(authFetch);
      if (res.success) {
        setActionMessage({
          type: 'success',
          text: 'Circuit breaker reset to NORMAL. Order routing and live trading re-enabled.'
        });
        await refreshStatus();
      } else {
        setActionMessage({ type: 'error', text: res.message || 'Failed to reset circuit breaker' });
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err?.message || 'Error resetting circuit breaker' });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in font-sans">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className={`p-5 border-b flex items-center justify-between ${
          isHalted
            ? 'bg-rose-950/40 border-rose-500/30'
            : 'bg-slate-950/60 border-slate-800'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isHalted
                ? 'bg-rose-500/20 border border-rose-500/40 text-rose-400'
                : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
            }`}>
              {isHalted ? <AlertOctagon className="w-5 h-5 animate-pulse" /> : <ShieldCheck className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">Institutional Circuit Breaker</h3>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                  isHalted
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                    : currentStatus.status === 'WARNING'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                }`}>
                  {currentStatus.status}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Continuous risk telemetry &amp; emergency panic kill-switch
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refreshStatus}
              disabled={isLoading}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Refresh telemetry"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Message Alert */}
        {actionMessage && (
          <div className={`px-5 py-3 text-xs flex items-center gap-2 border-b ${
            actionMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
          }`}>
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            )}
            <span>{actionMessage.text}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Status Indicator Banner */}
          <div className={`p-4 rounded-xl border flex items-center justify-between ${
            isHalted
              ? 'bg-rose-950/20 border-rose-500/30'
              : 'bg-slate-950/70 border-slate-800'
          }`}>
            <div>
              <div className="text-xs text-slate-400">Order Routing Status</div>
              <div className={`text-base font-bold font-mono ${isHalted ? 'text-rose-400' : 'text-emerald-400'}`}>
                {currentStatus.tradingAllowed ? 'LIVE & PAPER TRADING PERMITTED' : 'EXECUTION HALTED BY RISK ENGINE'}
              </div>
              {currentStatus.triggerReason && (
                <div className="text-[11px] text-rose-300 font-mono mt-0.5">
                  Reason: {currentStatus.triggerReason}
                </div>
              )}
            </div>
            <div className={`w-3 h-3 rounded-full ${isHalted ? 'bg-rose-500 animate-ping' : 'bg-emerald-500'}`} />
          </div>

          {/* Telemetry Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Hourly Drawdown */}
            <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <TrendingDown className="w-3.5 h-3.5 text-amber-400" />
                  1-Hour Drawdown
                </span>
                <span className="font-mono font-bold text-white">
                  {(currentStatus.hourlyDrawdownPct || 0).toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    (currentStatus.hourlyDrawdownPct || 0) >= 5
                      ? 'bg-rose-500'
                      : (currentStatus.hourlyDrawdownPct || 0) >= 3
                      ? 'bg-amber-400'
                      : 'bg-emerald-400'
                  }`}
                  style={{ width: `${Math.min(100, ((currentStatus.hourlyDrawdownPct || 0) / 5) * 100)}%` }}
                />
              </div>
              <div className="text-[10px] text-slate-500 flex justify-between font-mono">
                <span>0%</span>
                <span>Max: 5.0%</span>
              </div>
            </div>

            {/* Daily Drawdown */}
            <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  Daily Drawdown
                </span>
                <span className="font-mono font-bold text-white">
                  {(currentStatus.dailyDrawdownPct || 0).toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    (currentStatus.dailyDrawdownPct || 0) >= 10
                      ? 'bg-rose-500'
                      : (currentStatus.dailyDrawdownPct || 0) >= 6
                      ? 'bg-amber-400'
                      : 'bg-emerald-400'
                  }`}
                  style={{ width: `${Math.min(100, ((currentStatus.dailyDrawdownPct || 0) / 10) * 100)}%` }}
                />
              </div>
              <div className="text-[10px] text-slate-500 flex justify-between font-mono">
                <span>0%</span>
                <span>Max: 10.0%</span>
              </div>
            </div>

            {/* Consecutive Losses */}
            <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-purple-400" />
                  Loss Streak
                </span>
                <span className="font-mono font-bold text-white">
                  {currentStatus.consecutiveLosses || 0}
                </span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    (currentStatus.consecutiveLosses || 0) >= 3 ? 'bg-rose-500' : 'bg-emerald-400'
                  }`}
                  style={{ width: `${Math.min(100, ((currentStatus.consecutiveLosses || 0) / 3) * 100)}%` }}
                />
              </div>
              <div className="text-[10px] text-slate-500 flex justify-between font-mono">
                <span>0</span>
                <span>Max: 3 trades</span>
              </div>
            </div>
          </div>

          {/* Emergency Panic Controls Section */}
          <div className="p-4 bg-slate-950/90 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  Emergency Operational Controls
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Institutional fail-safes to protect capital during black swan events
                </p>
              </div>
            </div>

            {confirmKill ? (
              <div className="p-3.5 bg-rose-950/40 border border-rose-500/40 rounded-xl space-y-3">
                <div className="text-xs text-rose-200">
                  <strong className="text-white">Confirm Panic Execution:</strong> This will instantly cancel all open orders, liquidate positions at market price, and lock trading until manual admin reset.
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Trigger Reason Tag</label>
                  <input
                    type="text"
                    value={killReason}
                    onChange={(e) => setKillReason(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setConfirmKill(false)}
                    disabled={isExecutingKill}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleKillSwitch}
                    disabled={isExecutingKill}
                    className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-rose-600/30 cursor-pointer disabled:opacity-50"
                  >
                    <AlertOctagon className="w-3.5 h-3.5" />
                    <span>{isExecutingKill ? 'Executing Panic Kill...' : 'Confirm EMERGENCY KILL'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setConfirmKill(true)}
                  disabled={isHalted}
                  className="w-full sm:w-auto flex-1 py-2.5 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <AlertOctagon className="w-4 h-4 text-rose-400" />
                  <span>{isHalted ? 'Kill-Switch Already Active' : 'Trigger Panic Kill-Switch'}</span>
                </button>

                {isHalted && (
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={isResetting}
                    className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
                    <span>{isResetting ? 'Resetting...' : 'Reset Circuit Breaker'}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5 text-[11px] font-mono">
            <span>Thresholds: 5% 1h Max</span>
            <span>•</span>
            <span>10% Daily Max</span>
            <span>•</span>
            <span>3 Consec. Losses</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default CircuitBreakerModal;
