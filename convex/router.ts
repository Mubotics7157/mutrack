import { httpRouter } from "convex/server";
import { handleBeaconSightings, handleHeartbeat } from "./scannerApi";

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

export default http;
