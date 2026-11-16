/**
 * Binance WebSocket Streaming Client
 * Provides sub-second real-time market data directly from Binance public WebSocket streams:
 * - Sub-second Ticker (`@ticker`)
 * - Level 2 Order Book Depth 20-level (`@depth20@100ms`)
 * - Tick-by-tick Trades (`@trade`) with real-time Cumulative Volume Delta (CVD) computation.
 */

export type WsStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface WsPriceTick {
  symbol: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  timestamp: number;
}

export interface DepthItem {
  price: number;
  quantity: number;
  total: number;
  depthPercent: number;
}

export interface OrderBookDepth {
  symbol: string;
  bids: DepthItem[];
  asks: DepthItem[];
  bestBid: number;
  bestAsk: number;
  spread: number;
  spreadBps: number;
  totalBidVolume: number;
  totalAskVolume: number;
  imbalanceRatio: number; // -1.0 (100% Ask dominance) to +1.0 (100% Bid dominance)
  timestamp: number;
}

export interface TradeTick {
  id: number | string;
  price: number;
  quantity: number;
  isBuyerMaker: boolean; // true = taker sell (bearish), false = taker buy (bullish)
  side: 'BUY' | 'SELL';
  delta: number; // +quantity for taker buy, -quantity for taker sell
  timestamp: number;
}

export interface CvdPoint {
  timestamp: number;
  price: number;
  cvd: number;
  delta: number;
}

export interface CvdState {
  cumulativeDelta: number;
  totalBuyVolume: number;
  totalSellVolume: number;
  tradesCount: number;
  divergence: 'BULLISH_ABSORPTION' | 'BEARISH_EXHAUSTION' | 'CONVERGENT' | 'NEUTRAL';
  history: CvdPoint[];
  recentTrades: TradeTick[];
}

export type WsPriceCallback = (tick: WsPriceTick) => void;
export type WsDepthCallback = (depth: OrderBookDepth) => void;
export type WsTradeCallback = (trade: TradeTick) => void;
export type WsCvdCallback = (cvd: CvdState) => void;
export type WsStatusCallback = (status: WsStatus) => void;

class BinanceWsManager {
  private ws: WebSocket | null = null;
  private currentSymbol = 'btcusdt';
  private priceCallbacks: Set<WsPriceCallback> = new Set();
  private depthCallbacks: Set<WsDepthCallback> = new Set();
  private tradeCallbacks: Set<WsTradeCallback> = new Set();
  private cvdCallbacks: Set<WsCvdCallback> = new Set();
  private statusCallbacks: Set<WsStatusCallback> = new Set();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private isExplicitlyClosed = false;

  // Running CVD state
  public cvdState: CvdState = {
    cumulativeDelta: 0,
    totalBuyVolume: 0,
    totalSellVolume: 0,
    tradesCount: 0,
    divergence: 'NEUTRAL',
    history: [],
    recentTrades: [],
  };

  // Latest Depth state
  public latestDepth: OrderBookDepth | null = null;

  public status: WsStatus = 'disconnected';

  public connect(symbol = 'BTC'): void {
    if (typeof window === 'undefined' || typeof WebSocket === 'undefined') {
      return;
    }

    this.isExplicitlyClosed = false;
    const cleanSymbol = symbol.toLowerCase().replace('usdt', '').replace('/usdt', '') + 'usdt';
    this.currentSymbol = cleanSymbol;

    // Close existing connection if switching symbols
    if (this.ws) {
      try {
        this.ws.close();
      } catch (_) {}
    }

    this.updateStatus('connecting');

    try {
      // Connect to Binance multiplexed combined stream:
      // Ticker + Depth 20 @ 100ms + Real-time Trades
      const url = `wss://stream.binance.com:9443/stream?streams=${this.currentSymbol}@ticker/${this.currentSymbol}@depth20@100ms/${this.currentSymbol}@trade`;
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.updateStatus('connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const raw = JSON.parse(event.data);

          // Binance multiplexed stream sends { stream: "...", data: { ... } }
          // Or direct stream sends { ... }
          const streamName: string = raw.stream || '';
          const data = raw.data || raw;

          if (!data) return;

          // 1. Route Ticker message
          if (streamName.includes('@ticker') || (data && data.c && data.P !== undefined)) {
            this.handleTickerMessage(data);
          }

          // 2. Route Depth message
          if (streamName.includes('@depth') || (data && Array.isArray(data.bids) && Array.isArray(data.asks))) {
            this.handleDepthMessage(data);
          }

          // 3. Route Trade message
          if (streamName.includes('@trade') || (data && data.e === 'trade')) {
            this.handleTradeMessage(data);
          }
        } catch (_) {
          // Ignore json parse error
        }
      };

      this.ws.onerror = () => {
        this.updateStatus('error');
      };

      this.ws.onclose = () => {
        this.ws = null;
        if (!this.isExplicitlyClosed) {
          this.updateStatus('disconnected');
          this.scheduleReconnect();
        }
      };
    } catch (err) {
      this.updateStatus('error');
      this.scheduleReconnect();
    }
  }

  private handleTickerMessage(data: any): void {
    if (!data || !data.c) return;

    const tick: WsPriceTick = {
      symbol: data.s ? `${data.s.replace('USDT', '')}/USDT` : 'BTC/USDT',
      price: parseFloat(data.c),
      change24h: parseFloat(data.P || '0'),
      high24h: parseFloat(data.h || data.c),
      low24h: parseFloat(data.l || data.c),
      volume24h: parseFloat(data.v || '0'),
      timestamp: data.E || Date.now(),
    };

    this.priceCallbacks.forEach((cb) => {
      try {
        cb(tick);
      } catch (e) {
        console.error('Error in WS price callback:', e);
      }
    });
  }

  private handleDepthMessage(data: any): void {
    if (!data.bids || !data.asks) return;

    const rawBids: [number, number][] = data.bids.map((b: any) => [parseFloat(b[0]), parseFloat(b[1])]);
    const rawAsks: [number, number][] = data.asks.map((a: any) => [parseFloat(a[0]), parseFloat(a[1])]);

    // Compute cumulative totals
    let cumBid = 0;
    const bids: DepthItem[] = rawBids.map(([price, qty]) => {
      cumBid += qty;
      return { price, quantity: qty, total: cumBid, depthPercent: 0 };
    });

    let cumAsk = 0;
    const asks: DepthItem[] = rawAsks.map(([price, qty]) => {
      cumAsk += qty;
      return { price, quantity: qty, total: cumAsk, depthPercent: 0 };
    });

    const maxVolume = Math.max(cumBid, cumAsk, 1);
    bids.forEach((b) => (b.depthPercent = Math.min(100, (b.total / maxVolume) * 100)));
    asks.forEach((a) => (a.depthPercent = Math.min(100, (a.total / maxVolume) * 100)));

    const bestBid = bids[0]?.price || 0;
    const bestAsk = asks[0]?.price || 0;
    const spread = bestAsk > 0 && bestBid > 0 ? Number((bestAsk - bestBid).toFixed(2)) : 0;
    const mid = (bestBid + bestAsk) / 2 || 1;
    const spreadBps = Number(((spread / mid) * 10000).toFixed(2));

    // Liquidity Imbalance Ratio: (BidVol - AskVol) / (BidVol + AskVol)
    const imbalanceRatio = (cumBid + cumAsk) > 0 ? Number(((cumBid - cumAsk) / (cumBid + cumAsk)).toFixed(3)) : 0;

    const depth: OrderBookDepth = {
      symbol: this.currentSymbol.toUpperCase().replace('USDT', '') + '/USDT',
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
    };

    this.latestDepth = depth;

    this.depthCallbacks.forEach((cb) => {
      try {
        cb(depth);
      } catch (e) {
        console.error('Error in WS depth callback:', e);
      }
    });
  }

  private handleTradeMessage(data: any): void {
    if (!data || data.p === undefined) return;

    const price = parseFloat(data.p);
    const quantity = parseFloat(data.q);
    const isBuyerMaker = Boolean(data.m);
    const isTakerBuy = !isBuyerMaker;
    const side: 'BUY' | 'SELL' = isTakerBuy ? 'BUY' : 'SELL';
    const delta = isTakerBuy ? quantity : -quantity;
    const timestamp = data.T || Date.now();

    const trade: TradeTick = {
      id: data.t || `${timestamp}-${Math.random()}`,
      price,
      quantity,
      isBuyerMaker,
      side,
      delta,
      timestamp,
    };

    // Update running CVD state
    const newCumulativeDelta = Number((this.cvdState.cumulativeDelta + delta).toFixed(4));
    const newBuyVolume = Number((this.cvdState.totalBuyVolume + (isTakerBuy ? quantity : 0)).toFixed(4));
    const newSellVolume = Number((this.cvdState.totalSellVolume + (isTakerBuy ? 0 : quantity)).toFixed(4));
    const newTradeCount = this.cvdState.tradesCount + 1;

    // Buffer recent trades (keep max 60)
    const recentTrades = [trade, ...this.cvdState.recentTrades.slice(0, 59)];

    // Buffer CVD history points (sample at most 1 point per 300ms to preserve performance, max 80 points)
    const lastHist = this.cvdState.history[this.cvdState.history.length - 1];
    let newHistory = this.cvdState.history;
    if (!lastHist || timestamp - lastHist.timestamp > 300) {
      newHistory = [...this.cvdState.history.slice(-79), {
        timestamp,
        price,
        cvd: newCumulativeDelta,
        delta,
      }];
    }

    // Divergence detection
    let divergence: 'BULLISH_ABSORPTION' | 'BEARISH_EXHAUSTION' | 'CONVERGENT' | 'NEUTRAL' = 'NEUTRAL';
    if (newHistory.length >= 10) {
      const pStart = newHistory[0].price;
      const pEnd = price;
      const cvdStart = newHistory[0].cvd;
      const cvdEnd = newCumulativeDelta;

      const pChange = pEnd - pStart;
      const cvdChange = cvdEnd - cvdStart;

      if (pChange > 0 && cvdChange < 0) {
        divergence = 'BEARISH_EXHAUSTION'; // Price rising on negative volume delta (passive seller absorption)
      } else if (pChange < 0 && cvdChange > 0) {
        divergence = 'BULLISH_ABSORPTION'; // Price falling despite aggressive market buyers (passive buyer absorption)
      } else if ((pChange > 0 && cvdChange > 0) || (pChange < 0 && cvdChange < 0)) {
        divergence = 'CONVERGENT';
      }
    }

    this.cvdState = {
      cumulativeDelta: newCumulativeDelta,
      totalBuyVolume: newBuyVolume,
      totalSellVolume: newSellVolume,
      tradesCount: newTradeCount,
      divergence,
      history: newHistory,
      recentTrades,
    };

    // Dispatch Trade callbacks
    this.tradeCallbacks.forEach((cb) => {
      try {
        cb(trade);
      } catch (e) {
        console.error('Error in WS trade callback:', e);
      }
    });

    // Dispatch CVD state callbacks
    this.cvdCallbacks.forEach((cb) => {
      try {
        cb(this.cvdState);
      } catch (e) {
        console.error('Error in WS CVD callback:', e);
      }
    });
  }

  public disconnect(): void {
    this.isExplicitlyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch (_) {}
      this.ws = null;
    }
    this.updateStatus('disconnected');
  }

  public resetCvd(): void {
    this.cvdState = {
      cumulativeDelta: 0,
      totalBuyVolume: 0,
      totalSellVolume: 0,
      tradesCount: 0,
      divergence: 'NEUTRAL',
      history: [],
      recentTrades: [],
    };
    this.cvdCallbacks.forEach((cb) => cb(this.cvdState));
  }

  public onPrice(callback: WsPriceCallback): () => void {
    this.priceCallbacks.add(callback);
    return () => {
      this.priceCallbacks.delete(callback);
    };
  }

  public onDepth(callback: WsDepthCallback): () => void {
    this.depthCallbacks.add(callback);
    if (this.latestDepth) {
      callback(this.latestDepth);
    }
    return () => {
      this.depthCallbacks.delete(callback);
    };
  }

  public onTrade(callback: WsTradeCallback): () => void {
    this.tradeCallbacks.add(callback);
    return () => {
      this.tradeCallbacks.delete(callback);
    };
  }

  public onCvd(callback: WsCvdCallback): () => void {
    this.cvdCallbacks.add(callback);
    callback(this.cvdState);
    return () => {
      this.cvdCallbacks.delete(callback);
    };
  }

  public onStatus(callback: WsStatusCallback): () => void {
    this.statusCallbacks.add(callback);
    callback(this.status);
    return () => {
      this.statusCallbacks.delete(callback);
    };
  }

  private updateStatus(newStatus: WsStatus) {
    this.status = newStatus;
    this.statusCallbacks.forEach((cb) => {
      try {
        cb(newStatus);
      } catch (_) {}
    });
  }

  private scheduleReconnect() {
    if (this.isExplicitlyClosed) return;
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.updateStatus('disconnected');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 16000);
    this.reconnectAttempts++;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectTimer = setTimeout(() => {
      this.connect(this.currentSymbol.replace('usdt', '').toUpperCase());
    }, delay);
  }
}

export const binanceWs = new BinanceWsManager();
