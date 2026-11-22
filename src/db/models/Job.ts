import mongoose, { Schema } from 'mongoose';

export type JobType = 'MONTE_CARLO' | 'WALK_FORWARD' | 'BACKTEST';
export type JobStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface IJob {
  jobId: string;
  type: JobType;
  status: JobStatus;
  progress: number;
  params: Record<string, any>;
  result: Record<string, any> | null;
  error: string | null;
  durationMs: number | null;
  startedAt: number | null;
  completedAt: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const JobSchema = new Schema<IJob>(
  {
    jobId: { type: String, required: true, unique: true, index: true },
    type: { type: String, enum: ['MONTE_CARLO', 'WALK_FORWARD', 'BACKTEST'], required: true },
    status: {
      type: String,
      enum: ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'],
      default: 'PENDING',
      index: true
    },
    progress: { type: Number, default: 0 },
    params: { type: Schema.Types.Mixed, default: {} },
    result: { type: Schema.Types.Mixed, default: null },
    error: { type: String, default: null },
    durationMs: { type: Number, default: null },
    startedAt: { type: Number, default: null },
    completedAt: { type: Number, default: null }
  },
  { timestamps: true }
);

export const JobModel =
  (mongoose.models.Job as mongoose.Model<IJob>) ||
  mongoose.model<IJob>('Job', JobSchema);
