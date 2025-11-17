# DevFest Raffle Wheel Spinner

🎡 An interactive, real-time raffle wheel application for DevFest events. Admins create sessions, participants join via QR codes or session codes, and spin to win with animated wheel mechanics and live broadcasts!

## Overview

The DevFest Raffle Wheel is a raffle system designed for quick launch at large-scale events (100–500 users). It combines real-time synchronization, secure admin controls, and an engaging user experience with animated wheel mechanics and winner announcements.

## Core User Flows

### 1. Universal Homepage

- **Public Users**: View the static wheel and watch live spins in real-time
- **Admins**: Access spin controls, session management, and participant lists after login

### 2. Audience Join Flow

- Scan QR code or manually input 6-character session code
- Enter name → Auto-added to session participant pool
- Real-time updates visible to all viewers (admins and public)

### 3. Admin Session Management

- Login with email/password (Supabase Auth)
- Create new raffle session (name, prize, round info)
- Auto-generate QR code and shareable session code
- Manually add/remove participants
- View real-time participant counts

### 4. Live Draw & Winner Announcement

- Admin initiates spin with confirmation modal
- Realistic wheel animation broadcasts in real-time
- Winner announcement with celebration (confetti animation)
- Draw recorded in raffle history

---

## Essential Features

### ✨ Admin Controls

- **Admin-Only Spin Button**: Visible only to logged-in admins with confirmation modal
- **30-Second Cooldown**: Prevents accidental rapid re-spins
- **Session Management**: Create, activate/deactivate, and manage multiple session pools
- **Real-Time Participant Counts**: Monitor active participants per session
- **CSV Export** (Planned): Download session data for record-keeping

### 🎯 Core Mechanics

- **Separate Session Pools**: Each session (e.g., "Early Bird," "Lunch Draw") maintains isolated participant lists
- **Re-Spin Feature**: Admin can re-spin post-draw with history tracking
- **Participant Deduplication**: Auto-appends numbers to duplicate names (e.g., "John" → "John 2")
- **Winner Overlay**: Large, celebratory winner announcement with visual effects

### 👥 Real-Time Features

- **Live Wheel Broadcast**: Animated wheel synced across all connected users via WebSockets
- **Instant Participant Updates**: Users see participants join/leave in real-time
- **Public Viewer Mode**: Spectators watch live without login

### 📊 Raffle History

- **Session History**: Public page displaying past sessions with aggregated data
- **Draw Records**: Date, time, winner name, and participant count (privacy-friendly)
- **Session Details**: View historical raffle sessions and outcomes

### 🔐 Secure Admin Dashboard

- **Session Listing**: Overview of all active and inactive sessions
- **Real-Time Metrics**: Participant counts, session status, creation timestamps
- **Quick Actions**: Spin, view participants, generate QR codes
- **Role-Based Access**: Admin-only features protected by Row-Level Security (RLS)

---

## Technical Stack

### Frontend

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite (fast dev server, optimized builds)
- **Styling**: Tailwind CSS + shadcn/ui (Radix UI components)
- **Component Library**: 40+ pre-built UI components (dialogs, buttons, cards, tabs, etc.)
- **Animations**: Framer Motion (wheel spin, winner overlay)
- **State Management**: TanStack React Query (data fetching, caching, real-time sync)
- **Routing**: React Router v6

### Backend & Real-Time

- **Database**: Supabase (PostgreSQL with Row-Level Security)
- **Authentication**: Supabase Auth (email/password)
- **Real-Time Sync**: Supabase Realtime (PostgreSQL LISTEN/NOTIFY via WebSockets)
- **QR Code Generation**: qrcode.react

### Additional Libraries

- **Form Validation**: Zod + React Hook Form
- **Notifications**: Sonner (toast notifications)
- **Icons**: Lucide React
- **Package Manager**: Bun

---

## Feature Highlights

| Feature                    | Status      | Details                                           |
| -------------------------- | ----------- | ------------------------------------------------- |
| Real-Time Wheel Spin       | ✅ Complete | Animated spinning wheel with physics-based easing |
| Admin Session Management   | ✅ Complete | Create, manage, and deactivate sessions           |
| QR Code Generation         | ✅ Complete | Dynamic QR codes for session sharing              |
| Session Code System        | ✅ Complete | 6-char alphanumeric codes (easy manual entry)     |
| Real-Time Participant Sync | ✅ Complete | WebSocket-based live updates                      |
| Winner Announcement        | ✅ Complete | Confetti animation + visual overlay               |
| Draw History               | ✅ Complete | Record and display past draws                     |
| Admin Auth                 | ✅ Complete | Secure email/password login                       |
| Role-Based Access          | ✅ Complete | Supabase RLS policies enforce admin-only actions  |
| Re-Spin Functionality      | ✅ Complete | Admin can re-spin with history tracking           |
| Duplicate Name Handling    | ✅ Complete | Auto-append numbers to prevent conflicts          |

---

## Database Schema

```sql
sessions
├── id (UUID, PK)
├── name (TEXT) - Session name/event
├── code (TEXT, UNIQUE) - 6-char session code
├── prize (TEXT) - Prize description
├── round (TEXT) - Round/category info
├── active (BOOLEAN) - Session status
├── created_at (TIMESTAMP)
└── created_by (UUID, FK to auth.users)

participants
├── id (UUID, PK)
├── session_id (UUID, FK)
├── name (TEXT)
└── joined_at (TIMESTAMP)

draws
├── id (UUID, PK)
├── session_id (UUID, FK)
├── winner_name (TEXT)
├── timestamp (TIMESTAMP)
├── is_re_spin (BOOLEAN)
└── seed (TEXT)

user_roles
├── id (UUID, PK)
├── user_id (UUID, FK)
├── role (ENUM: 'admin', 'user')
└── UNIQUE(user_id, role)
```

**Security**: Row-Level Security (RLS) policies restrict admin actions to authenticated admin users.

---

## Getting Started

### Prerequisites

- Node.js 16+ or Bun
- Git

### Installation

```sh
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to project directory
cd devfest-wheel-spinner

# Install dependencies
npm install
# or with Bun
bun install

# Start development server
npm run dev
```

The application will be available at `http://localhost:8080` with hot module reloading.

### Environment Setup

Create a `.env.local` file in the root directory with your Supabase credentials:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## Development

### Available Scripts

```sh
# Start dev server
npm run dev

# Build for production
npm run build

# Build in development mode (debugging)
npm run build:dev

# Run ESLint
npm lint

# Preview production build locally
npm run preview
```

### Project Structure

```txt
src/
├── pages/
│   ├── Index.tsx          - Main raffle wheel interface
│   ├── Auth.tsx           - Admin login/signup
│   ├── Admin.tsx          - Admin dashboard
│   ├── History.tsx        - Raffle history viewer
│   └── NotFound.tsx       - 404 page
├── components/
│   ├── WheelSpinner.tsx   - Animated wheel component
│   ├── JoinSessionModal.tsx - Participant join modal
│   ├── Confetti.tsx       - Winner celebration animation
│   ├── NavLink.tsx        - Navigation
│   └── ui/                - 40+ shadcn/ui components
├── contexts/
│   └── AuthContext.tsx    - Auth state & admin role management
├── integrations/
│   └── supabase/
│       ├── client.ts      - Supabase client initialization
│       └── types.ts       - Database type definitions
├── hooks/
│   ├── use-mobile.tsx     - Mobile detection hook
│   └── use-toast.ts       - Toast notification hook
├── utils/
│   └── sessionCode.ts     - Session code generation & formatting
└── lib/
    └── utils.ts           - Utility functions
```

---

## Deployment

### Production Build

```sh
npm run build
```

This creates an optimized build in the `dist/` folder.

### Hosting Options

- **Vercel**: `vercel deploy` (recommended for Vite apps)
- **Netlify**: Drag-and-drop `dist/` folder or connect via Git
- **GitHub Pages**: Configure with `vite-plugin-gh-pages`
- **Self-Hosted**: Deploy `dist/` to any static file server (Nginx, Apache, etc.)

### Supabase Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run migrations in the SQL editor:

   ```sql
   -- Execute supabase/migrations/20251114130831_*.sql
   ```

3. Configure environment variables with your project credentials

---

## Architecture Decisions

### Real-Time Synchronization

- **WebSockets via Supabase**: Uses PostgreSQL `LISTEN/NOTIFY` for efficient real-time updates
- **TanStack React Query**: Handles data fetching, caching, and synchronization

### Security

- **Row-Level Security (RLS)**: Database-level access control ensures only admins can modify sessions
- **Supabase Auth**: Industry-standard email/password authentication with JWT tokens

### Performance

- **Vite**: Sub-second HMR (Hot Module Reload) for fast development
- **Code Splitting**: Automatic route-based code splitting with React Router
- **CSS Optimization**: Tailwind CSS with PurgeCSS for minimal bundle size

### UI/UX

- **Component Library**: shadcn/ui provides accessible, themeable Radix UI components
- **Responsive Design**: Mobile-first approach with Tailwind breakpoints
- **Animations**: Framer Motion for smooth, physics-based wheel mechanics

---

## Roadmap (Post-MVP)

- [ ] CSV export for session data
- [ ] Admin analytics dashboard
- [ ] Participant statistics & demographics
- [ ] Customizable wheel colors/themes
- [ ] Email notifications for winners
- [ ] Session templates
- [ ] Multi-language support
- [ ] Leaderboard system

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## License

This project is open source. See `LICENSE` file for details.

---

## Support

For issues, feature requests, or questions, please open an issue on GitHub or contact the development team.
