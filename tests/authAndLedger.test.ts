import { hashPassword, verifyPassword, signJwt, verifyJwt } from '../src/utils/auth';
import { hasNoSqlInjection, isValidEmail } from '../src/middlewares/sanitizer';
import { calculateEntryHash } from '../src/services/ledgerService';
import { createRateLimiter } from '../src/middlewares/rateLimiter';

describe('Phase 3: Auth, Security, Rate Limiter & Immutable Ledger', () => {
  describe('Password Hashing & JWT Security', () => {
    it('generates salted scrypt password hashes and verifies correctly', () => {
      const password = 'SuperSecretTradingPass123!';
      const { hash, salt } = hashPassword(password);

      expect(hash).toBeDefined();
      expect(salt).toBeDefined();
      expect(hash.length).toBe(128); // 64 bytes hex
      expect(salt.length).toBe(32); // 16 bytes hex

      expect(verifyPassword(password, hash, salt)).toBe(true);
      expect(verifyPassword('WrongPassword', hash, salt)).toBe(false);
    });

    it('signs and verifies JWT tokens with HMAC-SHA256', () => {
      const payload = {
        userId: 'usr_quant_123',
        email: 'trader@quant.com',
        role: 'trader' as const,
        name: 'Quant Trader'
      };

      const token = signJwt(payload, 3600);
      expect(token).toBeDefined();
      expect(token.split('.')).toHaveLength(3);

      const verified = verifyJwt(token);
      expect(verified).not.toBeNull();
      expect(verified?.userId).toBe(payload.userId);
      expect(verified?.email).toBe(payload.email);
      expect(verified?.role).toBe('trader');
    });

    it('rejects tampered or forged JWT tokens', () => {
      const token = signJwt({
        userId: 'usr_normal',
        email: 'normal@quant.com',
        role: 'trader'
      });

      const parts = token.split('.');
      // Tamper with payload
      const tamperedToken = `${parts[0]}.${parts[1]}tampered.${parts[2]}`;
      expect(verifyJwt(tamperedToken)).toBeNull();

      // Tamper with signature
      const badSigToken = `${parts[0]}.${parts[1]}.invalidsignature`;
      expect(verifyJwt(badSigToken)).toBeNull();
    });

    it('rejects expired JWT tokens', () => {
      const token = signJwt(
        { userId: 'usr_expired', email: 'exp@quant.com', role: 'trader' },
        -10 // Expired 10 seconds ago
      );
      expect(verifyJwt(token)).toBeNull();
    });
  });

  describe('Input Sanitization & Injection Prevention', () => {
    it('detects NoSQL injection operator patterns', () => {
      expect(hasNoSqlInjection({ $gt: '' })).toBe(true);
      expect(hasNoSqlInjection({ filter: { $ne: null } })).toBe(true);
      expect(hasNoSqlInjection({ 'nested.key': 'val' })).toBe(true);

      // Clean payloads
      expect(hasNoSqlInjection({ symbol: 'BTC', interval: '1h', limit: 100 })).toBe(false);
      expect(hasNoSqlInjection({ email: 'user@example.com', price: 90000 })).toBe(false);
    });

    it('validates email formats accurately', () => {
      expect(isValidEmail('zakiafuadi925@gmail.com')).toBe(true);
      expect(isValidEmail('trader.pro@sub.domain.co')).toBe(true);
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('@nodomain.com')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
    });
  });

  describe('Rate Limiter Middleware', () => {
    it('throttles excessive requests within the window and returns 429', () => {
      const limiter = createRateLimiter({
        windowMs: 1000,
        max: 3,
        message: 'Too many requests'
      });

      const mockReq: any = {
        headers: {},
        socket: { remoteAddress: '192.168.1.100' }
      };

      const setHeaderMock = jest.fn();
      let statusCalled = 0;
      let statusCode = 200;
      let jsonResponse: any = null;

      const mockRes: any = {
        setHeader: setHeaderMock,
        status: (code: number) => {
          statusCode = code;
          statusCalled++;
          return {
            json: (data: any) => {
              jsonResponse = data;
            }
          };
        }
      };

      const nextMock = jest.fn();

      // Requests 1, 2, 3 should pass
      limiter(mockReq, mockRes, nextMock);
      expect(nextMock).toHaveBeenCalledTimes(1);

      limiter(mockReq, mockRes, nextMock);
      expect(nextMock).toHaveBeenCalledTimes(2);

      limiter(mockReq, mockRes, nextMock);
      expect(nextMock).toHaveBeenCalledTimes(3);

      // Request 4 should be blocked (exceeded max of 3)
      limiter(mockReq, mockRes, nextMock);
      expect(nextMock).toHaveBeenCalledTimes(3); // Not called again
      expect(statusCode).toBe(429);
      expect(jsonResponse?.error).toBe('TOO_MANY_REQUESTS');
    });
  });

  describe('Immutable Financial Ledger Cryptographic Hashing', () => {
    it('produces deterministic SHA-256 hashes and detects tampering', () => {
      const hash1 = calculateEntryHash(
        'led_001',
        'usr_1',
        1,
        'INITIAL_DEPOSIT',
        10000,
        0,
        10000,
        'GENESIS_HASH_000',
        1700000000000
      );

      const hash2 = calculateEntryHash(
        'led_001',
        'usr_1',
        1,
        'INITIAL_DEPOSIT',
        10000,
        0,
        10000,
        'GENESIS_HASH_000',
        1700000000000
      );

      // Determinism
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);

      // Tampered amount produces completely different hash
      const tamperedHash = calculateEntryHash(
        'led_001',
        'usr_1',
        1,
        'INITIAL_DEPOSIT',
        20000, // Tampered
        0,
        20000,
        'GENESIS_HASH_000',
        1700000000000
      );
      expect(tamperedHash).not.toBe(hash1);
    });
  });
});
