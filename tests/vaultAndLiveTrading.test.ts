import {
  fetchVaultKeys,
  saveVaultKey,
  deleteVaultKey,
  testVaultKey,
  submitLiveOrder,
  VaultKeyItem,
  LiveOrderPayload
} from '../src/services/exchangeApi';
import { maskApiKey } from '../src/utils/vault';

describe('Frontend Phase 2: Live Exchange & AES Key Vault Operations', () => {
  it('masks API keys securely showing only initial and trailing characters', () => {
    const rawKey = 'd942e88a38b2416f91ad190014ef0a1c';
    const masked = maskApiKey(rawKey);

    expect(masked.length).toBeLessThan(rawKey.length);
    expect(masked).toContain('...');
    expect(masked.startsWith('d942')).toBe(true);
    expect(masked.endsWith('0a1c')).toBe(true);
  });

  it('handles fetchVaultKeys with mock authFetch successfully', async () => {
    const mockKeys: VaultKeyItem[] = [
      {
        keyId: 'key_binance_123',
        exchange: 'binance',
        label: 'Primary Binance Key',
        maskedKey: 'd942...0a1c',
        isTestnet: true,
        isActive: true,
        lastTestedAt: new Date().toISOString()
      }
    ];

    const mockAuthFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, count: 1, keys: mockKeys })
    });

    const keys = await fetchVaultKeys(mockAuthFetch as any);

    expect(mockAuthFetch).toHaveBeenCalledWith('/api/exchange/keys');
    expect(keys).toHaveLength(1);
    expect(keys[0].exchange).toBe('binance');
    expect(keys[0].isTestnet).toBe(true);
  });

  it('handles saveVaultKey dispatching encrypted payload to API', async () => {
    const mockAuthFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        message: 'API Key securely encrypted and stored in Vault.',
        key: {
          keyId: 'key_bybit_456',
          exchange: 'bybit',
          label: 'Bybit Hedge Account',
          maskedKey: '8f92...9921',
          isTestnet: false
        }
      })
    });

    const result = await saveVaultKey(
      {
        exchange: 'bybit',
        label: 'Bybit Hedge Account',
        apiKey: '8f92secretrawkey9921',
        apiSecret: 'verysecretpassword123',
        isTestnet: false
      },
      mockAuthFetch as any
    );

    expect(result.success).toBe(true);
    expect(result.key?.keyId).toBe('key_bybit_456');
    expect(mockAuthFetch).toHaveBeenCalledWith(
      '/api/exchange/keys',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
    );
  });

  it('handles deleteVaultKey calling DELETE endpoint', async () => {
    const mockAuthFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        message: 'API key successfully removed from Vault.',
        keyId: 'key_binance_123'
      })
    });

    const result = await deleteVaultKey('key_binance_123', mockAuthFetch as any);

    expect(result.success).toBe(true);
    expect(mockAuthFetch).toHaveBeenCalledWith('/api/exchange/keys/key_binance_123', {
      method: 'DELETE'
    });
  });

  it('handles testVaultKey returning measured latency', async () => {
    const mockAuthFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        keyId: 'key_binance_123',
        exchange: 'binance',
        isTestnet: true,
        latencyMs: 38,
        message: 'Binance API ping successful'
      })
    });

    const result = await testVaultKey('key_binance_123', mockAuthFetch as any);

    expect(result.success).toBe(true);
    expect(result.latencyMs).toBe(38);
    expect(mockAuthFetch).toHaveBeenCalledWith(
      '/api/exchange/keys/key_binance_123/test',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('handles submitLiveOrder dispatching signed order to matching engine', async () => {
    const mockAuthFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        message: 'Live exchange order executed successfully.',
        order: {
          orderId: 'live_ord_882910',
          symbol: 'BTCUSDT',
          status: 'FILLED',
          executedQty: 0.05,
          avgPrice: 85200,
          exchange: 'binance',
          side: 'BUY',
          timestamp: Date.now()
        }
      })
    });

    const payload: LiveOrderPayload = {
      keyId: 'key_binance_123',
      orderParams: {
        symbol: 'BTCUSDT',
        side: 'BUY',
        type: 'MARKET',
        quantity: 0.05,
        price: 85200,
        leverage: 5
      }
    };

    const result = await submitLiveOrder(payload, mockAuthFetch as any);

    expect(result.success).toBe(true);
    expect(result.order?.orderId).toBe('live_ord_882910');
    expect(result.order?.status).toBe('FILLED');
    expect(mockAuthFetch).toHaveBeenCalledWith(
      '/api/exchange/order',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
    );
  });
});
