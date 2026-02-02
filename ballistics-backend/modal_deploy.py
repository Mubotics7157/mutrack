"""Modal.com deployment configuration for ballistics worker."""

import modal

# Create Modal app
app = modal.App("ballistics-worker")

# Define the container image
image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg", "libgl1-mesa-glx", "libglib2.0-0")
    .pip_install(
        "fastapi>=0.109.0",
        "uvicorn[standard]>=0.27.0",
        "pydantic>=2.5.0",
        "pydantic-settings>=2.1.0",
        "torch>=2.1.0",
        "torchvision>=0.16.0",
        "ultralytics>=8.1.0",
        "supervision>=0.18.0",
        "transformers>=4.37.0",
        "opencv-python-headless>=4.9.0",
        "numpy>=1.26.0",
        "scipy>=1.12.0",
        "accelerate>=0.25.0",
        "safetensors>=0.4.0",
        "httpx>=0.26.0",
        "aiofiles>=23.2.0",
        "python-dotenv>=1.0.0",
        "python-multipart>=0.0.6",
    )
)


@app.cls(
    image=image,
    gpu="A10G",  # or "T4" for cheaper option
    timeout=600,  # 10 minutes per job
    secrets=[modal.Secret.from_name("ballistics-secrets")],
)
class BallisticsWorker:
    """Modal worker class for processing videos."""

    @modal.enter()
    def setup(self):
        """Initialize models on container start."""
        import os
        import sys

        # Add app to path
        sys.path.insert(0, "/root")

        # Initialize services
        from app.services.ball_detector import BallDetector
        from app.services.depth_estimator import DepthEstimator
        from app.config import get_settings

        settings = get_settings()

        print("Loading models...")
        self.detector = BallDetector(
            model_path=settings.yolo_model,
            confidence_threshold=settings.detection_confidence,
        )
        # Trigger model load
        import numpy as np

        dummy = np.zeros((640, 640, 3), dtype=np.uint8)
        self.detector.detect(dummy)

        self.depth_estimator = DepthEstimator(
            model_name=settings.depth_model,
        )
        self.depth_estimator.estimate(dummy)

        print("Models loaded!")

    @modal.method()
    async def process_video(
        self,
        video_url: str,
        video_info: dict,
        calibration: dict | None,
    ) -> dict:
        """Process a single video and return trajectory."""
        from app.services.video_processor import VideoProcessor

        processor = VideoProcessor()
        processor.detector = self.detector
        processor.depth_estimator = self.depth_estimator

        async def progress_callback(progress: float, message: str):
            print(f"Progress: {progress:.1f}% - {message}")

        result = await processor.process_video(
            video_url=video_url,
            video_info=video_info,
            calibration=calibration,
            progress_callback=progress_callback,
        )

        return result


@app.function(
    image=image,
    schedule=modal.Period(seconds=10),
    secrets=[modal.Secret.from_name("ballistics-secrets")],
)
async def worker_loop():
    """Polling loop that runs on a schedule."""
    import os
    import httpx

    convex_url = os.environ.get("BALLISTICS_CONVEX_URL")
    api_key = os.environ.get("BALLISTICS_ML_WORKER_API_KEY")

    if not convex_url or not api_key:
        print("Missing environment variables")
        return

    async with httpx.AsyncClient() as client:
        # Try to claim a job
        try:
            response = await client.post(
                f"{convex_url}/api/ml/jobs/claim",
                headers={"Authorization": f"Bearer {api_key}"},
                json={"jobTypes": ["trajectory_detection"]},
                timeout=30.0,
            )
            response.raise_for_status()
            data = response.json()
            job = data.get("job")

            if not job:
                print("No pending jobs")
                return

            print(f"Claimed job: {job['jobId']}")

            # Process the job
            worker = BallisticsWorker()
            result = await worker.process_video.remote(
                video_url=job["videoUrl"],
                video_info=job["video"],
                calibration=job.get("calibration"),
            )

            # Submit results
            await client.post(
                f"{convex_url}/api/ml/jobs/complete",
                headers={"Authorization": f"Bearer {api_key}"},
                json={"jobId": job["jobId"], "trajectory": result},
                timeout=30.0,
            )

            print(f"Job {job['jobId']} completed!")

        except Exception as e:
            print(f"Error: {e}")


@app.local_entrypoint()
def main():
    """Local test entrypoint."""
    print("Ballistics worker ready for Modal deployment")
    print("Deploy with: modal deploy modal_deploy.py")
    print("Run locally with: modal run modal_deploy.py")
