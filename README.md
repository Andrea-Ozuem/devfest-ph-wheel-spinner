# DevFest Raffle Wheel Spinner

An interactive raffle wheel application for DevFest event. Admins create sessions, participants join via QR codes or session codes, and spin to win!

## Features

- Real-time wheel spinning with animated physics
- QR code generation for easy session joining
- Admin dashboard for session management
- Winner announcements

# DevFest Wheel Spinner

A lightweight, event-ready wheel spinner web app for randomly selecting participants during raffle draw sessions. Built with Vite + React + TypeScript and styled with Tailwind. Integrates with Firebase for auth and realtime data; includes Cloud Functions in the `functions/` folder.

## Features

- Interactive spinning wheel component with configurable segments
- Add and manage participants
- Join session modal for participants to enter sessions (QR codes / codes)
- Admin controls for starting/stopping spins and managing sessions
- Spin history and confetti celebration for winners
- Firebase integration (Auth + Firestore) and Cloud Functions

## Tech stack

- Vite
- React + TypeScript
- Tailwind CSS
- Firebase (Auth, Firestore, Cloud Functions)

## Demo

Run locally (instructions below).

## Prerequisites

- Node 18+ (or Bun)
- Firebase CLI (for deployment of hosting/functions)

## Install & Run (local)

Using Bun:

```bash
bun install
bun dev
```

Using npm:

```bash
npm install
npm run dev
```

The project uses Vite; the `dev` script runs the local dev server.

## Environment variables

This project reads Firebase configuration from Vite environment variables. Create a `.env` file in the project root (do not commit it) and provide the following variables:

```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

There may also be a project-specific admin secret used by some admin flows. If your project expects it, add:

```
VITE_ADMIN_SECRET_CODE=your_admin_code
```

These correspond to the config in `src/integrations/firebase/config.ts`.

## Firebase (deploying)

1. Install Firebase CLI and log in:

```bash
npm install -g firebase-tools
firebase login
```

2. Initialize or confirm your Firebase project settings.

3. Build and deploy:

```bash
npm run build
firebase deploy --only hosting,functions
```

Note: Cloud Functions live in the `functions/` folder — change into that directory to install dependencies and manage functions:

```bash
cd functions
npm install
```

## Project structure (high level)

- `src/` — main frontend source
  - `components/` — UI components (WheelSpinner, Admin UI, dialogs)
  - `integrations/firebase/` — Firebase initialization (`config.ts`)
  - `pages/` — application pages (Admin, Auth, Index)
- `functions/` — Firebase Cloud Functions (Node project)
- `public/` — static assets
- `package.json` — project scripts and dependencies

## Scripts

- `npm run dev` — start local dev server (Vite)
- `npm run build` — build production assets
- `npm run preview` — preview the production build
- `npm run lint` — run ESLint

## Contributing

- Fork the repo and open a pull request. Keep changes small and focused.
- Run `npm run lint` and verify the app builds before submitting.

## Troubleshooting

- If Firebase auth or DB fails to initialize, confirm your `.env` values and Firebase project settings.
- If ports are busy, change the Vite port in `vite.config.ts` or run with `PORT=your_port npm run dev`.

## License

This project has no license specified — add a `LICENSE` file if you want to define one.

## Acknowledgements

Built with popular OSS tooling: Vite, React, Tailwind, and Firebase. Inspired by event spinner apps used at conferences and meetups.
