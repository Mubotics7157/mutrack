"""FastAPI entry point for the ballistics backend."""

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.api.v1 import worker, predict

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    settings = get_settings()
    logger.info(f"Starting ballistics worker: {settings.worker_name}")

    # Start the worker polling loop in background
    worker_task = asyncio.create_task(worker.start_worker_loop())

    yield

    # Shutdown
    logger.info("Shutting down ballistics worker...")
    worker_task.cancel()
    try:
        await worker_task
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title="Ballistics Analysis Backend",
    description="ML backend for processing shooting videos and extracting trajectories",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(worker.router, prefix="/api/v1", tags=["worker"])
app.include_router(predict.router, prefix="/api/v1", tags=["predict"])


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "worker": get_settings().worker_name}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
