import mongoose, { Schema } from 'mongoose';

export type LedgerEntryType =
  | 'INITIAL_DEPOSIT'
  | 'ORDER_EXECUTION'
  | 'FEE_DEDUCTION'
  | 'FUNDING_PAYMENT'
  | 'POSITION_CLOSE'
  | 'LIQUIDATION'
  | 'ACCOUNT_RESET';

export interface ILedgerEntry {
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

const LedgerEntrySchema = new Schema<ILedgerEntry>(
  {
    entryId: { type: String, required: true, unique: true, index: true },
    accountId: { type: String, required: true, index: true },
    sequence: { type: Number, required: true, index: true },
    type: {
      type: String,
      enum: [
        'INITIAL_DEPOSIT',
        'ORDER_EXECUTION',
        'FEE_DEDUCTION',
        'FUNDING_PAYMENT',
        'POSITION_CLOSE',
        'LIQUIDATION',
        'ACCOUNT_RESET'
      ],
      required: true
    },
    amount: { type: Number, required: true },
    balanceBefore: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    prevHash: { type: String, required: true },
    hash: { type: String, required: true },
    referenceId: { type: String },
    description: { type: String, required: true },
    timestamp: { type: Number, default: Date.now }
  },
  { timestamps: true }
);

LedgerEntrySchema.index({ accountId: 1, sequence: 1 }, { unique: true });

export const LedgerEntryModel =
  (mongoose.models.LedgerEntry as mongoose.Model<ILedgerEntry>) ||
  mongoose.model<ILedgerEntry>('LedgerEntry', LedgerEntrySchema);
