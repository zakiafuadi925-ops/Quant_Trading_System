/**
 * Client-Side API Service for Asynchronous Heavy Computing Jobs
 *
 * Communicates with /api/jobs/* to enqueue, poll, and cancel background tasks.
 */

export type JobType = 'MONTE_CARLO' | 'WALK_FORWARD' | 'BACKTEST';
export type JobStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface JobItem {
  jobId: string;
  type: JobType;
  status: JobStatus;
  progress: number;
  result?: any;
  error?: string;
  durationMs?: number;
  completedAt?: string;
  createdAt?: string;
}

export async function submitMonteCarloJob(
  params: {
    numSimulations?: number;
    days?: number;
    currentPrice?: number;
    drift?: number;
    volatility?: number;
  }
): Promise<{ success: boolean; jobId?: string; message?: string }> {
  try {
    const res = await fetch('/api/jobs/monte-carlo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err?.message || 'Failed to submit Monte Carlo job' };
  }
}

export async function submitWalkForwardJob(
  params: {
    trainRatio?: number;
    stepRatio?: number;
    iterations?: number;
    candles?: any[];
  }
): Promise<{ success: boolean; jobId?: string; message?: string }> {
  try {
    const res = await fetch('/api/jobs/walk-forward', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err?.message || 'Failed to submit Walk-Forward job' };
  }
}

export async function submitBacktestJob(
  params: {
    symbol?: string;
    timeframe?: string;
    initialCapital?: number;
  }
): Promise<{ success: boolean; jobId?: string; message?: string }> {
  try {
    const res = await fetch('/api/jobs/backtest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err?.message || 'Failed to submit Backtest job' };
  }
}

export async function fetchJobStatus(jobId: string): Promise<JobItem | null> {
  try {
    const res = await fetch(`/api/jobs/${jobId}/status`);
    if (!res.ok) return null;
    const data = await res.json();
    return data;
  } catch (err) {
    console.debug(`[jobApi] fetchJobStatus failed for ${jobId}:`, err);
    return null;
  }
}

export async function cancelJobApi(jobId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/jobs/${jobId}/cancel`, { method: 'POST' });
    const data = await res.json();
    return Boolean(data.success);
  } catch (err) {
    console.debug(`[jobApi] cancelJobApi failed for ${jobId}:`, err);
    return false;
  }
}

export async function listJobsApi(limit: number = 10): Promise<JobItem[]> {
  try {
    const res = await fetch(`/api/jobs?limit=${limit}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.jobs || [];
  } catch (err) {
    console.debug('[jobApi] listJobsApi failed:', err);
    return [];
  }
}
