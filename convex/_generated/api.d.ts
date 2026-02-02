/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as ResendOTPPasswordReset from "../ResendOTPPasswordReset.js";
import type * as analytics from "../analytics.js";
import type * as attendance from "../attendance.js";
import type * as auth from "../auth.js";
import type * as beacons from "../beacons.js";
import type * as bounties from "../bounties.js";
import type * as http from "../http.js";
import type * as lib_meetingTime from "../lib/meetingTime.js";
import type * as meetings from "../meetings.js";
import type * as members from "../members.js";
import type * as notifications from "../notifications.js";
import type * as purchases from "../purchases.js";
import type * as router from "../router.js";
import type * as scannerApi from "../scannerApi.js";
import type * as scanners from "../scanners.js";
import type * as shootingVideos from "../shootingVideos.js";
import type * as smsCheckIn from "../smsCheckIn.js";
import type * as smsCheckInApi from "../smsCheckInApi.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  ResendOTPPasswordReset: typeof ResendOTPPasswordReset;
  analytics: typeof analytics;
  attendance: typeof attendance;
  auth: typeof auth;
  beacons: typeof beacons;
  bounties: typeof bounties;
  http: typeof http;
  "lib/meetingTime": typeof lib_meetingTime;
  meetings: typeof meetings;
  members: typeof members;
  notifications: typeof notifications;
  purchases: typeof purchases;
  router: typeof router;
  scannerApi: typeof scannerApi;
  scanners: typeof scanners;
  shootingVideos: typeof shootingVideos;
  smsCheckIn: typeof smsCheckIn;
  smsCheckInApi: typeof smsCheckInApi;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
