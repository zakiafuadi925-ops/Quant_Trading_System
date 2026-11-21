import mongoose, { Schema } from 'mongoose';

export interface IUser {
  userId: string;
  email: string;
  name: string;
  passwordHash: string;
  salt: string;
  role: 'trader' | 'admin';
  lastLoginAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const UserSchema = new Schema<IUser>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    salt: { type: String, required: true },
    role: { type: String, enum: ['trader', 'admin'], default: 'trader' },
    lastLoginAt: { type: Date }
  },
  { timestamps: true }
);

export const UserModel =
  (mongoose.models.User as mongoose.Model<IUser>) ||
  mongoose.model<IUser>('User', UserSchema);
