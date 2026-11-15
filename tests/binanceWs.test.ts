import { binanceWs, WsPriceTick } from '../src/services/binanceWs';

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

  it('handles disconnect cleanly without throwing', () => {
    expect(() => {
      binanceWs.disconnect();
    }).not.toThrow();
    expect(binanceWs.status).toBe('disconnected');
  });
});
