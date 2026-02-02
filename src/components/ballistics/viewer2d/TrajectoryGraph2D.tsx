import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Play, Pause, SkipBack, SkipForward, Loader2 } from "lucide-react";
import { cn } from "../../../lib/utils";

interface TrajectoryGraph2DProps {
  videoId?: string;
  trajectoryId?: string;
}

export function TrajectoryGraph2D({
  videoId,
  trajectoryId,
}: TrajectoryGraph2DProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [showOverlay, setShowOverlay] = useState(true);

  // Fetch trajectory
  const trajectory = useQuery(
    api.physicsModels.getTrajectory,
    trajectoryId ? { trajectoryId: trajectoryId as any } : "skip"
  );

  // Parse positions
  const positions = useMemo(() => {
    if (!trajectory?.positions) return [];
    try {
      return JSON.parse(trajectory.positions);
    } catch {
      return [];
    }
  }, [trajectory?.positions]);

  // Draw overlay on canvas
  useEffect(() => {
    if (!canvasRef.current || !videoRef.current || !showOverlay) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Match canvas size to video
    canvas.width = video.videoWidth || video.clientWidth;
    canvas.height = video.videoHeight || video.clientHeight;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (positions.length === 0) return;

    // Find positions near current frame
    const frameRate = trajectory?.video?.frameRate || 30;
    const currentTime = currentFrame / frameRate;

    // Draw trajectory path
    ctx.beginPath();
    ctx.strokeStyle = "rgba(102, 126, 234, 0.6)";
    ctx.lineWidth = 2;

    positions.forEach((pos: any, i: number) => {
      // Project 3D to 2D (simplified - uses original detection positions)
      // In a real implementation, you'd project using camera intrinsics
      const x = canvas.width * 0.1 + (pos.x / 10) * canvas.width * 0.8;
      const y = canvas.height * 0.9 - (pos.y / 5) * canvas.height * 0.8;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Draw current position marker
    const currentPos = positions.find(
      (p: any) => Math.abs(p.time - currentTime) < 0.02
    );
    if (currentPos) {
      const x = canvas.width * 0.1 + (currentPos.x / 10) * canvas.width * 0.8;
      const y = canvas.height * 0.9 - (currentPos.y / 5) * canvas.height * 0.8;

      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(246, 173, 85, 0.9)";
      ctx.fill();
      ctx.strokeStyle = "white";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Confidence indicator
      const conf = currentPos.confidence || 0.5;
      ctx.font = "12px monospace";
      ctx.fillStyle = "white";
      ctx.fillText(`${(conf * 100).toFixed(0)}%`, x + 12, y + 4);
    }

    // Draw position markers for all frames
    positions.forEach((pos: any) => {
      const x = canvas.width * 0.1 + (pos.x / 10) * canvas.width * 0.8;
      const y = canvas.height * 0.9 - (pos.y / 5) * canvas.height * 0.8;

      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = getConfidenceColor(pos.confidence || 0.5);
      ctx.fill();
    });
  }, [positions, currentFrame, showOverlay, trajectory]);

  // Sync frame with video time
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const frameRate = trajectory?.video?.frameRate || 30;
      setCurrentFrame(Math.floor(video.currentTime * frameRate));
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    return () => video.removeEventListener("timeupdate", handleTimeUpdate);
  }, [trajectory?.video?.frameRate]);

  const togglePlayback = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const stepFrame = (direction: number) => {
    if (!videoRef.current) return;
    const frameRate = trajectory?.video?.frameRate || 30;
    videoRef.current.currentTime += direction / frameRate;
  };

  if (!videoId && !trajectoryId) {
    return (
      <div className="w-full h-full flex items-center justify-center text-text-muted">
        Select a video or trajectory
      </div>
    );
  }

  if (trajectory === undefined) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Video with Canvas Overlay */}
      <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
        {trajectory?.videoUrl ? (
          <>
            <video
              ref={videoRef}
              src={trajectory.videoUrl}
              className="w-full h-full object-contain"
              onEnded={() => setIsPlaying(false)}
              playsInline
            />
            <canvas
              ref={canvasRef}
              className={cn(
                "absolute inset-0 pointer-events-none",
                !showOverlay && "hidden"
              )}
            />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text-muted">
            No video available
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => stepFrame(-1)}
            className="p-2 text-text-muted hover:text-text-primary rounded-lg hover:bg-bg-hover"
          >
            <SkipBack size={18} />
          </button>
          <button
            onClick={togglePlayback}
            className="p-2 bg-accent text-white rounded-lg hover:bg-accent/90"
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <button
            onClick={() => stepFrame(1)}
            className="p-2 text-text-muted hover:text-text-primary rounded-lg hover:bg-bg-hover"
          >
            <SkipForward size={18} />
          </button>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm text-text-muted">
            Frame: {currentFrame}
          </span>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showOverlay}
              onChange={(e) => setShowOverlay(e.target.checked)}
              className="accent-accent"
            />
            <span className="text-text-secondary">Show overlay</span>
          </label>
        </div>
      </div>

      {/* Trajectory Info */}
      {trajectory && (
        <div className="grid grid-cols-4 gap-3 text-center">
          <InfoBox
            label="Launch Angle"
            value={`${trajectory.launchAngle?.toFixed(1) ?? "—"}°`}
          />
          <InfoBox
            label="Launch Speed"
            value={`${trajectory.launchSpeed?.toFixed(1) ?? "—"} m/s`}
          />
          <InfoBox
            label="Max Height"
            value={`${trajectory.maxHeight?.toFixed(2) ?? "—"} m`}
          />
          <InfoBox
            label="Distance"
            value={`${trajectory.horizontalDistance?.toFixed(2) ?? "—"} m`}
          />
        </div>
      )}
    </div>
  );
}

interface InfoBoxProps {
  label: string;
  value: string;
}

function InfoBox({ label, value }: InfoBoxProps) {
  return (
    <div className="p-2 bg-bg-tertiary rounded-lg">
      <p className="text-xs text-text-muted">{label}</p>
      <p className="text-sm font-medium text-text-primary">{value}</p>
    </div>
  );
}

function getConfidenceColor(confidence: number): string {
  if (confidence > 0.8) return "rgba(72, 187, 120, 0.8)";
  if (confidence > 0.5) return "rgba(236, 201, 75, 0.8)";
  return "rgba(245, 101, 101, 0.8)";
}
