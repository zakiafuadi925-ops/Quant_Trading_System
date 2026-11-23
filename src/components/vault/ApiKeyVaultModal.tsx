import React, { useState, useEffect, useCallback } from 'react';
import {
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  RefreshCw,
  Plus,
  Zap,
  CheckCircle2,
  AlertTriangle,
  X,
  Eye,
  EyeOff,
  Server,
  Lock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  VaultKeyItem,
  SaveKeyPayload,
  fetchVaultKeys,
  saveVaultKey,
  deleteVaultKey,
  testVaultKey
} from '../../services/exchangeApi';

interface ApiKeyVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedKeyId?: string;
  onSelectKey?: (keyId: string) => void;
}

export const ApiKeyVaultModal: React.FC<ApiKeyVaultModalProps> = ({
  isOpen,
  onClose,
  selectedKeyId,
  onSelectKey
}) => {
  const { authFetch } = useAuth();
  const [activeTab, setActiveTab] = useState<'keys' | 'add'>('keys');

  // Vault Keys List state
  const [keys, setKeys] = useState<VaultKeyItem[]>([]);
  const [isLoadingKeys, setIsLoadingKeys] = useState<boolean>(false);
  const [testingKeyId, setTestingKeyId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { latencyMs?: number; success: boolean; msg?: string }>>({});
  const [deletingKeyId, setDeletingKeyId] = useState<string | null>(null);

  // Form State
  const [exchange, setExchange] = useState<'binance' | 'bybit' | 'okx'>('binance');
  const [label, setLabel] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>('');
  const [apiSecret, setApiSecret] = useState<string>('');
  const [passphrase, setPassphrase] = useState<string>('');
  const [isTestnet, setIsTestnet] = useState<boolean>(true);
  const [showSecret, setShowSecret] = useState<boolean>(false);

  // UI status
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Load keys
  const loadKeys = useCallback(async () => {
    setIsLoadingKeys(true);
    try {
      const items = await fetchVaultKeys(authFetch);
      setKeys(items);
      if (items.length > 0 && !selectedKeyId && onSelectKey) {
        onSelectKey(items[0].keyId);
      }
    } finally {
      setIsLoadingKeys(false);
    }
  }, [authFetch, selectedKeyId, onSelectKey]);

  useEffect(() => {
    if (isOpen) {
      loadKeys();
      setFormError(null);
      setFormSuccess(null);
    }
  }, [isOpen, loadKeys]);

  if (!isOpen) return null;

  // Handle Save
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!apiKey.trim() || !apiSecret.trim()) {
      setFormError('API Key and Secret Key are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: SaveKeyPayload = {
        exchange,
        label: label.trim() || `${exchange.toUpperCase()} Key`,
        apiKey: apiKey.trim(),
        apiSecret: apiSecret.trim(),
        passphrase: passphrase.trim() ? passphrase.trim() : undefined,
        isTestnet
      };

      const res = await saveVaultKey(payload, authFetch);
      if (res.success) {
        setFormSuccess('API Key encrypted and safely stored in Vault.');
        setApiKey('');
        setApiSecret('');
        setPassphrase('');
        setLabel('');
        await loadKeys();
        setTimeout(() => {
          setActiveTab('keys');
          setFormSuccess(null);
        }, 1200);
      } else {
        setFormError(res.message || 'Failed to save key to Vault.');
      }
    } catch (err: any) {
      setFormError(err?.message || 'Error communicating with Vault API.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete
  const handleDelete = async (keyId: string) => {
    if (!window.confirm('Are you sure you want to delete this API Key from your encrypted vault?')) {
      return;
    }
    setDeletingKeyId(keyId);
    try {
      const res = await deleteVaultKey(keyId, authFetch);
      if (res.success) {
        setKeys((prev) => prev.filter((k) => k.keyId !== keyId));
      } else {
        alert(res.message || 'Failed to delete key.');
      }
    } finally {
      setDeletingKeyId(null);
    }
  };

  // Handle Test Connection
  const handleTestKey = async (keyId: string) => {
    setTestingKeyId(keyId);
    try {
      const res = await testVaultKey(keyId, authFetch);
      setTestResults((prev) => ({
        ...prev,
        [keyId]: {
          success: res.success,
          latencyMs: res.latencyMs,
          msg: res.message
        }
      }));
    } finally {
      setTestingKeyId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in font-sans">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-sm">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-tight">API Key Vault</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 font-semibold">
                  <Lock className="w-3 h-3" />
                  AES-256-GCM
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Encrypted exchange credentials for authenticated live order routing
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Security Warning Notice */}
        <div className="px-5 py-2.5 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-2.5 text-xs text-amber-300">
          <ShieldAlert className="w-4 h-4 flex-shrink-0 text-amber-400" />
          <span>
            <strong>Security Tip:</strong> Never enable withdrawal permissions on trading API keys. Only enable <em>Futures Trading</em>.
          </span>
        </div>

        {/* Tabs Bar */}
        <div className="flex border-b border-slate-800 bg-slate-950/20 px-5 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('keys')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'keys'
                ? 'bg-slate-800 text-white border-t-2 border-amber-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            Saved Keys ({keys.length})
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'add'
                ? 'bg-slate-800 text-white border-t-2 border-amber-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            Add New Key
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'keys' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
                <span>Configured Exchange Connections</span>
                <button
                  onClick={loadKeys}
                  disabled={isLoadingKeys}
                  className="flex items-center gap-1 text-slate-400 hover:text-white cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingKeys ? 'animate-spin text-amber-400' : ''}`} />
                  Refresh
                </button>
              </div>

              {isLoadingKeys && keys.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-400 mb-2" />
                  Loading encrypted credentials from vault...
                </div>
              ) : keys.length === 0 ? (
                <div className="p-8 text-center rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
                  <KeyRound className="w-8 h-8 text-slate-600 mx-auto" />
                  <div>
                    <h4 className="text-sm font-semibold text-white">No API Keys Configured</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      Add your Binance or Bybit API key to enable live exchange execution and real-time portfolio tracking.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('add')}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/10"
                  >
                    <Plus className="w-4 h-4" />
                    Configure New Key
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {keys.map((k) => {
                    const test = testResults[k.keyId];
                    const isSelected = selectedKeyId === k.keyId;

                    return (
                      <div
                        key={k.keyId}
                        onClick={() => onSelectKey && onSelectKey(k.keyId)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500/50 shadow-sm shadow-amber-500/10'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs uppercase ${
                              k.exchange === 'binance'
                                ? 'bg-amber-400/10 text-amber-400 border border-amber-400/30'
                                : k.exchange === 'bybit'
                                ? 'bg-orange-500/10 text-orange-400 border border-orange-500/30'
                                : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                            }`}>
                              {k.exchange.slice(0, 3)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-white">{k.label}</span>
                                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                                  k.isTestnet
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                }`}>
                                  {k.isTestnet ? 'TESTNET' : 'MAINNET'}
                                </span>
                                {isSelected && (
                                  <span className="text-[10px] bg-amber-500 text-slate-950 font-bold px-1.5 rounded">
                                    ACTIVE
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 font-mono text-xs text-slate-400">
                                <span>Key: {k.maskedKey}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-auto">
                            {/* Latency result badge if tested */}
                            {test && (
                              <span className={`text-[11px] font-mono font-semibold px-2 py-1 rounded-lg border flex items-center gap-1 ${
                                test.success
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                              }`}>
                                {test.success ? (
                                  <>
                                    <Zap className="w-3 h-3 text-emerald-400" />
                                    {test.latencyMs !== undefined ? `${test.latencyMs}ms` : 'Connected'}
                                  </>
                                ) : (
                                  <>
                                    <AlertTriangle className="w-3 h-3 text-rose-400" />
                                    Failed
                                  </>
                                )}
                              </span>
                            )}

                            {/* Test Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTestKey(k.keyId);
                              }}
                              disabled={testingKeyId === k.keyId}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                              title="Test API Key credentials and measure latency"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${testingKeyId === k.keyId ? 'animate-spin text-amber-400' : ''}`} />
                              <span>Test</span>
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(k.keyId);
                              }}
                              disabled={deletingKeyId === k.keyId}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs transition-colors cursor-pointer disabled:opacity-50"
                              title="Delete key from Vault"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-4">
              {/* Form Feedback */}
              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}
              {formSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{formSuccess}</span>
                </div>
              )}

              {/* Exchange Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Exchange Platform</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['binance', 'bybit', 'okx'] as const).map((ex) => (
                    <button
                      type="button"
                      key={ex}
                      onClick={() => setExchange(ex)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold uppercase transition-all cursor-pointer ${
                        exchange === ex
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {ex === 'binance' ? 'Binance Futures' : ex === 'bybit' ? 'Bybit USDT' : 'OKX v5'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Label */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Account Label</label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. Primary Binance Subaccount"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* API Key */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">API Key</label>
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Paste your exchange API Key"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* API Secret */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">API Secret</label>
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showSecret ? 'Hide' : 'Show'}</span>
                  </button>
                </div>
                <input
                  type={showSecret ? 'text' : 'password'}
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  placeholder="Paste your exchange API Secret"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Passphrase (OKX) */}
              {exchange === 'okx' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">API Passphrase (OKX)</label>
                  <input
                    type="password"
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    placeholder="API Passphrase"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}

              {/* Testnet vs Mainnet toggle */}
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-white">Testnet / Sandbox Mode</div>
                  <div className="text-[11px] text-slate-400">
                    Route orders to testnet futures endpoint (testnet.binancefuture.com / testnet.bybit.com)
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isTestnet}
                  onChange={(e) => setIsTestnet(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('keys')}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/10 cursor-pointer disabled:opacity-50"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Encrypting & Saving...' : 'Save to Vault'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApiKeyVaultModal;
