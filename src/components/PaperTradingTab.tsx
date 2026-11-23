import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  ShieldAlert, 
  ArrowUpRight, 
  ArrowDownRight, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Sliders, 
  Send, 
  Bell, 
  Radio, 
  Layers, 
  ChevronRight,
  ExternalLink,
  Database,
  Zap,
  KeyRound
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { submitLiveOrder, fetchVaultKeys, VaultKeyItem } from '../services/exchangeApi';
import { LiveOrderConfirmModal, LiveOrderDetails } from './vault/LiveOrderConfirmModal';
import { CandleData } from '../types';
import { SUPPORTED_SYMBOLS } from '../services/cryptoApi';
import {
  fetchCloudPaperSummary,
  submitCloudPaperOrder,
  closeCloudPaperPosition,
  cancelCloudPaperOrder,
  resetCloudPaperAccount,
  fetchCloudAlertRules
} from '../services/paperTradingApi';
import {
  PaperTradingState,
  PaperOrderSide,
  PaperOrderType,
  PaperPositionSide,
  loadPaperTradingState,
  savePaperTradingState,
  resetPaperTradingState,
  placePaperOrder,
  cancelPaperOrder,
  closePosition,
  processMarketTick,
  applyFundingFee,
  calculateDynamicSlippage,
  calculateLiquidationPrice,
  getPaperTradingStats
} from '../utils/paperTrading';
import {
  AlertRule,
  AlertEvent,
  WebhookConfig,
  loadAlertRules,
  saveAlertRules,
  loadWebhookConfig,
  saveWebhookConfig,
  loadAlertHistory,
  saveAlertHistory,
  evaluateAlertRules,
  dispatchTelegramAlert,
  dispatchDiscordAlert,
  formatTelegramMessage,
  formatDiscordPayload
} from '../utils/alertEngine';

interface PaperTradingTabProps {
  candles: CandleData[];
  currentPrice: number;
  symbol?: string;
  onSymbolChange?: (symbol: string) => void;
  tradingMode?: 'paper' | 'live';
  selectedKeyId?: string;
  onOpenVaultModal?: () => void;
}

export const PaperTradingTab: React.FC<PaperTradingTabProps> = ({
  candles,
  currentPrice,
  symbol = 'BTC',
  onSymbolChange,
  tradingMode = 'paper',
  selectedKeyId,
  onOpenVaultModal
}) => {
  const { authFetch } = useAuth();

  // Paper Trading Core State
  const [tradingState, setTradingState] = useState<PaperTradingState>(() => loadPaperTradingState());
  
  // Live Trading Engine State
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
  const [isLiveExecuting, setIsLiveExecuting] = useState<boolean>(false);
  const [pendingLiveOrder, setPendingLiveOrder] = useState<LiveOrderDetails | null>(null);
  const [activeVaultKey, setActiveVaultKey] = useState<VaultKeyItem | null>(null);

  // Fetch active vault key when live mode is engaged
  useEffect(() => {
    if (tradingMode === 'live') {
      fetchVaultKeys(authFetch).then((keys) => {
        if (keys && keys.length > 0) {
          const found = selectedKeyId ? keys.find(k => k.keyId === selectedKeyId) || keys[0] : keys[0];
          setActiveVaultKey(found);
        }
      }).catch(() => {});
    }
  }, [tradingMode, selectedKeyId, authFetch]);
  
  // Order Form State
  const [orderSide, setOrderSide] = useState<PaperPositionSide>('LONG');
  const [orderType, setOrderType] = useState<PaperOrderType>('MARKET');
  const [targetSymbol, setTargetSymbol] = useState<string>(symbol.toUpperCase());
  const [leverage, setLeverage] = useState<number>(5);
  const [orderSizeUsd, setOrderSizeUsd] = useState<string>('1000');
  const [limitPrice, setLimitPrice] = useState<string>(currentPrice > 0 ? currentPrice.toString() : '50000');
  const [stopLossPrice, setStopLossPrice] = useState<string>('');
  const [takeProfitPrice, setTakeProfitPrice] = useState<string>('');
  const [trailingStopDist, setTrailingStopDist] = useState<string>('');
  const [orderError, setOrderError] = useState<string | null>(null);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);

  // Alert & Webhook Engine State
  const [alertRules, setAlertRules] = useState<AlertRule[]>(() => loadAlertRules());
  const [webhookConfig, setWebhookConfig] = useState<WebhookConfig>(() => loadWebhookConfig());
  const [alertHistory, setAlertHistory] = useState<AlertEvent[]>(() => loadAlertHistory());
  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState<boolean>(false);
  const [testAlertStatus, setTestAlertStatus] = useState<string | null>(null);
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(false);

  // Initial Sync from MongoDB Atlas Cloud
  useEffect(() => {
    fetchCloudPaperSummary().then((res) => {
      if (res && res.success && res.data) {
        setIsCloudConnected(true);
        if (res.data.positions && res.data.positions.length > 0) {
          setTradingState((prev) => ({
            ...prev,
            balance: res.data!.account.balance,
            equity: res.data!.account.equity,
            totalFeesPaid: res.data!.account.totalFeesPaid,
            totalRealizedPnl: res.data!.account.totalRealizedPnl,
            positions: res.data!.positions.map((p: any) => ({
              id: p.positionId || p._id,
              symbol: p.symbol,
              side: p.side,
              entryPrice: p.entryPrice,
              markPrice: p.markPrice,
              quantity: p.quantity,
              notionalValue: p.notionalValue,
              leverage: p.leverage,
              initialMargin: p.initialMargin,
              maintenanceMargin: p.maintenanceMargin,
              unrealizedPnl: p.unrealizedPnl || 0,
              unrealizedPnlPct: p.unrealizedPnlPct || 0,
              liquidationPrice: p.liquidationPrice,
              stopLoss: p.stopLoss,
              takeProfit: p.takeProfit,
              trailingStopDistance: p.trailingStopDistance,
              totalFundingPaid: p.totalFundingPaid || 0,
              openTimestamp: p.openTimestamp || Date.now()
            }))
          }));
        }
      }
    });

    fetchCloudAlertRules().then((rules) => {
      if (rules && rules.length > 0) {
        setAlertRules(rules.map((r: any) => ({
          id: r.ruleId || r._id,
          name: r.name,
          type: r.type,
          symbol: r.symbol,
          enabled: r.enabled,
          channels: r.channels,
          threshold: r.threshold,
          direction: r.direction,
          cooldownMinutes: r.cooldownMinutes,
          lastTriggeredTimestamp: r.lastTriggeredTimestamp
        })));
      }
    });
  }, []);

  // Sync selected symbol
  useEffect(() => {
    if (symbol) {
      setTargetSymbol(symbol.toUpperCase());
    }
  }, [symbol]);

  // Sync limit price with live price when user switches or price first loads
  useEffect(() => {
    if (currentPrice > 0 && orderType === 'MARKET') {
      setLimitPrice(currentPrice.toString());
    }
  }, [currentPrice, orderType]);

  // Persist trading state on change
  useEffect(() => {
    savePaperTradingState(tradingState);
  }, [tradingState]);

  // Persist alert config
  useEffect(() => {
    saveAlertRules(alertRules);
  }, [alertRules]);

  useEffect(() => {
    saveWebhookConfig(webhookConfig);
  }, [webhookConfig]);

  useEffect(() => {
    saveAlertHistory(alertHistory);
  }, [alertHistory]);

  // Process live ticks for mark-to-market and automated triggers
  useEffect(() => {
    if (currentPrice <= 0) return;
    setTradingState((prev) => {
      const updated = processMarketTick(prev, { [targetSymbol]: currentPrice, BTC: currentPrice });
      return updated;
    });
  }, [currentPrice, targetSymbol]);

  // Dispatch Webhooks for Triggered Events
  const dispatchAlertNotifications = useCallback(async (events: AlertEvent[]) => {
    for (const evt of events) {
      // 1. Dispatch Telegram
      if (evt.channels.includes('TELEGRAM') && webhookConfig.telegramBotToken && webhookConfig.telegramChatId) {
        const text = formatTelegramMessage(evt, { symbol: evt.symbol, currentPrice });
        await dispatchTelegramAlert(webhookConfig.telegramBotToken, webhookConfig.telegramChatId, text);
      }
      // 2. Dispatch Discord
      if (evt.channels.includes('DISCORD') && webhookConfig.discordWebhookUrl) {
        const payload = formatDiscordPayload(evt, { symbol: evt.symbol, currentPrice });
        await dispatchDiscordAlert(webhookConfig.discordWebhookUrl, payload);
      }
    }
  }, [webhookConfig, currentPrice]);

  // Run Alert Evaluation on Candle & State Changes
  useEffect(() => {
    if (candles.length < 2 || currentPrice <= 0) return;
    const latestCandle = candles[candles.length - 1];
    const prevCandle = candles[candles.length - 2];

    const freeMargin = tradingState.balance - tradingState.positions.reduce((acc, p) => acc + p.initialMargin, 0);
    const freeMarginRatio = tradingState.balance > 0 ? (freeMargin / tradingState.balance) * 100 : 0;

    const { updatedRules, triggeredEvents } = evaluateAlertRules(alertRules, {
      symbol: targetSymbol,
      currentPrice,
      confluenceScore: latestCandle.confluenceScore,
      supertrendDirection: latestCandle.supertrendDirection,
      prevSupertrendDirection: prevCandle.supertrendDirection,
      freeMarginRatio
    });

    if (triggeredEvents.length > 0) {
      setAlertRules(updatedRules);
      setAlertHistory((prev) => [...triggeredEvents, ...prev].slice(0, 50));
      dispatchAlertNotifications(triggeredEvents);
    }
  }, [candles, currentPrice, targetSymbol, tradingState, alertRules, dispatchAlertNotifications]);

  // Calculations
  const stats = useMemo(() => getPaperTradingStats(tradingState), [tradingState]);

  const allocatedMargin = useMemo(() => {
    return tradingState.positions.reduce((acc, p) => acc + p.initialMargin, 0);
  }, [tradingState.positions]);

  const freeMargin = Math.max(0, tradingState.balance - allocatedMargin);
  const marginLevelPct = allocatedMargin > 0 ? (tradingState.equity / allocatedMargin) * 100 : 999;

  const currentFillPrice = orderType === 'MARKET' ? currentPrice : parseFloat(limitPrice) || currentPrice;
  const parsedNotionalUsd = parseFloat(orderSizeUsd) || 0;
  const assetQuantity = currentFillPrice > 0 ? parsedNotionalUsd / currentFillPrice : 0;
  const requiredOrderMargin = leverage > 0 ? parsedNotionalUsd / leverage : 0;
  const dynamicSlippage = calculateDynamicSlippage(parsedNotionalUsd);
  const estimatedLiqPrice = calculateLiquidationPrice(currentFillPrice, leverage, orderSide);

  // Handlers
  const handlePlaceOrder = () => {
    setOrderError(null);
    setOrderSuccess(null);

    if (parsedNotionalUsd <= 0 || assetQuantity <= 0) {
      setOrderError('Please enter a valid order size.');
      return;
    }

    // Branch to Live Exchange Execution if Live Mode is active
    if (tradingMode === 'live') {
      const liveDetails: LiveOrderDetails = {
        symbol: targetSymbol,
        side: orderSide === 'LONG' ? 'BUY' : 'SELL',
        positionSide: orderSide,
        type: orderType,
        quantity: assetQuantity,
        price: currentFillPrice,
        notionalUsd: parsedNotionalUsd,
        leverage,
        marginRequired: requiredOrderMargin
      };
      setPendingLiveOrder(liveDetails);
      setIsConfirmModalOpen(true);
      return;
    }

    if (requiredOrderMargin > freeMargin) {
      setOrderError(`Insufficient free margin! Required: $${requiredOrderMargin.toFixed(2)}, Available: $${freeMargin.toFixed(2)}`);
      return;
    }

    const { newState, order, error } = placePaperOrder(
      tradingState,
      {
        symbol: targetSymbol,
        side: orderSide === 'LONG' ? 'BUY' : 'SELL',
        type: orderType,
        positionSide: orderSide,
        quantity: assetQuantity,
        price: currentFillPrice,
        leverage,
        stopLoss: stopLossPrice ? parseFloat(stopLossPrice) : undefined,
        takeProfit: takeProfitPrice ? parseFloat(takeProfitPrice) : undefined,
        trailingStopDistance: trailingStopDist ? parseFloat(trailingStopDist) : undefined
      },
      currentPrice
    );

    if (error) {
      setOrderError(error);
      return;
    }

    setTradingState(newState);
    setOrderSuccess(`Order submitted successfully! ID: ${order.id.slice(0, 8)} (${order.type} ${order.positionSide})`);
    
    // Sync with MongoDB Atlas Cloud
    submitCloudPaperOrder({
      symbol: targetSymbol,
      side: orderSide === 'LONG' ? 'BUY' : 'SELL',
      type: orderType,
      positionSide: orderSide,
      quantity: assetQuantity,
      price: currentFillPrice,
      leverage,
      stopLoss: stopLossPrice ? parseFloat(stopLossPrice) : undefined,
      takeProfit: takeProfitPrice ? parseFloat(takeProfitPrice) : undefined,
      trailingStopDistance: trailingStopDist ? parseFloat(trailingStopDist) : undefined
    }, currentPrice).catch((e) => console.debug('Cloud order sync skipped:', e));

    // Clear alerts after 4s
    setTimeout(() => setOrderSuccess(null), 4000);
  };

  const handleConfirmLiveOrder = async () => {
    if (!pendingLiveOrder) return;
    setIsLiveExecuting(true);
    setOrderError(null);
    try {
      const res = await submitLiveOrder(
        {
          keyId: selectedKeyId || activeVaultKey?.keyId,
          orderParams: {
            symbol: `${pendingLiveOrder.symbol}USDT`,
            side: pendingLiveOrder.side,
            type: pendingLiveOrder.type,
            quantity: pendingLiveOrder.quantity,
            price: pendingLiveOrder.price,
            leverage: pendingLiveOrder.leverage
          }
        },
        authFetch
      );

      if (res.success && res.order) {
        setOrderSuccess(
          `Live signed order executed on ${res.order.exchange.toUpperCase()}! ID: ${res.order.orderId.slice(0, 10)} (${res.order.status})`
        );
        setIsConfirmModalOpen(false);
        setPendingLiveOrder(null);
        setTimeout(() => setOrderSuccess(null), 5000);
      } else {
        setOrderError(res.message || res.error || 'Failed to execute live order on exchange.');
        setIsConfirmModalOpen(false);
      }
    } catch (err: any) {
      setOrderError(err?.message || 'Error executing live order on exchange.');
      setIsConfirmModalOpen(false);
    } finally {
      setIsLiveExecuting(false);
    }
  };

  const handleClosePosition = (posId: string) => {
    const updated = closePosition(tradingState, posId, currentPrice, 'MANUAL_CLOSE');
    setTradingState(updated);
    closeCloudPaperPosition(posId, currentPrice).catch((e) => console.debug('Cloud close sync skipped:', e));
  };

  const handleCancelOrder = (ordId: string) => {
    const updated = cancelPaperOrder(tradingState, ordId);
    setTradingState(updated);
    cancelCloudPaperOrder(ordId).catch((e) => console.debug('Cloud cancel sync skipped:', e));
  };

  const handleResetWallet = () => {
    if (window.confirm('Reset Paper Trading account back to initial $10,000 USDT balance? All active positions and history will be cleared.')) {
      const fresh = resetPaperTradingState(10000);
      setTradingState(fresh);
      resetCloudPaperAccount().catch((e) => console.debug('Cloud reset sync skipped:', e));
    }
  };

  const handleSimulateFunding = () => {
    const updated = applyFundingFee(tradingState, 1.0); // 1 bps = 0.01%
    setTradingState(updated);
  };

  const handleQuickMarginPct = (pct: number) => {
    const marginToUse = freeMargin * (pct / 100);
    const notional = marginToUse * leverage;
    setOrderSizeUsd(notional.toFixed(0));
  };

  const handleTestAlert = async (channel: 'TELEGRAM' | 'DISCORD') => {
    setTestAlertStatus(`Testing ${channel} dispatch...`);
    const testEvent: AlertEvent = {
      id: `test_${Date.now()}`,
      ruleId: 'test_manual',
      ruleName: 'Manual Verification Ping',
      symbol: targetSymbol,
      type: 'ENSEMBLE_CONFLUENCE',
      message: 'Test dispatch triggered from Quant System Phase 4 Execution Terminal.',
      channels: [channel],
      timestamp: Date.now(),
      dispatched: true
    };

    if (channel === 'TELEGRAM') {
      if (!webhookConfig.telegramBotToken || !webhookConfig.telegramChatId) {
        setTestAlertStatus('Error: Missing Telegram Bot Token or Chat ID');
        return;
      }
      const res = await dispatchTelegramAlert(
        webhookConfig.telegramBotToken,
        webhookConfig.telegramChatId,
        formatTelegramMessage(testEvent, { symbol: targetSymbol, currentPrice })
      );
      setTestAlertStatus(res.success ? 'Telegram test sent successfully!' : `Telegram error: ${res.error}`);
    } else {
      if (!webhookConfig.discordWebhookUrl) {
        setTestAlertStatus('Error: Missing Discord Webhook URL');
        return;
      }
      const res = await dispatchDiscordAlert(
        webhookConfig.discordWebhookUrl,
        formatDiscordPayload(testEvent, { symbol: targetSymbol, currentPrice })
      );
      setTestAlertStatus(res.success ? 'Discord test sent successfully!' : `Discord error: ${res.error}`);
    }

    setTimeout(() => setTestAlertStatus(null), 5000);
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-100">
      {/* Top Header & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-white">Paper Trading &amp; Alert Engine</h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  v6.2.0 Live Simulator
                </span>
                <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                  isCloudConnected
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                    : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
                }`}>
                  <Database className="w-3 h-3" />
                  {isCloudConnected ? 'MongoDB Cloud Active' : 'Dual-Mode (Cloud + Local)'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Institutional Perpetual Futures Execution • Dynamic Slippage • Trailing Stop &amp; Liquidation Engine
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={() => setIsWebhookModalOpen(true)}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Bell className="w-4 h-4 text-amber-400" />
            Alerts &amp; Webhooks
          </button>

          <button
            onClick={handleSimulateFunding}
            title="Deduct 8-hour perpetual funding rate (0.01%) across open positions"
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all"
          >
            <Clock className="w-4 h-4 text-cyan-400" />
            Simulate 8h Funding
          </button>

          <button
            onClick={handleResetWallet}
            className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Reset ($10k)
          </button>
        </div>
      </div>

      {/* KPI Performance Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Equity */}
        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Account Equity</div>
          <div className="text-xl font-bold font-mono text-white mt-1">
            ${tradingState.equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className={`text-[11px] font-mono mt-0.5 flex items-center gap-1 ${stats.roiPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {stats.roiPct >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {stats.roiPct >= 0 ? '+' : ''}{stats.roiPct.toFixed(2)}% ROI
          </div>
        </div>

        {/* Free Margin / Cash */}
        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Free Margin / Cash</div>
          <div className="text-xl font-bold font-mono text-slate-200 mt-1">
            ${freeMargin.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] font-mono text-slate-400 mt-0.5">
            Bal: ${tradingState.balance.toFixed(2)}
          </div>
        </div>

        {/* Unrealized PnL */}
        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Unrealized PnL</div>
          {(() => {
            const uPnl = tradingState.positions.reduce((acc, p) => acc + p.unrealizedPnl, 0);
            return (
              <>
                <div className={`text-xl font-bold font-mono mt-1 ${uPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {uPnl >= 0 ? '+' : ''}${uPnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                  {tradingState.positions.length} Active Positions
                </div>
              </>
            );
          })()}
        </div>

        {/* Realized PnL */}
        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Realized Net PnL</div>
          <div className={`text-xl font-bold font-mono mt-1 ${tradingState.totalRealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {tradingState.totalRealizedPnl >= 0 ? '+' : ''}${tradingState.totalRealizedPnl.toFixed(2)}
          </div>
          <div className="text-[11px] font-mono text-slate-400 mt-0.5">
            Fees: ${tradingState.totalFeesPaid.toFixed(2)}
          </div>
        </div>

        {/* Win Rate & Trades */}
        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Win Rate</div>
          <div className="text-xl font-bold font-mono text-amber-400 mt-1">
            {stats.winRatePct.toFixed(1)}%
          </div>
          <div className="text-[11px] font-mono text-slate-400 mt-0.5">
            {stats.winningTrades}W / {stats.losingTrades}L ({stats.totalTrades} total)
          </div>
        </div>

        {/* Margin Health */}
        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Margin Level</div>
          <div className={`text-xl font-bold font-mono mt-1 ${marginLevelPct > 200 ? 'text-emerald-400' : marginLevelPct > 120 ? 'text-amber-400' : 'text-rose-400'}`}>
            {marginLevelPct > 500 ? '>500%' : `${marginLevelPct.toFixed(0)}%`}
          </div>
          <div className="text-[11px] font-mono text-slate-400 mt-0.5">
            Max DD: {stats.maxDrawdownPct.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Main Execution Grid: Order Entry & Positions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Perpetual Order Entry Form (5 Cols) */}
        <div className="lg:col-span-5 bg-slate-900/80 rounded-2xl border border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              Perpetual Order Entry
            </h3>
            <span className="text-xs font-mono text-slate-400">
              Mark: ${currentPrice.toLocaleString()}
            </span>
          </div>

          {/* Symbol Quick Switcher */}
          <div className="flex items-center justify-between gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800">
            {SUPPORTED_SYMBOLS.map((s) => (
              <button
                key={s.symbol}
                onClick={() => {
                  setTargetSymbol(s.symbol);
                  if (onSymbolChange) onSymbolChange(s.symbol);
                }}
                className={`flex-1 py-1.5 text-xs font-bold font-mono rounded-lg transition-all ${
                  targetSymbol === s.symbol
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {s.symbol}
              </button>
            ))}
          </div>

          {/* Side (Long vs Short) Tabs */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setOrderSide('LONG')}
              className={`py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                orderSide === 'LONG'
                  ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Open Long (Buy)
            </button>
            <button
              onClick={() => setOrderSide('SHORT')}
              className={`py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                orderSide === 'SHORT'
                  ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              <TrendingDown className="w-4 h-4" />
              Open Short (Sell)
            </button>
          </div>

          {/* Order Type Tabs */}
          <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setOrderType('MARKET')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
                orderType === 'MARKET' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Market Order
            </button>
            <button
              onClick={() => setOrderType('LIMIT')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
                orderType === 'LIMIT' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Limit Order
            </button>
          </div>

          {/* Limit Price Input (Only for Limit) */}
          {orderType === 'LIMIT' && (
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">Limit Execution Price ($ USD)</label>
              <div className="relative">
                <input
                  type="number"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-amber-500"
                  placeholder="e.g. 52000"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-mono">USD</span>
              </div>
            </div>
          )}

          {/* Leverage Slider (1x to 10x) */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Perpetual Leverage</span>
              <span className="font-mono font-bold text-amber-400">{leverage}x</span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={leverage}
              onChange={(e) => setLeverage(parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>1x (Spot)</span>
              <span>3x</span>
              <span>5x (Standard)</span>
              <span>10x (Max)</span>
            </div>
          </div>

          {/* Order Size Input */}
          <div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span>Order Size (USD Notional)</span>
              <span className="font-mono">Avail: ${freeMargin.toFixed(0)}</span>
            </div>
            <div className="relative">
              <input
                type="number"
                value={orderSizeUsd}
                onChange={(e) => setOrderSizeUsd(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-amber-500"
                placeholder="1000"
              />
              <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-mono">USD</span>
            </div>

            {/* Quick Percentage Buttons */}
            <div className="grid grid-cols-4 gap-1.5 mt-2">
              {[10, 25, 50, 100].map((pct) => (
                <button
                  key={pct}
                  onClick={() => handleQuickMarginPct(pct)}
                  className="py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono rounded-lg transition-all"
                >
                  {pct}% Margin
                </button>
              ))}
            </div>
          </div>

          {/* Advanced Risk Controls: SL / TP / Trailing */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">Stop Loss ($ USD)</label>
              <input
                type="number"
                value={stopLossPrice}
                onChange={(e) => setStopLossPrice(e.target.value)}
                placeholder="Optional"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 font-mono text-white text-xs focus:outline-none focus:border-rose-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">Take Profit ($ USD)</label>
              <input
                type="number"
                value={takeProfitPrice}
                onChange={(e) => setTakeProfitPrice(e.target.value)}
                placeholder="Optional"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 font-mono text-white text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-400 block mb-1">
              Trailing Stop Distance (USD offset from peak)
            </label>
            <input
              type="number"
              value={trailingStopDist}
              onChange={(e) => setTrailingStopDist(e.target.value)}
              placeholder="e.g. 1000"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 font-mono text-white text-xs focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Execution Specs & Pre-Flight Calculation */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 space-y-1.5 text-xs font-mono">
            <div className="flex justify-between text-slate-400">
              <span>Required Margin:</span>
              <span className="text-white font-bold">${requiredOrderMargin.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Position Quantity:</span>
              <span className="text-white">{assetQuantity.toFixed(4)} {targetSymbol}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Est. Liquidation Price:</span>
              <span className="text-amber-400 font-bold">${estimatedLiqPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Dynamic Slippage:</span>
              <span className="text-slate-300">{(dynamicSlippage * 10000).toFixed(1)} bps ({(dynamicSlippage * 100).toFixed(3)}%)</span>
            </div>
          </div>

          {/* Feedback messages */}
          {orderError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{orderError}</span>
            </div>
          )}

          {orderSuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{orderSuccess}</span>
            </div>
          )}

          {/* Live Trading Warning/Status Banner above button */}
          {tradingMode === 'live' && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs space-y-1">
              <div className="flex items-center justify-between text-rose-300 font-bold">
                <span className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Live Order Routing Engaged
                </span>
                {onOpenVaultModal && (
                  <button
                    type="button"
                    onClick={onOpenVaultModal}
                    className="text-[11px] underline text-amber-400 hover:text-amber-300 cursor-pointer"
                  >
                    Change Key
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Connected: <span className="text-white font-mono">{activeVaultKey ? `${activeVaultKey.label} (${activeVaultKey.maskedKey})` : 'Default Vault Key'}</span>
              </p>
            </div>
          )}

          {/* Submit Order Button */}
          <button
            onClick={handlePlaceOrder}
            className={`w-full py-3 rounded-xl font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer ${
              tradingMode === 'live'
                ? orderSide === 'LONG'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 shadow-emerald-500/20'
                  : 'bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-400 hover:to-red-400 text-white shadow-rose-500/20'
                : orderSide === 'LONG'
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                : 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20'
            }`}
          >
            {tradingMode === 'live' ? (
              <>
                <Zap className="w-4 h-4 animate-bounce" />
                Transmit LIVE {orderSide} ({leverage}x)
              </>
            ) : orderSide === 'LONG' ? (
              <>
                <TrendingUp className="w-4 h-4" /> Place {orderType} Long ({leverage}x)
              </>
            ) : (
              <>
                <TrendingDown className="w-4 h-4" /> Place {orderType} Short ({leverage}x)
              </>
            )}
          </button>
        </div>

        {/* Right Column: Active Positions & Open Orders (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Active Positions Table */}
          <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                Active Perpetual Positions ({tradingState.positions.length})
              </h3>
            </div>

            {tradingState.positions.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-xs">
                No active positions open. Place a market or limit order above to start paper trading.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-800 pb-2">
                      <th className="pb-2 font-medium">Position</th>
                      <th className="pb-2 font-medium">Size</th>
                      <th className="pb-2 font-medium">Entry / Mark</th>
                      <th className="pb-2 font-medium">Liq. Price</th>
                      <th className="pb-2 font-medium">Unrealized PnL</th>
                      <th className="pb-2 text-right font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {tradingState.positions.map((pos) => {
                      const isProfit = pos.unrealizedPnl >= 0;
                      return (
                        <tr key={pos.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3">
                            <div className="flex items-center gap-1.5">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                pos.side === 'LONG' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                              }`}>
                                {pos.side}
                              </span>
                              <span className="font-bold text-white">{pos.symbol}</span>
                              <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1 rounded">
                                {pos.leverage}x
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Margin: ${pos.initialMargin.toFixed(1)}
                            </div>
                          </td>
                          <td className="py-3">
                            <div className="text-slate-200">{pos.quantity.toFixed(4)}</div>
                            <div className="text-[10px] text-slate-400">${pos.notionalValue.toFixed(0)}</div>
                          </td>
                          <td className="py-3">
                            <div className="text-slate-300">${pos.entryPrice.toFixed(1)}</div>
                            <div className="text-[10px] text-amber-400">${pos.markPrice.toFixed(1)}</div>
                          </td>
                          <td className="py-3">
                            <div className="text-rose-400 font-bold">${pos.liquidationPrice.toFixed(1)}</div>
                            {pos.stopLoss && (
                              <div className="text-[10px] text-slate-400">SL: ${pos.stopLoss}</div>
                            )}
                          </td>
                          <td className="py-3">
                            <div className={`font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {isProfit ? '+' : ''}${pos.unrealizedPnl.toFixed(2)}
                            </div>
                            <div className={`text-[10px] ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {isProfit ? '+' : ''}{pos.unrealizedPnlPct.toFixed(2)}%
                            </div>
                          </td>
                          <td className="py-3 text-right">
                            <button
                              onClick={() => handleClosePosition(pos.id)}
                              className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-[11px] transition-all"
                            >
                              Market Close
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pending Limit Orders */}
          <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                Pending Limit Orders ({tradingState.openOrders.length})
              </h3>
            </div>

            {tradingState.openOrders.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs">
                No active limit orders pending.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-800 pb-2">
                      <th className="pb-2 font-medium">Order</th>
                      <th className="pb-2 font-medium">Limit Price</th>
                      <th className="pb-2 font-medium">Quantity</th>
                      <th className="pb-2 font-medium">Leverage</th>
                      <th className="pb-2 text-right font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {tradingState.openOrders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-2.5">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            ord.positionSide === 'LONG' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                          }`}>
                            {ord.type} {ord.positionSide}
                          </span>
                          <span className="ml-1.5 font-bold text-white">{ord.symbol}</span>
                        </td>
                        <td className="py-2.5 text-slate-200">${ord.price.toFixed(1)}</td>
                        <td className="py-2.5 text-slate-300">{ord.quantity.toFixed(4)}</td>
                        <td className="py-2.5 text-amber-400">{ord.leverage}x</td>
                        <td className="py-2.5 text-right">
                          <button
                            onClick={() => handleCancelOrder(ord.id)}
                            className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] transition-all"
                          >
                            Cancel
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Trade Execution Ledger (Audit Log) */}
      <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            Execution Audit Ledger ({tradingState.tradeLedger.length} Records)
          </h3>
          <span className="text-xs text-slate-500 font-mono">
            Immutable Real-Time Simulation Trail
          </span>
        </div>

        {tradingState.tradeLedger.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            Ledger is empty. Executed orders and position closes will appear here.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-72">
            <table className="w-full text-left text-xs font-mono">
              <thead className="sticky top-0 bg-slate-900 border-b border-slate-800">
                <tr className="text-slate-400">
                  <th className="py-2 font-medium">Timestamp</th>
                  <th className="py-2 font-medium">Asset</th>
                  <th className="py-2 font-medium">Action</th>
                  <th className="py-2 font-medium">Execution Price</th>
                  <th className="py-2 font-medium">Quantity</th>
                  <th className="py-2 font-medium">Realized PnL</th>
                  <th className="py-2 font-medium">Fee</th>
                  <th className="py-2 text-right font-medium">Trigger Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {tradingState.tradeLedger.map((trd) => {
                  const isPnlPositive = trd.realizedPnl >= 0;
                  return (
                    <tr key={trd.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2 text-slate-500 text-[11px]">
                        {new Date(trd.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-2 font-bold text-white">{trd.symbol}</td>
                      <td className="py-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          trd.side === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                        }`}>
                          {trd.side} ({trd.positionSide})
                        </span>
                      </td>
                      <td className="py-2 text-slate-300">${trd.executedPrice.toFixed(2)}</td>
                      <td className="py-2 text-slate-400">{trd.quantity.toFixed(4)}</td>
                      <td className="py-2">
                        <span className={`font-bold ${isPnlPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isPnlPositive ? '+' : ''}${trd.realizedPnl.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-2 text-slate-400">${trd.fee.toFixed(2)}</td>
                      <td className="py-2 text-right">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
                          {trd.reason}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Alert Engine & Webhooks Modal */}
      {isWebhookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Alert &amp; Webhook Dispatcher Engine</h3>
                  <p className="text-xs text-slate-400">Telegram Bot API &amp; Discord Channel Webhooks</p>
                </div>
              </div>
              <button
                onClick={() => setIsWebhookModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Telegram Configuration */}
            <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-cyan-400" />
                  Telegram Bot Notification Channel
                </span>
                <button
                  onClick={() => handleTestAlert('TELEGRAM')}
                  className="px-2.5 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg text-[11px] transition-all"
                >
                  Test Telegram Ping
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Telegram Bot Token</label>
                  <input
                    type="password"
                    value={webhookConfig.telegramBotToken || ''}
                    onChange={(e) => setWebhookConfig((prev) => ({ ...prev, telegramBotToken: e.target.value }))}
                    placeholder="123456789:ABCdefGHI..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Target Chat ID</label>
                  <input
                    type="text"
                    value={webhookConfig.telegramChatId || ''}
                    onChange={(e) => setWebhookConfig((prev) => ({ ...prev, telegramChatId: e.target.value }))}
                    placeholder="-100123456789"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>

            {/* Discord Webhook Configuration */}
            <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-indigo-400" />
                  Discord Channel Webhook
                </span>
                <button
                  onClick={() => handleTestAlert('DISCORD')}
                  className="px-2.5 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-lg text-[11px] transition-all"
                >
                  Test Discord Ping
                </button>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Discord Webhook URL</label>
                <input
                  type="url"
                  value={webhookConfig.discordWebhookUrl || ''}
                  onChange={(e) => setWebhookConfig((prev) => ({ ...prev, discordWebhookUrl: e.target.value }))}
                  placeholder="https://discord.com/api/webhooks/..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {testAlertStatus && (
              <div className="p-3 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-amber-300 font-mono">
                {testAlertStatus}
              </div>
            )}

            {/* Active Alert Rules List */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Rule Triggers &amp; Thresholds
              </h4>
              <div className="space-y-2">
                {alertRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800"
                  >
                    <div>
                      <div className="text-xs font-semibold text-white">{rule.name}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                        <span>Cooldown: {rule.cooldownMinutes}m</span>
                        <span>•</span>
                        <span>Channels: {rule.channels.join(', ')}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setAlertRules((prev) =>
                          prev.map((r) => (r.id === rule.id ? { ...r, enabled: !r.enabled } : r))
                        );
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-bold font-mono transition-all ${
                        rule.enabled
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-500 border border-slate-700'
                      }`}
                    >
                      {rule.enabled ? 'ACTIVE' : 'MUTED'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Alert History Log */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Recent Trigger History ({alertHistory.length})
              </h4>
              <div className="max-h-40 overflow-y-auto space-y-1.5">
                {alertHistory.length === 0 ? (
                  <div className="text-center py-4 text-slate-500 text-xs">No alerts triggered yet.</div>
                ) : (
                  alertHistory.map((evt) => (
                    <div key={evt.id} className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/60 text-xs">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span className="font-bold text-amber-400">{evt.ruleName}</span>
                        <span>{new Date(evt.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <div className="text-slate-300 mt-1 text-[11px]">{evt.message}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsWebhookModalOpen(false)}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Order Double-Confirmation Modal */}
      <LiveOrderConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={() => {
          if (!isLiveExecuting) {
            setIsConfirmModalOpen(false);
            setPendingLiveOrder(null);
          }
        }}
        onConfirm={handleConfirmLiveOrder}
        orderDetails={pendingLiveOrder}
        activeKey={activeVaultKey}
        isExecuting={isLiveExecuting}
      />
    </div>
  );
};
