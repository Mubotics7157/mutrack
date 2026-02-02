"""3D geometry and camera projection utilities."""

import math
from typing import Optional, Tuple

import numpy as np


class Camera:
    """Camera model for 2D to 3D projection."""

    def __init__(
        self,
        width: int,
        height: int,
        calibration: Optional[dict] = None,
    ):
        """
        Initialize camera model.

        Args:
            width: Image width in pixels
            height: Image height in pixels
            calibration: Calibration dict with fx, fy, cx, cy, distortionCoeffs
        """
        self.width = width
        self.height = height

        if calibration:
            cal_width = calibration.get("imageWidth", width)
            cal_height = calibration.get("imageHeight", height)

            # Check if video orientation differs from calibration
            # Portrait video (h > w) with landscape calibration (cal_w > cal_h) or vice versa
            video_is_portrait = height > width
            cal_is_portrait = cal_height > cal_width
            orientation_mismatch = video_is_portrait != cal_is_portrait

            if orientation_mismatch:
                # Swap fx/fy and cx/cy for 90-degree rotation
                # Also swap the principal point relative to new dimensions
                self.fx = calibration["fy"]
                self.fy = calibration["fx"]
                # Principal point: (cx, cy) in landscape becomes (cal_height - cy, cx) in portrait
                # But since we're going from calibration space to video space:
                self.cx = calibration["cy"] * (width / cal_height)
                self.cy = calibration["cx"] * (height / cal_width)
                self.dist_coeffs = np.array(
                    calibration.get("distortionCoeffs", [0, 0, 0, 0, 0])
                )
            else:
                # Same orientation - scale if needed
                scale_x = width / cal_width
                scale_y = height / cal_height
                self.fx = calibration["fx"] * scale_x
                self.fy = calibration["fy"] * scale_y
                self.cx = calibration["cx"] * scale_x
                self.cy = calibration["cy"] * scale_y
                self.dist_coeffs = np.array(
                    calibration.get("distortionCoeffs", [0, 0, 0, 0, 0])
                )
        else:
            # Estimate intrinsics from image size
            # Assume typical smartphone FOV of ~70 degrees horizontal
            fov_h = math.radians(70)
            self.fx = width / (2 * math.tan(fov_h / 2))
            self.fy = self.fx  # Assume square pixels
            self.cx = width / 2
            self.cy = height / 2
            self.dist_coeffs = np.zeros(5)

        # Build intrinsic matrix
        self.K = np.array(
            [
                [self.fx, 0, self.cx],
                [0, self.fy, self.cy],
                [0, 0, 1],
            ]
        )

    def undistort_point(self, x: float, y: float) -> Tuple[float, float]:
        """
        Undistort a single point.

        Args:
            x: Pixel x coordinate
            y: Pixel y coordinate

        Returns:
            Undistorted (x, y) coordinates
        """
        if np.all(self.dist_coeffs == 0):
            return x, y

        # Normalize coordinates
        x_norm = (x - self.cx) / self.fx
        y_norm = (y - self.cy) / self.fy

        # Radial distortion
        r2 = x_norm**2 + y_norm**2
        k1, k2, p1, p2, k3 = self.dist_coeffs[:5] if len(self.dist_coeffs) >= 5 else (
            list(self.dist_coeffs) + [0] * (5 - len(self.dist_coeffs))
        )

        radial = 1 + k1 * r2 + k2 * r2**2 + k3 * r2**3

        # Tangential distortion
        x_undist = x_norm * radial + 2 * p1 * x_norm * y_norm + p2 * (r2 + 2 * x_norm**2)
        y_undist = y_norm * radial + p1 * (r2 + 2 * y_norm**2) + 2 * p2 * x_norm * y_norm

        # Convert back to pixel coordinates
        return x_undist * self.fx + self.cx, y_undist * self.fy + self.cy


def project_to_3d(
    pixel_x: float,
    pixel_y: float,
    depth: float,
    camera: Camera,
) -> Tuple[float, float, float]:
    """
    Project 2D pixel coordinates to 3D world coordinates.

    Uses pinhole camera model with depth.
    Coordinate system:
    - X: right
    - Y: up
    - Z: forward (into scene)

    Args:
        pixel_x: Pixel x coordinate
        pixel_y: Pixel y coordinate
        depth: Depth value (meters or relative)
        camera: Camera model

    Returns:
        (x, y, z) 3D coordinates
    """
    # Undistort point
    u, v = camera.undistort_point(pixel_x, pixel_y)

    # Normalize to camera coordinates
    x_norm = (u - camera.cx) / camera.fx
    y_norm = (v - camera.cy) / camera.fy

    # Project to 3D using depth
    # Depth is along the optical axis (Z)
    z = depth
    x = x_norm * z
    y = -y_norm * z  # Flip y (image y is down, world y is up)

    return x, y, z


def triangulate_from_motion(
    points_2d: list[Tuple[float, float]],
    camera: Camera,
    frame_times: list[float],
) -> Optional[list[Tuple[float, float, float]]]:
    """
    Estimate 3D trajectory from 2D points using motion constraints.

    This uses the physics-based constraint that the ball follows
    a parabolic trajectory under gravity.

    Args:
        points_2d: List of (x, y) pixel coordinates
        camera: Camera model
        frame_times: List of timestamps

    Returns:
        List of (x, y, z) 3D coordinates or None if failed
    """
    if len(points_2d) < 5:
        return None

    # This is a simplified approach:
    # 1. Assume the ball starts at a known distance
    # 2. Use the apparent size change to estimate depth change
    # 3. Fit a parabola to constrain the solution

    # For a more robust solution, we would need:
    # - Multiple camera views, OR
    # - Known ball size for scale, OR
    # - IMU data for camera motion

    # For now, return None and rely on depth estimation
    return None


def estimate_scale_from_ball_size(
    bbox_width: float,
    bbox_height: float,
    camera: Camera,
    known_diameter: float = 0.24,  # Standard foam ball diameter in meters
) -> float:
    """
    Estimate depth from apparent ball size.

    Args:
        bbox_width: Bounding box width in pixels
        bbox_height: Bounding box height in pixels
        camera: Camera model
        known_diameter: Known ball diameter in meters

    Returns:
        Estimated depth in meters
    """
    # Use average of width and height
    apparent_size = (bbox_width + bbox_height) / 2

    # Depth = (focal_length * real_size) / apparent_size
    focal_length = (camera.fx + camera.fy) / 2
    depth = (focal_length * known_diameter) / apparent_size

    return depth
