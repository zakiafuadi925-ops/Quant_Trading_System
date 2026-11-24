/**
 * Client-Side API Service for Immutable Financial Ledger Operations
 *
 * Communicates with /api/paper/ledger/* to inspect and cryptographically audit
 * chained transaction records.
 */

export type LedgerEntryType =
  | 'INITIAL_DEPOSIT'
  | 'TRADE_PROFIT'
  | 'TRADE_LOSS'
  | 'FEE_DEDUCTION'
  | 'FUNDING_PAYMENT'
  | 'ORDER_MARGIN_LOCK'
  | 'ORDER_MARGIN_RELEASE'
  | 'MANUAL_ADJUSTMENT';

export interface LedgerEntryItem {
  entryId: string;
  accountId: string;
  sequence: number;
  type: LedgerEntryType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  prevHash: string;
  hash: string;
  referenceId?: string;
  description: string;
  timestamp: number;
}

export interface LedgerAuditResult {
  valid: boolean;
  verifiedEntries: number;
  failedAtSequence?: number;
  error?: string;
}

export async function fetchAccountLedger(
  authFetch?: (url: string, init?: RequestInit) => Promise<Response>,
  accountId?: string,
  limit: number = 50
): Promise<{ count: number; entries: LedgerEntryItem[] }> {
  try {
    const fetcher = authFetch || fetch;
    const url = accountId
      ? `/api/paper/ledger/${accountId}?limit=${limit}`
      : `/api/paper/ledger?limit=${limit}`;

    const res = await fetcher(url);
    if (!res.ok) return { count: 0, entries: [] };
    const data = await res.json();
    return { count: data.count || 0, entries: data.entries || [] };
  } catch (err) {
    console.debug('[ledgerApi] fetchAccountLedger error:', err);
    return { count: 0, entries: [] };
  }
}

export async function verifyLedgerChain(
  authFetch?: (url: string, init?: RequestInit) => Promise<Response>,
  accountId?: string
): Promise<LedgerAuditResult> {
  try {
    const fetcher = authFetch || fetch;
    const url = accountId
      ? `/api/paper/ledger/verify/${accountId}`
      : `/api/paper/ledger/verify`;

    const res = await fetcher(url);
    if (!res.ok) {
      return { valid: false, verifiedEntries: 0, error: 'Network request failed' };
    }
    const data = await res.json();
    return data.audit || { valid: false, verifiedEntries: 0 };
  } catch (err: any) {
    return { valid: false, verifiedEntries: 0, error: err?.message || 'Verification error' };
  }
}
