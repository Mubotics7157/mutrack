# mutrack — 7157 ops tool

Schedule meetings, drop μpoints, track meeting attendance, and push purchase orders

## what you can do

- **Meetings** Admins and leads can spin up, edit, or delete meetings with descriptions, time blocks, and locations. Everyone sees the RSVP list, and reminders are sent to opted users via push notifications on multiple devices.
- **Real attendance from BLE beacons.** The time tracking tab can scan iBeacons over Web Bluetooth, spin up sessions, and roll them into clean hour totals per member without requiring sign ins.
- **μpoints + leaderboard hype.** Award μpoints manually or by completing bounties, track full award history, and surface a live leaderboard with attendance stats mixed in. Push notifications fire when someone earns points or sneaks into the top three (assuming they opted in).
- **Bounties for ad-hoc tasks.** Leads/admins can post quests with point values and mark them complete with notes so the right member gets the credit.
- **Purchasing pipeline.** Track requests, vendors, approvals, and purchase orders in one view so nothing falls through.

## under the hood

- Frontend: React + Vite, Tailwind, lucide icons, Sonner toasts, and a glassmorphic UI layer.
- Backend: Convex handles the database, auth, cron-style scheduling, and server-side logic.
- Push: Web Push via `public/sw.js` on the client and `web-push` inside Convex actions.
- Hardware tie-ins: Web Bluetooth scanning for the attendance flow, with guard rails for browsers that can't scan.

## getting set up locally

1. Install deps:
   ```bash
   npm install
   ```
2. Wire up env vars:
   - Frontend (`.env` or shell):
     ```bash
     VITE_VAPID_PUBLIC_KEY=your_public_vapid_key
     ```
   - Convex deployment env:
     ```bash
     VAPID_PUBLIC_KEY=your_public_vapid_key
     VAPID_PRIVATE_KEY=your_private_vapid_key
     VAPID_CONTACT=mailto:you@example.com
     CONVEX_SITE_URL=https://your.dev.domain
     ```
   - Need keys? Run `npx web-push generate-vapid-keys` once and paste them in both places.
3. Kick off both servers:
   ```bash
   npm run dev
   ```
   Vite serves the React app, `convex dev` boots the backend, and the first account you create becomes the admin.

### other scripts

- `npm run build` — production Vite build.
- `npm run lint` — type-check both Convex + frontend, boot a one-off Convex backend (for schema validation), then build the client. Bring a coffee; it does a lot.

## folders, roughly

- `src/` — the React app.
  - `components/` — dashboard panels, onboarding flow, purchase UI, leaderboard tabs, and the BLE time-tracking screen.
  - `lib/` — helpers for members, formatting, and shared UI logic.
- `convex/` — database schema plus all server-side queries/mutations/actions.
  - `meetings.ts` schedules, RSVPs, and reminder jobs.
  - `members.ts` handles onboarding, μpoint math, leaderboard queries, and push preferences.
  - `attendance.ts` stores BLE check-ins and aggregates durations.
  - `bounties.ts` tracks quests that auto-award μpoints.
  - `notifications.ts` centralizes push sending.
  - `lib/meetingTime.ts` makes the reminder scheduler timezone-aware.
- `public/sw.js` — service worker that actually listens for pushes.

## roles & permissions

- `admin` — can manage roles, scrub members, handle meetings, award μpoints, and oversee purchases/bounties.
- `lead` — manages meetings, awards μpoints, and runs bounties.
- `member` — RSVP, view the directory + leaderboard, submit purchase requests, and opt into pushes.

## extra little notes

- Onboarding is a hard gate: no dashboard until the profile is filled out.
- Each device's push subscription is stored separately so phones and laptops can ping in sync.
- Meeting reminders reschedule themselves if they somehow fire early.
- Attendance durations use the earliest start + latest end per meeting/member so brief BLE dropouts don't nuke your hours.
- Leaderboard math blends μpoints, attendance totals, and award counts so you get a quick read on involvement.
