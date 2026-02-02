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
  Filter,
  X,
  Loader2,
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

function UploadModal({ onClose }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [robot, setRobot] = useState<"alpha" | "beta">("alpha");
  const [flywheelRpm, setFlywheelRpm] = useState("");
  const [hoodAngle, setHoodAngle] = useState("");
  const [notes, setNotes] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateUploadUrl = useMutation(api.shootingVideos.generateUploadUrl);
  const createVideo = useMutation(api.shootingVideos.createVideo);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.type.startsWith("video/")) {
      toast.error("Please select a video file");
      return;
    }

    // 100MB limit
    const MAX_SIZE = 100 * 1024 * 1024;
    if (selectedFile.size > MAX_SIZE) {
      toast.error("Video must be under 100 MB");
      return;
    }

    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (!droppedFile) return;

    if (!droppedFile.type.startsWith("video/")) {
      toast.error("Please drop a video file");
      return;
    }

    const MAX_SIZE = 100 * 1024 * 1024;
    if (droppedFile.size > MAX_SIZE) {
      toast.error("Video must be under 100 MB");
      return;
    }

    setFile(droppedFile);
    setPreviewUrl(URL.createObjectURL(droppedFile));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
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
    setUploadProgress(10);

    try {
      // Get upload URL
      const uploadUrl = await generateUploadUrl();
      setUploadProgress(20);

      // Upload file
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!response.ok) throw new Error("Upload failed");

      setUploadProgress(80);

      const { storageId } = (await response.json()) as { storageId: string };

      // Create video record
      await createVideo({
        videoStorageId: storageId as any,
        robot,
        flywheelRpm: rpm,
        hoodAngle: angle,
        notes: notes.trim() || undefined,
        fileSize: file.size,
        mimeType: file.type,
      });

      setUploadProgress(100);
      toast.success("Video uploaded successfully");
      onClose();
    } catch {
      toast.error("Failed to upload video");
    } finally {
      setIsUploading(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-bg-secondary border border-border rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle sticky top-0 bg-bg-secondary z-10">
          <h2 className="text-lg font-semibold text-text-primary">
            Upload Shooting Video
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-text-muted hover:text-text-primary transition-colors rounded-lg hover:bg-bg-hover"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Video Drop Zone */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Video File
            </label>
            {!file ? (
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border-subtle rounded-xl p-8 text-center cursor-pointer hover:border-accent hover:bg-bg-tertiary/50 transition-colors"
              >
                <Upload
                  size={32}
                  className="mx-auto mb-3 text-text-muted"
                />
                <p className="text-sm text-text-secondary mb-1">
                  Drop video here or click to browse
                </p>
                <p className="text-xs text-text-muted">
                  MP4, MOV, or WebM up to 100 MB
                </p>
              </div>
            ) : (
              <div className="relative rounded-xl overflow-hidden bg-bg-tertiary">
                <video
                  src={previewUrl || undefined}
                  className="w-full aspect-video object-cover"
                  controls
                  playsInline
                />
                <button
                  type="button"
                  onClick={clearFile}
                  className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 rounded-lg text-white transition-colors"
                >
                  <X size={16} />
                </button>
                <div className="p-3 border-t border-border-subtle">
                  <p className="text-sm text-text-secondary truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-text-muted">
                    {(file.size / (1024 * 1024)).toFixed(1)} MB
                  </p>
                </div>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

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
              disabled={!file || isUploading}
              loading={isUploading}
            >
              Upload Video
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isUploading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
