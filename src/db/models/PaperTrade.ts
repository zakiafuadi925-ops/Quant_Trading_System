import mongoose, { Schema } from 'mongoose';

export interface IPaperTrade {
  tradeId: string;
  orderId: string;
  accountId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  positionSide: 'LONG' | 'SHORT';
  executedPrice: number;
  quantity: number;
  notional: number;
  leverage: number;
  realizedPnl: number;
  fee: number;
  reason: string;
  timestamp: number;
}

const PaperTradeSchema = new Schema<IPaperTrade>(
  {
    tradeId: { type: String, required: true, unique: true },
    orderId: { type: String, required: true },
    accountId: { type: String, required: true, default: 'default_account', index: true },
    symbol: { type: String, required: true, uppercase: true },
    side: { type: String, enum: ['BUY', 'SELL'], required: true },
    positionSide: { type: String, enum: ['LONG', 'SHORT'], required: true },
    executedPrice: { type: Number, required: true },
    quantity: { type: Number, required: true },
    notional: { type: Number, required: true },
    leverage: { type: Number, required: true, default: 1 },
    realizedPnl: { type: Number, required: true },
    fee: { type: Number, default: 0 },
    reason: { type: String, required: true },
    timestamp: { type: Number, default: Date.now }
  },
  { timestamps: true }
);

export const PaperTradeModel =
  (mongoose.models.PaperTrade as mongoose.Model<IPaperTrade>) ||
  mongoose.model<IPaperTrade>('PaperTrade', PaperTradeSchema);
