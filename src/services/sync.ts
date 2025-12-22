import { airtableService, AirtableError } from './airtable'
import {
  db,
  setLastSyncTime,
  getPendingMutations,
  removePendingMutation,
  addPendingMutation,
} from '@/db'
import { useSyncStore } from '@/stores/syncStore'
import type {
  HealthRecord,
  WordsRecord,
  WeeksRecord,
  GoalsRecord,
  LocalHealthRecord,
  LocalWordsRecord,
  LocalWeeksRecord,
  LocalGoalsRecord,
  PendingMutation,
  TABLES,
} from '@/types/airtable'

const MAX_RETRY_COUNT = 3

// Transform Airtable records to local format
function transformHealthRecord(record: HealthRecord): LocalHealthRecord {
  return {
    id: record.id,
    name: record.fields.Name || '',
    value: record.fields.Value,
    type: record.fields.Type,
    date: record.fields.Date,
    weekId: record.fields['Week Link']?.[0] || null,
    createdTime: record.createdTime,
  }
}

function transformWordsRecord(record: WordsRecord): LocalWordsRecord {
  return {
    id: record.id,
    name: record.fields.Name || '',
    words: record.fields.Words,
    project: record.fields.Project,
    when: record.fields.When,
    weekId: record.fields['Weekly Link']?.[0] || null,
    createdTime: record.createdTime,
  }
}

function transformWeeksRecord(record: WeeksRecord): LocalWeeksRecord {
  return {
    id: record.id,
    name: record.fields.Name || '',
    weekCommencing: record.fields['Week Commencing'],
    weekNumber: record.fields['Week Number'] || 0,
    thisWeek: record.fields['This Week'] === 'Yes',
    lastWeek: record.fields['Last Week'] === 'Yes',
    nextWeek: record.fields['Next Week'] === 'Yes',
    averageSugar: record.fields['Average Sugar'] ?? null,
    totalUnits: record.fields['Total Units'] ?? null,
    totalReps: record.fields['Total Reps'] ?? null,
    totalWillpoints: record.fields['Total Willpoints'] ?? null,
    totalWords: record.fields['Total Words'] ?? null,
    totalNotes: record.fields['Total Notes'] ?? null,
    totalFiction: record.fields['Total Fiction'] ?? null,
    totalBlog: record.fields['Total Blog'] ?? null,
    totalIdeas: record.fields['Total Ideas'] ?? null,
    goalSuccess: record.fields['Goal Success'] ?? null,
    totalGoals: record.fields['Total Goals'] ?? null,
    goalSuccessRate: record.fields['Goal Success Rate'] ?? null,
    goalConfidence: record.fields['Goal Confidence'] ?? null,
    createdTime: record.createdTime,
  }
}

function transformGoalsRecord(record: GoalsRecord): LocalGoalsRecord {
  return {
    id: record.id,
    name: record.fields.Name || '',
    areaId: record.fields.Area?.[0] || null,
    initialConfidence: record.fields['Initial Confidence'] ?? null,
    currentConfidence: record.fields['Current Confidence'] ?? null,
    deadline: record.fields.Deadline,
    status: record.fields.Status,
    weekId: record.fields.Weeks?.[0] || null,
    type: record.fields.Type,
    notes: record.fields.Notes,
    createdTime: record.createdTime,
  }
}

// Transform local records back to Airtable format for mutations
function localHealthToAirtable(record: LocalHealthRecord): Record<string, unknown> {
  return {
    Value: record.value,
    Type: record.type,
    Date: record.date,
    'Week Link': record.weekId ? [record.weekId] : undefined,
  }
}

function localWordsToAirtable(record: LocalWordsRecord): Record<string, unknown> {
  return {
    Name: record.name,
    Words: record.words,
    Project: record.project,
    When: record.when,
    'Weekly Link': record.weekId ? [record.weekId] : undefined,
  }
}

// Used for future goal creation feature
export function localGoalsToAirtable(record: LocalGoalsRecord): Record<string, unknown> {
  return {
    Name: record.name,
    'Current Confidence': record.currentConfidence,
    Status: record.status,
    Notes: record.notes,
    Weeks: record.weekId ? [record.weekId] : undefined,
  }
}

class SyncService {
  private isSyncing = false

  async performFullSync(): Promise<void> {
    if (this.isSyncing) {
      console.log('Sync already in progress')
      return
    }

    const store = useSyncStore.getState()
    this.isSyncing = true
    store.setSyncing(true)
    store.setError(null)

    try {
      // First, push any pending mutations
      await this.pushPendingMutations()

      // Then, pull fresh data from Airtable
      await this.pullAllData()

      // Update last sync time
      const now = Date.now()
      await setLastSyncTime(now)
      store.setLastSyncTime(now)

      console.log('Full sync completed successfully')
    } catch (error) {
      console.error('Sync failed:', error)
      store.setError(error instanceof Error ? error.message : 'Sync failed')
      throw error
    } finally {
      this.isSyncing = false
      store.setSyncing(false)
    }
  }

  async pullAllData(): Promise<void> {
    console.log('Pulling data from Airtable...')

    // Fetch all tables in parallel
    const [healthRecords, wordsRecords, weeksRecords, goalsRecords] = await Promise.all([
      airtableService.fetchAllRecords<HealthRecord>('Health'),
      airtableService.fetchAllRecords<WordsRecord>('Words'),
      airtableService.fetchAllRecords<WeeksRecord>('Weeks'),
      airtableService.fetchAllRecords<GoalsRecord>('Goals'),
    ])

    // Transform and store locally
    await db.transaction('rw', [db.health, db.words, db.weeks, db.goals], async () => {
      // Clear existing data (except pending mutations)
      await db.health.clear()
      await db.words.clear()
      await db.weeks.clear()
      await db.goals.clear()

      // Bulk insert transformed records
      await db.health.bulkPut(healthRecords.map(transformHealthRecord))
      await db.words.bulkPut(wordsRecords.map(transformWordsRecord))
      await db.weeks.bulkPut(weeksRecords.map(transformWeeksRecord))
      await db.goals.bulkPut(goalsRecords.map(transformGoalsRecord))
    })

    console.log(
      `Pulled: ${healthRecords.length} health, ${wordsRecords.length} words, ${weeksRecords.length} weeks, ${goalsRecords.length} goals`
    )
  }

  async pushPendingMutations(): Promise<void> {
    const mutations = await getPendingMutations()
    if (mutations.length === 0) return

    console.log(`Pushing ${mutations.length} pending mutations...`)
    const store = useSyncStore.getState()

    for (const mutation of mutations) {
      try {
        await this.processMutation(mutation)
        await removePendingMutation(mutation.id!)
        store.decrementPending()
      } catch (error) {
        if (error instanceof AirtableError && error.isRateLimit) {
          // Retry later
          console.log('Rate limited, will retry later')
          break
        }

        // Increment retry count
        if (mutation.retryCount < MAX_RETRY_COUNT) {
          await db.pendingMutations.update(mutation.id!, {
            retryCount: mutation.retryCount + 1,
          })
        } else {
          // Max retries reached, remove and log error
          console.error(`Mutation failed after ${MAX_RETRY_COUNT} retries:`, mutation)
          await removePendingMutation(mutation.id!)
          store.decrementPending()
        }
      }
    }
  }

  private async processMutation(mutation: PendingMutation): Promise<void> {
    const { tableName, operation, recordId, data } = mutation

    switch (operation) {
      case 'create':
        await airtableService.createRecord(tableName as typeof TABLES[keyof typeof TABLES], data)
        break
      case 'update':
        await airtableService.updateRecord(
          tableName as typeof TABLES[keyof typeof TABLES],
          recordId,
          data
        )
        break
      case 'delete':
        await airtableService.deleteRecord(tableName as typeof TABLES[keyof typeof TABLES], recordId)
        break
    }
  }

  // Queue a mutation for offline sync
  async queueMutation(
    tableName: string,
    operation: 'create' | 'update' | 'delete',
    recordId: string,
    data: Record<string, unknown>,
    localId?: string
  ): Promise<void> {
    const store = useSyncStore.getState()

    await addPendingMutation({
      tableName,
      operation,
      recordId,
      localId,
      data,
      timestamp: Date.now(),
      retryCount: 0,
    })

    store.incrementPending()

    // If online, try to sync immediately
    if (navigator.onLine) {
      // Debounce immediate sync to batch rapid mutations
      this.debouncedSync()
    }
  }

  private syncTimeout: ReturnType<typeof setTimeout> | null = null

  private debouncedSync(): void {
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout)
    }
    this.syncTimeout = setTimeout(() => {
      this.pushPendingMutations().catch(console.error)
      this.syncTimeout = null
    }, 500)
  }

  // Create a health record (handles offline)
  async createHealthRecord(
    data: Omit<LocalHealthRecord, 'id' | 'name' | 'createdTime'>
  ): Promise<LocalHealthRecord> {
    const localId = `local_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const record: LocalHealthRecord = {
      id: localId,
      name: `${data.date} - ${data.type}`,
      ...data,
      createdTime: new Date().toISOString(),
      _pendingSync: true,
      _localId: localId,
    }

    await db.health.add(record)

    if (navigator.onLine) {
      try {
        const created = await airtableService.createRecord<HealthRecord>(
          'Health',
          localHealthToAirtable(record)
        )
        // Update local record with real ID
        await db.health.delete(localId)
        const updatedRecord = transformHealthRecord(created)
        await db.health.add(updatedRecord)
        return updatedRecord
      } catch {
        // Queue for later
        await this.queueMutation('Health', 'create', localId, localHealthToAirtable(record), localId)
      }
    } else {
      await this.queueMutation('Health', 'create', localId, localHealthToAirtable(record), localId)
    }

    return record
  }

  // Create a words record (handles offline)
  async createWordsRecord(
    data: Omit<LocalWordsRecord, 'id' | 'createdTime'>
  ): Promise<LocalWordsRecord> {
    const localId = `local_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const record: LocalWordsRecord = {
      id: localId,
      ...data,
      createdTime: new Date().toISOString(),
      _pendingSync: true,
      _localId: localId,
    }

    await db.words.add(record)

    if (navigator.onLine) {
      try {
        const created = await airtableService.createRecord<WordsRecord>(
          'Words',
          localWordsToAirtable(record)
        )
        await db.words.delete(localId)
        const updatedRecord = transformWordsRecord(created)
        await db.words.add(updatedRecord)
        return updatedRecord
      } catch {
        await this.queueMutation('Words', 'create', localId, localWordsToAirtable(record), localId)
      }
    } else {
      await this.queueMutation('Words', 'create', localId, localWordsToAirtable(record), localId)
    }

    return record
  }

  // Create a goal record (handles offline)
  async createGoalRecord(
    data: Omit<LocalGoalsRecord, 'id' | 'createdTime'>
  ): Promise<LocalGoalsRecord> {
    const localId = `local_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const record: LocalGoalsRecord = {
      id: localId,
      ...data,
      createdTime: new Date().toISOString(),
      _pendingSync: true,
      _localId: localId,
    }

    await db.goals.add(record)

    if (navigator.onLine) {
      try {
        const created = await airtableService.createRecord<GoalsRecord>(
          'Goals',
          localGoalsToAirtable(record)
        )
        await db.goals.delete(localId)
        const updatedRecord = transformGoalsRecord(created)
        await db.goals.add(updatedRecord)
        return updatedRecord
      } catch {
        await this.queueMutation('Goals', 'create', localId, localGoalsToAirtable(record), localId)
      }
    } else {
      await this.queueMutation('Goals', 'create', localId, localGoalsToAirtable(record), localId)
    }

    return record
  }

  // Update goal status (handles offline)
  async updateGoalStatus(
    goalId: string,
    status: LocalGoalsRecord['status']
  ): Promise<void> {
    const goal = await db.goals.get(goalId)
    if (!goal) throw new Error('Goal not found')

    goal.status = status
    goal._pendingSync = true
    await db.goals.put(goal)

    if (navigator.onLine) {
      try {
        await airtableService.updateRecord('Goals', goalId, { Status: status })
        goal._pendingSync = false
        await db.goals.put(goal)
      } catch {
        await this.queueMutation('Goals', 'update', goalId, { Status: status })
      }
    } else {
      await this.queueMutation('Goals', 'update', goalId, { Status: status })
    }
  }

  // Initialize sync listeners
  initializeListeners(): void {
    // Sync when coming back online
    window.addEventListener('online', () => {
      console.log('Back online, syncing...')
      this.performFullSync().catch(console.error)
    })

    // Track offline status
    window.addEventListener('offline', () => {
      console.log('Gone offline')
    })

    // Initial sync on app load
    if (navigator.onLine) {
      this.performFullSync().catch(console.error)
    }
  }
}

export const syncService = new SyncService()
