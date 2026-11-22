import mongoose, { Schema } from 'mongoose';

export type SupportedExchange = 'binance' | 'bybit' | 'okx';

export interface IApiKeyVault {
  keyId: string;
  userId: string;
  exchange: SupportedExchange;
  label: string;
  encryptedApiKey: string;
  encryptedApiSecret: string;
  encryptedPassphrase?: string;
  maskedKey: string;
  isTestnet: boolean;
  isActive: boolean;
  lastTestedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const ApiKeyVaultSchema = new Schema<IApiKeyVault>(
  {
    keyId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    exchange: { type: String, enum: ['binance', 'bybit', 'okx'], required: true },
    label: { type: String, required: true },
    encryptedApiKey: { type: String, required: true },
    encryptedApiSecret: { type: String, required: true },
    encryptedPassphrase: { type: String },
    maskedKey: { type: String, required: true },
    isTestnet: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    lastTestedAt: { type: Date }
  },
  { timestamps: true }
);

ApiKeyVaultSchema.index({ userId: 1, exchange: 1 });

export const ApiKeyVaultModel =
  (mongoose.models.ApiKeyVault as mongoose.Model<IApiKeyVault>) ||
  mongoose.model<IApiKeyVault>('ApiKeyVault', ApiKeyVaultSchema);
