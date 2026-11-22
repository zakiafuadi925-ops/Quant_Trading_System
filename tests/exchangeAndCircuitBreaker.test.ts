import { encryptSecret, decryptSecret, maskApiKey } from '../src/utils/vault';
import { signHmacSha256, UnifiedExchangeAdapter } from '../src/services/exchangeAdaptor';
import {
  evaluateRiskThresholds,
  triggerEmergencyKillSwitch,
  resetCircuitBreaker,
  getCircuitBreakerStatus
} from '../src/services/circuitBreakerService';

describe('Phase 5: Live Exchange Execution, Key Vault & Circuit Breaker', () => {
  describe('Secure API Key Vault (AES-256-GCM)', () => {
    it('encrypts and decrypts API secrets using authenticated AES-256-GCM', () => {
      const originalApiKey = 'binance_live_api_key_9823489234892348923';
      const encrypted = encryptSecret(originalApiKey);

      expect(encrypted).toBeDefined();
      expect(encrypted.split(':')).toHaveLength(3); // iv : authTag : data

      const decrypted = decryptSecret(encrypted);
      expect(decrypted).toBe(originalApiKey);
    });

    it('detects tampering or corruption and refuses decryption', () => {
      const originalSecret = 'very_confidential_secret_phrase';
      const encrypted = encryptSecret(originalSecret);
      const [iv, authTag, data] = encrypted.split(':');

      // Tamper with encrypted data
      const tamperedData = `${data.slice(0, -2)}ff`;
      const tamperedCipher = `${iv}:${authTag}:${tamperedData}`;

      expect(() => decryptSecret(tamperedCipher)).toThrow();

      // Tamper with auth tag
      const badTag = `${authTag.slice(0, -2)}aa`;
      const tamperedTagCipher = `${iv}:${badTag}:${data}`;

      expect(() => decryptSecret(tamperedTagCipher)).toThrow();
    });

    it('safely masks API keys for display', () => {
      expect(maskApiKey('f482a938b8294cd98231a482')).toBe('f482...a482');
      expect(maskApiKey('short')).toBe('****');
    });
  });

  describe('Unified Exchange Adaptor & HMAC Signing', () => {
    it('generates cryptographic HMAC-SHA256 signature for requests', () => {
      const queryString = 'symbol=BTCUSDT&side=BUY&type=LIMIT&quantity=0.05&timestamp=1700000000000';
      const secret = 'test_secret_key_12345';
      const signature = signHmacSha256(queryString, secret);

      expect(signature).toBeDefined();
      expect(signature).toHaveLength(64); // 256 bits = 64 hex characters

      // Verify determinism
      const signature2 = signHmacSha256(queryString, secret);
      expect(signature).toBe(signature2);
    });

    it('creates formatted live exchange orders through the adapter', async () => {
      const adapter = new UnifiedExchangeAdapter('binance', {
        apiKey: 'test_key',
        apiSecret: 'test_secret',
        isTestnet: true
      });

      const order = await adapter.createOrder({
        symbol: 'BTC/USDT',
        side: 'BUY',
        type: 'LIMIT',
        quantity: 0.1,
        price: 88000
      });

      expect(order).toBeDefined();
      expect(order.orderId).toMatch(/^live_/);
      expect(order.symbol).toBe('BTC/USDT');
      expect(order.quantity).toBe(0.1);
      expect(order.price).toBe(88000);
      expect(order.status).toBe('FILLED');
    });
  });

  describe('Institutional Safety Circuit Breaker (Kill-Switch)', () => {
    const testAccount = 'acc_circuit_test_01';

    beforeEach(() => {
      resetCircuitBreaker(testAccount);
    });

    it('allows trading when drawdown is within safe parameters', async () => {
      // 10,000 -> 9,800 is a 2% drawdown (below 5% limit)
      const check = await evaluateRiskThresholds(testAccount, 9800, 10000);

      expect(check.breached).toBe(false);
      expect(check.drawdownPct).toBe(2.0);
      expect(check.status.state).toBe('NORMAL');
      expect(check.status.tradingAllowed).toBe(true);
    });

    it('trips the circuit breaker and halts trading when drawdown exceeds 5%', async () => {
      // 10,000 -> 9,300 is a 7% drawdown (exceeds 5% limit)
      const check = await evaluateRiskThresholds(testAccount, 9300, 10000);

      expect(check.breached).toBe(true);
      expect(check.drawdownPct).toBe(7.0);
      expect(check.status.state).toBe('HALTED');
      expect(check.status.tradingAllowed).toBe(false);
      expect(check.status.triggerReason).toContain('HOURLY_DRAWDOWN_BREACH');

      // Subsequent checks should remain halted
      const status = getCircuitBreakerStatus(testAccount);
      expect(status.tradingAllowed).toBe(false);
    });

    it('allows manual emergency kill-switch activation and administrative reset', async () => {
      const killResult = await triggerEmergencyKillSwitch(testAccount, 'MANUAL_TEST_KILL');
      expect(killResult.state).toBe('HALTED');

      let status = getCircuitBreakerStatus(testAccount);
      expect(status.tradingAllowed).toBe(false);

      // Reset
      const resetStatus = resetCircuitBreaker(testAccount);
      expect(resetStatus.state).toBe('NORMAL');
      expect(resetStatus.tradingAllowed).toBe(true);

      status = getCircuitBreakerStatus(testAccount);
      expect(status.tradingAllowed).toBe(true);
    });
  });
});
