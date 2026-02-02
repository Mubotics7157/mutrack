import { useState, useRef, useEffect, useCallback } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Check,
  Scissors,
} from "lucide-react";
import { Button } from "./ui";
import { cn } from "../lib/utils";

interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  frameRate: number | null;
  clipStart?: number;
  clipEnd?: number;
}

interface VideoTrimmerProps {
  file: File;
  onTrimComplete: (file: File, metadata: VideoMetadata) => void;
  onCancel: () => void;
}

export function VideoTrimmer({ file, onTrimComplete, onCancel }: VideoTrimmerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [detectedFrameRate, setDetectedFrameRate] = useState<number | null>(null);
  const [manualFrameRate, setManualFrameRate] = useState<string>("");
  const [resolution, setResolution] = useState<{ width: number; height: number } | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [isDragging, setIsDragging] = useState<"start" | "end" | null>(null);
  const [isTrimming, setIsTrimming] = useState(false);
  const [trimProgress, setTrimProgress] = useState(0);

  // Create video URL on mount
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setVideoError(null);
    setIsVideoLoading(true);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Extract metadata when video loads
  const handleVideoLoaded = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    setIsVideoLoading(false);
    setVideoError(null);

    const dur = video.duration;
    if (!isFinite(dur) || dur <= 0) {
      setVideoError("Could not determine video duration");
      return;
    }

    setDuration(dur);
    setEndTime(dur);
    setResolution({ width: video.videoWidth, height: video.videoHeight });

    // Try to detect frame rate
    if ("captureStream" in video) {
      try {
        const stream = (video as any).captureStream();
        const tracks = stream.getVideoTracks();
        if (tracks.length > 0) {
          const settings = tracks[0].getSettings();
          if (settings.frameRate) {
            setDetectedFrameRate(settings.frameRate);
          }
          tracks.forEach((track: MediaStreamTrack) => track.stop());
        }
      } catch {
        // Ignore
      }
    }
  }, []);

  const handleVideoError = useCallback(() => {
    setIsVideoLoading(false);
    setVideoError("Could not load video preview. You can still continue.");
  }, []);

  // Time update handler
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (video.currentTime >= endTime) {
        video.pause();
        video.currentTime = startTime;
        setIsPlaying(false);
      }
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    return () => video.removeEventListener("timeupdate", handleTimeUpdate);
  }, [startTime, endTime]);

  // Drag handling for timeline (mouse + touch)
  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (clientX: number) => {
      const timeline = timelineRef.current;
      if (!timeline) return;

      const rect = timeline.getBoundingClientRect();
      const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const time = percent * duration;

      if (isDragging === "start") {
        setStartTime(Math.min(time, endTime - 0.1));
      } else {
        setEndTime(Math.max(time, startTime + 0.1));
      }
    };

    const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handleMove(e.touches[0].clientX);
      }
    };

    const handleEnd = () => setIsDragging(null);

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleEnd);
    document.addEventListener("touchmove", handleTouchMove);
    document.addEventListener("touchend", handleEnd);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleEnd);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleEnd);
    };
  }, [isDragging, duration, startTime, endTime]);

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      if (video.currentTime < startTime || video.currentTime >= endTime) {
        video.currentTime = startTime;
      }
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (time: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = time;
    setCurrentTime(time);
  };

  const nudgeTime = (type: "start" | "end", delta: number) => {
    if (type === "start") {
      const newStart = Math.max(0, Math.min(startTime + delta, endTime - 0.1));
      setStartTime(newStart);
      if (currentTime < newStart) handleSeek(newStart);
    } else {
      const newEnd = Math.min(duration, Math.max(endTime + delta, startTime + 0.1));
      setEndTime(newEnd);
      if (currentTime > newEnd) handleSeek(newEnd);
    }
  };

  const resetTrim = () => {
    setStartTime(0);
    setEndTime(duration);
    handleSeek(0);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
  };

  const clipDuration = endTime - startTime;
  const hasClip = startTime > 0 || endTime < duration;

  // Trim the video using MediaRecorder
  const trimVideo = useCallback(async (): Promise<File> => {
    const video = videoRef.current;
    if (!video) throw new Error("Video element not available");

    return new Promise((resolve, reject) => {
      // Create a canvas for rendering
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      // Create canvas stream for video
      const canvasStream = canvas.captureStream(30); // 30 fps for recording

      // Try to get audio from the video
      let combinedStream: MediaStream;
      try {
        const videoStream = (video as any).captureStream();
        const audioTracks = videoStream.getAudioTracks();
        if (audioTracks.length > 0) {
          // Combine canvas video with original audio
          combinedStream = new MediaStream([
            ...canvasStream.getVideoTracks(),
            ...audioTracks,
          ]);
        } else {
          combinedStream = canvasStream;
        }
      } catch {
        combinedStream = canvasStream;
      }

      // Choose best available codec
      let mimeType = "video/webm;codecs=vp9";
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "video/webm;codecs=vp8";
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = "video/webm";
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = "video/mp4";
          }
        }
      }

      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 8000000, // 8 Mbps for good quality
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onerror = (e) => {
        reject(new Error("MediaRecorder error: " + e));
      };

      mediaRecorder.onstop = () => {
        // Stop all tracks
        combinedStream.getTracks().forEach((track) => track.stop());
        canvasStream.getTracks().forEach((track) => track.stop());

        const blob = new Blob(chunks, { type: mimeType.split(";")[0] });
        const extension = mimeType.includes("mp4") ? "mp4" : "webm";
        const baseName = file.name.replace(/\.[^/.]+$/, "");
        const trimmedFile = new File([blob], `${baseName}_trimmed.${extension}`, {
          type: mimeType.split(";")[0],
        });
        resolve(trimmedFile);
      };

      // Animation loop to draw video frames to canvas
      let animationId: number;
      const drawFrame = () => {
        if (video.paused || video.ended || video.currentTime >= endTime) {
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        animationId = requestAnimationFrame(drawFrame);
      };

      // Progress tracking
      const updateProgress = () => {
        if (video.currentTime >= endTime) return;
        const elapsed = video.currentTime - startTime;
        const total = endTime - startTime;
        setTrimProgress(Math.min(99, Math.round((elapsed / total) * 100)));
      };
      const progressInterval = setInterval(updateProgress, 100);

      // Handle video ending or reaching end time
      const handleTimeUpdate = () => {
        if (video.currentTime >= endTime - 0.05) {
          video.pause();
          cancelAnimationFrame(animationId);
          clearInterval(progressInterval);
          setTrimProgress(100);
          // Small delay to ensure last frames are captured
          setTimeout(() => {
            mediaRecorder.stop();
          }, 100);
          video.removeEventListener("timeupdate", handleTimeUpdate);
        }
      };

      // Seek to start and begin recording
      video.currentTime = startTime;
      video.onseeked = () => {
        video.onseeked = null;
        mediaRecorder.start(100); // Collect data every 100ms
        drawFrame();
        video.addEventListener("timeupdate", handleTimeUpdate);
        video.play().catch(reject);
      };
    });
  }, [file, startTime, endTime]);

  const handleContinue = async () => {
    const fps = manualFrameRate ? parseFloat(manualFrameRate) : detectedFrameRate;

    let fileToUse = file;
    let trimmedDuration = duration;

    // Actually trim the video if user has marked a clip
    if (hasClip) {
      setIsTrimming(true);
      setTrimProgress(0);
      try {
        fileToUse = await trimVideo();
        trimmedDuration = endTime - startTime;
      } catch (error) {
        console.error("Failed to trim video:", error);
        // Fall back to uploading original with metadata
        fileToUse = file;
      } finally {
        setIsTrimming(false);
      }
    }

    onTrimComplete(fileToUse, {
      duration: trimmedDuration,
      width: resolution?.width || 0,
      height: resolution?.height || 0,
      frameRate: fps && isFinite(fps) ? fps : null,
      // Only include clip times if we failed to trim (fallback)
      clipStart: fileToUse === file && hasClip ? startTime : undefined,
      clipEnd: fileToUse === file && hasClip ? endTime : undefined,
    });
  };

  if (!videoUrl) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Video Preview */}
      <div className="relative bg-black rounded-lg overflow-hidden min-h-[180px]">
        {isVideoLoading && !videoError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-white" />
          </div>
        )}

        {videoError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
            <AlertCircle className="w-8 h-8 text-yellow-400 mb-2" />
            <p className="text-sm text-yellow-400">{videoError}</p>
          </div>
        )}

        <video
          ref={videoRef}
          src={videoUrl}
          className={cn(
            "w-full max-h-[250px] object-contain",
            (isVideoLoading || videoError) && "invisible"
          )}
          onLoadedMetadata={handleVideoLoaded}
          onError={handleVideoError}
          onCanPlay={() => setIsVideoLoading(false)}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          playsInline
          preload="metadata"
        />

        {!isVideoLoading && !videoError && (
          <button
            onClick={togglePlayPause}
            className="absolute inset-0 flex items-center justify-center bg-black/0 active:bg-black/20 transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center">
              {isPlaying ? (
                <Pause size={20} className="text-white" />
              ) : (
                <Play size={20} className="text-white ml-0.5" />
              )}
            </div>
          </button>
        )}
      </div>

      {/* Metadata & Framerate */}
      {!videoError && duration > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
          {resolution && (
            <span className="text-text-muted">{resolution.width}x{resolution.height}</span>
          )}
          <span className="text-text-muted">{formatTime(duration)} total</span>
          <div className="flex items-center gap-2">
            <span className="text-text-muted">FPS:</span>
            <input
              type="number"
              value={manualFrameRate || (detectedFrameRate?.toFixed(0) ?? "")}
              onChange={(e) => setManualFrameRate(e.target.value)}
              placeholder={detectedFrameRate ? `${detectedFrameRate.toFixed(0)}` : "240"}
              className="w-16 px-2 py-1 text-xs bg-bg-tertiary border border-border rounded text-text-primary"
            />
          </div>
        </div>
      )}

      {/* Timeline */}
      {!videoError && duration > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-secondary">Mark the shot</span>
            {hasClip && (
              <button
                onClick={resetTrim}
                className="text-xs text-text-muted hover:text-text-primary flex items-center gap-1"
              >
                <RotateCcw size={12} />
                Reset
              </button>
            )}
          </div>

          {/* Visual Timeline */}
          <div
            ref={timelineRef}
            className="relative h-12 bg-bg-tertiary rounded-lg overflow-hidden touch-none select-none"
          >
            {/* Selected Range */}
            <div
              className="absolute top-0 bottom-0 bg-accent/30"
              style={{
                left: `${(startTime / duration) * 100}%`,
                width: `${((endTime - startTime) / duration) * 100}%`,
              }}
            />

            {/* Current Time Indicator */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg pointer-events-none z-20"
              style={{ left: `${(currentTime / duration) * 100}%` }}
            />

            {/* Clickable Seek Area */}
            <div
              className="absolute inset-0 cursor-pointer"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const percent = (e.clientX - rect.left) / rect.width;
                handleSeek(percent * duration);
              }}
            />

            {/* Start Handle */}
            <div
              className={cn(
                "absolute top-0 bottom-0 w-6 -ml-3 flex items-center justify-center cursor-ew-resize z-10",
                isDragging === "start" && "bg-accent/10"
              )}
              style={{ left: `${(startTime / duration) * 100}%` }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging("start");
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                setIsDragging("start");
              }}
            >
              <div className="w-1 h-8 bg-accent rounded-full" />
            </div>

            {/* End Handle */}
            <div
              className={cn(
                "absolute top-0 bottom-0 w-6 -mr-3 flex items-center justify-center cursor-ew-resize z-10",
                isDragging === "end" && "bg-accent/10"
              )}
              style={{ left: `${(endTime / duration) * 100}%`, transform: "translateX(-100%)" }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging("end");
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                setIsDragging("end");
              }}
            >
              <div className="w-1 h-8 bg-accent rounded-full" />
            </div>
          </div>

          {/* Time Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-text-muted">Start</label>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => nudgeTime("start", -0.1)}
                  className="p-2 rounded bg-bg-tertiary active:bg-bg-hover text-text-muted"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="flex-1 text-center text-sm font-mono text-text-primary bg-bg-tertiary rounded px-2 py-2">
                  {formatTime(startTime)}
                </div>
                <button
                  onClick={() => nudgeTime("start", 0.1)}
                  className="p-2 rounded bg-bg-tertiary active:bg-bg-hover text-text-muted"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-text-muted">End</label>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => nudgeTime("end", -0.1)}
                  className="p-2 rounded bg-bg-tertiary active:bg-bg-hover text-text-muted"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="flex-1 text-center text-sm font-mono text-text-primary bg-bg-tertiary rounded px-2 py-2">
                  {formatTime(endTime)}
                </div>
                <button
                  onClick={() => nudgeTime("end", 0.1)}
                  className="p-2 rounded bg-bg-tertiary active:bg-bg-hover text-text-muted"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Clip Info */}
          <div className="text-center text-sm">
            {hasClip ? (
              <span className="text-accent">
                Shot marked: {formatTime(clipDuration)}
              </span>
            ) : (
              <span className="text-text-muted">
                Drag handles to mark the shot (optional)
              </span>
            )}
          </div>
        </div>
      )}

      {/* Trimming Progress */}
      {isTrimming && (
        <div className="space-y-2 bg-bg-tertiary rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <Scissors size={16} className="text-accent animate-pulse" />
            <span>Trimming video...</span>
          </div>
          <div className="h-2 bg-bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-300"
              style={{ width: `${trimProgress}%` }}
            />
          </div>
          <p className="text-xs text-text-muted text-center">
            {trimProgress}% - Creating trimmed clip
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-2 pt-2">
        <Button
          variant="primary"
          icon={isTrimming ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          onClick={handleContinue}
          disabled={isTrimming}
        >
          {isTrimming ? "Trimming..." : hasClip ? "Trim & Continue" : "Continue"}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={isTrimming}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
