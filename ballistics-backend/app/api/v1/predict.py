"""Trajectory prediction API."""

import json
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.physics import BallisticsSimulator

router = APIRouter()


class PredictionRequest(BaseModel):
    """Request for trajectory prediction."""

    flywheel_rpm: float
    hood_angle: float  # degrees
    # Optional physics parameters (use defaults if not provided)
    drag_coefficient: Optional[float] = None
    magnus_coefficient: Optional[float] = None
    spin_ratio: Optional[float] = None
    ball_mass: Optional[float] = None
    ball_diameter: Optional[float] = None
    # Simulation settings
    time_step: float = 0.001  # seconds
    max_time: float = 3.0  # seconds


class PredictionResponse(BaseModel):
    """Response with predicted trajectory."""

    positions: list[dict]  # [{time, x, y, z}]
    max_height: float
    horizontal_distance: float
    flight_time: float
    launch_speed: float
    launch_angle: float


@router.post("/predict", response_model=PredictionResponse)
async def predict_trajectory(request: PredictionRequest):
    """Predict trajectory for given parameters."""
    simulator = BallisticsSimulator(
        drag_coefficient=request.drag_coefficient,
        magnus_coefficient=request.magnus_coefficient,
        spin_ratio=request.spin_ratio,
        ball_mass=request.ball_mass,
        ball_diameter=request.ball_diameter,
    )

    try:
        result = simulator.simulate(
            flywheel_rpm=request.flywheel_rpm,
            hood_angle=request.hood_angle,
            time_step=request.time_step,
            max_time=request.max_time,
        )

        return PredictionResponse(
            positions=result["positions"],
            max_height=result["max_height"],
            horizontal_distance=result["horizontal_distance"],
            flight_time=result["flight_time"],
            launch_speed=result["launch_speed"],
            launch_angle=result["launch_angle"],
        )

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/batch-predict")
async def batch_predict(requests: list[PredictionRequest]):
    """Predict trajectories for multiple parameter sets."""
    simulator = BallisticsSimulator()
    results = []

    for req in requests:
        try:
            result = simulator.simulate(
                flywheel_rpm=req.flywheel_rpm,
                hood_angle=req.hood_angle,
                time_step=req.time_step,
                max_time=req.max_time,
            )
            results.append({
                "success": True,
                "max_height": result["max_height"],
                "horizontal_distance": result["horizontal_distance"],
                "flight_time": result["flight_time"],
            })
        except Exception as e:
            results.append({
                "success": False,
                "error": str(e),
            })

    return {"results": results}
