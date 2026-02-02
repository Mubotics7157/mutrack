import { useState, useRef, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { toast } from "sonner";
import {
  Camera,
  CheckCircle,
  ChevronRight,
  Image,
  Loader2,
  X,
  AlertCircle,
} from "lucide-react";
import { Button, Input, Card, CardContent } from "../../ui";

interface CameraCalibrationWizardProps {
  onClose: () => void;
}

type WizardStep = "intro" | "capture" | "processing" | "result";

interface CalibrationResult {
  fx: number;
  fy: number;
  cx: number;
  cy: number;
  distortionCoeffs: number[];
  imageWidth: number;
  imageHeight: number;
  reprojectionError: number;
}

export function CameraCalibrationWizard({
  onClose,
}: CameraCalibrationWizardProps) {
  const [step, setStep] = useState<WizardStep>("intro");
  const [deviceName, setDeviceName] = useState("");
  const [capturedImages, setCapturedImages] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<CalibrationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const saveCalibration = useMutation(api.calibration.saveCalibration);

  const handleImageCapture = useCallback(
    (files: FileList | null) => {
      if (!files) return;

      const imageFiles = Array.from(files).filter((f) =>
        f.type.startsWith("image/")
      );

      setCapturedImages((prev) => [...prev, ...imageFiles]);
    },
    []
  );

  const removeImage = (index: number) => {
    setCapturedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const processCalibration = async () => {
    if (capturedImages.length < 10) {
      toast.error("Need at least 10 images for accurate calibration");
      return;
    }

    setStep("processing");
    setIsProcessing(true);
    setError(null);

    try {
      // In a real implementation, this would:
      // 1. Upload images to a temporary storage
      // 2. Call the ML backend's calibration endpoint
      // 3. Receive the computed intrinsics

      // For now, simulate processing with default values
      // This would be replaced with actual API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Simulated result (replace with actual API call)
      const simulatedResult: CalibrationResult = {
        fx: 1000 + Math.random() * 200,
        fy: 1000 + Math.random() * 200,
        cx: 960 + Math.random() * 100,
        cy: 540 + Math.random() * 100,
        distortionCoeffs: [
          -0.1 + Math.random() * 0.05,
          0.05 + Math.random() * 0.02,
          0,
          0,
          0.01 + Math.random() * 0.005,
        ],
        imageWidth: 1920,
        imageHeight: 1080,
        reprojectionError: 0.3 + Math.random() * 0.2,
      };

      setResult(simulatedResult);
      setStep("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Calibration failed");
      setStep("capture");
    } finally {
      setIsProcessing(false);
    }
  };

  const saveResult = async () => {
    if (!result) return;

    try {
      // Generate device ID from browser/device info
      const deviceId = `${navigator.platform}-${navigator.userAgent.slice(0, 50)}`.replace(
        /[^a-zA-Z0-9]/g,
        "-"
      );

      await saveCalibration({
        deviceId,
        deviceName: deviceName || undefined,
        fx: result.fx,
        fy: result.fy,
        cx: result.cx,
        cy: result.cy,
        distortionCoeffs: result.distortionCoeffs,
        imageWidth: result.imageWidth,
        imageHeight: result.imageHeight,
        reprojectionError: result.reprojectionError,
      });

      toast.success("Calibration saved successfully");
      onClose();
    } catch (err) {
      toast.error("Failed to save calibration");
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">
            Camera Calibration
          </h2>
          <p className="text-sm text-text-muted mt-1">
            {step === "intro" && "Prepare your calibration target"}
            {step === "capture" && "Capture calibration images"}
            {step === "processing" && "Computing camera intrinsics..."}
            {step === "result" && "Review calibration results"}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-text-muted hover:text-text-primary rounded-lg hover:bg-bg-hover"
        >
          <X size={20} />
        </button>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2 mb-8">
        {(["intro", "capture", "processing", "result"] as WizardStep[]).map(
          (s, i) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === s
                    ? "bg-accent text-white"
                    : (["intro", "capture", "processing", "result"].indexOf(step) >
                        i)
                      ? "bg-accent/20 text-accent"
                      : "bg-bg-tertiary text-text-muted"
                }`}
              >
                {["intro", "capture", "processing", "result"].indexOf(step) > i ? (
                  <CheckCircle size={16} />
                ) : (
                  i + 1
                )}
              </div>
              {i < 3 && (
                <ChevronRight size={16} className="text-text-muted mx-1" />
              )}
            </div>
          )
        )}
      </div>

      {/* Step Content */}
      {step === "intro" && (
        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent/10 flex items-center justify-center">
                <Camera size={32} className="text-accent" />
              </div>
              <h3 className="text-lg font-medium text-text-primary mb-2">
                What You'll Need
              </h3>
              <p className="text-text-secondary">
                A printed checkerboard calibration pattern (7×10 inner corners
                recommended)
              </p>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3 p-3 bg-bg-tertiary rounded-lg">
                <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-accent font-medium text-xs">1</span>
                </div>
                <div>
                  <p className="font-medium text-text-primary">
                    Print the pattern
                  </p>
                  <p className="text-text-muted">
                    Use a flat, rigid surface (foam board works well)
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-bg-tertiary rounded-lg">
                <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-accent font-medium text-xs">2</span>
                </div>
                <div>
                  <p className="font-medium text-text-primary">
                    Capture 15-20 images
                  </p>
                  <p className="text-text-muted">
                    Vary angles, distances, and positions across the frame
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-bg-tertiary rounded-lg">
                <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-accent font-medium text-xs">3</span>
                </div>
                <div>
                  <p className="font-medium text-text-primary">
                    Keep the pattern in focus
                  </p>
                  <p className="text-text-muted">
                    Ensure good lighting and sharp images
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Device Name (optional)
              </label>
              <Input
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder="e.g., iPhone 15 Pro, Samsung S24"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" onClick={() => setStep("capture")}>
                Start Capture
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "capture" && (
        <Card>
          <CardContent className="p-6 space-y-6">
            {/* Image Upload Area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border-subtle rounded-xl p-8 text-center cursor-pointer hover:border-accent hover:bg-bg-tertiary/50 transition-colors"
            >
              <Image size={40} className="mx-auto mb-3 text-text-muted" />
              <p className="text-text-secondary mb-1">
                Click to upload calibration images
              </p>
              <p className="text-sm text-text-muted">
                Select multiple images at once
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleImageCapture(e.target.files)}
              className="hidden"
            />

            {/* Captured Images */}
            {capturedImages.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-text-primary">
                    Captured Images ({capturedImages.length})
                  </p>
                  <span
                    className={`text-xs ${
                      capturedImages.length >= 10
                        ? "text-accent-success"
                        : "text-text-muted"
                    }`}
                  >
                    {capturedImages.length >= 10
                      ? "✓ Minimum reached"
                      : `Need ${10 - capturedImages.length} more`}
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {capturedImages.map((file, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Calibration ${index + 1}`}
                        className="w-full aspect-square object-cover rounded-lg"
                      />
                      <button
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={12} className="text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 p-3 bg-accent-error/10 border border-accent-error/30 rounded-lg">
                <AlertCircle size={16} className="text-accent-error" />
                <p className="text-sm text-accent-error">{error}</p>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="ghost" onClick={() => setStep("intro")}>
                Back
              </Button>
              <Button
                variant="primary"
                onClick={processCalibration}
                disabled={capturedImages.length < 10}
              >
                Process Calibration
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "processing" && (
        <Card>
          <CardContent className="p-12 text-center">
            <Loader2 size={48} className="mx-auto mb-4 text-accent animate-spin" />
            <h3 className="text-lg font-medium text-text-primary mb-2">
              Computing Camera Intrinsics
            </h3>
            <p className="text-text-secondary">
              Detecting checkerboard corners and computing calibration
              matrix...
            </p>
          </CardContent>
        </Card>
      )}

      {step === "result" && result && (
        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent-success/10 flex items-center justify-center">
                <CheckCircle size={32} className="text-accent-success" />
              </div>
              <h3 className="text-lg font-medium text-text-primary mb-2">
                Calibration Complete
              </h3>
              <p className="text-text-secondary">
                Reprojection error:{" "}
                <span className="font-mono text-accent">
                  {result.reprojectionError.toFixed(3)} px
                </span>
              </p>
            </div>

            {/* Intrinsic Matrix */}
            <div className="bg-bg-tertiary rounded-lg p-4">
              <h4 className="text-sm font-medium text-text-primary mb-3">
                Camera Intrinsic Matrix (K)
              </h4>
              <div className="font-mono text-xs text-text-secondary grid grid-cols-3 gap-2 text-center">
                <span>{result.fx.toFixed(1)}</span>
                <span>0</span>
                <span>{result.cx.toFixed(1)}</span>
                <span>0</span>
                <span>{result.fy.toFixed(1)}</span>
                <span>{result.cy.toFixed(1)}</span>
                <span>0</span>
                <span>0</span>
                <span>1</span>
              </div>
            </div>

            {/* Distortion Coefficients */}
            <div className="bg-bg-tertiary rounded-lg p-4">
              <h4 className="text-sm font-medium text-text-primary mb-2">
                Distortion Coefficients
              </h4>
              <p className="font-mono text-xs text-text-secondary">
                [{result.distortionCoeffs.map((c) => c.toFixed(4)).join(", ")}]
              </p>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="ghost" onClick={() => setStep("capture")}>
                Recalibrate
              </Button>
              <Button variant="primary" onClick={saveResult}>
                Save Calibration
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
