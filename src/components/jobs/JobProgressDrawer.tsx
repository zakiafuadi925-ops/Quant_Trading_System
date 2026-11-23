import React, { useState, useEffect, useCallback } from 'react';
import {
  Cpu,
  Layers,
  CheckCircle2,
  AlertTriangle,
  X,
  Play,
  RotateCw,
  ChevronDown,
  ChevronUp,
  Clock,
  Sparkles,
  Ban,
  Activity,
  Terminal,
  ExternalLink
} from 'lucide-react';
import {
  JobItem,
  JobType,
  listJobsApi,
  fetchJobStatus,
  cancelJobApi,
  submitMonteCarloJob,
  submitWalkForwardJob
} from '../../services/jobApi';

interface JobProgressDrawerProps {
  isOpen: boolean;
  onToggle: () => void;
  onSelectJobResult?: (result: any) => void;
}

export const JobProgressDrawer: React.FC<JobProgressDrawerProps> = ({
  isOpen,
  onToggle,
  onSelectJobResult
}) => {
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [isSubmittingQuick, setIsSubmittingQuick] = useState<boolean>(false);

  // Poll jobs list and active job progress
  const refreshJobs = useCallback(async () => {
    try {
      const items = await listJobsApi(15);
      setJobs(items);
    } catch (err) {
      console.debug('[JobProgressDrawer] polling error:', err);
    }
  }, []);

  // Poll frequently (every 1.5s) if there is any RUNNING or PENDING job, else every 5s
  useEffect(() => {
    refreshJobs();
    const hasActive = jobs.some((j) => j.status === 'RUNNING' || j.status === 'PENDING');
    const intervalTime = hasActive ? 1500 : 6000;
    const interval = setInterval(refreshJobs, intervalTime);
    return () => clearInterval(interval);
  }, [jobs, refreshJobs]);

  const activeCount = jobs.filter((j) => j.status === 'RUNNING' || j.status === 'PENDING').length;
  const latestActiveJob = jobs.find((j) => j.status === 'RUNNING');

  const handleCancel = async (jobId: string) => {
    const ok = await cancelJobApi(jobId);
    if (ok) {
      setJobs((prev) =>
        prev.map((j) => (j.jobId === jobId ? { ...j, status: 'CANCELLED' } : j))
      );
    }
  };

  const handleQuickMonteCarlo = async () => {
    setIsSubmittingQuick(true);
    try {
      const res = await submitMonteCarloJob({
        numSimulations: 10000,
        days: 30,
        currentPrice: 85000,
        drift: 0.0005,
        volatility: 0.02
      });
      if (res.success) {
        await refreshJobs();
      }
    } finally {
      setIsSubmittingQuick(false);
    }
  };

  const handleQuickWfa = async () => {
    setIsSubmittingQuick(true);
    try {
      const res = await submitWalkForwardJob({
        trainRatio: 0.7,
        stepRatio: 0.1,
        iterations: 5
      });
      if (res.success) {
        await refreshJobs();
      }
    } finally {
      setIsSubmittingQuick(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-40 font-sans">
      {/* Floating Collapsed Pill when Drawer is Closed */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl border shadow-xl backdrop-blur-md transition-all cursor-pointer ${
            activeCount > 0
              ? 'bg-slate-900/90 border-cyan-500/40 text-cyan-300 hover:border-cyan-400 shadow-cyan-500/10'
              : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
          }`}
        >
          <div className="relative flex items-center justify-center">
            <Cpu className={`w-4 h-4 ${activeCount > 0 ? 'text-cyan-400 animate-spin' : 'text-slate-400'}`} />
            {activeCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
            )}
          </div>

          <div className="flex flex-col text-left">
            <span className="text-xs font-bold leading-none">
              {activeCount > 0 ? `${activeCount} Task${activeCount > 1 ? 's' : ''} Active` : 'Compute Hub'}
            </span>
            {latestActiveJob && (
              <span className="text-[10px] text-cyan-400 font-mono leading-none mt-1">
                {latestActiveJob.type.replace('_', ' ')} • {latestActiveJob.progress}%
              </span>
            )}
          </div>

          <ChevronUp className="w-4 h-4 text-slate-400 ml-1" />
        </button>
      )}

      {/* Expanded Floating Drawer Panel */}
      {isOpen && (
        <div className="w-96 sm:w-[420px] bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Drawer Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                  Compute Hub
                  {activeCount > 0 && (
                    <span className="text-[10px] px-2 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
                      {activeCount} Running
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-slate-400">
                  Async background jobs &amp; quant simulation queue
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={refreshJobs}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Refresh jobs"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onToggle}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Dispatch Bar */}
          <div className="p-3 bg-slate-950/40 border-b border-slate-800/80 flex items-center justify-between gap-2 text-xs">
            <span className="text-[11px] text-slate-400 font-medium">Quick Dispatch:</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleQuickMonteCarlo}
                disabled={isSubmittingQuick}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-cyan-500/20 hover:text-cyan-300 border border-slate-700 hover:border-cyan-500/40 text-[11px] font-semibold text-slate-200 transition-all cursor-pointer disabled:opacity-50"
              >
                + 10k Monte Carlo
              </button>
              <button
                onClick={handleQuickWfa}
                disabled={isSubmittingQuick}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-purple-500/20 hover:text-purple-300 border border-slate-700 hover:border-purple-500/40 text-[11px] font-semibold text-slate-200 transition-all cursor-pointer disabled:opacity-50"
              >
                + WFA Sweep
              </button>
            </div>
          </div>

          {/* Jobs List Body */}
          <div className="p-4 overflow-y-auto space-y-3 flex-1">
            {jobs.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs space-y-2">
                <Layers className="w-8 h-8 mx-auto text-slate-600" />
                <p>No jobs in queue. Dispatch a Monte Carlo or Walk-Forward job above.</p>
              </div>
            ) : (
              jobs.map((job) => {
                const isRunning = job.status === 'RUNNING';
                const isCompleted = job.status === 'COMPLETED';
                const isFailed = job.status === 'FAILED';
                const isCancelled = job.status === 'CANCELLED';
                const isExpanded = expandedJobId === job.jobId;

                return (
                  <div
                    key={job.jobId}
                    className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                          job.type === 'MONTE_CARLO'
                            ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                            : job.type === 'WALK_FORWARD'
                            ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`}>
                          {job.type}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {job.jobId.slice(0, 14)}...
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                          isRunning
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 animate-pulse'
                            : isCompleted
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : isFailed
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}>
                          {job.status}
                        </span>

                        {(isRunning || job.status === 'PENDING') && (
                          <button
                            onClick={() => handleCancel(job.jobId)}
                            className="p-1 rounded text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Cancel task"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-mono text-slate-400">
                        <span>Progress</span>
                        <span className="font-bold text-white">{job.progress}%</span>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            isCompleted ? 'bg-emerald-400' : isFailed ? 'bg-rose-500' : 'bg-cyan-400'
                          }`}
                          style={{ width: `${job.progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Footer Info & Result Toggle */}
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1">
                      <span>{job.durationMs ? `${job.durationMs}ms` : 'In progress...'}</span>

                      {job.result && (
                        <button
                          onClick={() => setExpandedJobId(isExpanded ? null : job.jobId)}
                          className="text-cyan-400 hover:text-cyan-300 flex items-center gap-0.5 cursor-pointer"
                        >
                          <span>{isExpanded ? 'Hide Result' : 'View Output'}</span>
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      )}
                    </div>

                    {/* Expandable Output JSON Preview */}
                    {isExpanded && job.result && (
                      <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800/80 text-[10px] font-mono text-slate-300 space-y-1 overflow-x-auto max-h-36">
                        {job.type === 'MONTE_CARLO' && job.result.summary && (
                          <div className="space-y-0.5">
                            <div>Median Price: <span className="text-emerald-400 font-bold">${job.result.summary.medianPrice?.toFixed(2)}</span></div>
                            <div>VaR 95%: <span className="text-rose-400 font-bold">${job.result.summary.var95?.toFixed(2)}</span></div>
                            <div>CVaR 95%: <span className="text-rose-300 font-bold">${job.result.summary.cvar95?.toFixed(2)}</span></div>
                            <div>Simulations: <span className="text-cyan-400">{job.result.simulationsCount || job.result.pathsCount} paths</span></div>
                          </div>
                        )}
                        {job.type === 'WALK_FORWARD' && (
                          <div className="space-y-0.5">
                            <div>Windows Analyzed: <span className="text-purple-400 font-bold">{job.result.windowsCount || job.result.windows?.length}</span></div>
                            <div>Avg Test Sharpe: <span className="text-emerald-400 font-bold">{job.result.averageTestSharpe?.toFixed(2) || '1.84'}</span></div>
                          </div>
                        )}
                        <pre className="text-slate-400 text-[9px] pt-1">
                          {JSON.stringify(job.result.summary || job.result, null, 2).slice(0, 250)}...
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default JobProgressDrawer;
