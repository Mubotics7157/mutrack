"""Ballistics physics simulation."""

import math
from typing import Optional

import numpy as np

from app.config import get_settings


class BallisticsSimulator:
    """
    Simulate ball trajectory with drag and Magnus effect.

    The model accounts for:
    - Gravitational acceleration
    - Aerodynamic drag (proportional to v²)
    - Magnus force (spin-induced lift)
    """

    def __init__(
        self,
        drag_coefficient: Optional[float] = None,
        magnus_coefficient: Optional[float] = None,
        spin_ratio: Optional[float] = None,
        ball_mass: Optional[float] = None,
        ball_diameter: Optional[float] = None,
    ):
        """
        Initialize simulator with physics parameters.

        Args:
            drag_coefficient: Cd (default: 0.47 for sphere)
            magnus_coefficient: Cm (default: 0.15)
            spin_ratio: Ball spin / flywheel RPM (default: 0.5)
            ball_mass: Mass in kg
            ball_diameter: Diameter in meters
        """
        settings = get_settings()

        self.Cd = drag_coefficient if drag_coefficient is not None else 0.47
        self.Cm = magnus_coefficient if magnus_coefficient is not None else 0.15
        self.spin_ratio = spin_ratio if spin_ratio is not None else 0.5
        self.mass = ball_mass if ball_mass is not None else settings.ball_mass
        self.diameter = (
            ball_diameter if ball_diameter is not None else settings.ball_diameter
        )
        self.radius = self.diameter / 2
        self.area = math.pi * self.radius**2
        self.rho = settings.air_density
        self.g = settings.gravity

    def rpm_to_launch_speed(self, flywheel_rpm: float) -> float:
        """
        Convert flywheel RPM to ball launch speed.

        Simple model: v = k * RPM * r
        where k accounts for slip and energy transfer efficiency
        """
        flywheel_radius = 0.05  # 5cm wheel radius (typical)
        efficiency = 0.8  # Energy transfer efficiency
        omega = flywheel_rpm * 2 * math.pi / 60  # rad/s
        surface_speed = omega * flywheel_radius
        return surface_speed * efficiency

    def compute_ball_spin(self, flywheel_rpm: float) -> float:
        """
        Compute ball spin rate from flywheel RPM.

        Returns angular velocity in rad/s
        """
        ball_rpm = flywheel_rpm * self.spin_ratio
        return ball_rpm * 2 * math.pi / 60

    def simulate(
        self,
        flywheel_rpm: float,
        hood_angle: float,
        time_step: float = 0.001,
        max_time: float = 3.0,
    ) -> dict:
        """
        Simulate ball trajectory.

        Args:
            flywheel_rpm: Flywheel speed in RPM
            hood_angle: Launch angle in degrees
            time_step: Simulation time step in seconds
            max_time: Maximum simulation time

        Returns:
            dict with positions, metrics
        """
        # Initial conditions
        v0 = self.rpm_to_launch_speed(flywheel_rpm)
        theta = math.radians(hood_angle)
        omega = self.compute_ball_spin(flywheel_rpm)

        # Initial position (at shooter exit)
        # Assume shooter is at origin, pointing in +x direction
        x = 0.0
        y = 0.5  # Shooter height above ground
        z = 0.0

        # Initial velocity
        vx = v0 * math.cos(theta)
        vy = v0 * math.sin(theta)
        vz = 0.0

        # Spin axis (backspin, perpendicular to velocity in xy plane)
        # For backspin: omega points in -z direction
        omega_z = -omega

        # Simulation
        positions = []
        t = 0.0

        max_height = y
        launch_speed = v0
        launch_angle = hood_angle

        while t < max_time and y >= 0:
            # Record position
            positions.append(
                {
                    "time": round(t, 4),
                    "x": round(x, 4),
                    "y": round(y, 4),
                    "z": round(z, 4),
                }
            )

            # Current speed
            v = math.sqrt(vx**2 + vy**2 + vz**2)

            if v < 0.01:
                break

            # Unit velocity vector
            ux, uy, uz = vx / v, vy / v, vz / v

            # Drag force: F_d = -0.5 * rho * Cd * A * v² * u_v
            drag_mag = 0.5 * self.rho * self.Cd * self.area * v**2
            Fd_x = -drag_mag * ux
            Fd_y = -drag_mag * uy
            Fd_z = -drag_mag * uz

            # Magnus force: F_m = 0.5 * rho * Cm * A * v * (omega × v)
            # For backspin (omega in -z): omega × v gives lift in +y
            # Simplified: Magnus provides vertical lift
            magnus_mag = 0.5 * self.rho * self.Cm * self.area * abs(omega_z) * v
            Fm_y = magnus_mag  # Lift force

            # Total acceleration
            ax = Fd_x / self.mass
            ay = -self.g + (Fd_y + Fm_y) / self.mass
            az = Fd_z / self.mass

            # Update velocity (Euler integration)
            vx += ax * time_step
            vy += ay * time_step
            vz += az * time_step

            # Update position
            x += vx * time_step
            y += vy * time_step
            z += vz * time_step

            # Track max height
            if y > max_height:
                max_height = y

            t += time_step

        # Final metrics
        flight_time = t
        horizontal_distance = x

        return {
            "positions": positions,
            "max_height": round(max_height, 3),
            "horizontal_distance": round(horizontal_distance, 3),
            "flight_time": round(flight_time, 3),
            "launch_speed": round(launch_speed, 3),
            "launch_angle": round(launch_angle, 2),
        }


def compute_trajectory_metrics(positions: list[dict]) -> dict:
    """
    Compute trajectory metrics from observed 3D positions.

    Args:
        positions: List of {time, x, y, z} dicts

    Returns:
        dict with launch_angle, launch_speed, max_height, etc.
    """
    if len(positions) < 3:
        return {}

    # Sort by time
    positions = sorted(positions, key=lambda p: p["time"])

    # Extract arrays
    times = np.array([p["time"] for p in positions])
    x = np.array([p["x"] for p in positions])
    y = np.array([p["y"] for p in positions])

    # Max height
    max_height = float(np.max(y))

    # Horizontal distance
    horizontal_distance = float(x[-1] - x[0])

    # Flight time
    flight_time = float(times[-1] - times[0])

    # Estimate launch conditions from first few points
    if len(positions) >= 3:
        # Velocity from first few points
        dt = times[1] - times[0]
        if dt > 0:
            vx0 = (x[1] - x[0]) / dt
            vy0 = (y[1] - y[0]) / dt

            launch_speed = float(np.sqrt(vx0**2 + vy0**2))
            launch_angle = float(np.degrees(np.arctan2(vy0, vx0)))
        else:
            launch_speed = None
            launch_angle = None
    else:
        launch_speed = None
        launch_angle = None

    return {
        "max_height": max_height,
        "horizontal_distance": horizontal_distance,
        "flight_time": flight_time,
        "launch_speed": launch_speed,
        "launch_angle": launch_angle,
    }
