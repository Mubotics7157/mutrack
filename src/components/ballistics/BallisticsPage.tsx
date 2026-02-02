import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { MemberWithProfile } from "../../lib/members";
import {
  Camera,
  LineChart,
  Settings2,
  Cpu,
  Loader2,
  Activity,
} from "lucide-react";
import { Tabs, Card, CardContent, EmptyState } from "../ui";
import { CameraCalibrationWizard } from "./calibration/CameraCalibrationWizard";
import { ProcessingStatus } from "./processing/ProcessingStatus";
import { TrajectoryViewer3D } from "./viewer3d/TrajectoryViewer3D";
import { ParameterTuner } from "./tuner/ParameterTuner";
import { ConfidenceDisplay } from "./confidence/ConfidenceDisplay";

interface BallisticsPageProps {
  member: MemberWithProfile;
}

type TabId = "viewer" | "tuner" | "calibration" | "processing";

export function BallisticsPage({ member }: BallisticsPageProps) {
  const [activeTab, setActiveTab] = useState<TabId>("viewer");

  // Fetch active physics model
  const activeModel = useQuery(api.physicsModels.getActiveModel, {
    modelType: "drag_magnus",
  });

  // Fetch calibrations
  const calibrations = useQuery(api.calibration.listAllCalibrations, {});

  // Fetch trajectories
  const trajectories = useQuery(api.physicsModels.getTrajectories, {
    validOnly: true,
    limit: 50,
  });

  // Fetch pending jobs (admin only)
  const pendingJobs = useQuery(
    api.mlJobs.listJobs,
    member.role === "admin" ? { status: "pending", limit: 10 } : "skip"
  );

  const tabs = [
    {
      id: "viewer" as const,
      label: "3D Viewer",
      icon: <LineChart size={16} />,
    },
    {
      id: "tuner" as const,
      label: "Parameter Tuner",
      icon: <Settings2 size={16} />,
    },
    {
      id: "calibration" as const,
      label: "Camera Setup",
      icon: <Camera size={16} />,
    },
    ...(member.role === "admin"
      ? [
          {
            id: "processing" as const,
            label: "Processing",
            icon: <Cpu size={16} />,
            badge: pendingJobs?.length || undefined,
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Ballistics Analysis
          </h1>
          <p className="text-text-secondary mt-1">
            3D trajectory analysis and physics simulation
          </p>
        </div>

        {/* Model Status Badge */}
        {activeModel && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-accent/10 rounded-lg">
            <Activity size={14} className="text-accent" />
            <span className="text-sm text-text-secondary">
              Model v{activeModel.version}
            </span>
            <span className="text-xs text-text-muted">
              R² = {(activeModel.fittingStats.r2Score * 100).toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as TabId)}
        variant="underline"
      />

      {/* Content */}
      <div className="space-y-6">
        {activeTab === "viewer" && (
          <ViewerTab
            trajectories={trajectories}
            activeModel={activeModel}
            member={member}
          />
        )}

        {activeTab === "tuner" && (
          <TunerTab activeModel={activeModel} member={member} />
        )}

        {activeTab === "calibration" && (
          <CalibrationTab calibrations={calibrations} member={member} />
        )}

        {activeTab === "processing" && member.role === "admin" && (
          <ProcessingTab pendingJobs={pendingJobs} member={member} />
        )}
      </div>
    </div>
  );
}

interface ViewerTabProps {
  trajectories: any[] | undefined;
  activeModel: any;
  member: MemberWithProfile;
}

function ViewerTab({ trajectories, activeModel, member }: ViewerTabProps) {
  const [selectedTrajectoryId, setSelectedTrajectoryId] = useState<
    string | null
  >(null);

  if (trajectories === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
      </div>
    );
  }

  if (trajectories.length === 0) {
    return (
      <Card>
        <CardContent>
          <EmptyState
            icon={<LineChart />}
            title="No trajectories yet"
            description="Process some videos to extract 3D trajectories and view them here."
          />
        </CardContent>
      </Card>
    );
  }

  const selectedTrajectory = selectedTrajectoryId
    ? trajectories.find((t) => t._id === selectedTrajectoryId)
    : trajectories[0];

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* 3D Viewer */}
      <div className="lg:col-span-2">
        <Card className="h-[500px]">
          <CardContent className="h-full p-0">
            <TrajectoryViewer3D
              trajectoryId={selectedTrajectory?._id}
              showConfidence={true}
            />
          </CardContent>
        </Card>
      </div>

      {/* Trajectory List & Stats */}
      <div className="space-y-4">
        {/* Stats */}
        {activeModel && (
          <ConfidenceDisplay model={activeModel} compact />
        )}

        {/* Trajectory Selector */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-medium text-text-primary mb-3">
              Trajectories ({trajectories.length})
            </h3>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {trajectories.map((traj) => (
                <button
                  key={traj._id}
                  onClick={() => setSelectedTrajectoryId(traj._id)}
                  className={`w-full text-left p-2 rounded-lg transition-colors ${
                    selectedTrajectory?._id === traj._id
                      ? "bg-accent/10 border border-accent/30"
                      : "bg-bg-tertiary hover:bg-bg-hover"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-text-primary">
                      {traj.robot === "alpha" ? "Alpha" : "Beta"}
                    </span>
                    <span className="text-xs text-text-muted">
                      {traj.flywheelRpm} RPM
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-text-muted">
                    <span>{traj.hoodAngle}° hood</span>
                    <span>•</span>
                    <span>
                      {(traj.averageConfidence * 100).toFixed(0)}% conf
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface TunerTabProps {
  activeModel: any;
  member: MemberWithProfile;
}

function TunerTab({ activeModel, member }: TunerTabProps) {
  if (!activeModel) {
    return (
      <Card>
        <CardContent>
          <EmptyState
            icon={<Settings2 />}
            title="No physics model available"
            description="A physics model needs to be trained from trajectory data before you can use the tuner."
          />
        </CardContent>
      </Card>
    );
  }

  return <ParameterTuner model={activeModel} />;
}

interface CalibrationTabProps {
  calibrations: any[] | undefined;
  member: MemberWithProfile;
}

function CalibrationTab({ calibrations, member }: CalibrationTabProps) {
  const [showWizard, setShowWizard] = useState(false);

  if (calibrations === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
      </div>
    );
  }

  if (showWizard) {
    return <CameraCalibrationWizard onClose={() => setShowWizard(false)} />;
  }

  return (
    <div className="space-y-6">
      {/* Add Calibration Button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowWizard(true)}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
        >
          <Camera size={16} />
          New Calibration
        </button>
      </div>

      {/* Calibrations List */}
      {calibrations.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={<Camera />}
              title="No camera calibrations"
              description="Calibrate your camera for accurate 3D trajectory reconstruction."
              action={
                <button
                  onClick={() => setShowWizard(true)}
                  className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
                >
                  Start Calibration
                </button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {calibrations.map((cal) => (
            <Card key={cal._id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-medium text-text-primary">
                      {cal.deviceName || cal.deviceId}
                    </h3>
                    <p className="text-xs text-text-muted">
                      {cal.imageWidth}×{cal.imageHeight}
                    </p>
                  </div>
                  <Camera size={16} className="text-text-muted" />
                </div>
                <div className="space-y-1 text-sm text-text-secondary">
                  <div className="flex justify-between">
                    <span>Focal length:</span>
                    <span>{cal.fx?.toFixed(0) || "N/A"}</span>
                  </div>
                  {cal.reprojectionError && (
                    <div className="flex justify-between">
                      <span>Error:</span>
                      <span>{cal.reprojectionError.toFixed(3)} px</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-text-muted mt-3">
                  By {cal.calibratedBy} •{" "}
                  {new Date(cal.calibratedAt).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

interface ProcessingTabProps {
  pendingJobs: any[] | undefined;
  member: MemberWithProfile;
}

function ProcessingTab({ pendingJobs, member }: ProcessingTabProps) {
  return <ProcessingStatus />;
}
