import mongoose, { Schema } from 'mongoose';

export interface IPaperPosition {
  positionId: string;
  accountId: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  markPrice: number;
  quantity: number;
  notionalValue: number;
  leverage: number;
  initialMargin: number;
  maintenanceMargin: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  liquidationPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  trailingStopDistance?: number;
  highestPriceSinceEntry?: number;
  lowestPriceSinceEntry?: number;
  totalFundingPaid: number;
  openTimestamp: number;
}

const PaperPositionSchema = new Schema<IPaperPosition>(
  {
    positionId: { type: String, required: true, unique: true },
    accountId: { type: String, required: true, default: 'default_account', index: true },
    symbol: { type: String, required: true, uppercase: true },
    side: { type: String, enum: ['LONG', 'SHORT'], required: true },
    entryPrice: { type: Number, required: true },
    markPrice: { type: Number, required: true },
    quantity: { type: Number, required: true },
    notionalValue: { type: Number, required: true },
    leverage: { type: Number, required: true, default: 1 },
    initialMargin: { type: Number, required: true },
    maintenanceMargin: { type: Number, required: true },
    unrealizedPnl: { type: Number, default: 0 },
    unrealizedPnlPct: { type: Number, default: 0 },
    liquidationPrice: { type: Number, required: true },
    stopLoss: { type: Number },
    takeProfit: { type: Number },
    trailingStopDistance: { type: Number },
    highestPriceSinceEntry: { type: Number },
    lowestPriceSinceEntry: { type: Number },
    totalFundingPaid: { type: Number, default: 0 },
    openTimestamp: { type: Number, default: Date.now }
  },
  { timestamps: true }
);

export const PaperPositionModel =
  (mongoose.models.PaperPosition as mongoose.Model<IPaperPosition>) ||
  mongoose.model<IPaperPosition>('PaperPosition', PaperPositionSchema);
