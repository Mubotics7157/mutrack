"""Worker API for job polling and processing."""

import asyncio
import logging
import json
from typing import Optional

import httpx
from fastapi import APIRouter

from app.config import get_settings
from app.services.video_processor import VideoProcessor

logger = logging.getLogger(__name__)
router = APIRouter()

# Global processor instance (initialized lazily)
_processor: Optional[VideoProcessor] = None


def get_processor() -> VideoProcessor:
    """Get or create the video processor."""
    global _processor
    if _processor is None:
        _processor = VideoProcessor()
    return _processor


async def claim_job(client: httpx.AsyncClient, settings) -> Optional[dict]:
    """Claim a pending job from Convex."""
    try:
        response = await client.post(
            f"{settings.convex_url}/api/ml/jobs/claim",
            headers={"Authorization": f"Bearer {settings.ml_worker_api_key}"},
            json={"jobTypes": ["trajectory_detection", "parameter_fitting"]},
            timeout=30.0,
        )
        response.raise_for_status()
        data = response.json()
        return data.get("job")
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 401:
            logger.error("Invalid API key")
        else:
            logger.error(f"Failed to claim job: {e}")
        return None
    except Exception as e:
        logger.error(f"Error claiming job: {e}")
        return None


async def update_progress(
    client: httpx.AsyncClient,
    settings,
    job_id: str,
    progress: float,
    message: str = "",
):
    """Update job progress."""
    try:
        await client.post(
            f"{settings.convex_url}/api/ml/jobs/progress",
            headers={"Authorization": f"Bearer {settings.ml_worker_api_key}"},
            json={
                "jobId": job_id,
                "progress": progress,
                "progressMessage": message,
            },
            timeout=10.0,
        )
    except Exception as e:
        logger.warning(f"Failed to update progress: {e}")


async def complete_job(
    client: httpx.AsyncClient,
    settings,
    job_id: str,
    trajectory: dict,
):
    """Mark job as completed with results."""
    try:
        response = await client.post(
            f"{settings.convex_url}/api/ml/jobs/complete",
            headers={"Authorization": f"Bearer {settings.ml_worker_api_key}"},
            json={"jobId": job_id, "trajectory": trajectory},
            timeout=30.0,
        )
        response.raise_for_status()
        logger.info(f"Job {job_id} completed successfully")
    except Exception as e:
        logger.error(f"Failed to complete job: {e}")
        raise


async def fail_job(
    client: httpx.AsyncClient,
    settings,
    job_id: str,
    error_message: str,
):
    """Mark job as failed."""
    try:
        await client.post(
            f"{settings.convex_url}/api/ml/jobs/fail",
            headers={"Authorization": f"Bearer {settings.ml_worker_api_key}"},
            json={"jobId": job_id, "errorMessage": error_message},
            timeout=10.0,
        )
        logger.info(f"Job {job_id} marked as failed: {error_message}")
    except Exception as e:
        logger.error(f"Failed to mark job as failed: {e}")


async def send_heartbeat(client: httpx.AsyncClient, settings):
    """Send heartbeat to Convex."""
    try:
        response = await client.post(
            f"{settings.convex_url}/api/ml/heartbeat",
            headers={"Authorization": f"Bearer {settings.ml_worker_api_key}"},
            json={
                "metadata": {
                    "platform": "local",
                    "version": "0.1.0",
                }
            },
            timeout=10.0,
        )
        data = response.json()
        return data.get("pendingJobCount", 0)
    except Exception as e:
        logger.warning(f"Heartbeat failed: {e}")
        return 0


async def process_job(client: httpx.AsyncClient, settings, job: dict):
    """Process a claimed job."""
    job_id = job["jobId"]
    job_type = job["type"]
    video_url = job["videoUrl"]
    video_info = job["video"]
    calibration = job.get("calibration")

    logger.info(f"Processing job {job_id} ({job_type})")

    try:
        processor = get_processor()

        # Progress callback
        async def on_progress(progress: float, message: str):
            await update_progress(client, settings, job_id, progress, message)

        if job_type == "trajectory_detection":
            # Process video and extract trajectory
            trajectory = await processor.process_video(
                video_url=video_url,
                video_info=video_info,
                calibration=calibration,
                progress_callback=on_progress,
            )

            # Submit results
            await complete_job(client, settings, job_id, trajectory)

        elif job_type == "parameter_fitting":
            # Parameter fitting requires multiple trajectories
            # For now, just mark as not implemented
            await fail_job(
                client, settings, job_id, "Parameter fitting not yet implemented"
            )

    except Exception as e:
        logger.exception(f"Error processing job {job_id}")
        await fail_job(client, settings, job_id, str(e))


async def start_worker_loop():
    """Main worker polling loop."""
    settings = get_settings()

    if not settings.convex_url or not settings.ml_worker_api_key:
        logger.warning(
            "Missing BALLISTICS_CONVEX_URL or BALLISTICS_ML_WORKER_API_KEY. "
            "Worker loop disabled."
        )
        return

    logger.info(f"Starting worker loop for {settings.worker_name}")
    poll_interval = settings.poll_interval_seconds

    async with httpx.AsyncClient() as client:
        while True:
            try:
                # Send heartbeat and get pending count
                pending_count = await send_heartbeat(client, settings)

                if pending_count > 0:
                    # Try to claim a job
                    job = await claim_job(client, settings)

                    if job:
                        # Process the job
                        await process_job(client, settings, job)
                        # Immediately check for more jobs
                        continue

                # Wait before polling again
                await asyncio.sleep(poll_interval)

            except asyncio.CancelledError:
                logger.info("Worker loop cancelled")
                raise
            except Exception as e:
                logger.exception(f"Worker loop error: {e}")
                await asyncio.sleep(poll_interval * 2)


@router.get("/status")
async def worker_status():
    """Get worker status."""
    settings = get_settings()
    return {
        "worker_name": settings.worker_name,
        "convex_configured": bool(settings.convex_url),
        "api_key_configured": bool(settings.ml_worker_api_key),
    }


@router.post("/process-manual")
async def process_manual(video_url: str, flywheel_rpm: float, hood_angle: float):
    """Manually trigger video processing (for testing)."""
    processor = get_processor()

    async def progress_callback(progress: float, message: str):
        logger.info(f"Progress: {progress:.1f}% - {message}")

    trajectory = await processor.process_video(
        video_url=video_url,
        video_info={
            "flywheelRpm": flywheel_rpm,
            "hoodAngle": hood_angle,
        },
        calibration=None,
        progress_callback=progress_callback,
    )

    return {"trajectory": trajectory}
