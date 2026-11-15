/**
 * Binance WebSocket Streaming Client
 * Provides sub-second real-time price updates directly from Binance public WebSocket streams.
 * Includes automatic reconnection with exponential backoff and graceful failover.
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

export type WsPriceCallback = (tick: WsPriceTick) => void;
export type WsStatusCallback = (status: WsStatus) => void;

class BinanceWsManager {
  private ws: WebSocket | null = null;
  private currentSymbol = 'btcusdt';
  private priceCallbacks: Set<WsPriceCallback> = new Set();
  private statusCallbacks: Set<WsStatusCallback> = new Set();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private isExplicitlyClosed = false;

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
      // Connect to Binance ticker stream for 24h stats + sub-second close price
      const url = `wss://stream.binance.com:9443/ws/${this.currentSymbol}@ticker`;
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.updateStatus('connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // Binance 24hr Ticker Stream payload fields:
          // s: symbol (e.g. BTCUSDT)
          // c: current close price
          // P: price change percent
          // h: high price 24h
          // l: low price 24h
          // v: total traded base asset volume
          if (data && data.c) {
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
        } catch (_) {
          // Ignore parse errors on ping/pong frames
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

  public onPrice(callback: WsPriceCallback): () => void {
    this.priceCallbacks.add(callback);
    return () => {
      this.priceCallbacks.delete(callback);
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
