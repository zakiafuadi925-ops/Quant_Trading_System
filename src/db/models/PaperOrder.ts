import mongoose, { Schema } from 'mongoose';

export interface IPaperOrder {
  orderId: string;
  accountId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT';
  positionSide: 'LONG' | 'SHORT';
  price: number;
  quantity: number;
  leverage: number;
  status: 'PENDING' | 'FILLED' | 'CANCELLED' | 'REJECTED';
  stopLoss?: number;
  takeProfit?: number;
  trailingStopDistance?: number;
  fee: number;
  slippage: number;
  timestamp: number;
}

const PaperOrderSchema = new Schema<IPaperOrder>(
  {
    orderId: { type: String, required: true, unique: true },
    accountId: { type: String, required: true, default: 'default_account', index: true },
    symbol: { type: String, required: true, uppercase: true },
    side: { type: String, enum: ['BUY', 'SELL'], required: true },
    type: { type: String, enum: ['MARKET', 'LIMIT'], required: true },
    positionSide: { type: String, enum: ['LONG', 'SHORT'], required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
    leverage: { type: Number, required: true, default: 1 },
    status: { type: String, enum: ['PENDING', 'FILLED', 'CANCELLED', 'REJECTED'], required: true },
    stopLoss: { type: Number },
    takeProfit: { type: Number },
    trailingStopDistance: { type: Number },
    fee: { type: Number, default: 0 },
    slippage: { type: Number, default: 0 },
    timestamp: { type: Number, default: Date.now }
  },
  { timestamps: true }
);

export const PaperOrderModel =
  (mongoose.models.PaperOrder as mongoose.Model<IPaperOrder>) ||
  mongoose.model<IPaperOrder>('PaperOrder', PaperOrderSchema);
