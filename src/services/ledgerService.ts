import crypto from 'crypto';
import { LedgerEntryModel, ILedgerEntry, LedgerEntryType } from '../db/models/LedgerEntry.js';
import { connectToDatabase } from '../db/mongodb.js';

export interface RecordLedgerParams {
  accountId: string;
  type: LedgerEntryType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceId?: string;
  description: string;
}

/**
 * Calculates deterministic SHA-256 hash of a ledger entry
 */
export function calculateEntryHash(
  entryId: string,
  accountId: string,
  sequence: number,
  type: string,
  amount: number,
  balanceBefore: number,
  balanceAfter: number,
  prevHash: string,
  timestamp: number
): string {
  const payload = [
    entryId,
    accountId,
    sequence,
    type,
    amount.toFixed(4),
    balanceBefore.toFixed(4),
    balanceAfter.toFixed(4),
    prevHash,
    timestamp
  ].join('|');

  return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * Appends an immutable, cryptographically chained financial ledger entry.
 */
export async function recordLedgerTransaction(params: RecordLedgerParams): Promise<ILedgerEntry> {
  await connectToDatabase();

  // Find latest entry for this account to establish hash continuity
  const lastEntry = await LedgerEntryModel.findOne({ accountId: params.accountId }).sort({ sequence: -1 });

  const sequence = lastEntry ? lastEntry.sequence + 1 : 1;
  const prevHash = lastEntry ? lastEntry.hash : 'GENESIS_HASH_00000000000000000000000000000000';
  const entryId = `led_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const timestamp = Date.now();

  const hash = calculateEntryHash(
    entryId,
    params.accountId,
    sequence,
    params.type,
    params.amount,
    params.balanceBefore,
    params.balanceAfter,
    prevHash,
    timestamp
  );

  const entry = await LedgerEntryModel.create({
    entryId,
    accountId: params.accountId,
    sequence,
    type: params.type,
    amount: params.amount,
    balanceBefore: params.balanceBefore,
    balanceAfter: params.balanceAfter,
    prevHash,
    hash,
    referenceId: params.referenceId,
    description: params.description,
    timestamp
  });

  return entry;
}

/**
 * Audits and verifies the entire cryptographic ledger chain for an account.
 */
export async function verifyLedgerIntegrity(accountId: string): Promise<{
  valid: boolean;
  totalEntries: number;
  lastSequence?: number;
  error?: string;
}> {
  await connectToDatabase();

  const entries = await LedgerEntryModel.find({ accountId }).sort({ sequence: 1 });
  if (entries.length === 0) {
    return { valid: true, totalEntries: 0 };
  }

  let expectedPrevHash = 'GENESIS_HASH_00000000000000000000000000000000';

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const expectedSequence = i + 1;

    // 1. Verify sequence order
    if (entry.sequence !== expectedSequence) {
      return {
        valid: false,
        totalEntries: entries.length,
        error: `Sequence gap detected at entry ${entry.entryId}: expected ${expectedSequence}, got ${entry.sequence}`
      };
    }

    // 2. Verify previous hash chaining
    if (entry.prevHash !== expectedPrevHash) {
      return {
        valid: false,
        totalEntries: entries.length,
        error: `Hash chain broken at entry ${entry.entryId} (sequence ${entry.sequence}): expected prevHash ${expectedPrevHash}, got ${entry.prevHash}`
      };
    }

    // 3. Recompute hash
    const recomputedHash = calculateEntryHash(
      entry.entryId,
      entry.accountId,
      entry.sequence,
      entry.type,
      entry.amount,
      entry.balanceBefore,
      entry.balanceAfter,
      entry.prevHash,
      entry.timestamp
    );

    if (entry.hash !== recomputedHash) {
      return {
        valid: false,
        totalEntries: entries.length,
        error: `Tampered hash at entry ${entry.entryId}: stored ${entry.hash}, calculated ${recomputedHash}`
      };
    }

    // 4. Verify balance arithmetic consistency
    const calculatedAfter = Number((entry.balanceBefore + entry.amount).toFixed(4));
    const storedAfter = Number(entry.balanceAfter.toFixed(4));
    if (Math.abs(calculatedAfter - storedAfter) > 0.01) {
      return {
        valid: false,
        totalEntries: entries.length,
        error: `Balance arithmetic discrepancy at entry ${entry.entryId}: ${entry.balanceBefore} + ${entry.amount} = ${calculatedAfter}, stored balanceAfter: ${storedAfter}`
      };
    }

    expectedPrevHash = entry.hash;
  }

  return {
    valid: true,
    totalEntries: entries.length,
    lastSequence: entries[entries.length - 1].sequence
  };
}
