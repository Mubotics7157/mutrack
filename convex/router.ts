import { httpRouter } from "convex/server";
import { handleBeaconSightings, handleHeartbeat } from "./scannerApi";
import {
  handleSmsCheckInStatus,
  handleSmsCheckIn,
  handleSmsCheckOut,
} from "./smsCheckInApi";
import {
  handleClaimJob,
  handleUpdateProgress,
  handleCompleteJob,
  handleFailJob,
  handleWorkerHeartbeat,
  handleCalibrationUpload,
} from "./mlWorkerApi";

const http = httpRouter();

// Scanner API routes
http.route({
  path: "/api/scanner/beacon-sightings",
  method: "POST",
  handler: handleBeaconSightings,
});

http.route({
  path: "/api/scanner/heartbeat",
  method: "POST",
  handler: handleHeartbeat,
});

// SMS Check-in API routes
http.route({
  path: "/api/sms-checkin/status",
  method: "GET",
  handler: handleSmsCheckInStatus,
});

http.route({
  path: "/api/sms-checkin/checkin",
  method: "POST",
  handler: handleSmsCheckIn,
});

http.route({
  path: "/api/sms-checkin/checkout",
  method: "POST",
  handler: handleSmsCheckOut,
});

// ML Worker API routes
http.route({
  path: "/api/ml/jobs/claim",
  method: "POST",
  handler: handleClaimJob,
});

http.route({
  path: "/api/ml/jobs/progress",
  method: "POST",
  handler: handleUpdateProgress,
});

http.route({
  path: "/api/ml/jobs/complete",
  method: "POST",
  handler: handleCompleteJob,
});

http.route({
  path: "/api/ml/jobs/fail",
  method: "POST",
  handler: handleFailJob,
});

http.route({
  path: "/api/ml/heartbeat",
  method: "POST",
  handler: handleWorkerHeartbeat,
});

http.route({
  path: "/api/ml/calibration",
  method: "POST",
  handler: handleCalibrationUpload,
});

export default http;
