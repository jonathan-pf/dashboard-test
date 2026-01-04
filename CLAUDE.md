# CLAUDE.md

This file provides guidance for Claude Code when working on this project.

## Project Overview

This is a **Personal Life Dashboard PWA** that syncs with Airtable for data storage. It's an offline-first mobile web app built with React, TypeScript, and Tailwind CSS.

## Build & Development Commands

```bash
npm run dev      # Start development server (Vite)
npm run build    # TypeScript check + production build
npm run lint     # TypeScript no-emit check
npm run test:run # Run Vitest tests
```

## Architecture

### Data Flow

```
Airtable API → syncService → Dexie (IndexedDB) → useLiveQuery hooks → React UI
```

1. **Airtable** is the source of truth (cloud database)
2. **syncService** (`src/services/sync.ts`) handles bi-directional sync with transform functions
3. **Dexie** (`src/db/index.ts`) stores data locally in IndexedDB for offline access
4. **React hooks** (`src/hooks/useAirtableData.ts`) use `useLiveQuery` for reactive data
5. **UI components** render the data and dispatch mutations

### Offline-First Pattern

- All data operations go through local Dexie first
- Mutations are queued in `pendingMutations` table when offline
- On reconnect, `pushPendingMutations()` syncs changes to Airtable
- Records have `_pendingSync` flag until confirmed synced

### Key Services

- `src/services/airtable.ts` - Low-level Airtable API client with rate limiting
- `src/services/sync.ts` - Sync orchestration, transforms, and mutation queuing
- `src/stores/syncStore.ts` - Zustand store for sync status UI

## Data Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| Health | Track glucose, units, reps, willpoints | value, type, date |
| Words | Track writing by project | words, project, when |
| Goals | Weekly/Monthly/Annual goals | name, status, type, areaId, confidence |
| Ideas | Capture insights/concepts | name, type (9 types) |
| Rules | Personal rules/limits | name, select (Goal/Limit), status |
| Scoping | Project scoping items | name, type, created |
| Weeks | Central hub with rollups | weekNumber, thisWeek, lastWeek, nextWeek |
| Areas | Goal categories | name, type (Work/Personal/Health/Creative) |
| Career | Lifetime totals | totalDonations, totalLives |

## File Structure

```
src/
├── components/
│   ├── charts/          # HealthTrendChart, WordsBarChart, GoalProgressRing
│   ├── layout/          # AppShell, Header, BottomNav
│   └── ErrorBoundary.tsx
├── db/
│   └── index.ts         # Dexie database schema (version 6)
├── hooks/
│   └── useAirtableData.ts  # All data hooks (queries + mutations)
├── pages/               # Route components
├── services/
│   ├── airtable.ts      # API client
│   └── sync.ts          # Sync logic
├── stores/
│   └── syncStore.ts     # Zustand sync state
└── types/
    └── airtable.ts      # All type definitions
```

## Common Patterns

### Adding a New Data Type

1. Add Airtable record type in `src/types/airtable.ts` (e.g., `FooRecord`)
2. Add local record type (e.g., `LocalFooRecord`)
3. Add table to `TABLES` constant
4. Add Dexie table in `src/db/index.ts` (bump version)
5. Add transform functions in `src/services/sync.ts`
6. Add to `performFullSync()` in sync service
7. Add hooks in `src/hooks/useAirtableData.ts`

### Creating a New Page

1. Create page component in `src/pages/`
2. Add route in `src/App.tsx`
3. Add to BottomNav if primary, or link from parent page if secondary

### Mutation Pattern

```typescript
const createFoo = useCreateFoo()

await createFoo.mutateAsync({
  name: 'Example',
  // ... other fields (omit id, createdTime)
})
```

Mutations automatically:
- Save to local Dexie first
- Queue for Airtable sync
- Update UI via live queries

## Environment Variables

Required in `.env`:
```
VITE_AIRTABLE_PAT=pat...      # Airtable Personal Access Token
VITE_AIRTABLE_BASE_ID=app...  # Airtable Base ID
```

## PWA Configuration

- Configured in `vite.config.ts` via `vite-plugin-pwa`
- Service worker caches assets and Airtable API responses
- Manifest enables "Add to Home Screen"

## Testing

- **Vitest** for unit tests
- **Playwright** for E2E tests
- **MSW** for API mocking

## Deployment

Deployed to Vercel. Push to `claude/airtable-integration-plan-3nxet` branch triggers auto-deploy.

```bash
vercel --prod  # Manual production deploy
```
