# DevFest Raffle Wheel Spinner

An interactive raffle wheel application for DevFest events. Admins create sessions, participants join via QR codes or session codes, and spin to win!

## Features

- Real-time wheel spinning with animated physics
- QR code generation for easy session joining
- Admin dashboard for session management
- Participant management and tracking
- Winner announcements with confetti
- Draw history tracking

## Tech Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS + shadcn/ui
- Framer Motion
- Firebase (Firestore + Auth)
- React Router v6

## Getting Started

### Prerequisites

- Node.js 16+ or Bun
- Git

### Installation

```sh
npm install
npm run dev
```

### Environment Setup

Create a `.env.local` file with your Firebase credentials:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_ADMIN_SECRET_CODE=your_admin_code
```

## Development

```sh
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
```
