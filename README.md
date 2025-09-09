# MuTrack — FRC Team 7157 Internal Tool

Team operations hub for FRC 7157. Schedule and get reminded about meetings, track RSVPs, manage members and roles, and run the purchasing workflow — all in one place.

## Features

- Meetings
  - Create/update/delete meetings (admin/lead)
  - RSVPs with per-user status
  - Push notifications to all opted-in members
- Members
  - Member list visible to all authenticated users
- Onboarding
  - Prompts for web push notifications and saves device subscriptions
- Purchases
  - Request tracking UI with statuses and vendor info (see `PurchasesPage`/`PurchasesPanel`)

## Tech stack

- Frontend: React + Vite, Tailwind CSS, `lucide-react`, `sonner`
- Backend: Convex (database, functions, scheduler), Convex Auth
- Push: Web Push with service worker (`public/sw.js`) and `web-push` on the server

## Local development

1. Install dependencies

```bash
npm install
```

2. Configure environment

Frontend (.env or shell):

```bash
# must match backend public key
VITE_VAPID_PUBLIC_KEY=YOUR_PUBLIC_VAPID_KEY
```

Backend (Convex environment):

```bash
# set these in your Convex deployment environment
VAPID_PUBLIC_KEY=YOUR_PUBLIC_VAPID_KEY
VAPID_PRIVATE_KEY=YOUR_PRIVATE_VAPID_KEY
VAPID_CONTACT=mailto:you@example.com
```

Generate VAPID keys (one-time):

```bash
npx web-push generate-vapid-keys
```

3. Start dev servers

```bash
npm run dev
```

- Frontend runs on Vite
- Backend runs on Convex dev

Sign up with email/password. The first account created becomes `admin` automatically.

## Project structure

- `src/` — React app components and pages
  - `components/HomePage.tsx` — calendar view, quick meeting actions
  - `components/MembersPage.tsx` — member list, role management, admin remove
  - `components/PurchasesPage.tsx` — purchase request UI
  - `components/ProfilePage.tsx` — per-device push enable, past meetings calendar
  - `components/Onboarding.tsx` — real-name + phone + push enable
- `convex/` — Convex functions and schema
  - `schema.ts` — tables: `members`, `meetings`, `meetingRsvps`, `purchase*`, `pushSubscriptions`
  - `members.ts` — current user, list, role updates, delete, onboarding, push saves
  - `meetings.ts` — CRUD, RSVP, and queries (includes `getMeetingById`)
  - `notifications.ts` — internal actions to broadcast web push
- `public/sw.js` — service worker for web push notifications

## Roles & access

- `admin`: full access — manage roles, remove members, manage meetings
- `lead`: manage meetings
- `member`: view members, RSVP, participate

## Notes

- Push subscriptions are stored per device in `pushSubscriptions`, allowing desktop and phone to both receive alerts
- Onboarding gates the app until completed (`onboardingCompleted` flag)
- Gradients are used sparingly in the UI; toggles and headings are toned down for clarity

## Useful links

- Convex docs: https://docs.convex.dev/
- Convex Auth: https://auth.convex.dev/
- Vite: https://vitejs.dev/
