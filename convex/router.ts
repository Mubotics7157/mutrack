import { httpRouter } from "convex/server";
import { handleBeaconSightings, handleHeartbeat } from "./scannerApi";
import {
  handleSmsCheckInStatus,
  handleSmsCheckIn,
  handleSmsCheckOut,
} from "./smsCheckInApi";

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

export default http;
