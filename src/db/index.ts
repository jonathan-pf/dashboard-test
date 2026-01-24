import Dexie, { type EntityTable } from 'dexie'
import type {
  LocalHealthRecord,
  LocalWordsRecord,
  LocalWeeksRecord,
  LocalGoalsRecord,
  LocalAreasRecord,
  LocalIdeasRecord,
  LocalCareerRecord,
  LocalRulesRecord,
  LocalEventsRecord,
  PendingMutation,
  SyncMeta,
} from '@/types/airtable'

class DashboardDatabase extends Dexie {
  health!: EntityTable<LocalHealthRecord, 'id'>
  words!: EntityTable<LocalWordsRecord, 'id'>
  weeks!: EntityTable<LocalWeeksRecord, 'id'>
  goals!: EntityTable<LocalGoalsRecord, 'id'>
  areas!: EntityTable<LocalAreasRecord, 'id'>
  ideas!: EntityTable<LocalIdeasRecord, 'id'>
  career!: EntityTable<LocalCareerRecord, 'id'>
  rules!: EntityTable<LocalRulesRecord, 'id'>
  events!: EntityTable<LocalEventsRecord, 'id'>
  pendingMutations!: EntityTable<PendingMutation, 'id'>
  syncMeta!: EntityTable<SyncMeta, 'key'>

  constructor() {
    super('DashboardDB')

    this.version(1).stores({
      health: 'id, type, date, weekId, _pendingSync',
      words: 'id, project, when, weekId, _pendingSync',
      weeks: 'id, name, weekCommencing, weekNumber, thisWeek, lastWeek, nextWeek',
      goals: 'id, status, deadline, weekId, type, _pendingSync',
      pendingMutations: '++id, tableName, operation, recordId, timestamp',
      syncMeta: 'key',
    })

    this.version(2).stores({
      health: 'id, type, date, weekId, _pendingSync',
      words: 'id, project, when, weekId, _pendingSync',
      weeks: 'id, name, weekCommencing, weekNumber, thisWeek, lastWeek, nextWeek',
      goals: 'id, status, deadline, weekId, type, _pendingSync',
      areas: 'id, name, type',
      pendingMutations: '++id, tableName, operation, recordId, timestamp',
      syncMeta: 'key',
    })

    this.version(3).stores({
      health: 'id, type, date, weekId, _pendingSync',
      words: 'id, project, when, weekId, _pendingSync',
      weeks: 'id, name, weekCommencing, weekNumber, thisWeek, lastWeek, nextWeek',
      goals: 'id, status, deadline, weekId, type, _pendingSync',
      areas: 'id, name, type',
      ideas: 'id, type, when, weekId, _pendingSync',
      pendingMutations: '++id, tableName, operation, recordId, timestamp',
      syncMeta: 'key',
    })

    this.version(4).stores({
      health: 'id, type, date, weekId, _pendingSync',
      words: 'id, project, when, weekId, _pendingSync',
      weeks: 'id, name, weekCommencing, weekNumber, thisWeek, lastWeek, nextWeek',
      goals: 'id, status, deadline, weekId, type, _pendingSync',
      areas: 'id, name, type',
      ideas: 'id, type, when, weekId, _pendingSync',
      career: 'id, name',
      pendingMutations: '++id, tableName, operation, recordId, timestamp',
      syncMeta: 'key',
    })

    this.version(5).stores({
      health: 'id, type, date, weekId, _pendingSync',
      words: 'id, project, when, weekId, _pendingSync',
      weeks: 'id, name, weekCommencing, weekNumber, thisWeek, lastWeek, nextWeek',
      goals: 'id, status, deadline, weekId, type, _pendingSync',
      areas: 'id, name, type',
      ideas: 'id, type, when, weekId, _pendingSync',
      career: 'id, name',
      rules: 'id, status, select',
      pendingMutations: '++id, tableName, operation, recordId, timestamp',
      syncMeta: 'key',
    })

    this.version(6).stores({
      health: 'id, type, date, weekId, _pendingSync',
      words: 'id, project, when, weekId, _pendingSync',
      weeks: 'id, name, weekCommencing, weekNumber, thisWeek, lastWeek, nextWeek',
      goals: 'id, status, deadline, weekId, type, _pendingSync',
      areas: 'id, name, type',
      ideas: 'id, type, when, weekId, _pendingSync',
      career: 'id, name',
      rules: 'id, status, select',
      events: 'id, type, date, _pendingSync',
      pendingMutations: '++id, tableName, operation, recordId, timestamp',
      syncMeta: 'key',
    })

    this.version(7).stores({
      health: 'id, type, date, weekId, _pendingSync',
      words: 'id, project, when, weekId, _pendingSync',
      weeks: 'id, name, weekCommencing, weekNumber, thisWeek, lastWeek, nextWeek',
      goals: 'id, status, deadline, weekId, type, _pendingSync',
      areas: 'id, name, type',
      ideas: 'id, type, when, weekId, _pendingSync',
      career: 'id, name',
      rules: 'id, status, select',
      events: 'id, type, date, status, dateHeld, _pendingSync',
      pendingMutations: '++id, tableName, operation, recordId, timestamp',
      syncMeta: 'key',
    })
  }
}

export const db = new DashboardDatabase()

// Helper functions for common operations
export async function getLastSyncTime(): Promise<number | null> {
  const meta = await db.syncMeta.get('lastSyncTime')
  return meta ? Number(meta.value) : null
}

export async function setLastSyncTime(time: number): Promise<void> {
  await db.syncMeta.put({ key: 'lastSyncTime', value: time })
}

export async function getPendingMutationsCount(): Promise<number> {
  return db.pendingMutations.count()
}

export async function addPendingMutation(mutation: Omit<PendingMutation, 'id'>): Promise<number> {
  const id = await db.pendingMutations.add(mutation as PendingMutation)
  return id as number
}

export async function getPendingMutations(): Promise<PendingMutation[]> {
  return db.pendingMutations.orderBy('timestamp').toArray()
}

export async function removePendingMutation(id: number): Promise<void> {
  await db.pendingMutations.delete(id)
}

export async function clearAllData(): Promise<void> {
  await Promise.all([
    db.health.clear(),
    db.words.clear(),
    db.weeks.clear(),
    db.goals.clear(),
    db.areas.clear(),
    db.ideas.clear(),
    db.career.clear(),
    db.rules.clear(),
    db.events.clear(),
    db.pendingMutations.clear(),
    db.syncMeta.clear(),
  ])
}

// Get current week
export async function getCurrentWeek(): Promise<LocalWeeksRecord | undefined> {
  return db.weeks.where('thisWeek').equals(1).first()
}

// Get health records for a specific type and date range
export async function getHealthByTypeAndDateRange(
  type: LocalHealthRecord['type'],
  startDate: string,
  endDate: string
): Promise<LocalHealthRecord[]> {
  return db.health
    .where('type')
    .equals(type)
    .and((record) => record.date >= startDate && record.date <= endDate)
    .toArray()
}

// Get words records for a specific week
export async function getWordsByWeek(weekId: string): Promise<LocalWordsRecord[]> {
  return db.words.where('weekId').equals(weekId).toArray()
}

// Get goals for current week
export async function getCurrentWeekGoals(): Promise<LocalGoalsRecord[]> {
  const currentWeek = await getCurrentWeek()
  if (!currentWeek) return []
  return db.goals.where('weekId').equals(currentWeek.id).toArray()
}
