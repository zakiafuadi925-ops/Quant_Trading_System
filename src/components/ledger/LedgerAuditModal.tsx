import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Link2,
  RefreshCw,
  X,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Database,
  Lock,
  Search
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  LedgerEntryItem,
  LedgerAuditResult,
  fetchAccountLedger,
  verifyLedgerChain
} from '../../services/ledgerApi';

interface LedgerAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId?: string;
}

export const LedgerAuditModal: React.FC<LedgerAuditModalProps> = ({
  isOpen,
  onClose,
  accountId
}) => {
  const { authFetch, user } = useAuth();
  const [entries, setEntries] = useState<LedgerEntryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [auditResult, setAuditResult] = useState<LedgerAuditResult | null>(null);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const activeAccountId = accountId || user?.userId || 'default_account';

  const loadLedger = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchAccountLedger(authFetch, activeAccountId, 100);
      setEntries(data.entries);
    } finally {
      setIsLoading(false);
    }
  }, [authFetch, activeAccountId]);

  useEffect(() => {
    if (isOpen) {
      loadLedger();
      setAuditResult(null);
    }
  }, [isOpen, loadLedger]);

  if (!isOpen) return null;

  const handleAudit = async () => {
    setIsAuditing(true);
    try {
      const result = await verifyLedgerChain(authFetch, activeAccountId);
      setAuditResult(result);
    } finally {
      setIsAuditing(false);
    }
  };

  const copyToClipboard = (hash: string) => {
    navigator.clipboard?.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const filteredEntries = entries.filter((e) => {
    if (filterType === 'ALL') return true;
    return e.type === filterType;
  });

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'INITIAL_DEPOSIT':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'TRADE_PROFIT':
        return 'bg-teal-500/10 text-teal-300 border-teal-500/30';
      case 'TRADE_LOSS':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'FEE_DEDUCTION':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'FUNDING_PAYMENT':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'ORDER_MARGIN_LOCK':
      case 'ORDER_MARGIN_RELEASE':
        return 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in font-sans">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">Immutable Financial Ledger</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 flex items-center gap-1 font-semibold">
                  <Lock className="w-3 h-3" />
                  SHA-256 Chained
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Account: {activeAccountId} • {entries.length} recorded transactions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadLedger}
              disabled={isLoading}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Refresh ledger"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Cryptographic Chain Audit Action Card */}
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">Cryptographic Hash Audit</span>
              {auditResult && (
                <span className={`text-[10px] font-mono font-bold px-2 py-0.2 rounded-full border flex items-center gap-1 ${
                  auditResult.valid
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                }`}>
                  {auditResult.valid ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                  {auditResult.valid ? 'INTEGRITY VERIFIED' : 'TAMPER DETECTED'}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              {auditResult
                ? auditResult.valid
                  ? `Successfully validated ${auditResult.verifiedEntries} chained entries. All hashes match previous links.`
                  : `Hash mismatch at sequence #${auditResult.failedAtSequence}: ${auditResult.error}`
                : 'Run live mathematical verification across all sequential SHA-256 blocks.'}
            </p>
          </div>

          <button
            onClick={handleAudit}
            disabled={isAuditing || entries.length === 0}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer disabled:opacity-50"
          >
            <ShieldCheck className={`w-4 h-4 ${isAuditing ? 'animate-spin' : ''}`} />
            <span>{isAuditing ? 'Auditing Hash Chain...' : 'Audit Cryptographic Chain'}</span>
          </button>
        </div>

        {/* Filter Bar */}
        <div className="px-5 py-2.5 bg-slate-950/40 border-b border-slate-800 flex items-center justify-between gap-2 overflow-x-auto text-xs">
          <div className="flex items-center gap-1.5 font-mono">
            <span className="text-slate-500 text-[11px]">Filter:</span>
            {['ALL', 'TRADE_PROFIT', 'TRADE_LOSS', 'FEE_DEDUCTION', 'FUNDING_PAYMENT', 'INITIAL_DEPOSIT'].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                  filterType === type
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {type.replace('_', ' ')}
              </button>
            ))}
          </div>

          <span className="text-[11px] text-slate-500 font-mono">
            Showing {filteredEntries.length} of {entries.length}
          </span>
        </div>

        {/* Table Body */}
        <div className="overflow-y-auto flex-1 p-5">
          {isLoading && entries.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-cyan-400 mb-2" />
              Loading cryptographic ledger entries...
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-slate-950/60 border border-slate-800 text-slate-500 text-xs">
              <FileText className="w-8 h-8 mx-auto text-slate-600 mb-2" />
              No ledger entries match the selected filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase font-sans">
                    <th className="pb-2.5 pl-2">Seq</th>
                    <th className="pb-2.5">Timestamp</th>
                    <th className="pb-2.5">Type</th>
                    <th className="pb-2.5">Amount</th>
                    <th className="pb-2.5">Balance Flow</th>
                    <th className="pb-2.5">Hash Link</th>
                    <th className="pb-2.5 pr-2">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredEntries.map((entry) => {
                    const isPositive = entry.amount >= 0;
                    const isCopied = copiedHash === entry.hash;

                    return (
                      <tr key={entry.entryId} className="hover:bg-slate-950/60 transition-colors">
                        <td className="py-2.5 pl-2 font-bold text-slate-400">#{entry.sequence}</td>
                        <td className="py-2.5 text-slate-400 text-[11px]">
                          {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                        <td className="py-2.5">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getTypeBadge(entry.type)}`}>
                            {entry.type}
                          </span>
                        </td>
                        <td className={`py-2.5 font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isPositive ? '+' : ''}${Math.abs(entry.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 text-slate-400 text-[11px]">
                          <span className="text-slate-500">${entry.balanceBefore.toFixed(0)}</span>
                          <span className="mx-1 text-slate-600">→</span>
                          <span className="text-white font-bold">${entry.balanceAfter.toFixed(0)}</span>
                        </td>
                        <td className="py-2.5">
                          <button
                            onClick={() => copyToClipboard(entry.hash)}
                            className="text-[10px] text-cyan-400 hover:text-cyan-300 underline font-mono flex items-center gap-1 cursor-pointer"
                            title={`Full SHA-256: ${entry.hash}\nPrevious: ${entry.prevHash}\nClick to copy`}
                          >
                            <Link2 className="w-3 h-3 text-cyan-500" />
                            <span>{entry.hash.slice(0, 8)}...{entry.hash.slice(-6)}</span>
                            {isCopied && <span className="text-emerald-400 text-[9px]">Copied!</span>}
                          </button>
                        </td>
                        <td className="py-2.5 pr-2 text-slate-400 text-[11px] truncate max-w-xs font-sans">
                          {entry.description}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2 text-[11px] font-mono">
            <span>Deterministic SHA-256</span>
            <span>•</span>
            <span>Zero-Knowledge Tamper Guard</span>
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

export default LedgerAuditModal;
