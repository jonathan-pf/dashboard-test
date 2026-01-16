# Airtable Dashboard PWA

A personal productivity dashboard with offline-first architecture, built to track health metrics, writing goals, personal goals, ideas, and rules. Designed for mobile use with PWA capabilities.

**Version:** 1.7.0

## Features

- **Dashboard** - Overview with career totals, weekly stats, charts, and live rules
- **Health Tracking** - Monitor glucose, units, reps, and willpoints
- **Words** - Track writing progress across projects (Arcadia, Blog, Notes, Novella)
- **Goals** - Manage weekly, monthly, and annual goals with status and confidence tracking
- **Ideas** - Capture ideas by type (Revelation, Crux Test, Driver, Bottleneck, etc.)
- **Rules** - Personal goals and limits with status management
- **Offline Support** - Full functionality without internet, syncs when online
- **PWA** - Installable on mobile devices as a native-like app

## Tech Stack

- **React 19** with TypeScript
- **Vite** - Build tool with PWA plugin
- **TailwindCSS 4** - Styling
- **TanStack React Query v5** - Server state management
- **Zustand** - Local state management
- **Dexie.js** - IndexedDB for offline storage
- **Recharts** - Data visualization
- **Airtable** - Backend data storage

## Getting Started

### Prerequisites

- Node.js (LTS recommended)
- Airtable account with a configured base
- Airtable Personal Access Token (PAT)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/jonathan-pf/dashboard-test.git
   cd dashboard-test
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your Airtable credentials:
   ```
   VITE_AIRTABLE_PAT=your_personal_access_token
   VITE_AIRTABLE_BASE_ID=your_base_id
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:5173`

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run test` | Run tests in watch mode |
| `npm run test:run` | Run tests once |
| `npm run test:coverage` | Generate test coverage report |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run lint` | TypeScript type checking |

## Project Structure

```
src/
├── pages/           # Route pages (Dashboard, Health, Words, Goals, Ideas, Rules, Settings)
├── components/
│   ├── layout/      # AppShell, Header, BottomNav, OfflineBanner
│   ├── charts/      # GoalProgressRing, HealthTrendChart, WordsBarChart
│   └── widgets/     # StatCard and other UI components
├── hooks/           # Custom React hooks for data fetching and mutations
├── services/
│   ├── airtable.ts  # Airtable API service with rate limiting
│   └── sync.ts      # Offline sync with mutation queue
├── db/              # Dexie.js IndexedDB schema
├── stores/          # Zustand state stores
├── types/           # TypeScript interfaces
├── App.tsx          # Route definitions
└── main.tsx         # Entry point with providers
```

## Offline Architecture

The app uses an offline-first approach:

1. **Local Database** - All data is cached in IndexedDB via Dexie.js
2. **Mutation Queue** - Changes made offline are queued and synced when online
3. **Service Worker** - Caches API responses and enables offline access
4. **Automatic Sync** - Data syncs on app load and network reconnection

## License

ISC
