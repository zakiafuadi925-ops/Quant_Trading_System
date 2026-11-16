import { 
  binanceWs, 
  WsPriceTick, 
  OrderBookDepth, 
  TradeTick, 
  CvdState 
} from '../src/services/binanceWs';

describe('BinanceWsManager', () => {
  afterEach(() => {
    binanceWs.disconnect();
  });

  it('initializes with disconnected status and tracks state callbacks', () => {
    const statuses: string[] = [];
    const unsubscribe = binanceWs.onStatus((status) => {
      statuses.push(status);
    });

    expect(statuses).toContain('disconnected');
    unsubscribe();
  });

  it('allows registering and unregistering price tick listeners', () => {
    const receivedTicks: WsPriceTick[] = [];
    const unsubscribe = binanceWs.onPrice((tick) => {
      receivedTicks.push(tick);
    });

    expect(typeof unsubscribe).toBe('function');
    unsubscribe();
  });

  it('allows registering and receiving depth listeners', () => {
    const depths: OrderBookDepth[] = [];
    const unsubscribe = binanceWs.onDepth((depth) => {
      depths.push(depth);
    });

    expect(typeof unsubscribe).toBe('function');
    unsubscribe();
  });

  it('tracks CVD state and supports resetCvd', () => {
    let currentCvd: CvdState | null = null;
    const unsubscribe = binanceWs.onCvd((state) => {
      currentCvd = state;
    });

    expect(currentCvd).not.toBeNull();
    expect(currentCvd?.cumulativeDelta).toBe(0);

    // Call reset
    binanceWs.resetCvd();
    expect(binanceWs.cvdState.cumulativeDelta).toBe(0);
    expect(binanceWs.cvdState.tradesCount).toBe(0);
    unsubscribe();
  });

  it('supports dynamic symbol switching across multi-asset universe', () => {
    binanceWs.connect('BTC');
    expect(binanceWs.getSymbol()).toBe('BTC');

    // Switch to ETH
    binanceWs.switchSymbol('ETH');
    expect(binanceWs.getSymbol()).toBe('ETH');
    expect(binanceWs.latestDepth).toBeNull();
    expect(binanceWs.cvdState.cumulativeDelta).toBe(0);

    // Switch to SOL
    binanceWs.switchSymbol('SOL');
    expect(binanceWs.getSymbol()).toBe('SOL');
  });

  it('handles disconnect cleanly without throwing', () => {
    expect(() => {
      binanceWs.disconnect();
    }).not.toThrow();
    expect(binanceWs.status).toBe('disconnected');
  });
});
