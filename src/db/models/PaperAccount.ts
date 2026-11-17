import mongoose, { Schema } from 'mongoose';

export interface IPaperAccount {
  accountId: string;
  initialBalance: number;
  balance: number;
  equity: number;
  totalFeesPaid: number;
  totalRealizedPnl: number;
  lastFundingTimestamp: number;
  updatedAt?: Date;
}

const PaperAccountSchema = new Schema<IPaperAccount>(
  {
    accountId: { type: String, required: true, unique: true, default: 'default_account' },
    initialBalance: { type: Number, required: true, default: 10000 },
    balance: { type: Number, required: true, default: 10000 },
    equity: { type: Number, required: true, default: 10000 },
    totalFeesPaid: { type: Number, default: 0 },
    totalRealizedPnl: { type: Number, default: 0 },
    lastFundingTimestamp: { type: Number, default: Date.now }
  },
  { timestamps: true }
);

export const PaperAccountModel =
  (mongoose.models.PaperAccount as mongoose.Model<IPaperAccount>) ||
  mongoose.model<IPaperAccount>('PaperAccount', PaperAccountSchema);
