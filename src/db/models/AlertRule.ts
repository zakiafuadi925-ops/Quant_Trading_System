import mongoose, { Schema } from 'mongoose';

export interface IAlertRule {
  ruleId: string;
  name: string;
  type: string;
  symbol: string;
  enabled: boolean;
  channels: string[];
  threshold?: number;
  direction?: string;
  cooldownMinutes: number;
  lastTriggeredTimestamp?: number;
}

const AlertRuleSchema = new Schema<IAlertRule>(
  {
    ruleId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    type: { type: String, required: true },
    symbol: { type: String, required: true, uppercase: true },
    enabled: { type: Boolean, default: true },
    channels: [{ type: String }],
    threshold: { type: Number },
    direction: { type: String },
    cooldownMinutes: { type: Number, default: 15 },
    lastTriggeredTimestamp: { type: Number }
  },
  { timestamps: true }
);

export const AlertRuleModel =
  (mongoose.models.AlertRule as mongoose.Model<IAlertRule>) ||
  mongoose.model<IAlertRule>('AlertRule', AlertRuleSchema);
