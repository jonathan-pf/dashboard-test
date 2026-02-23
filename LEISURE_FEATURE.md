# Leisure Feature Specification

## Overview

A Leisure tracker page for tracking media consumption (books, films, TV shows, games, etc.), accessible from a link card at the bottom of the Home/Dashboard page (same pattern as Events).

## Airtable Table: "Leisure"

### Fields

| Airtable Field | Type | Local Field | Notes |
|---|---|---|---|
| Name | string (required) | `name` | Title of the item |
| Status | single select | `status` | `Planned`, `Consumed`, `Live` |
| Type | single select | `type` | `Article`, `Book`, `Film`, `TV Show`, `Game`, `Play`, `Cinema`, `Immersive`, `Museum` |
| Date Started | date | `dateStarted` | ISO date string, nullable |
| Date Ended | date | `dateEnded` | ISO date string, nullable |
| URL | url | `url` | Optional link, nullable |
| Duration | number | `duration` | Duration in **seconds** (Airtable stores as seconds) |
| Rating | number | `rating` | 1-5 star rating, nullable |

## Data Layer

### Types (`src/types/airtable.ts`)

- `LeisureRecord` - Airtable API shape (extends `AirtableRecord`)
- `LocalLeisureRecord` - Local/Dexie shape with `id`, `name`, `status`, `type`, `dateStarted`, `dateEnded`, `url`, `duration`, `rating`, `createdTime`, `_pendingSync`, `_localId`
- `LeisureType` - union of the 9 type values
- `LeisureStatus` - `'Planned' | 'Consumed' | 'Live'`
- `LEISURE_TYPES` - const array of all types
- `LEISURE_STATUSES` - const array of all statuses
- `LEISURE_TYPE_COLORS` - maps each type to Tailwind badge classes (blue, cyan, teal, green, yellow, orange, red, pink, purple)
- `LEISURE_STATUS_COLORS` - maps each status to Tailwind badge classes
- Add `LEISURE: 'Leisure'` to the `TABLES` constant

### Database (`src/db/index.ts`)

- Add `leisure` table to Dexie schema: `EntityTable<LocalLeisureRecord, 'id'>`
- New DB version with indexes: `'id, type, status, dateStarted, dateEnded, _pendingSync'`
- Add `db.leisure.clear()` to `clearAllData()`

### Sync Service (`src/services/sync.ts`)

- `transformLeisureRecord(record: LeisureRecord): LocalLeisureRecord` - transforms Airtable fields to local shape
- `localLeisureToAirtable(record: LocalLeisureRecord): Record<string, unknown>` - transforms local back to Airtable fields
- Fetch `Leisure` table during `pullData()`, include in transaction, bulkPut transformed records
- `createLeisureRecord(data)` - creates locally with `local_` ID prefix, syncs to Airtable if online, queues mutation if offline
- `updateLeisureRecord(leisureId, updates)` - updates locally, syncs/queues
- `deleteLeisureRecord(leisureId)` - deletes locally, syncs/queues (skips API call for `local_` prefixed IDs)

### Hooks (`src/hooks/useAirtableData.ts`)

- `useLeisure()` - `useLiveQuery` on `db.leisure.orderBy('dateStarted').reverse()` (most recent first)
- `useCreateLeisure()` - mutation calling `syncService.createLeisureRecord`, invalidates `leisure` query key
- `useUpdateLeisure()` - mutation calling `syncService.updateLeisureRecord`, invalidates `leisure` query key
- `useDeleteLeisure()` - mutation calling `syncService.deleteLeisureRecord`, invalidates `leisure` query key
- Add `leisure: ['leisure']` to `queryKeys`

## Routing (`src/App.tsx`)

- Import `Leisure` from `./pages/Leisure`
- Add route: `<Route path="/leisure" element={<Leisure />} />`

## Dashboard Link (`src/pages/Dashboard.tsx`)

Add a `<Link to="/leisure">` card at the bottom of the Dashboard (after Events), styled identically:

```tsx
<Link
  to="/leisure"
  className="block bg-white rounded-xl p-4 shadow-sm border border-slate-200 hover:border-blue-300 transition-colors"
>
  <div className="flex items-center justify-between">
    <h3 className="font-semibold text-slate-900">Leisure</h3>
    <span className="text-blue-600 text-sm">View all</span>
  </div>
  <p className="text-sm text-slate-500 mt-1">Track books, films, TV shows, games and more</p>
</Link>
```

## Leisure Page (`src/pages/Leisure.tsx`)

### Stats Section (top)

Three stat cards in a 3-column grid:
1. **Total 2026** - total duration of items started/ended in 2026, formatted as `Xh Ym`
2. **Avg / Week** - total 2026 duration divided by current week number
3. **Avg Rating** - average star rating across all rated items (or `--` if none)

### Type Breakdown Chart

Horizontal bar chart showing time by type for 2026 data. Each type gets a distinct bar color:
- Article: `#3b82f6` (blue)
- Book: `#06b6d4` (cyan)
- Film: `#14b8a6` (teal)
- TV Show: `#22c55e` (green)
- Game: `#eab308` (yellow)
- Play: `#f97316` (orange)
- Cinema: `#ef4444` (red)
- Immersive: `#ec4899` (pink)
- Museum: `#a855f7` (purple)

Bars are proportional to the max duration type. Shows duration if > 0, otherwise shows count.

### Filter Dropdown

Select dropdown in the header to filter by type (default "All Types").

### Add/Edit Form

Toggleable form with fields:
- **Name** (text input, required)
- **Type** (select from LEISURE_TYPES, default "Film")
- **Status** (select from LEISURE_STATUSES, default "Planned")
- **Date Started** (date input)
- **Date Ended** (date input)
- **URL** (url input, optional)
- **Duration** (two number inputs: hours + minutes, converted to/from seconds)
- **Rating** (interactive 5-star rating component - click to set, click same star to clear)
- Cancel / Save buttons

Clicking an item in the list opens the edit form pre-populated with that item's data.

### Items List

Each item card shows:
- Name (bold) with status badge (top right)
- Type badge, date range, duration, star rating (second row)
- URL as truncated link (if present)
- Delete button (top right, with confirm/cancel step)

Clicking an item opens it for editing. Items are sorted by dateStarted descending.

### Star Rating Component

Reusable `StarRating` component:
- 5 stars, amber when filled, slate when empty
- Click to rate, click same star to clear (set to 0)
- `readonly` mode for display-only use

### Duration Formatting

`formatDuration(seconds)` helper:
- Shows `Xh Ym`, `Xh`, or `Ym` as appropriate
