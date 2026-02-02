import { Card, CardContent } from "../../ui";
import { Activity, TrendingUp, Target, Database } from "lucide-react";
import { cn } from "../../../lib/utils";

interface PhysicsModel {
  name: string;
  version: number;
  fittingStats: {
    trajectoryCount: number;
    videoCount: number;
    rmse: number;
    r2Score: number;
    fittedAt: number;
  };
  parameterUncertainties?: {
    dragCoefficient?: number;
    magnusCoefficient?: number;
    hoodAngleBias?: number;
  };
}

interface ConfidenceDisplayProps {
  model: PhysicsModel;
  compact?: boolean;
}

export function ConfidenceDisplay({ model, compact = false }: ConfidenceDisplayProps) {
  const { fittingStats, parameterUncertainties } = model;
  const r2Percent = fittingStats.r2Score * 100;

  // Confidence level classification
  const confidenceLevel =
    r2Percent >= 90
      ? { label: "Excellent", color: "text-accent-success" }
      : r2Percent >= 75
        ? { label: "Good", color: "text-accent" }
        : r2Percent >= 50
          ? { label: "Fair", color: "text-yellow-500" }
          : { label: "Low", color: "text-accent-error" };

  if (compact) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-text-primary flex items-center gap-2">
              <Activity size={14} />
              Model Stats
            </h4>
            <span className={cn("text-xs font-medium", confidenceLevel.color)}>
              {confidenceLevel.label}
            </span>
          </div>

          {/* R² Score */}
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-text-muted">R² Score</span>
              <span className="font-mono text-text-secondary">
                {r2Percent.toFixed(1)}%
              </span>
            </div>
            <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
              <div
                className={cn("h-full transition-all", getR2Color(r2Percent))}
                style={{ width: `${r2Percent}%` }}
              />
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-text-muted">Trajectories:</span>
              <span className="text-text-secondary">{fittingStats.trajectoryCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">RMSE:</span>
              <span className="font-mono text-text-secondary">
                ±{fittingStats.rmse.toFixed(3)}m
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-text-primary">{model.name}</h3>
            <p className="text-sm text-text-muted">Version {model.version}</p>
          </div>
          <div
            className={cn(
              "px-3 py-1 rounded-full text-sm font-medium",
              confidenceLevel.color,
              confidenceLevel.color.replace("text-", "bg-") + "/10"
            )}
          >
            {confidenceLevel.label} Fit
          </div>
        </div>

        {/* Main Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <MetricBox
            icon={<TrendingUp size={18} />}
            label="R² Score"
            value={`${r2Percent.toFixed(1)}%`}
            description="Variance explained"
            color={confidenceLevel.color}
          />
          <MetricBox
            icon={<Target size={18} />}
            label="RMSE"
            value={`±${fittingStats.rmse.toFixed(3)}m`}
            description="Prediction error"
          />
          <MetricBox
            icon={<Database size={18} />}
            label="Trajectories"
            value={fittingStats.trajectoryCount.toString()}
            description={`From ${fittingStats.videoCount} videos`}
          />
          <MetricBox
            icon={<Activity size={18} />}
            label="Last Updated"
            value={formatDate(fittingStats.fittedAt)}
            description="Model fitted"
          />
        </div>

        {/* R² Score Bar */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-text-secondary">Model Fit Quality</span>
            <span className={cn("font-mono", confidenceLevel.color)}>
              {r2Percent.toFixed(1)}%
            </span>
          </div>
          <div className="h-3 bg-bg-tertiary rounded-full overflow-hidden">
            <div
              className={cn("h-full transition-all", getR2Color(r2Percent))}
              style={{ width: `${r2Percent}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-text-muted mt-1">
            <span>Poor</span>
            <span>Fair</span>
            <span>Good</span>
            <span>Excellent</span>
          </div>
        </div>

        {/* Parameter Uncertainties */}
        {parameterUncertainties && (
          <div className="pt-4 border-t border-border-subtle">
            <h4 className="text-sm font-medium text-text-secondary mb-3">
              Parameter Uncertainties (1σ)
            </h4>
            <div className="grid grid-cols-3 gap-4 text-xs">
              {parameterUncertainties.dragCoefficient !== undefined && (
                <UncertaintyBar
                  label="Drag Coeff"
                  uncertainty={parameterUncertainties.dragCoefficient}
                  maxUncertainty={0.1}
                />
              )}
              {parameterUncertainties.magnusCoefficient !== undefined && (
                <UncertaintyBar
                  label="Magnus Coeff"
                  uncertainty={parameterUncertainties.magnusCoefficient}
                  maxUncertainty={0.1}
                />
              )}
              {parameterUncertainties.hoodAngleBias !== undefined && (
                <UncertaintyBar
                  label="Hood Bias"
                  uncertainty={parameterUncertainties.hoodAngleBias}
                  maxUncertainty={5}
                  unit="°"
                />
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface MetricBoxProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  description: string;
  color?: string;
}

function MetricBox({ icon, label, value, description, color }: MetricBoxProps) {
  return (
    <div className="p-3 bg-bg-tertiary rounded-lg">
      <div className="flex items-center gap-2 text-text-muted mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className={cn("text-lg font-semibold", color || "text-text-primary")}>
        {value}
      </p>
      <p className="text-xs text-text-muted">{description}</p>
    </div>
  );
}

interface UncertaintyBarProps {
  label: string;
  uncertainty: number;
  maxUncertainty: number;
  unit?: string;
}

function UncertaintyBar({
  label,
  uncertainty,
  maxUncertainty,
  unit = "",
}: UncertaintyBarProps) {
  const percent = Math.min(100, (uncertainty / maxUncertainty) * 100);
  const isLow = percent < 33;

  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-text-muted">{label}</span>
        <span className={cn("font-mono", isLow ? "text-accent-success" : "text-text-secondary")}>
          ±{uncertainty.toFixed(3)}{unit}
        </span>
      </div>
      <div className="h-1.5 bg-bg-hover rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full",
            isLow ? "bg-accent-success" : percent < 66 ? "bg-yellow-500" : "bg-accent-error"
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function getR2Color(r2Percent: number): string {
  if (r2Percent >= 90) return "bg-accent-success";
  if (r2Percent >= 75) return "bg-accent";
  if (r2Percent >= 50) return "bg-yellow-500";
  return "bg-accent-error";
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
