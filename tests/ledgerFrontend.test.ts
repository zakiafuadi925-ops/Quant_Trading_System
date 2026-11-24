import {
  fetchAccountLedger,
  verifyLedgerChain,
  LedgerEntryItem,
  LedgerAuditResult
} from '../src/services/ledgerApi';
import { calculateEntryHash } from '../src/services/ledgerService';

describe('Frontend Phase 5: Immutable Financial Ledger & Multi-Asset Audit', () => {
  it('calculates deterministic SHA-256 hash correctly for chained entries', () => {
    const entryId = 'led_1700000000_abcd';
    const accountId = 'usr_test_audit';
    const sequence = 1;
    const type = 'INITIAL_DEPOSIT';
    const amount = 10000.0;
    const balanceBefore = 0.0;
    const balanceAfter = 10000.0;
    const prevHash = 'GENESIS_HASH_00000000000000000000000000000000';
    const timestamp = 1700000000000;

    const hash1 = calculateEntryHash(
      entryId,
      accountId,
      sequence,
      type,
      amount,
      balanceBefore,
      balanceAfter,
      prevHash,
      timestamp
    );

    const hash2 = calculateEntryHash(
      entryId,
      accountId,
      sequence,
      type,
      amount,
      balanceBefore,
      balanceAfter,
      prevHash,
      timestamp
    );

    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
  });

  it('detects tampering when payload fields are modified', () => {
    const originalHash = calculateEntryHash(
      'led_1',
      'acc_1',
      1,
      'INITIAL_DEPOSIT',
      10000,
      0,
      10000,
      'GENESIS',
      1700000000
    );

    const tamperedHash = calculateEntryHash(
      'led_1',
      'acc_1',
      1,
      'INITIAL_DEPOSIT',
      15000, // tampered amount
      0,
      10000,
      'GENESIS',
      1700000000
    );

    expect(originalHash).not.toBe(tamperedHash);
  });

  it('fetches account ledger with mock authFetch successfully', async () => {
    const mockEntries: LedgerEntryItem[] = [
      {
        entryId: 'led_1',
        accountId: 'acc_demo',
        sequence: 1,
        type: 'INITIAL_DEPOSIT',
        amount: 10000,
        balanceBefore: 0,
        balanceAfter: 10000,
        prevHash: 'GENESIS',
        hash: 'hash_123',
        description: 'Initial virtual capital',
        timestamp: Date.now()
      }
    ];

    const mockAuthFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, count: 1, entries: mockEntries })
    });

    const result = await fetchAccountLedger(mockAuthFetch as any, 'acc_demo');

    expect(mockAuthFetch).toHaveBeenCalledWith('/api/paper/ledger/acc_demo?limit=50');
    expect(result.count).toBe(1);
    expect(result.entries[0].type).toBe('INITIAL_DEPOSIT');
  });

  it('verifies ledger chain calling cryptographic audit endpoint', async () => {
    const mockAudit: LedgerAuditResult = {
      valid: true,
      verifiedEntries: 14
    };

    const mockAuthFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, audit: mockAudit })
    });

    const result = await verifyLedgerChain(mockAuthFetch as any, 'acc_demo');

    expect(mockAuthFetch).toHaveBeenCalledWith('/api/paper/ledger/verify/acc_demo');
    expect(result.valid).toBe(true);
    expect(result.verifiedEntries).toBe(14);
  });
});
