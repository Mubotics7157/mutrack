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

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
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
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
