import React, { useState, useEffect, useCallback } from "react";
import { Header } from "./components/Header";
import { Navbar } from "./components/Navbar";
import { useAppRouter } from "./hooks/useAppRouter";
import { BacktestTab } from "./components/BacktestTab";
import { AstroCycleTab } from "./components/AstroCycleTab";
import { LstmModelTab } from "./components/LstmModelTab";
import { MonteCarloTab } from "./components/MonteCarloTab";
import { PortfolioTab } from "./components/PortfolioTab";
import { GridTradingTab } from "./components/GridTradingTab";
import { ModulesTab } from "./components/ModulesTab";
import { RiskManagementTab } from "./components/RiskManagementTab";
import { PaperTradingTab } from "./components/PaperTradingTab";
import { LiveFeedModal } from "./components/LiveFeedModal";
import { BTC_CANDLES } from "./data/historicalData";
import {
  fetchLivePrice,
  fetchHistoricalCandles,
  LiveTicker,
} from "./services/cryptoApi";
import { binanceWs, WsStatus } from "./services/binanceWs";
import { CandleData } from "./types";
import { AuthProvider } from "./context/AuthContext";
import { AuthModal } from "./components/auth/AuthModal";
import { ApiKeyVaultModal } from "./components/vault/ApiKeyVaultModal";
import { CircuitBreakerModal } from "./components/circuitBreaker/CircuitBreakerModal";
import { JobProgressDrawer } from "./components/jobs/JobProgressDrawer";
import { CircuitBreakerState, fetchCircuitBreaker } from "./services/exchangeApi";
import {
  Sparkles,
  Terminal,
  Activity,
  ShieldCheck,
  Zap,
  Database,
  Clock,
  Coins,
} from "lucide-react";

function AppContent() {
  const { activeTab, navigate: handleTabChange } = useAppRouter();
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isVaultModalOpen, setIsVaultModalOpen] = useState<boolean>(false);
  const [isCircuitBreakerModalOpen, setIsCircuitBreakerModalOpen] = useState<boolean>(false);
  const [isJobDrawerOpen, setIsJobDrawerOpen] = useState<boolean>(false);
  const [circuitBreaker, setCircuitBreaker] = useState<CircuitBreakerState | null>(null);
  const [tradingMode, setTradingMode] = useState<"paper" | "live">("paper");
  const [selectedVaultKeyId, setSelectedVaultKeyId] = useState<string | undefined>(undefined);
  const [isAutoSync, setIsAutoSync] = useState<boolean>(false); // Manual on-demand API calls by default
  const [syncInterval, setSyncInterval] = useState<number>(30);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [isLoadingCandles, setIsLoadingCandles] = useState<boolean>(false);

  // Active Multi-Asset Universe state (BTC, ETH, SOL, BNB, ADA)
  const [selectedSymbol, setSelectedSymbol] = useState<string>("BTC");

  // Timeframe resolution state (1h, 4h, 1d, 1w)
  const [timeframe, setTimeframe] = useState<"1h" | "4h" | "1d" | "1w">("1d");

  // WebSocket Live Stream state
  const [wsStatus, setWsStatus] = useState<WsStatus>("disconnected");

  // Dynamic Candles Dataset state (initialized with seed, hydrated dynamically)
  const [candles, setCandles] = useState<CandleData[]>(BTC_CANDLES);
  const [datasetSource, setDatasetSource] = useState<string>(
    "Compact Seed Fallback",
  );

  const [ticker, setTicker] = useState<LiveTicker>({
    symbol: "BTC/USDT",
    price: 85263.08,
    change24h: 2.61,
    high24h: 86400.0,
    low24h: 83500.0,
    volume24h: 42100,
    lastUpdated: "Initial Data",
    source: "Binance API",
  });

  // Fetch live market data (ticker + full dynamic candle dataset for active asset and timeframe)
  const handleFetchAllData = useCallback(async () => {
    setIsFetching(true);
    setIsLoadingCandles(true);
    try {
      const [tickerData, dynamicCandles] = await Promise.all([
        fetchLivePrice(selectedSymbol),
        fetchHistoricalCandles(selectedSymbol, 120, timeframe),
      ]);

      setTicker(tickerData);
      if (dynamicCandles.candles && dynamicCandles.candles.length > 0) {
        setCandles(dynamicCandles.candles);
        setDatasetSource(dynamicCandles.source);
      }
    } catch (e) {
      console.warn("Failed to fetch dynamic market data", e);
    } finally {
      setIsFetching(false);
      setIsLoadingCandles(false);
    }
  }, [selectedSymbol, timeframe]);

  // Handle switching timeframe across the entire application & strategy backtest engine
  const handleTimeframeChange = useCallback(
    async (newTf: "1h" | "4h" | "1d" | "1w") => {
      setTimeframe(newTf);
      setIsLoadingCandles(true);
      try {
        const dynamicCandles = await fetchHistoricalCandles(
          selectedSymbol,
          120,
          newTf,
        );
        if (dynamicCandles.candles && dynamicCandles.candles.length > 0) {
          setCandles(dynamicCandles.candles);
          setDatasetSource(dynamicCandles.source);
        }
      } catch (e) {
        console.warn(`Failed to switch to ${newTf} candles`, e);
      } finally {
        setIsLoadingCandles(false);
      }
    },
    [selectedSymbol],
  );

  // Handle switching active asset across live WS stream, order book, and backtest dataset
  const handleSymbolChange = useCallback(
    async (newSymbol: string) => {
      setSelectedSymbol(newSymbol);
      setIsLoadingCandles(true);
      setIsFetching(true);

      // Switch multiplexed WebSocket stream immediately
      binanceWs.switchSymbol(newSymbol);

      try {
        const [tickerData, dynamicCandles] = await Promise.all([
          fetchLivePrice(newSymbol),
          fetchHistoricalCandles(newSymbol, 120, timeframe),
        ]);

        setTicker(tickerData);
        if (dynamicCandles.candles && dynamicCandles.candles.length > 0) {
          setCandles(dynamicCandles.candles);
          setDatasetSource(dynamicCandles.source);
        }
      } catch (e) {
        console.warn(`Failed to switch symbol to ${newSymbol}`, e);
      } finally {
        setIsLoadingCandles(false);
        setIsFetching(false);
      }
    },
    [timeframe],
  );

  // Connect to Binance WebSocket for sub-second live price streaming
  useEffect(() => {
    binanceWs.connect(selectedSymbol);

    const unsubPrice = binanceWs.onPrice((tick) => {
      setTicker((prev) => ({
        symbol: tick.symbol,
        price: tick.price,
        change24h: tick.change24h,
        high24h: tick.high24h,
        low24h: tick.low24h,
        volume24h: tick.volume24h,
        lastUpdated: new Date().toLocaleTimeString(),
        source: "Binance WebSocket (Live)",
      }));
    });

    const unsubStatus = binanceWs.onStatus((status) => {
      setWsStatus(status);
    });

    return () => {
      unsubPrice();
      unsubStatus();
      binanceWs.disconnect();
    };
  }, []);

  // Fetch initial candles and ticker on mount
  useEffect(() => {
    handleFetchAllData();
  }, [handleFetchAllData]);

  // Periodic Auto-Sync Timer for fallback polling
  useEffect(() => {
    if (!isAutoSync) return;

    const timer = setInterval(() => {
      handleFetchAllData();
    }, syncInterval * 1000);

    return () => clearInterval(timer);
  }, [isAutoSync, syncInterval, handleFetchAllData]);

  // Circuit Breaker Telemetry Poller (every 15s)
  const refreshCircuitBreaker = useCallback(async () => {
    try {
      const status = await fetchCircuitBreaker();
      if (status) setCircuitBreaker(status);
    } catch (e) {
      console.debug('Circuit breaker polling skipped:', e);
    }
  }, []);

  useEffect(() => {
    refreshCircuitBreaker();
    const interval = setInterval(refreshCircuitBreaker, 15000);
    return () => clearInterval(interval);
  }, [refreshCircuitBreaker]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Top Application Header */}
      <Header
        ticker={ticker}
        isFetching={isFetching || isLoadingCandles}
        onRefresh={handleFetchAllData}
        onOpenFeedModal={() => setIsModalOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenVaultModal={() => setIsVaultModalOpen(true)}
        onOpenCircuitBreakerModal={() => setIsCircuitBreakerModalOpen(true)}
        circuitBreaker={circuitBreaker}
        tradingMode={tradingMode}
        onTradingModeChange={setTradingMode}
        isAutoSync={isAutoSync}
        wsStatus={wsStatus}
        selectedTimeframe={timeframe}
        onTimeframeChange={handleTimeframeChange}
        selectedSymbol={selectedSymbol}
        onSymbolChange={handleSymbolChange}
      />

      {/* Module Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        selectedSymbol={selectedSymbol}
        onSymbolChange={handleSymbolChange}
        selectedTimeframe={timeframe}
        onTimeframeChange={handleTimeframeChange}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 tab-panel-container">
        {activeTab === "overview" && (
          <BacktestTab
            candles={candles}
            currentPrice={ticker.price}
            timeframe={timeframe}
            onTimeframeChange={handleTimeframeChange}
            isLoadingCandles={isLoadingCandles}
            symbol={selectedSymbol}
            onSymbolChange={handleSymbolChange}
          />
        )}
        {activeTab === "paper-trading" && (
          <PaperTradingTab
            candles={candles}
            currentPrice={ticker.price}
            symbol={selectedSymbol}
            onSymbolChange={handleSymbolChange}
            tradingMode={tradingMode}
            selectedKeyId={selectedVaultKeyId}
            onOpenVaultModal={() => setIsVaultModalOpen(true)}
          />
        )}
        {activeTab === "risk" && (
          <RiskManagementTab candles={candles} currentPrice={ticker.price} />
        )}
        {activeTab === "astronacci" && <AstroCycleTab candles={candles} />}
        {activeTab === "lstm" && <LstmModelTab candles={candles} />}
        {activeTab === "monte-carlo" && (
          <MonteCarloTab
            currentBtcPrice={ticker.price}
            onOpenJobDrawer={() => setIsJobDrawerOpen(true)}
          />
        )}
        {activeTab === "portfolio" && <PortfolioTab btcPrice={ticker.price} />}
        {activeTab === "grid" && <GridTradingTab initialPrice={ticker.price} />}
        {activeTab === "modules" && (
          <ModulesTab candles={candles} currentPrice={ticker.price} />
        )}
      </main>

      {/* Live Data Configuration Modal */}
      <LiveFeedModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        ticker={ticker}
        isAutoSync={isAutoSync}
        setIsAutoSync={setIsAutoSync}
        syncInterval={syncInterval}
        setSyncInterval={setSyncInterval}
        onManualFetch={handleFetchAllData}
        isFetching={isFetching || isLoadingCandles}
        wsStatus={wsStatus}
        onReconnectWs={() => binanceWs.connect(selectedSymbol)}
      />

      {/* Bottom Global Status Bar */}
      <footer className="border-t border-slate-800 bg-slate-900/60 backdrop-blur text-xs py-4 text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 font-mono">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5 text-slate-300 font-semibold">
              <span
                className={`w-2 h-2 rounded-full ${wsStatus === "connected" ? "bg-emerald-400 animate-pulse" : isAutoSync ? "bg-emerald-400" : "bg-amber-400"}`}
              />
              Mode:{" "}
              {wsStatus === "connected"
                ? "WebSocket Live Stream"
                : isAutoSync
                  ? `Auto-Sync (${syncInterval}s)`
                  : "Manual Refresh"}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5 text-amber-400 font-medium">
              <Coins className="w-3.5 h-3.5" />
              Asset: {selectedSymbol}/USDT
            </span>
            <span>•</span>
            <span className="text-slate-400">Source: {ticker.source}</span>
            <span>•</span>
            <span className="flex items-center gap-1.5 text-amber-400 font-medium">
              <Clock className="w-3.5 h-3.5" />
              Resolution: {timeframe.toUpperCase()}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <Database className="w-3.5 h-3.5" />
              Dataset: {datasetSource} ({candles.length} bars)
            </span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <span>Last Sync: {ticker.lastUpdated}</span>
            <span>Fee: 0.1%</span>
          </div>
        </div>
      </footer>

      {/* Authentication & Profile Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* AES-256-GCM Exchange API Key Vault Modal */}
      <ApiKeyVaultModal
        isOpen={isVaultModalOpen}
        onClose={() => setIsVaultModalOpen(false)}
        selectedKeyId={selectedVaultKeyId}
        onSelectKey={setSelectedVaultKeyId}
      />

      {/* Institutional Circuit Breaker & Emergency Panic HUD */}
      <CircuitBreakerModal
        isOpen={isCircuitBreakerModalOpen}
        onClose={() => setIsCircuitBreakerModalOpen(false)}
        circuitBreaker={circuitBreaker}
        onUpdateStatus={setCircuitBreaker}
      />

      {/* Floating Background Compute Hub Drawer */}
      <JobProgressDrawer
        isOpen={isJobDrawerOpen}
        onToggle={() => setIsJobDrawerOpen(!isJobDrawerOpen)}
      />
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
