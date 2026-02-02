import { useState, useMemo, useCallback } from "react";
import { Card, CardContent } from "../../ui";
import { Settings2, Play, RotateCcw, Info } from "lucide-react";
import { cn } from "../../../lib/utils";

interface PhysicsModel {
  _id: string;
  name: string;
  version: number;
  parameters: {
    dragCoefficient?: number;
    magnusCoefficient?: number;
    spinRatio?: number;
    ballMass?: number;
    ballDiameter?: number;
    hoodAngleBias?: number;
  };
  fittingStats: {
    rmse: number;
    r2Score: number;
  };
}

interface ParameterTunerProps {
  model: PhysicsModel;
}

export function ParameterTuner({ model }: ParameterTunerProps) {
  // Shooter parameters
  const [flywheelRpm, setFlywheelRpm] = useState(4500);
  const [hoodAngle, setHoodAngle] = useState(45);

  // Simulated trajectory
  const trajectory = useMemo(() => {
    return simulateTrajectory(flywheelRpm, hoodAngle, model.parameters);
  }, [flywheelRpm, hoodAngle, model.parameters]);

  const resetToDefaults = () => {
    setFlywheelRpm(4500);
    setHoodAngle(45);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Controls */}
      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-text-primary flex items-center gap-2">
              <Settings2 size={18} />
              Shooter Parameters
            </h3>
            <button
              onClick={resetToDefaults}
              className="text-xs text-text-muted hover:text-text-secondary flex items-center gap-1"
            >
              <RotateCcw size={12} />
              Reset
            </button>
          </div>

          {/* Flywheel RPM */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm text-text-secondary">
                Flywheel RPM
              </label>
              <span className="text-sm font-mono text-accent">{flywheelRpm}</span>
            </div>
            <input
              type="range"
              min={2000}
              max={7000}
              step={100}
              value={flywheelRpm}
              onChange={(e) => setFlywheelRpm(parseInt(e.target.value))}
              className="w-full accent-accent"
            />
            <div className="flex justify-between text-xs text-text-muted">
              <span>2000</span>
              <span>7000</span>
            </div>
          </div>

          {/* Hood Angle */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm text-text-secondary">
                Hood Angle (°)
              </label>
              <span className="text-sm font-mono text-accent">{hoodAngle}°</span>
            </div>
            <input
              type="range"
              min={20}
              max={70}
              step={1}
              value={hoodAngle}
              onChange={(e) => setHoodAngle(parseInt(e.target.value))}
              className="w-full accent-accent"
            />
            <div className="flex justify-between text-xs text-text-muted">
              <span>20°</span>
              <span>70°</span>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="space-y-2">
            <label className="text-sm text-text-secondary">Quick Presets</label>
            <div className="flex flex-wrap gap-2">
              <PresetButton
                label="Close Shot"
                onClick={() => {
                  setFlywheelRpm(3500);
                  setHoodAngle(55);
                }}
              />
              <PresetButton
                label="Mid Range"
                onClick={() => {
                  setFlywheelRpm(4500);
                  setHoodAngle(45);
                }}
              />
              <PresetButton
                label="Long Shot"
                onClick={() => {
                  setFlywheelRpm(5500);
                  setHoodAngle(35);
                }}
              />
            </div>
          </div>

          {/* Model Parameters (read-only) */}
          <div className="pt-4 border-t border-border-subtle">
            <div className="flex items-center gap-2 mb-3">
              <Info size={14} className="text-text-muted" />
              <span className="text-sm text-text-muted">
                Model v{model.version} Parameters
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <ParamDisplay
                label="Drag Coefficient"
                value={model.parameters.dragCoefficient}
                unit="Cd"
              />
              <ParamDisplay
                label="Magnus Coefficient"
                value={model.parameters.magnusCoefficient}
                unit="Cm"
              />
              <ParamDisplay
                label="Spin Ratio"
                value={model.parameters.spinRatio}
                unit=""
              />
              <ParamDisplay
                label="Hood Bias"
                value={model.parameters.hoodAngleBias}
                unit="°"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="space-y-4">
        {/* Trajectory Metrics */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-medium text-text-primary mb-4">
              Predicted Trajectory
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <MetricCard
                label="Launch Speed"
                value={trajectory.launchSpeed.toFixed(1)}
                unit="m/s"
              />
              <MetricCard
                label="Launch Angle"
                value={trajectory.launchAngle.toFixed(1)}
                unit="°"
              />
              <MetricCard
                label="Max Height"
                value={trajectory.maxHeight.toFixed(2)}
                unit="m"
              />
              <MetricCard
                label="Distance"
                value={trajectory.horizontalDistance.toFixed(2)}
                unit="m"
              />
              <MetricCard
                label="Flight Time"
                value={trajectory.flightTime.toFixed(2)}
                unit="s"
              />
              <MetricCard
                label="Ball Spin"
                value={(flywheelRpm * (model.parameters.spinRatio || 0.5)).toFixed(0)}
                unit="RPM"
              />
            </div>
          </CardContent>
        </Card>

        {/* 2D Trajectory Preview */}
        <Card>
          <CardContent className="p-4">
            <h4 className="text-sm font-medium text-text-primary mb-3">
              Side View
            </h4>
            <TrajectoryPreview2D trajectory={trajectory} />
          </CardContent>
        </Card>

        {/* Model Confidence */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Model Accuracy</span>
              <span className="font-mono text-accent">
                R² = {(model.fittingStats.r2Score * 100).toFixed(1)}%
              </span>
            </div>
            <div className="mt-2 h-2 bg-bg-tertiary rounded-full overflow-hidden">
              <div
                className="h-full bg-accent"
                style={{ width: `${model.fittingStats.r2Score * 100}%` }}
              />
            </div>
            <p className="text-xs text-text-muted mt-2">
              RMSE: ±{model.fittingStats.rmse.toFixed(3)}m
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface PresetButtonProps {
  label: string;
  onClick: () => void;
}

function PresetButton({ label, onClick }: PresetButtonProps) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 text-xs font-medium bg-bg-tertiary text-text-secondary rounded-lg hover:bg-bg-hover transition-colors"
    >
      {label}
    </button>
  );
}

interface ParamDisplayProps {
  label: string;
  value?: number;
  unit: string;
}

function ParamDisplay({ label, value, unit }: ParamDisplayProps) {
  return (
    <div className="flex justify-between">
      <span className="text-text-muted">{label}:</span>
      <span className="font-mono text-text-secondary">
        {value?.toFixed(3) ?? "—"} {unit}
      </span>
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  unit: string;
}

function MetricCard({ label, value, unit }: MetricCardProps) {
  return (
    <div className="p-3 bg-bg-tertiary rounded-lg">
      <p className="text-xs text-text-muted mb-1">{label}</p>
      <p className="text-lg font-semibold text-text-primary">
        {value}
        <span className="text-sm font-normal text-text-muted ml-1">{unit}</span>
      </p>
    </div>
  );
}

interface TrajectoryResult {
  launchSpeed: number;
  launchAngle: number;
  maxHeight: number;
  horizontalDistance: number;
  flightTime: number;
  positions: Array<{ x: number; y: number }>;
}

function simulateTrajectory(
  rpm: number,
  angle: number,
  params: PhysicsModel["parameters"]
): TrajectoryResult {
  // Simple physics simulation
  const Cd = params.dragCoefficient ?? 0.47;
  const Cm = params.magnusCoefficient ?? 0.15;
  const mass = params.ballMass ?? 0.27;
  const diameter = params.ballDiameter ?? 0.24;
  const angleBias = params.hoodAngleBias ?? 0;

  // Convert RPM to launch speed (simplified model)
  const flywheelRadius = 0.05;
  const efficiency = 0.8;
  const omega = (rpm * 2 * Math.PI) / 60;
  const launchSpeed = omega * flywheelRadius * efficiency;

  const effectiveAngle = angle + angleBias;
  const theta = (effectiveAngle * Math.PI) / 180;

  // Simulation
  const dt = 0.001;
  const g = 9.81;
  const rho = 1.225;
  const area = Math.PI * (diameter / 2) ** 2;

  let x = 0;
  let y = 0.5; // Start height
  let vx = launchSpeed * Math.cos(theta);
  let vy = launchSpeed * Math.sin(theta);

  const positions: Array<{ x: number; y: number }> = [];
  let maxHeight = y;
  let t = 0;

  while (y >= 0 && t < 3) {
    positions.push({ x, y });

    const v = Math.sqrt(vx ** 2 + vy ** 2);
    if (v < 0.01) break;

    // Drag force
    const drag = 0.5 * rho * Cd * area * v ** 2;
    const dragAx = (-drag * vx) / v / mass;
    const dragAy = (-drag * vy) / v / mass;

    // Magnus lift (simplified)
    const magnusLift = 0.5 * rho * Cm * area * v * rpm * 0.1;
    const magnusAy = magnusLift / mass;

    // Update velocity
    vx += dragAx * dt;
    vy += (-g + dragAy + magnusAy) * dt;

    // Update position
    x += vx * dt;
    y += vy * dt;

    if (y > maxHeight) maxHeight = y;
    t += dt;
  }

  return {
    launchSpeed,
    launchAngle: effectiveAngle,
    maxHeight,
    horizontalDistance: x,
    flightTime: t,
    positions: positions.filter((_, i) => i % 10 === 0), // Downsample
  };
}

interface TrajectoryPreview2DProps {
  trajectory: TrajectoryResult;
}

function TrajectoryPreview2D({ trajectory }: TrajectoryPreview2DProps) {
  const { positions, maxHeight, horizontalDistance } = trajectory;

  // SVG dimensions
  const width = 400;
  const height = 150;
  const padding = 20;

  // Scale factors
  const xScale = (width - 2 * padding) / (horizontalDistance || 1);
  const yScale = (height - 2 * padding) / (maxHeight * 1.2 || 1);

  // Build path
  const pathData = positions
    .map((p, i) => {
      const x = padding + p.x * xScale;
      const y = height - padding - p.y * yScale;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-auto"
      style={{ maxHeight: "150px" }}
    >
      {/* Ground line */}
      <line
        x1={padding}
        y1={height - padding}
        x2={width - padding}
        y2={height - padding}
        stroke="currentColor"
        strokeOpacity={0.2}
        strokeDasharray="4 4"
      />

      {/* Trajectory path */}
      <path
        d={pathData}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        className="text-accent"
      />

      {/* Start point */}
      <circle
        cx={padding}
        cy={height - padding - 0.5 * yScale}
        r={4}
        className="fill-accent"
      />

      {/* Max height marker */}
      <line
        x1={padding}
        y1={height - padding - maxHeight * yScale}
        x2={width - padding}
        y2={height - padding - maxHeight * yScale}
        stroke="currentColor"
        strokeOpacity={0.1}
        strokeDasharray="2 2"
      />

      {/* Labels */}
      <text
        x={padding}
        y={height - 5}
        fontSize={10}
        fill="currentColor"
        fillOpacity={0.5}
      >
        0m
      </text>
      <text
        x={width - padding}
        y={height - 5}
        fontSize={10}
        fill="currentColor"
        fillOpacity={0.5}
        textAnchor="end"
      >
        {horizontalDistance.toFixed(1)}m
      </text>
      <text
        x={5}
        y={height - padding - maxHeight * yScale}
        fontSize={10}
        fill="currentColor"
        fillOpacity={0.5}
      >
        {maxHeight.toFixed(1)}m
      </text>
    </svg>
  );
}
