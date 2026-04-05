# Migration Plan: Thresholds to Airtable + Conditional Rule Visibility

## Overview

Move threshold definitions from hardcoded config (`src/config/trafficLights.ts`) to a new Airtable `Thresholds` table. Add a linked record relationship between Thresholds and Rules so that certain rules only appear when a linked threshold is red.

## Prerequisites ( Airtable Setup)

Before running the code, create the following in Airtable using the API:

### 1. Create `Thresholds` table with these fields:

| Field Name | Field Type | Notes |
|---|---|---|
| `Name` | Single line text | e.g. "Sugar", "Reps", "Tidy" |
| `Source` | Single select | Options: `health`, `ideas` |
| `Health Type` | Single select | Options: `Units`, `Glucose`, `Reps`, `Willpoint`, `Tidy`, `Weight` (blank if Source=ideas) |
| `Idea Type` | Single select | Options: `Revelation`, `Crux`, `Driver`, `Bottleneck`, `Step`, `Failure`, `Bit`, `Stage`, `Feature`, `Blog`, `Question`, `Skill`, `Gen`, `Model` (blank if Source=health) |
| `Aggregation` | Single select | Options: `lastValue`, `sumLast7Days`, `countLastNDays` |
| `Days` | Number (integer) | Only used when Aggregation=`countLastNDays` (for Ideas). e.g. `7`, `30` |
| `Red Threshold` | Number (decimal) | Value at which light turns red |
| `Green Threshold` | Number (decimal) | Value at which light turns green |
| `Lower Is Better` | Checkbox | `true` for metrics like Sugar, Weight |
| `Rules` | Link to another record → `Rules` | Many-to-many link |

### 2. Populate with existing data:

| Name | Source | Health Type | Idea Type | Aggregation | Days | Red | Green | Lower Is Better |
|---|---|---|---|---|---|---|---|---|
| Tidy | health | Tidy | | lastValue | | 3 | 5 | ☐ |
| Reps | health | Reps | | sumLast7Days | | 30 | 50 | ☐ |
| Sugar | health | Glucose | | lastValue | | 9 | 8 | ☑ |
| Weight | health | Weight | | lastValue | | 96 | 95 | ☑ |
| Steps/wk | ideas | | Step | countLastNDays | 7 | 1 | 3 | ☐ |
| Revelations/mo | ideas | | Revelation | countLastNDays | 30 | 1 | 3 | ☐ |
| Skills/mo | ideas | | Skill | countLastNDays | 30 | 1 | 3 | ☐ |

### 3. Link Rules to Thresholds

In the `Rules` table, Airtable will auto-create a `Thresholds` linked record field (the reverse of the `Rules` link on the Thresholds table). For any rule that should only show when a threshold is red, link it to the relevant threshold(s).

---

## Code Changes

### Step 1: Add types (`src/types/airtable.ts`)

**Add the Airtable record type** (after `RulesRecord`, around line 154):

```typescript
// Thresholds table - traffic light definitions
export interface ThresholdsRecord extends AirtableRecord {
  fields: {
    Name: string
    Source: 'health' | 'ideas'
    'Health Type'?: 'Units' | 'Glucose' | 'Reps' | 'Willpoint' | 'Tidy' | 'Weight' | null
    'Idea Type'?: 'Revelation' | 'Crux' | 'Driver' | 'Bottleneck' | 'Step' | 'Failure' | 'Bit' | 'Stage' | 'Feature' | 'Blog' | 'Question' | 'Skill' | 'Gen' | 'Model' | null
    Aggregation: 'lastValue' | 'sumLast7Days' | 'countLastNDays'
    Days?: number | null
    'Red Threshold': number
    'Green Threshold': number
    'Lower Is Better'?: boolean
    Rules?: string[] // Linked record IDs
  }
}
```

**Add the local record type** (after `LocalRulesRecord`, around line 290):

```typescript
export interface LocalThresholdsRecord {
  id: string
  name: string
  source: 'health' | 'ideas'
  healthType: LocalHealthRecord['type'] | null
  ideaType: LocalIdeasRecord['type'] | null
  aggregation: 'lastValue' | 'sumLast7Days' | 'countLastNDays'
  days: number | null
  redThreshold: number
  greenThreshold: number
  lowerIsBetter: boolean
  ruleIds: string[] // Linked Rule record IDs
  createdTime: string
}
```

**Update `LocalRulesRecord`** — add a `thresholdIds` field:

```typescript
export interface LocalRulesRecord {
  // ... existing fields ...
  thresholdIds: string[] // Linked Threshold record IDs
}
```

**Update `RulesRecord`** — add the Airtable-side linked field:

```typescript
export interface RulesRecord extends AirtableRecord {
  fields: {
    // ... existing fields ...
    Thresholds?: string[] // Linked record IDs (auto-created by Airtable)
  }
}
```

**Add to `TABLES` constant:**

```typescript
export const TABLES = {
  // ... existing ...
  THRESHOLDS: 'Thresholds',
} as const
```

### Step 2: Add Dexie table (`src/db/index.ts`)

**Add table declaration** to `DashboardDatabase` class (around line 28):

```typescript
thresholds!: EntityTable<LocalThresholdsRecord, 'id'>
```

**Add import** for `LocalThresholdsRecord`.

**Add new version (11):**

```typescript
this.version(11).stores({
  health: 'id, type, date, weekId, unitsType, _pendingSync',
  words: 'id, project, when, weekId, _pendingSync',
  weeks: 'id, name, weekCommencing, weekNumber, thisWeek, lastWeek, nextWeek',
  goals: 'id, status, deadline, weekId, type, _pendingSync',
  areas: 'id, name, type',
  ideas: 'id, type, when, weekId, status, _pendingSync',
  career: 'id, name',
  rules: 'id, status, select',
  events: 'id, type, date, status, dateHeld, _pendingSync',
  leisure: 'id, type, status, dateStarted, dateEnded, _pendingSync',
  thresholds: 'id, source, name',
  pendingMutations: '++id, tableName, operation, recordId, timestamp',
  syncMeta: 'key',
})
```

**Add `db.thresholds.clear()`** to the `clearAllData()` function.

### Step 3: Add sync logic (`src/services/sync.ts`)

**Add import** for `ThresholdsRecord` and `LocalThresholdsRecord`.

**Add transform function** (near the other transform functions, around line 168):

```typescript
function transformThresholdsRecord(record: ThresholdsRecord): LocalThresholdsRecord {
  return {
    id: record.id,
    name: record.fields.Name || '',
    source: record.fields.Source || 'health',
    healthType: record.fields['Health Type'] ?? null,
    ideaType: record.fields['Idea Type'] ?? null,
    aggregation: record.fields.Aggregation || 'lastValue',
    days: record.fields.Days ?? null,
    redThreshold: record.fields['Red Threshold'] ?? 0,
    greenThreshold: record.fields['Green Threshold'] ?? 0,
    lowerIsBetter: record.fields['Lower Is Better'] ?? false,
    ruleIds: record.fields.Rules ?? [],
    createdTime: record.createdTime,
  }
}
```

**Update `transformRulesRecord`** to include the new field:

```typescript
function transformRulesRecord(record: RulesRecord): LocalRulesRecord {
  return {
    // ... existing fields ...
    thresholdIds: record.fields.Thresholds ?? [],
  }
}
```

**Update `pullAllData()`:**

1. Add `let thresholdsRecords: ThresholdsRecord[] = []` with the other declarations
2. Add `thresholdsRecords = await fetchTable<ThresholdsRecord>('Thresholds')` in the fetch block
3. Add `await db.thresholds.clear()` in the transaction
4. Add `await db.thresholds.bulkPut(thresholdsRecords.map(transformThresholdsRecord))` in the transaction
5. Update the summary debug log to include thresholds count

### Step 4: Add hooks (`src/hooks/useAirtableData.ts`)

**Add import** for `LocalThresholdsRecord`.

**Add hook:**

```typescript
export function useThresholds() {
  return useLiveQuery(() => db.thresholds.toArray(), [])
}
```

### Step 5: Update `src/config/trafficLights.ts`

**Keep the file but simplify it.** Remove `TRAFFIC_LIGHT_DEFINITIONS` and the old type interfaces. Keep only:

- `TrafficLightColor` type
- `getTrafficLightColor()` function (it works with any object that has `redThreshold`, `greenThreshold`, `lowerIsBetter`)

**Update `getTrafficLightColor` signature** to accept the minimal shape:

```typescript
export type TrafficLightColor = 'green' | 'amber' | 'red' | 'grey'

export interface ThresholdColorConfig {
  redThreshold: number
  greenThreshold: number
  lowerIsBetter: boolean
}

export function getTrafficLightColor(
  value: number | null,
  def: ThresholdColorConfig
): TrafficLightColor {
  // ... same logic, unchanged ...
}
```

**Add hardcoded fallback definitions** for use before first sync:

```typescript
export const FALLBACK_DEFINITIONS: Array<{
  name: string
  source: 'health' | 'ideas'
  healthType?: string
  ideaType?: string
  aggregation: string
  days?: number
  redThreshold: number
  greenThreshold: number
  lowerIsBetter: boolean
}> = [
  { name: 'Tidy', source: 'health', healthType: 'Tidy', aggregation: 'lastValue', redThreshold: 3, greenThreshold: 5, lowerIsBetter: false },
  { name: 'Reps', source: 'health', healthType: 'Reps', aggregation: 'sumLast7Days', redThreshold: 30, greenThreshold: 50, lowerIsBetter: false },
  { name: 'Sugar', source: 'health', healthType: 'Glucose', aggregation: 'lastValue', redThreshold: 9, greenThreshold: 8, lowerIsBetter: true },
  { name: 'Weight', source: 'health', healthType: 'Weight', aggregation: 'lastValue', redThreshold: 96, greenThreshold: 95, lowerIsBetter: true },
  { name: 'Steps/wk', source: 'ideas', ideaType: 'Step', aggregation: 'countLastNDays', days: 7, redThreshold: 1, greenThreshold: 3, lowerIsBetter: false },
  { name: 'Revelations/mo', source: 'ideas', ideaType: 'Revelation', aggregation: 'countLastNDays', days: 30, redThreshold: 1, greenThreshold: 3, lowerIsBetter: false },
  { name: 'Skills/mo', source: 'ideas', ideaType: 'Skill', aggregation: 'countLastNDays', days: 30, redThreshold: 1, greenThreshold: 3, lowerIsBetter: false },
]
```

### Step 6: Update `src/components/widgets/TrafficLightWidget.tsx`

Replace the hardcoded `TRAFFIC_LIGHT_DEFINITIONS` import with the `useThresholds()` hook:

```typescript
import { useThresholds } from '@/hooks/useAirtableData'
import { FALLBACK_DEFINITIONS } from '@/config/trafficLights'

export function TrafficLightWidgets() {
  const thresholds = useThresholds()

  // Use DB thresholds if available, fallback for pre-sync
  const definitions = thresholds && thresholds.length > 0
    ? thresholds
    : FALLBACK_DEFINITIONS

  return (
    <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-200">
      <h3 className="font-semibold text-slate-900 mb-2 text-sm">Thresholds</h3>
      <div className="grid grid-cols-4 gap-2">
        {definitions.map((def) => (
          <TrafficLightItem key={def.name} definition={def} />
        ))}
      </div>
    </div>
  )
}
```

Update `HealthTrafficLightItem` and `IdeasTrafficLightItem` to accept `LocalThresholdsRecord` (or the fallback shape) instead of the old typed definitions. The logic is the same — just read from `def.healthType`/`def.ideaType`/`def.aggregation` etc.

### Step 7: Conditional Rule Visibility (`src/pages/Rules.tsx`)

**Add a `useAllThresholdColors()` hook** in `src/hooks/useAirtableData.ts` that computes the current traffic light color for every threshold:

```typescript
export function useAllThresholdColors() {
  const thresholds = useThresholds()

  return useLiveQuery(async () => {
    if (!thresholds) return new Map<string, TrafficLightColor>()

    const colors = new Map<string, TrafficLightColor>()

    for (const t of thresholds) {
      let value: number | null = null

      if (t.source === 'health' && t.healthType) {
        if (t.aggregation === 'lastValue') {
          const records = await db.health
            .where('type').equals(t.healthType)
            .toArray()
          const sorted = records.sort((a, b) => b.date.localeCompare(a.date))
          value = sorted[0]?.value ?? null
        } else if (t.aggregation === 'sumLast7Days') {
          const cutoff = new Date()
          cutoff.setDate(cutoff.getDate() - 7)
          const cutoffStr = cutoff.toISOString().split('T')[0]
          const records = await db.health
            .where('type').equals(t.healthType)
            .and(r => r.date >= cutoffStr)
            .toArray()
          value = records.reduce((sum, r) => sum + r.value, 0)
        }
      } else if (t.source === 'ideas' && t.ideaType) {
        const days = t.days ?? 7
        const cutoff = new Date()
        cutoff.setDate(cutoff.getDate() - days)
        const cutoffStr = cutoff.toISOString().split('T')[0]
        const records = await db.ideas
          .where('type').equals(t.ideaType)
          .and(r => r.when >= cutoffStr)
          .toArray()
        value = records.length
      }

      colors.set(t.id, getTrafficLightColor(value, t))
    }

    return colors
  }, [thresholds])
}
```

Then in `Rules.tsx`, filter the displayed rules:

```typescript
const thresholdColors = useAllThresholdColors()

// A rule is visible if:
// 1. It has no linked thresholds (thresholdIds is empty) — always visible
// 2. At least one of its linked thresholds is currently red
const visibleRules = filteredRules?.filter(rule => {
  if (!rule.thresholdIds || rule.thresholdIds.length === 0) return true
  if (!thresholdColors) return true // show all while loading
  return rule.thresholdIds.some(id => thresholdColors.get(id) === 'red')
})
```

**Add a visual indicator** on conditional rules — a small tag showing they're threshold-triggered:

```typescript
{rule.thresholdIds?.length > 0 && (
  <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600">
    Catch-up
  </span>
)}
```

### Step 8: Update the Dashboard (`src/pages/Dashboard.tsx`)

If the dashboard shows a Live rules count, update it to also apply the threshold filter so the count reflects only visible rules.

### Step 9: Version bump (`src/pages/Settings.tsx`)

Update line 134: `v1.43.1` → `v1.44.0` (new feature).

---

## File Change Summary

| File | Change |
|---|---|
| `src/types/airtable.ts` | Add `ThresholdsRecord`, `LocalThresholdsRecord`, update `RulesRecord` + `LocalRulesRecord`, add to `TABLES` |
| `src/db/index.ts` | Add `thresholds` table, version 11, update `clearAllData()` |
| `src/services/sync.ts` | Add `transformThresholdsRecord`, update `transformRulesRecord`, fetch + store thresholds in `pullAllData()` |
| `src/hooks/useAirtableData.ts` | Add `useThresholds()`, `useAllThresholdColors()` |
| `src/config/trafficLights.ts` | Remove old interfaces + `TRAFFIC_LIGHT_DEFINITIONS`, keep `getTrafficLightColor()` with simplified interface, add `FALLBACK_DEFINITIONS` |
| `src/components/widgets/TrafficLightWidget.tsx` | Use `useThresholds()` instead of hardcoded definitions, adapt component props |
| `src/pages/Rules.tsx` | Filter rules by threshold color, add "Catch-up" indicator |
| `src/pages/Dashboard.tsx` | Apply threshold filter to rules count (if applicable) |
| `src/pages/Settings.tsx` | Version bump to `v1.44.0` |

## Testing Checklist

- [ ] Thresholds table syncs correctly from Airtable
- [ ] Traffic light widget shows same colors as before migration
- [ ] Traffic light widget updates when Airtable threshold values change (after sync)
- [ ] Fallback definitions work on first load before sync
- [ ] Rules without linked thresholds always show
- [ ] Rules with linked thresholds only show when at least one threshold is red
- [ ] Rules with linked thresholds hide when all linked thresholds are green/amber
- [ ] "Catch-up" tag appears on threshold-linked rules
- [ ] Creating/editing rules still works (thresholdIds preserved)
- [ ] Offline sync still works correctly
