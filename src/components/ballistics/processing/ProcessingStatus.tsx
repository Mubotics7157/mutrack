import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { toast } from "sonner";
import {
  Cpu,
  Play,
  Pause,
  RefreshCw,
  XCircle,
  CheckCircle,
  Clock,
  Loader2,
  Server,
  AlertTriangle,
} from "lucide-react";
import { Button, Card, CardContent, EmptyState } from "../../ui";
import { cn } from "../../../lib/utils";

export function ProcessingStatus() {
  const [selectedStatus, setSelectedStatus] = useState<
    "all" | "pending" | "processing" | "completed" | "failed"
  >("all");

  // Fetch jobs
  const jobs = useQuery(
    api.mlJobs.listJobs,
    selectedStatus === "all" ? { limit: 50 } : { status: selectedStatus, limit: 50 }
  );

  // Fetch workers
  const workers = useQuery(api.mlWorkers.listWorkers, {});

  // Mutations
  const cancelJob = useMutation(api.mlJobs.cancelJob);
  const retryJob = useMutation(api.mlJobs.retryJob);

  const handleCancel = async (jobId: string) => {
    try {
      await cancelJob({ jobId: jobId as any });
      toast.success("Job cancelled");
    } catch (err) {
      toast.error("Failed to cancel job");
    }
  };

  const handleRetry = async (jobId: string) => {
    try {
      await retryJob({ jobId: jobId as any });
      toast.success("Job queued for retry");
    } catch (err) {
      toast.error("Failed to retry job");
    }
  };

  const statusCounts = {
    pending: jobs?.filter((j) => j.status === "pending").length || 0,
    processing: jobs?.filter((j) => j.status === "processing").length || 0,
    completed: jobs?.filter((j) => j.status === "completed").length || 0,
    failed: jobs?.filter((j) => j.status === "failed").length || 0,
  };

  return (
    <div className="space-y-6">
      {/* Workers Status */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-text-primary flex items-center gap-2">
              <Server size={16} />
              ML Workers
            </h3>
            {workers && (
              <span className="text-xs text-text-muted">
                {workers.filter((w) => w.isOnline).length} / {workers.length}{" "}
                online
              </span>
            )}
          </div>

          {workers === undefined ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 text-accent animate-spin" />
            </div>
          ) : workers.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-4">
              No workers registered
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {workers.map((worker) => (
                <div
                  key={worker._id}
                  className={cn(
                    "p-3 rounded-lg border",
                    worker.isOnline
                      ? "bg-accent-success/5 border-accent-success/30"
                      : "bg-bg-tertiary border-border-subtle"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-text-primary text-sm">
                      {worker.name}
                    </span>
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full",
                        worker.isOnline ? "bg-accent-success" : "bg-text-muted"
                      )}
                    />
                  </div>
                  <div className="text-xs text-text-muted space-y-1">
                    <div className="flex justify-between">
                      <span>Jobs completed:</span>
                      <span>{worker.jobsCompleted}</span>
                    </div>
                    {worker.currentJobId && (
                      <div className="flex items-center gap-1 text-accent">
                        <Loader2 size={10} className="animate-spin" />
                        <span>Processing...</span>
                      </div>
                    )}
                    {worker.metadata?.gpuModel && (
                      <div className="flex justify-between">
                        <span>GPU:</span>
                        <span>{worker.metadata.gpuModel}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Filter */}
      <div className="flex gap-2 flex-wrap">
        <StatusButton
          label="All"
          count={jobs?.length || 0}
          active={selectedStatus === "all"}
          onClick={() => setSelectedStatus("all")}
        />
        <StatusButton
          label="Pending"
          count={statusCounts.pending}
          active={selectedStatus === "pending"}
          onClick={() => setSelectedStatus("pending")}
          icon={<Clock size={14} />}
          color="text-yellow-500"
        />
        <StatusButton
          label="Processing"
          count={statusCounts.processing}
          active={selectedStatus === "processing"}
          onClick={() => setSelectedStatus("processing")}
          icon={<Loader2 size={14} className="animate-spin" />}
          color="text-blue-500"
        />
        <StatusButton
          label="Completed"
          count={statusCounts.completed}
          active={selectedStatus === "completed"}
          onClick={() => setSelectedStatus("completed")}
          icon={<CheckCircle size={14} />}
          color="text-accent-success"
        />
        <StatusButton
          label="Failed"
          count={statusCounts.failed}
          active={selectedStatus === "failed"}
          onClick={() => setSelectedStatus("failed")}
          icon={<XCircle size={14} />}
          color="text-accent-error"
        />
      </div>

      {/* Jobs List */}
      {jobs === undefined ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 text-accent animate-spin" />
        </div>
      ) : jobs.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={<Cpu />}
              title="No processing jobs"
              description="Jobs will appear here when videos are submitted for analysis."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <JobCard
              key={job._id}
              job={job}
              onCancel={handleCancel}
              onRetry={handleRetry}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface StatusButtonProps {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  color?: string;
}

function StatusButton({
  label,
  count,
  active,
  onClick,
  icon,
  color,
}: StatusButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
        active
          ? "bg-accent text-white"
          : "bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
      )}
    >
      {icon && <span className={active ? "text-white" : color}>{icon}</span>}
      <span>{label}</span>
      <span
        className={cn(
          "text-xs px-1.5 py-0.5 rounded",
          active ? "bg-white/20" : "bg-bg-hover"
        )}
      >
        {count}
      </span>
    </button>
  );
}

interface JobCardProps {
  job: {
    _id: string;
    videoId: string;
    type: "trajectory_detection" | "parameter_fitting";
    status: "pending" | "processing" | "completed" | "failed";
    progress: number;
    progressMessage?: string;
    createdAt: number;
    startedAt?: number;
    completedAt?: number;
    workerId?: string;
    errorMessage?: string;
  };
  onCancel: (jobId: string) => void;
  onRetry: (jobId: string) => void;
}

function JobCard({ job, onCancel, onRetry }: JobCardProps) {
  const statusIcons = {
    pending: <Clock size={16} className="text-yellow-500" />,
    processing: <Loader2 size={16} className="text-blue-500 animate-spin" />,
    completed: <CheckCircle size={16} className="text-accent-success" />,
    failed: <XCircle size={16} className="text-accent-error" />,
  };

  const statusColors = {
    pending: "border-yellow-500/30 bg-yellow-500/5",
    processing: "border-blue-500/30 bg-blue-500/5",
    completed: "border-accent-success/30 bg-accent-success/5",
    failed: "border-accent-error/30 bg-accent-error/5",
  };

  return (
    <Card className={cn("border", statusColors[job.status])}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {statusIcons[job.status]}
            <div>
              <p className="font-medium text-text-primary">
                {job.type === "trajectory_detection"
                  ? "Trajectory Detection"
                  : "Parameter Fitting"}
              </p>
              <p className="text-xs text-text-muted">
                Video: {job.videoId.slice(-8)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {job.status === "pending" && (
              <button
                onClick={() => onCancel(job._id)}
                className="p-1.5 text-text-muted hover:text-accent-error rounded transition-colors"
                title="Cancel"
              >
                <XCircle size={16} />
              </button>
            )}
            {job.status === "failed" && (
              <button
                onClick={() => onRetry(job._id)}
                className="p-1.5 text-text-muted hover:text-accent rounded transition-colors"
                title="Retry"
              >
                <RefreshCw size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {job.status === "processing" && (
          <div className="space-y-2">
            <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
              <div
                className="h-full bg-accent transition-all duration-300"
                style={{ width: `${job.progress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-text-muted">
              <span>{job.progressMessage || "Processing..."}</span>
              <span>{job.progress}%</span>
            </div>
          </div>
        )}

        {/* Error Message */}
        {job.status === "failed" && job.errorMessage && (
          <div className="flex items-start gap-2 p-2 bg-accent-error/10 rounded text-sm">
            <AlertTriangle size={14} className="text-accent-error mt-0.5" />
            <span className="text-accent-error">{job.errorMessage}</span>
          </div>
        )}

        {/* Timestamps */}
        <div className="flex items-center gap-4 mt-3 text-xs text-text-muted">
          <span>Created: {formatTime(job.createdAt)}</span>
          {job.startedAt && <span>Started: {formatTime(job.startedAt)}</span>}
          {job.completedAt && (
            <span>
              {job.status === "completed" ? "Completed" : "Ended"}:{" "}
              {formatTime(job.completedAt)}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}
