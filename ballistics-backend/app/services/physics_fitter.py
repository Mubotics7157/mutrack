"""Physics parameter fitting from trajectory data."""

import logging
from typing import Optional

import numpy as np
from scipy import optimize

from app.core.physics import BallisticsSimulator
from app.config import get_settings

logger = logging.getLogger(__name__)


class PhysicsFitter:
    """Fit physics parameters from observed trajectories."""

    def __init__(self):
        """Initialize fitter with default bounds."""
        settings = get_settings()

        # Parameter bounds
        self.bounds = {
            "drag_coefficient": (0.3, 0.7),  # Cd
            "magnus_coefficient": (0.0, 0.5),  # Cm
            "spin_ratio": (0.3, 0.8),  # ball spin / flywheel RPM
            "hood_angle_bias": (-5.0, 5.0),  # degrees
        }

        # Initial guesses
        self.initial_params = {
            "drag_coefficient": 0.47,  # Sphere
            "magnus_coefficient": 0.15,
            "spin_ratio": 0.5,
            "hood_angle_bias": 0.0,
        }

    def fit(
        self,
        trajectories: list[dict],
        video_params: list[dict],
    ) -> dict:
        """
        Fit physics parameters from multiple trajectories.

        Args:
            trajectories: List of trajectory position data
                [{positions: [{time, x, y, z}], ...}, ...]
            video_params: List of video parameters
                [{flywheelRpm, hoodAngle}, ...]

        Returns:
            Fitted parameters dict with uncertainties
        """
        if len(trajectories) != len(video_params):
            raise ValueError("Trajectories and video params must have same length")

        if len(trajectories) < 3:
            raise ValueError("Need at least 3 trajectories for fitting")

        # Prepare data
        observations = []
        for traj, params in zip(trajectories, video_params):
            positions = traj.get("positions", [])
            if isinstance(positions, str):
                import json

                positions = json.loads(positions)

            if len(positions) < 5:
                continue

            observations.append(
                {
                    "positions": positions,
                    "flywheel_rpm": params["flywheelRpm"],
                    "hood_angle": params["hoodAngle"],
                }
            )

        if len(observations) < 3:
            raise ValueError("Not enough valid trajectories for fitting")

        # Define objective function
        def objective(params_array):
            drag_coeff, magnus_coeff, spin_ratio, angle_bias = params_array

            simulator = BallisticsSimulator(
                drag_coefficient=drag_coeff,
                magnus_coefficient=magnus_coeff,
                spin_ratio=spin_ratio,
            )

            total_error = 0.0
            count = 0

            for obs in observations:
                # Simulate trajectory
                result = simulator.simulate(
                    flywheel_rpm=obs["flywheel_rpm"],
                    hood_angle=obs["hood_angle"] + angle_bias,
                )

                # Compare to observed
                sim_positions = result["positions"]
                obs_positions = obs["positions"]

                # Compute RMSE at matching time points
                for obs_pos in obs_positions:
                    t = obs_pos["time"]
                    # Find closest simulated point
                    closest_sim = min(
                        sim_positions, key=lambda p: abs(p["time"] - t)
                    )

                    if abs(closest_sim["time"] - t) < 0.02:  # Within 20ms
                        dx = closest_sim["x"] - obs_pos["x"]
                        dy = closest_sim["y"] - obs_pos["y"]
                        dz = closest_sim["z"] - obs_pos["z"]
                        total_error += dx**2 + dy**2 + dz**2
                        count += 1

            return np.sqrt(total_error / max(count, 1))

        # Run optimization
        x0 = [
            self.initial_params["drag_coefficient"],
            self.initial_params["magnus_coefficient"],
            self.initial_params["spin_ratio"],
            self.initial_params["hood_angle_bias"],
        ]

        bounds = [
            self.bounds["drag_coefficient"],
            self.bounds["magnus_coefficient"],
            self.bounds["spin_ratio"],
            self.bounds["hood_angle_bias"],
        ]

        logger.info("Starting parameter optimization...")

        result = optimize.minimize(
            objective,
            x0,
            method="L-BFGS-B",
            bounds=bounds,
            options={"maxiter": 100, "disp": False},
        )

        if not result.success:
            logger.warning(f"Optimization did not converge: {result.message}")

        fitted_params = {
            "drag_coefficient": float(result.x[0]),
            "magnus_coefficient": float(result.x[1]),
            "spin_ratio": float(result.x[2]),
            "hood_angle_bias": float(result.x[3]),
        }

        rmse = float(result.fun)

        # Compute R² score
        r2 = self._compute_r2(observations, fitted_params)

        # Estimate uncertainties using Hessian (if available)
        uncertainties = self._estimate_uncertainties(result)

        logger.info(f"Fitted parameters: {fitted_params}")
        logger.info(f"RMSE: {rmse:.4f}m, R²: {r2:.4f}")

        return {
            "parameters": fitted_params,
            "uncertainties": uncertainties,
            "rmse": rmse,
            "r2_score": r2,
            "trajectory_count": len(observations),
        }

    def _compute_r2(self, observations: list[dict], params: dict) -> float:
        """Compute R² score for fitted parameters."""
        simulator = BallisticsSimulator(
            drag_coefficient=params["drag_coefficient"],
            magnus_coefficient=params["magnus_coefficient"],
            spin_ratio=params["spin_ratio"],
        )

        ss_res = 0.0
        ss_tot = 0.0
        y_mean = 0.0
        count = 0

        # First pass: compute mean
        for obs in observations:
            for pos in obs["positions"]:
                y_mean += pos["y"]
                count += 1
        y_mean /= max(count, 1)

        # Second pass: compute SS_res and SS_tot
        for obs in observations:
            result = simulator.simulate(
                flywheel_rpm=obs["flywheel_rpm"],
                hood_angle=obs["hood_angle"] + params["hood_angle_bias"],
            )

            for obs_pos in obs["positions"]:
                t = obs_pos["time"]
                closest_sim = min(
                    result["positions"], key=lambda p: abs(p["time"] - t)
                )

                if abs(closest_sim["time"] - t) < 0.02:
                    ss_res += (obs_pos["y"] - closest_sim["y"]) ** 2
                    ss_tot += (obs_pos["y"] - y_mean) ** 2

        if ss_tot == 0:
            return 0.0

        return 1.0 - (ss_res / ss_tot)

    def _estimate_uncertainties(self, result) -> dict:
        """Estimate parameter uncertainties from optimization result."""
        # Simple uncertainty estimate based on final function value
        # A more rigorous approach would use the Hessian
        base_uncertainty = result.fun * 0.1  # 10% of RMSE as baseline

        return {
            "drag_coefficient": base_uncertainty * 0.2,
            "magnus_coefficient": base_uncertainty * 0.3,
            "hood_angle_bias": base_uncertainty * 2.0,  # degrees
        }
