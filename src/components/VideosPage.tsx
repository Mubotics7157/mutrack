import { useState, useRef, type ChangeEvent } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { MemberWithProfile } from "../lib/members";
import {
  Video,
  Upload,
  Play,
  Trash2,
  Settings2,
  X,
  Loader2,
  ArrowLeft,
  Film,
} from "lucide-react";
import {
  Button,
  Input,
  Select,
  EmptyState,
  Tabs,
  Card,
  CardContent,
} from "./ui";
import { cn } from "../lib/utils";
import { VideoTrimmer } from "./VideoTrimmer";

interface VideosPageProps {
  member: MemberWithProfile;
}

type RobotFilter = "all" | "alpha" | "beta";

export function VideosPage({ member }: VideosPageProps) {
  const [robotFilter, setRobotFilter] = useState<RobotFilter>("all");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const videos = useQuery(
    api.shootingVideos.listVideos,
    robotFilter === "all" ? {} : { robot: robotFilter }
  );

  const tabs = [
    { id: "all" as const, label: "All Robots" },
    { id: "alpha" as const, label: "Alpha" },
    { id: "beta" as const, label: "Beta" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Shooting Videos
          </h1>
          <p className="text-text-secondary mt-1">
            Video database for ballistics tuning
          </p>
        </div>
        <Button
          variant="primary"
          icon={<Upload size={18} />}
          onClick={() => setIsUploadModalOpen(true)}
        >
          Upload Video
        </Button>
      </div>

      {/* Filter Tabs */}
      <Tabs
        tabs={tabs}
        activeTab={robotFilter}
        onTabChange={(id) => setRobotFilter(id as RobotFilter)}
        variant="segment"
      />

      {/* Videos Grid */}
      {videos === undefined ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-accent animate-spin" />
        </div>
      ) : videos.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={<Video />}
              title="No videos yet"
              description={
                robotFilter === "all"
                  ? "Upload your first shooting video to start building the database."
                  : `No videos for ${robotFilter === "alpha" ? "Alpha" : "Beta"} robot yet.`
              }
              action={
                <Button
                  variant="primary"
                  icon={<Upload size={16} />}
                  onClick={() => setIsUploadModalOpen(true)}
                >
                  Upload Video
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => (
            <VideoCard key={video._id} video={video} currentMember={member} />
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <UploadModal onClose={() => setIsUploadModalOpen(false)} />
      )}
    </div>
  );
}

interface VideoCardProps {
  video: {
    _id: string;
    videoUrl: string | null;
    robot: "alpha" | "beta";
    flywheelRpm: number;
    hoodAngle: number;
    notes?: string;
    uploaderName: string;
    uploadedAt: number;
    frameRate?: number;
    duration?: number;
    resolution?: string;
  };
  currentMember: MemberWithProfile;
}

function VideoCard({ video, currentMember }: VideoCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const deleteVideo = useMutation(api.shootingVideos.deleteVideo);

  const handleDelete = async () => {
    if (!confirm("Delete this video? This cannot be undone.")) return;
    setIsDeleting(true);
    try {
      await deleteVideo({ videoId: video._id as any });
      toast.success("Video deleted");
    } catch {
      toast.error("Failed to delete video");
    } finally {
      setIsDeleting(false);
    }
  };

  const canDelete =
    currentMember.role === "admin" || currentMember.role === "lead";

  return (
    <Card className="overflow-hidden">
      {/* Video Preview */}
      <div className="relative aspect-video bg-bg-tertiary">
        {video.videoUrl ? (
          <>
            <video
              ref={videoRef}
              src={video.videoUrl}
              className="w-full h-full object-cover"
              onEnded={() => setIsPlaying(false)}
              controls={isPlaying}
              playsInline
            />
            {!isPlaying && (
              <button
                onClick={() => {
                  setIsPlaying(true);
                  videoRef.current?.play();
                }}
                className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
              >
                <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center">
                  <Play size={24} className="text-bg-primary ml-1" />
                </div>
              </button>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text-muted">
            <Video size={32} />
          </div>
        )}

        {/* Robot Badge */}
        <div
          className={cn(
            "absolute top-2 left-2 px-2 py-1 rounded text-xs font-medium",
            video.robot === "alpha"
              ? "bg-blue-500/90 text-white"
              : "bg-purple-500/90 text-white"
          )}
        >
          {video.robot === "alpha" ? "Alpha" : "Beta"}
        </div>
      </div>

      {/* Info */}
      <CardContent className="p-4 space-y-3">
        {/* Settings */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-text-secondary">
            <Settings2 size={14} className="text-text-muted" />
            <span className="font-medium">{video.flywheelRpm}</span>
            <span className="text-text-muted">RPM</span>
          </div>
          <div className="flex items-center gap-1.5 text-text-secondary">
            <span className="font-medium">{video.hoodAngle}°</span>
            <span className="text-text-muted">hood</span>
          </div>
        </div>

        {/* Video metadata */}
        {(video.frameRate || video.duration) && (
          <div className="flex items-center gap-3 text-xs text-text-muted">
            {video.frameRate && (
              <span className="text-accent">{video.frameRate.toFixed(0)} fps</span>
            )}
            {video.duration && (
              <span>{video.duration.toFixed(1)}s</span>
            )}
            {video.resolution && (
              <span>{video.resolution}</span>
            )}
          </div>
        )}

        {/* Notes */}
        {video.notes && (
          <p className="text-sm text-text-secondary line-clamp-2">
            {video.notes}
          </p>
        )}

        {/* Meta */}
        <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
          <div className="text-xs text-text-muted">
            <span>{video.uploaderName}</span>
            <span className="mx-1">·</span>
            <span>
              {new Date(video.uploadedAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
          {canDelete && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-1.5 text-text-muted hover:text-accent-error transition-colors rounded"
            >
              {isDeleting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Trash2 size={14} />
              )}
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface UploadModalProps {
  onClose: () => void;
}

interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  frameRate: number | null;
  clipStart?: number;
  clipEnd?: number;
}

type UploadStep = "select" | "trim" | "details";

function UploadModal({ onClose }: UploadModalProps) {
  const [step, setStep] = useState<UploadStep>("select");
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [trimmedFile, setTrimmedFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [robot, setRobot] = useState<"alpha" | "beta">("alpha");
  const [flywheelRpm, setFlywheelRpm] = useState("");
  const [hoodAngle, setHoodAngle] = useState("");
  const [notes, setNotes] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateUploadUrl = useMutation(api.shootingVideos.generateUploadUrl);
  const createVideo = useMutation(api.shootingVideos.createVideo);

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("video/")) {
      toast.error("Please select a video file");
      return;
    }
    setOriginalFile(file);
    setStep("trim");
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) handleFileSelect(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileSelect(droppedFile);
  };

  const handleTrimComplete = (file: File, meta: VideoMetadata) => {
    setTrimmedFile(file);
    setMetadata(meta);
    setStep("details");
  };

  const handleBack = () => {
    if (step === "trim") {
      setOriginalFile(null);
      setStep("select");
    } else if (step === "details") {
      setTrimmedFile(null);
      setStep("trim");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const fileToUpload = trimmedFile || originalFile;
    if (!fileToUpload) {
      toast.error("Please select a video");
      return;
    }

    const rpm = parseInt(flywheelRpm);
    const angle = parseFloat(hoodAngle);

    if (isNaN(rpm) || rpm <= 0) {
      toast.error("Enter a valid flywheel RPM");
      return;
    }

    if (isNaN(angle)) {
      toast.error("Enter a valid hood angle");
      return;
    }

    setIsUploading(true);
    setUploadProgress(5);

    try {
      // Step 1: Get upload URL from Convex
      const uploadUrl = await generateUploadUrl();
      setUploadProgress(10);

      // Step 2: Upload file with progress tracking using XMLHttpRequest
      const { storageId } = await new Promise<{ storageId: string }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            // Map upload progress to 10-80% range
            const percent = 10 + Math.round((event.loaded / event.total) * 70);
            setUploadProgress(percent);
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const json = JSON.parse(xhr.responseText);
              resolve(json);
            } catch {
              reject(new Error("Invalid response from server"));
            }
          } else {
            reject(new Error(`Upload failed: ${xhr.status}`));
          }
        });

        xhr.addEventListener("error", () => {
          reject(new Error("Network error during upload"));
        });

        xhr.addEventListener("timeout", () => {
          reject(new Error("Upload timed out"));
        });

        xhr.open("POST", uploadUrl);
        xhr.setRequestHeader("Content-Type", fileToUpload.type);
        xhr.timeout = 5 * 60 * 1000; // 5 minute timeout
        xhr.send(fileToUpload);
      });

      setUploadProgress(85);

      if (!storageId) {
        throw new Error("No storageId returned from upload");
      }

      // Step 3: Create video record in database
      await createVideo({
        videoStorageId: storageId,
        robot,
        flywheelRpm: rpm,
        hoodAngle: angle,
        notes: notes.trim() || undefined,
        fileSize: fileToUpload.size,
        mimeType: fileToUpload.type,
        frameRate: metadata?.frameRate || undefined,
        duration: metadata?.duration || undefined,
        resolution: metadata ? `${metadata.width}x${metadata.height}` : undefined,
        clipStart: metadata?.clipStart,
        clipEnd: metadata?.clipEnd,
      });

      setUploadProgress(100);
      toast.success("Video uploaded successfully");
      onClose();
    } catch (error) {
      console.error("Video upload error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to upload video");
    } finally {
      setIsUploading(false);
    }
  };

  const stepTitles: Record<UploadStep, string> = {
    select: "Select Video",
    trim: "Trim Clip",
    details: "Shot Details",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={step === "select" ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-bg-secondary border border-border rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle sticky top-0 bg-bg-secondary z-10">
          <div className="flex items-center gap-3">
            {step !== "select" && (
              <button
                onClick={handleBack}
                className="p-1.5 text-text-muted hover:text-text-primary transition-colors rounded-lg hover:bg-bg-hover"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <h2 className="text-lg font-semibold text-text-primary">
              {stepTitles[step]}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-text-muted hover:text-text-primary transition-colors rounded-lg hover:bg-bg-hover"
          >
            <X size={20} />
          </button>
        </div>

        {/* Step Progress */}
        <div className="px-6 py-3 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            {(["select", "trim", "details"] as UploadStep[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors",
                    step === s
                      ? "bg-accent text-white"
                      : (["select", "trim", "details"].indexOf(step) > i)
                        ? "bg-accent/20 text-accent"
                        : "bg-bg-tertiary text-text-muted"
                  )}
                >
                  {i + 1}
                </div>
                {i < 2 && (
                  <div
                    className={cn(
                      "flex-1 h-0.5 rounded",
                      (["select", "trim", "details"].indexOf(step) > i)
                        ? "bg-accent/40"
                        : "bg-bg-tertiary"
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* Step 1: Select Video */}
          {step === "select" && (
            <div className="space-y-4">
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border-subtle rounded-xl p-10 text-center cursor-pointer hover:border-accent hover:bg-bg-tertiary/50 transition-colors"
              >
                <Film size={40} className="mx-auto mb-4 text-text-muted" />
                <p className="text-base text-text-secondary mb-2">
                  Drop video here or click to browse
                </p>
                <p className="text-sm text-text-muted">
                  Any length - you'll trim it in the next step
                </p>
                <p className="text-xs text-text-muted mt-2">
                  Supports MP4, MOV, WebM, and more
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="flex justify-end">
                <Button variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Trim Video */}
          {step === "trim" && originalFile && (
            <VideoTrimmer
              file={originalFile}
              onTrimComplete={handleTrimComplete}
              onCancel={handleBack}
            />
          )}

          {/* Step 3: Details Form */}
          {step === "details" && (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Trimmed Video Preview */}
              {trimmedFile && (
                <div className="bg-bg-tertiary rounded-lg p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-accent/20 flex items-center justify-center">
                    <Video size={20} className="text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-text-primary truncate">
                        {trimmedFile.name}
                      </p>
                      {trimmedFile.name.includes("_trimmed") && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/20 text-accent font-medium">
                          Trimmed
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text-muted">
                      {(trimmedFile.size / (1024 * 1024)).toFixed(1)} MB
                      {metadata?.duration && ` · ${metadata.duration.toFixed(1)}s`}
                      {metadata?.frameRate && ` · ${metadata.frameRate.toFixed(0)} fps`}
                    </p>
                  </div>
                </div>
              )}

              {/* Robot Selection */}
              <Select
                label="Robot"
                value={robot}
                onChange={(e) => setRobot(e.target.value as "alpha" | "beta")}
                options={[
                  { value: "alpha", label: "Alpha" },
                  { value: "beta", label: "Beta" },
                ]}
              />

              {/* Settings Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Flywheel RPM
                  </label>
                  <Input
                    type="number"
                    value={flywheelRpm}
                    onChange={(e) => setFlywheelRpm(e.target.value)}
                    placeholder="e.g. 4500"
                    min="0"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Hood Angle (°)
                  </label>
                  <Input
                    type="number"
                    value={hoodAngle}
                    onChange={(e) => setHoodAngle(e.target.value)}
                    placeholder="e.g. 45"
                    step="0.1"
                    required
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Notes (optional)
                </label>
                <Input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Shot from back of field, 2-ball auto"
                />
              </div>

              {/* Upload Progress */}
              {isUploading && (
                <div className="space-y-2">
                  <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-text-muted text-center">
                    Uploading... {uploadProgress}%
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1"
                  disabled={isUploading}
                  loading={isUploading}
                >
                  Upload Video
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleBack}
                  disabled={isUploading}
                >
                  Back
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
