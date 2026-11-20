import mongoose, { Schema } from 'mongoose';

export interface ICandle {
  symbol: string;
  interval: string;
  openTime: number; // Unix timestamp in ms
  timestamp: string; // ISO or date string e.g. "2026-05-19" or "2026-05-19 14:00"
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const CandleSchema = new Schema<ICandle>(
  {
    symbol: { type: String, required: true, uppercase: true, index: true },
    interval: { type: String, required: true, default: '1d', index: true },
    openTime: { type: Number, required: true, index: true },
    timestamp: { type: String, required: true },
    open: { type: Number, required: true },
    high: { type: Number, required: true },
    low: { type: Number, required: true },
    close: { type: Number, required: true },
    volume: { type: Number, required: true, default: 0 }
  },
  { timestamps: true }
);

// Compound unique index to prevent duplicate candles for the same symbol + interval + openTime
CandleSchema.index({ symbol: 1, interval: 1, openTime: 1 }, { unique: true });
// Compound index for fast chronological and reverse queries
CandleSchema.index({ symbol: 1, interval: 1, openTime: -1 });

export const CandleModel =
  (mongoose.models.Candle as mongoose.Model<ICandle>) ||
  mongoose.model<ICandle>('Candle', CandleSchema);
