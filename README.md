# Airtable Dashboard PWA

A personal life management dashboard that syncs with Airtable. Built as an offline-first Progressive Web App for mobile use.

## Features

- **Offline-First**: Full functionality without internet. Changes sync automatically when reconnected.
- **PWA**: Installable on iOS and Android. Works like a native app.
- **Real-Time Sync**: Bi-directional sync with Airtable as the source of truth.
- **Data Visualization**: Charts for health trends, writing progress, and goal completion.

## What It Tracks

| Module | Description |
|--------|-------------|
| **Health** | Glucose readings, insulin units, exercise reps, willpoints |
| **Words** | Daily word counts by project (Arcadia, Blog, Notes, Novella) |
| **Goals** | Weekly, monthly, and annual goals with confidence tracking |
| **Ideas** | Insights categorized as revelations, drivers, bottlenecks, etc. |
| **Rules** | Personal rules and limits with status tracking |
| **Scoping** | Project scoping items (claims, mechanisms, outlines) |

## Tech Stack

- **React 19** + **TypeScript** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Dexie.js** - IndexedDB wrapper for offline storage
- **React Query** - Server state management
- **Zustand** - Global state (sync status)
- **Recharts** - Data visualization
- **vite-plugin-pwa** - PWA capabilities

## Getting Started

### Prerequisites

- Node.js 18+
- An Airtable account with a configured base

### Installation

```bash
# Clone the repository
git clone https://github.com/jonathan-pf/dashboard-test.git
cd dashboard-test

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Airtable credentials
```

### Environment Variables

Create a `.env` file with:

```env
VITE_AIRTABLE_PAT=pat...      # Your Airtable Personal Access Token
VITE_AIRTABLE_BASE_ID=app...  # Your Airtable Base ID
```

### Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build

```bash
npm run build
```

Output is in the `dist/` directory.

## Project Structure

```
src/
├── components/      # Reusable UI components
│   ├── charts/      # Data visualization (HealthTrendChart, GoalProgressRing)
│   └── layout/      # App shell, header, navigation
├── db/              # Dexie database schema
├── hooks/           # React hooks for data access
├── pages/           # Route components
├── services/        # Airtable API and sync logic
├── stores/          # Zustand stores
└── types/           # TypeScript definitions
```

## How Sync Works

1. **Initial Load**: Fetches all data from Airtable, stores in IndexedDB
2. **Reading Data**: UI reads from local IndexedDB via Dexie live queries
3. **Writing Data**: Mutations save locally first, then sync to Airtable
4. **Offline Mode**: Mutations queue in `pendingMutations` table
5. **Reconnection**: Queued mutations automatically sync to Airtable

## Deployment

Deployed on Vercel with automatic deploys on push.

```bash
# Manual deploy
vercel --prod
```

## License

Private project.
