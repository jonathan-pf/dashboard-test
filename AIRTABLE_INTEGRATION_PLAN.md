# Airtable Dashboard App - Integration Plan

## Project Overview
Build a React PWA (Progressive Web App) that connects to an Airtable database, with offline support for mobile use (specifically iPhone on the tube/subway).

## Requirements Gathered

### Core Features
- **React Web Dashboard** with PWA capabilities
- **Offline-first architecture** - works without internet, syncs when back online
- **Read & Update** Airtable data (CRUD operations)
- **Dashboard widgets and graphs** - charts, stats, visualizations
- **Single user** - API key authentication (no user login system needed)

### Technical Requirements
- Progressive Web App (PWA) for "Add to Home Screen" on iPhone
- Service Worker for offline caching
- IndexedDB or similar for local data storage
- Background sync when connectivity returns
- Responsive design for mobile

### Airtable Configuration
- **Base ID:** `app18iDGP7PR53lG4`
- **API Key:** User will provide PAT (Personal Access Token) - store in `.env` file

## Next Steps (When Running from Local CLI)

### 1. Explore Airtable Schema
```bash
# Claude will run this to discover tables and fields:
curl "https://api.airtable.com/v0/meta/bases/app18iDGP7PR53lG4/tables" \
  -H "Authorization: Bearer <PAT>"
```

### 2. Based on Schema, Design:
- Data models for each table
- Offline sync strategy (which tables to cache, conflict resolution)
- Dashboard widgets appropriate for the data types
- Graph/chart types based on numeric and date fields

### 3. Proposed Tech Stack
- **Framework:** React 18+ with TypeScript
- **Build Tool:** Vite (fast, good PWA support)
- **PWA:** vite-plugin-pwa (Workbox under the hood)
- **Offline Storage:** Dexie.js (IndexedDB wrapper) or localForage
- **State Management:** Zustand or React Query (good offline support)
- **Charts:** Recharts or Chart.js
- **UI Components:** Tailwind CSS + shadcn/ui (or similar)
- **Airtable SDK:** airtable.js official package

### 4. Architecture Overview
```
┌─────────────────────────────────────────────────────────┐
│                    React PWA                             │
├─────────────────────────────────────────────────────────┤
│  UI Layer: Dashboard, Widgets, Forms, Charts            │
├─────────────────────────────────────────────────────────┤
│  State Layer: React Query + Zustand                     │
│  - Manages server state and UI state                    │
│  - Handles cache invalidation                           │
├─────────────────────────────────────────────────────────┤
│  Sync Layer: Custom sync service                        │
│  - Queues offline mutations                             │
│  - Handles conflict resolution                          │
│  - Background sync on reconnect                         │
├─────────────────────────────────────────────────────────┤
│  Storage Layer: IndexedDB (via Dexie.js)               │
│  - Cached Airtable data                                 │
│  - Pending mutations queue                              │
├─────────────────────────────────────────────────────────┤
│  API Layer: Airtable REST API                          │
│  - Read/Write operations                                │
│  - Rate limit handling                                  │
└─────────────────────────────────────────────────────────┘
```

## Session Notes

**Session 1 (Cloud Environment):**
- Gathered requirements from user
- Unable to access Airtable API due to cloud network restrictions
- User will restart session from local CLI for full API access
- User should provide PAT again when starting local session

## Questions to Resolve
1. What tables exist in the Airtable base?
2. What fields and field types are in each table?
3. Which data should be visualized in charts?
4. Any specific widget preferences?
5. Conflict resolution strategy (last-write-wins vs. manual merge)

---

**To continue:** Run Claude Code from local CLI, provide the Airtable PAT, and say "Let's continue with the Airtable dashboard plan"
