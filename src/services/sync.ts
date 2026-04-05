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
  AirtableRecord,
  HealthRecord,
  WordsRecord,
  WeeksRecord,
  GoalsRecord,
  AreasRecord,
  IdeasRecord,
  CareerRecord,
  RulesRecord,
  EventsRecord,
  LeisureRecord,
  ThresholdsRecord,
  LocalHealthRecord,
  LocalWordsRecord,
  LocalWeeksRecord,
  LocalGoalsRecord,
  LocalAreasRecord,
  LocalIdeasRecord,
  LocalCareerRecord,
  LocalRulesRecord,
  LocalEventsRecord,
  LocalLeisureRecord,
  LocalThresholdsRecord,
  PendingMutation,
  TableName,
  TABLES,
} from '@/types/airtable'

const MAX_RETRY_COUNT = 3

// Track how many times initializeListeners has been called (for debugging)
let initializeListenersCallCount = 0
let onlineListenerCount = 0

// Debug logging helper
function debugLog(message: string, level: 'info' | 'warn' | 'error' | 'success' = 'info') {
  const store = useSyncStore.getState()
  if (store.debugMode) {
    store.addDebugLog(message, level)
  }
  // Also log to console for development
  const prefix = level === 'error' ? 'ERROR:' : level === 'warn' ? 'WARN:' : ''
  console.log(`[Sync Debug] ${prefix} ${message}`)
}

// Transform Airtable records to local format
function transformHealthRecord(record: HealthRecord): LocalHealthRecord {
  return {
    id: record.id,
    name: record.fields.Name || '',
    value: record.fields.Value,
    type: record.fields.Type,
    date: record.fields.Date,
    weekId: record.fields['Week Link']?.[0] || null,
    unitsType: record.fields['Units Type'] ?? null,
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
    totalNovella: record.fields['Total Novella'] ?? null,
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
    deadline: record.fields.Deadline ?? null,
    status: record.fields.Status,
    weekId: record.fields.Weeks?.[0] || null,
    type: record.fields.Type,
    notes: record.fields.Notes,
    createdTime: record.createdTime,
  }
}

function transformAreasRecord(record: AreasRecord): LocalAreasRecord {
  return {
    id: record.id,
    name: record.fields.Name || '',
    type: record.fields.Type,
    createdTime: record.createdTime,
  }
}

function transformIdeasRecord(record: IdeasRecord): LocalIdeasRecord {
  return {
    id: record.id,
    name: record.fields.Name || '',
    type: record.fields.Type,
    when: record.fields['When?'] || record.createdTime,
    weekId: record.fields.Weeks?.[0] || null,
    notes: record.fields.Notes ?? null,
    status: record.fields.Status ?? null,
    createdTime: record.createdTime,
  }
}

function transformCareerRecord(record: CareerRecord): LocalCareerRecord {
  return {
    id: record.id,
    name: record.fields.Name || '',
    totalDonations: record.fields['Total Donations'] ?? null,
    totalLives: record.fields['Total Lives'] ?? null,
    createdTime: record.createdTime,
  }
}

function transformRulesRecord(record: RulesRecord): LocalRulesRecord {
  return {
    id: record.id,
    name: record.fields.Name || '',
    select: record.fields.Select || 'Goal',
    status: record.fields.Status || 'Backlog',
    confidence: record.fields.Confidence ?? null,
    currentConfidence: record.fields['Current Confidence'] ?? null,
    deadline: record.fields.Deadline ?? null,
    outputGoal: record.fields['Output Goal'] ?? null,
    exceptions: record.fields.Exceptions ?? null,
    week: record.fields.Week ?? null,
    thresholdIds: record.fields.Thresholds ?? [],
    createdTime: record.createdTime,
  }
}

function transformThresholdsRecord(record: ThresholdsRecord): LocalThresholdsRecord {
  return {
    id: record.id,
    name: record.fields.Name || '',
    source: record.fields.Source || 'health',
    healthType: record.fields['Health Type'] ?? null,
    ideaType: record.fields['Idea Type'] ?? null,
    wordsProject: record.fields['Words Project'] ?? null,
    aggregation: record.fields.Aggregation || 'lastValue',
    days: record.fields.Days ?? null,
    redThreshold: record.fields['Red Threshold'] ?? 0,
    greenThreshold: record.fields['Green Threshold'] ?? 0,
    lowerIsBetter: record.fields['Lower Is Better'] ?? false,
    ruleIds: record.fields.Rules ?? [],
    createdTime: record.createdTime,
  }
}

function transformEventsRecord(record: EventsRecord): LocalEventsRecord {
  return {
    id: record.id,
    name: record.fields.Name || '',
    date: record.fields['Date organised'] || '',
    dateHeld: record.fields['Date held'] ?? null,
    notes: record.fields.Notes ?? null,
    type: record.fields.Type || 'Event',
    status: record.fields.Status || 'Planned',
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
    'Units Type': record.unitsType ?? undefined,
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

// Used for goal creation
export function localGoalsToAirtable(record: LocalGoalsRecord): Record<string, unknown> {
  return {
    Name: record.name,
    Area: record.areaId ? [record.areaId] : undefined,
    'Initial Confidence': record.initialConfidence,
    'Current Confidence': record.currentConfidence,
    Deadline: record.deadline,
    Status: record.status,
    Type: record.type,
    Notes: record.notes,
    Weeks: record.weekId ? [record.weekId] : undefined,
  }
}

function localIdeasToAirtable(record: LocalIdeasRecord): Record<string, unknown> {
  return {
    Name: record.name,
    Type: record.type,
    Weeks: record.weekId ? [record.weekId] : undefined,
    Notes: record.notes,
    Status: record.status,
  }
}

function localRulesToAirtable(record: LocalRulesRecord): Record<string, unknown> {
  return {
    Name: record.name,
    Select: record.select,
    Status: record.status,
    Confidence: record.confidence,
    'Current Confidence': record.currentConfidence,
    Deadline: record.deadline,
    'Output Goal': record.outputGoal,
    Exceptions: record.exceptions,
    Thresholds: record.thresholdIds.length > 0 ? record.thresholdIds : undefined,
  }
}

function localEventsToAirtable(record: LocalEventsRecord): Record<string, unknown> {
  return {
    Name: record.name,
    'Date organised': record.date,
    'Date held': record.dateHeld,
    Notes: record.notes,
    Type: record.type,
    Status: record.status,
  }
}

function transformLeisureRecord(record: LeisureRecord): LocalLeisureRecord {
  return {
    id: record.id,
    name: record.fields.Name || '',
    status: record.fields.Status || 'Planned',
    type: record.fields.Type || 'Film',
    dateStarted: record.fields['Date Started'] ?? null,
    dateEnded: record.fields['Date Ended'] ?? null,
    url: record.fields.URL ?? null,
    duration: record.fields.Duration ?? null,
    rating: record.fields.Rating ?? null,
    createdTime: record.createdTime,
  }
}

function localLeisureToAirtable(record: LocalLeisureRecord): Record<string, unknown> {
  return {
    Name: record.name,
    Status: record.status,
    Type: record.type,
    'Date Started': record.dateStarted,
    'Date Ended': record.dateEnded,
    URL: record.url,
    Duration: record.duration,
    Rating: record.rating,
  }
}

function localThresholdsToAirtable(record: LocalThresholdsRecord): Record<string, unknown> {
  return {
    Name: record.name,
    Source: record.source,
    'Health Type': record.healthType,
    'Idea Type': record.ideaType,
    'Words Project': record.wordsProject,
    Aggregation: record.aggregation,
    Days: record.days,
    'Red Threshold': record.redThreshold,
    'Green Threshold': record.greenThreshold,
    'Lower Is Better': record.lowerIsBetter,
    Rules: record.ruleIds.length > 0 ? record.ruleIds : undefined,
  }
}

class SyncService {
  private isSyncing = false
  private syncStartTime = 0

  async performFullSync(): Promise<void> {
    const store = useSyncStore.getState()

    debugLog('=== MANUAL SYNC STARTED ===')
    debugLog(`App version: v1.10.0`)

    // Log Airtable configuration (PAT redacted)
    const airtableDebug = airtableService.getDebugInfo()
    debugLog(`Airtable Base ID: ${airtableDebug.baseId}`, airtableDebug.baseId === '(not set)' ? 'error' : 'info')
    debugLog(`Airtable PAT: ${airtableDebug.patPrefix}`, !airtableDebug.patConfigured ? 'error' : 'info')

    debugLog(`isSyncing flag at entry: ${this.isSyncing}`, this.isSyncing ? 'warn' : 'info')
    debugLog(`navigator.onLine: ${navigator.onLine}`, navigator.onLine ? 'info' : 'warn')
    debugLog(`initializeListeners() call count: ${initializeListenersCallCount}`, initializeListenersCallCount > 1 ? 'warn' : 'info')
    debugLog(`'online' event listeners attached: ${onlineListenerCount}`, onlineListenerCount > 1 ? 'warn' : 'info')

    // Check service worker status
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration()
      if (registration) {
        debugLog(`Service Worker: ${registration.active ? 'active' : 'inactive'} (scope: ${registration.scope})`)
        if (registration.waiting) {
          debugLog('Service Worker: update waiting to install', 'warn')
        }
      } else {
        debugLog('Service Worker: not registered', 'warn')
      }
    } else {
      debugLog('Service Worker: not supported', 'warn')
    }

    // Check cache storage
    if ('caches' in window) {
      try {
        const cache = await caches.open('airtable-api-cache')
        const keys = await cache.keys()
        debugLog(`Cache 'airtable-api-cache': ${keys.length} entries`)
      } catch {
        debugLog('Cache storage: unable to check', 'warn')
      }
    }

    if (this.isSyncing) {
      debugLog('SYNC BLOCKED: isSyncing flag is already true!', 'error')
      debugLog('This may indicate a stuck sync or race condition', 'error')
      return
    }

    this.isSyncing = true
    this.syncStartTime = Date.now()
    store.setSyncing(true)
    store.setError(null)
    debugLog('isSyncing flag set to true')

    try {
      // First, push any pending mutations
      await this.pushPendingMutations()

      // Then, pull fresh data from Airtable
      await this.pullAllData()

      // Update last sync time
      const now = Date.now()
      await setLastSyncTime(now)
      store.setLastSyncTime(now)

      const duration = ((Date.now() - this.syncStartTime) / 1000).toFixed(2)
      debugLog(`=== SYNC COMPLETE (${duration}s) ===`, 'success')
    } catch (error) {
      const duration = ((Date.now() - this.syncStartTime) / 1000).toFixed(2)
      debugLog(`SYNC FAILED after ${duration}s: ${error instanceof Error ? error.message : String(error)}`, 'error')
      if (error instanceof Error && error.stack) {
        debugLog(`Stack: ${error.stack.split('\n').slice(0, 3).join(' | ')}`, 'error')
      }
      store.setError(error instanceof Error ? error.message : 'Sync failed')
      throw error
    } finally {
      this.isSyncing = false
      store.setSyncing(false)
      debugLog('isSyncing flag set to false')
    }
  }

  async pullAllData(): Promise<void> {
    debugLog('Starting data pull from Airtable...')

    // Fetch all tables sequentially with individual logging
    debugLog('Fetching all 11 tables sequentially...')
    const fetchStart = Date.now()

    let healthRecords: HealthRecord[] = []
    let wordsRecords: WordsRecord[] = []
    let weeksRecords: WeeksRecord[] = []
    let goalsRecords: GoalsRecord[] = []
    let areasRecords: AreasRecord[] = []
    let ideasRecords: IdeasRecord[] = []
    let careerRecords: CareerRecord[] = []
    let rulesRecords: RulesRecord[] = []
    let eventsRecords: EventsRecord[] = []
    let leisureRecords: LeisureRecord[] = []
    let thresholdsRecords: ThresholdsRecord[] = []

    // Helper to fetch a table with detailed error logging
    const fetchTable = async <T extends AirtableRecord>(tableName: string): Promise<T[]> => {
      debugLog(`Fetching ${tableName}...`)
      try {
        const records = await airtableService.fetchAllRecords<T>(tableName as TableName)
        debugLog(`${tableName}: ${records.length} records fetched`, 'success')
        return records
      } catch (error) {
        if (error instanceof AirtableError) {
          debugLog(`${tableName}: HTTP ${error.statusCode} - ${error.message}`, 'error')
        } else {
          debugLog(`${tableName}: ${error instanceof Error ? error.message : String(error)}`, 'error')
        }
        throw error
      }
    }

    // Fetch tables sequentially to identify exactly which one fails
    try {
      healthRecords = await fetchTable<HealthRecord>('Health')
      wordsRecords = await fetchTable<WordsRecord>('Words')
      weeksRecords = await fetchTable<WeeksRecord>('Weeks')
      goalsRecords = await fetchTable<GoalsRecord>('Goals')
      areasRecords = await fetchTable<AreasRecord>('Areas')
      ideasRecords = await fetchTable<IdeasRecord>('Ideas')
      careerRecords = await fetchTable<CareerRecord>('Career')
      rulesRecords = await fetchTable<RulesRecord>('Rules')
      eventsRecords = await fetchTable<EventsRecord>('Events')
      leisureRecords = await fetchTable<LeisureRecord>('Leisure')
      thresholdsRecords = await fetchTable<ThresholdsRecord>('Thresholds')
    } catch (error) {
      // Extract detailed error info from AirtableError
      if (error instanceof AirtableError) {
        debugLog(`Fetch failed: HTTP ${error.statusCode}`, 'error')
        debugLog(`Error message: ${error.message}`, 'error')
        if (error.isUnauthorized) {
          debugLog('DIAGNOSIS: Authentication failed - PAT may be expired or invalid', 'error')
        } else if (error.isRateLimit) {
          debugLog('DIAGNOSIS: Rate limited by Airtable - too many requests', 'error')
        } else if (error.isNotFound) {
          debugLog('DIAGNOSIS: Base or table not found - check AIRTABLE_BASE_ID', 'error')
        } else if (error.statusCode >= 500) {
          debugLog('DIAGNOSIS: Airtable server error - try again later', 'error')
        }
      } else if (error instanceof TypeError && String(error).includes('fetch')) {
        debugLog(`Fetch failed: Network error`, 'error')
        debugLog('DIAGNOSIS: Network error - possible CORS issue, blocked request, or no internet', 'error')
      } else {
        debugLog(`Fetch failed: ${error instanceof Error ? error.message : String(error)}`, 'error')
      }
      throw error
    }

    const fetchDuration = ((Date.now() - fetchStart) / 1000).toFixed(2)
    debugLog(`All fetches completed in ${fetchDuration}s`)

    // Log sample date formats to check for issues (Hypothesis 4)
    debugLog('--- Sample date formats from data ---')
    if (healthRecords.length > 0) {
      const sample = healthRecords[0]
      debugLog(`  health.Date: "${sample.fields.Date}"`)
    }
    if (wordsRecords.length > 0) {
      const sample = wordsRecords[0]
      debugLog(`  words.When: "${sample.fields.When}"`)
    }
    if (weeksRecords.length > 0) {
      const sample = weeksRecords[0]
      debugLog(`  weeks.Week Commencing: "${sample.fields['Week Commencing']}"`)
      // Check This Week flag
      const currentWeek = weeksRecords.find(w => w.fields['This Week'] === 'Yes')
      if (currentWeek) {
        debugLog(`  Current week found: "${currentWeek.fields.Name}" (Week ${currentWeek.fields['Week Number']})`, 'success')
      } else {
        debugLog('  No week with This Week = Yes found!', 'warn')
      }
    }
    if (ideasRecords.length > 0) {
      const sample = ideasRecords[0]
      debugLog(`  ideas.When?: "${sample.fields['When?']}"`)
    }

    // Transform and store locally
    debugLog('Starting database transaction...')
    const dbStart = Date.now()

    try {
      await db.transaction('rw', [db.health, db.words, db.weeks, db.goals, db.areas, db.ideas, db.career, db.rules, db.events, db.leisure, db.thresholds], async () => {
        // Clear existing data (except pending mutations)
        debugLog('Clearing existing data...')
        await db.health.clear()
        await db.words.clear()
        await db.weeks.clear()
        await db.goals.clear()
        await db.areas.clear()
        await db.ideas.clear()
        await db.career.clear()
        await db.rules.clear()
        await db.events.clear()
        await db.leisure.clear()
        await db.thresholds.clear()

        // Bulk insert transformed records
        debugLog('Inserting transformed records...')
        await db.health.bulkPut(healthRecords.map(transformHealthRecord))
        await db.words.bulkPut(wordsRecords.map(transformWordsRecord))
        await db.weeks.bulkPut(weeksRecords.map(transformWeeksRecord))
        await db.goals.bulkPut(goalsRecords.map(transformGoalsRecord))
        await db.areas.bulkPut(areasRecords.map(transformAreasRecord))
        await db.ideas.bulkPut(ideasRecords.map(transformIdeasRecord))
        await db.career.bulkPut(careerRecords.map(transformCareerRecord))
        await db.rules.bulkPut(rulesRecords.map(transformRulesRecord))
        await db.events.bulkPut(eventsRecords.map(transformEventsRecord))
        await db.leisure.bulkPut(leisureRecords.map(transformLeisureRecord))
        await db.thresholds.bulkPut(thresholdsRecords.map(transformThresholdsRecord))
      })

      const dbDuration = ((Date.now() - dbStart) / 1000).toFixed(2)
      debugLog(`Database transaction complete in ${dbDuration}s`, 'success')
    } catch (error) {
      debugLog(`Database transaction failed: ${error instanceof Error ? error.message : String(error)}`, 'error')
      throw error
    }

    debugLog(
      `Summary: ${healthRecords.length} health, ${wordsRecords.length} words, ${weeksRecords.length} weeks, ${goalsRecords.length} goals, ${areasRecords.length} areas, ${ideasRecords.length} ideas, ${careerRecords.length} career, ${rulesRecords.length} rules, ${eventsRecords.length} events, ${leisureRecords.length} leisure, ${thresholdsRecords.length} thresholds`
    )
  }

  async pushPendingMutations(): Promise<void> {
    const mutations = await getPendingMutations()

    debugLog(`--- Pending Mutations Check ---`)
    debugLog(`Pending mutations count: ${mutations.length}`)

    if (mutations.length === 0) {
      debugLog('No pending mutations to push')
      return
    }

    // Log details of each pending mutation (Hypothesis 5)
    mutations.forEach((m, i) => {
      const ageMs = Date.now() - m.timestamp
      const ageStr = ageMs < 60000 ? `${Math.round(ageMs / 1000)}s` :
                     ageMs < 3600000 ? `${Math.round(ageMs / 60000)}m` :
                     `${Math.round(ageMs / 3600000)}h`
      const retryWarning = m.retryCount >= MAX_RETRY_COUNT ? ' MAX RETRIES' : ''
      const level = m.retryCount > 0 ? 'warn' : 'info'
      debugLog(`  #${i + 1}: ${m.tableName}/${m.operation}/${m.recordId.slice(0, 10)}... (retry: ${m.retryCount}, age: ${ageStr})${retryWarning}`, level as 'info' | 'warn')
    })

    const store = useSyncStore.getState()

    for (const mutation of mutations) {
      try {
        debugLog(`Processing mutation: ${mutation.tableName}/${mutation.operation}`)
        await this.processMutation(mutation)
        await removePendingMutation(mutation.id!)
        store.decrementPending()
        debugLog(`Mutation successful: ${mutation.tableName}/${mutation.operation}`, 'success')
      } catch (error) {
        if (error instanceof AirtableError && error.isRateLimit) {
          debugLog('Rate limited by Airtable, will retry later', 'warn')
          break
        }

        debugLog(`Mutation failed: ${error instanceof Error ? error.message : String(error)}`, 'error')

        // Increment retry count
        if (mutation.retryCount < MAX_RETRY_COUNT) {
          await db.pendingMutations.update(mutation.id!, {
            retryCount: mutation.retryCount + 1,
          })
          debugLog(`Retry count incremented to ${mutation.retryCount + 1}`, 'warn')
        } else {
          debugLog(`Mutation abandoned after ${MAX_RETRY_COUNT} retries`, 'error')
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

  // Update a health record (handles offline)
  async updateHealthRecord(
    healthId: string,
    updates: Partial<Pick<LocalHealthRecord, 'value' | 'date' | 'unitsType'>>
  ): Promise<void> {
    const health = await db.health.get(healthId)
    if (!health) throw new Error('Health record not found')

    // Apply updates to local record
    if (updates.value !== undefined) health.value = updates.value
    if (updates.date !== undefined) health.date = updates.date
    if (updates.unitsType !== undefined) health.unitsType = updates.unitsType
    health._pendingSync = true
    await db.health.put(health)

    // Prepare Airtable update data
    const updateData: Record<string, unknown> = {}
    if (updates.value !== undefined) updateData.Value = updates.value
    if (updates.date !== undefined) updateData.Date = updates.date
    if (updates.unitsType !== undefined) updateData['Units Type'] = updates.unitsType

    if (navigator.onLine) {
      try {
        await airtableService.updateRecord('Health', healthId, updateData)
        health._pendingSync = false
        await db.health.put(health)
      } catch {
        await this.queueMutation('Health', 'update', healthId, updateData)
      }
    } else {
      await this.queueMutation('Health', 'update', healthId, updateData)
    }
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
        // Preserve weekId from input if Airtable response didn't include it
        // This can happen when linked record fields aren't returned in create response
        if (updatedRecord.weekId === null && record.weekId !== null) {
          updatedRecord.weekId = record.weekId
        }
        // Preserve deadline from input if Airtable response didn't include it
        if (updatedRecord.deadline === null && record.deadline !== null) {
          updatedRecord.deadline = record.deadline
        }
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

  // Create an idea record (handles offline)
  async createIdeaRecord(
    data: Omit<LocalIdeasRecord, 'id' | 'createdTime'>
  ): Promise<LocalIdeasRecord> {
    const localId = `local_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const record: LocalIdeasRecord = {
      id: localId,
      ...data,
      createdTime: new Date().toISOString(),
      _pendingSync: true,
      _localId: localId,
    }

    await db.ideas.add(record)

    if (navigator.onLine) {
      try {
        const created = await airtableService.createRecord<IdeasRecord>(
          'Ideas',
          localIdeasToAirtable(record)
        )
        await db.ideas.delete(localId)
        const updatedRecord = transformIdeasRecord(created)
        await db.ideas.add(updatedRecord)
        return updatedRecord
      } catch {
        await this.queueMutation('Ideas', 'create', localId, localIdeasToAirtable(record), localId)
      }
    } else {
      await this.queueMutation('Ideas', 'create', localId, localIdeasToAirtable(record), localId)
    }

    return record
  }

  // Update an idea record (handles offline)
  async updateIdeaRecord(
    ideaId: string,
    updates: Partial<Pick<LocalIdeasRecord, 'name' | 'type' | 'when' | 'notes' | 'status'>>
  ): Promise<void> {
    const idea = await db.ideas.get(ideaId)
    if (!idea) throw new Error('Idea not found')

    // Apply updates to local record
    if (updates.name !== undefined) idea.name = updates.name
    if (updates.type !== undefined) idea.type = updates.type
    if (updates.when !== undefined) idea.when = updates.when
    if (updates.notes !== undefined) idea.notes = updates.notes
    if (updates.status !== undefined) idea.status = updates.status
    idea._pendingSync = true
    await db.ideas.put(idea)

    // Prepare Airtable update data
    const updateData: Record<string, unknown> = {}
    if (updates.name !== undefined) updateData.Name = updates.name
    if (updates.type !== undefined) updateData.Type = updates.type
    if (updates.when !== undefined) updateData['When?'] = updates.when
    if (updates.notes !== undefined) updateData.Notes = updates.notes
    if (updates.status !== undefined) updateData.Status = updates.status

    if (navigator.onLine) {
      try {
        await airtableService.updateRecord('Ideas', ideaId, updateData)
        idea._pendingSync = false
        await db.ideas.put(idea)
      } catch {
        await this.queueMutation('Ideas', 'update', ideaId, updateData)
      }
    } else {
      await this.queueMutation('Ideas', 'update', ideaId, updateData)
    }
  }

  // Delete an idea record (handles offline)
  async deleteIdeaRecord(ideaId: string): Promise<void> {
    const idea = await db.ideas.get(ideaId)
    if (!idea) throw new Error('Idea not found')

    // Delete from local DB immediately
    await db.ideas.delete(ideaId)

    // If it's a local-only record that hasn't synced yet, no need to queue delete
    if (ideaId.startsWith('local_')) {
      return
    }

    if (navigator.onLine) {
      try {
        await airtableService.deleteRecord('Ideas', ideaId)
      } catch {
        await this.queueMutation('Ideas', 'delete', ideaId, {})
      }
    } else {
      await this.queueMutation('Ideas', 'delete', ideaId, {})
    }
  }

  // Update goal status (handles offline)
  async updateGoalStatus(
    goalId: string,
    status: LocalGoalsRecord['status']
  ): Promise<void> {
    const goal = await db.goals.get(goalId)
    if (!goal) throw new Error('Goal not found')

    goal.status = status
    // Update confidence based on status
    if (status === 'Success') {
      goal.currentConfidence = 1
    } else if (status === 'Fail') {
      goal.currentConfidence = 0
    }
    goal._pendingSync = true
    await db.goals.put(goal)

    const updateData: Record<string, unknown> = { Status: status }
    if (status === 'Success') {
      updateData['Current Confidence'] = 1
    } else if (status === 'Fail') {
      updateData['Current Confidence'] = 0
    }

    if (navigator.onLine) {
      try {
        await airtableService.updateRecord('Goals', goalId, updateData)
        goal._pendingSync = false
        await db.goals.put(goal)
      } catch {
        await this.queueMutation('Goals', 'update', goalId, updateData)
      }
    } else {
      await this.queueMutation('Goals', 'update', goalId, updateData)
    }
  }

  // Update goal confidence (handles offline)
  async updateGoalConfidence(
    goalId: string,
    confidence: number
  ): Promise<void> {
    const goal = await db.goals.get(goalId)
    if (!goal) throw new Error('Goal not found')

    goal.currentConfidence = confidence
    goal._pendingSync = true
    await db.goals.put(goal)

    const updateData = { 'Current Confidence': confidence }

    if (navigator.onLine) {
      try {
        await airtableService.updateRecord('Goals', goalId, updateData)
        goal._pendingSync = false
        await db.goals.put(goal)
      } catch {
        await this.queueMutation('Goals', 'update', goalId, updateData)
      }
    } else {
      await this.queueMutation('Goals', 'update', goalId, updateData)
    }
  }

  // Update goal details (name and area)
  async updateGoalDetails(
    goalId: string,
    updates: { name?: string; areaId?: string | null }
  ): Promise<void> {
    const goal = await db.goals.get(goalId)
    if (!goal) throw new Error('Goal not found')

    if (updates.name !== undefined) goal.name = updates.name
    if (updates.areaId !== undefined) goal.areaId = updates.areaId
    goal._pendingSync = true
    await db.goals.put(goal)

    const updateData: Record<string, unknown> = {}
    if (updates.name !== undefined) updateData['Name'] = updates.name
    if (updates.areaId !== undefined) updateData['Area'] = updates.areaId ? [updates.areaId] : []

    if (navigator.onLine) {
      try {
        await airtableService.updateRecord('Goals', goalId, updateData)
        goal._pendingSync = false
        await db.goals.put(goal)
      } catch {
        await this.queueMutation('Goals', 'update', goalId, updateData)
      }
    } else {
      await this.queueMutation('Goals', 'update', goalId, updateData)
    }
  }

  // Create a rule record (handles offline)
  async createRulesRecord(
    data: Omit<LocalRulesRecord, 'id' | 'createdTime'>
  ): Promise<LocalRulesRecord> {
    const localId = `local_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const record: LocalRulesRecord = {
      id: localId,
      ...data,
      createdTime: new Date().toISOString(),
      _pendingSync: true,
      _localId: localId,
    }

    await db.rules.add(record)

    if (navigator.onLine) {
      try {
        const created = await airtableService.createRecord<RulesRecord>(
          'Rules',
          localRulesToAirtable(record)
        )
        await db.rules.delete(localId)
        const updatedRecord = transformRulesRecord(created)
        await db.rules.add(updatedRecord)
        return updatedRecord
      } catch {
        await this.queueMutation('Rules', 'create', localId, localRulesToAirtable(record), localId)
      }
    } else {
      await this.queueMutation('Rules', 'create', localId, localRulesToAirtable(record), localId)
    }

    return record
  }

  // Update a rule record (handles offline)
  async updateRulesRecord(
    ruleId: string,
    updates: Partial<Pick<LocalRulesRecord, 'name' | 'select' | 'status' | 'confidence' | 'currentConfidence' | 'deadline' | 'outputGoal' | 'exceptions' | 'thresholdIds'>>
  ): Promise<void> {
    const rule = await db.rules.get(ruleId)
    if (!rule) throw new Error('Rule not found')

    // Apply updates to local record
    Object.assign(rule, updates)
    rule._pendingSync = true
    await db.rules.put(rule)

    // Prepare Airtable update data
    const updateData: Record<string, unknown> = {}
    if (updates.name !== undefined) updateData.Name = updates.name
    if (updates.select !== undefined) updateData.Select = updates.select
    if (updates.status !== undefined) updateData.Status = updates.status
    if (updates.confidence !== undefined) updateData.Confidence = updates.confidence
    if (updates.currentConfidence !== undefined) updateData['Current Confidence'] = updates.currentConfidence
    if (updates.deadline !== undefined) updateData.Deadline = updates.deadline
    if (updates.outputGoal !== undefined) updateData['Output Goal'] = updates.outputGoal
    if (updates.exceptions !== undefined) updateData.Exceptions = updates.exceptions
    if (updates.thresholdIds !== undefined) updateData.Thresholds = updates.thresholdIds.length > 0 ? updates.thresholdIds : []

    if (navigator.onLine) {
      try {
        await airtableService.updateRecord('Rules', ruleId, updateData)
        rule._pendingSync = false
        await db.rules.put(rule)
      } catch {
        await this.queueMutation('Rules', 'update', ruleId, updateData)
      }
    } else {
      await this.queueMutation('Rules', 'update', ruleId, updateData)
    }
  }

  // Create an event record (handles offline)
  async createEventsRecord(
    data: Omit<LocalEventsRecord, 'id' | 'createdTime'>
  ): Promise<LocalEventsRecord> {
    const localId = `local_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const record: LocalEventsRecord = {
      id: localId,
      ...data,
      createdTime: new Date().toISOString(),
      _pendingSync: true,
      _localId: localId,
    }

    await db.events.add(record)

    if (navigator.onLine) {
      try {
        const created = await airtableService.createRecord<EventsRecord>(
          'Events',
          localEventsToAirtable(record)
        )
        await db.events.delete(localId)
        const updatedRecord = transformEventsRecord(created)
        await db.events.add(updatedRecord)
        return updatedRecord
      } catch {
        await this.queueMutation('Events', 'create', localId, localEventsToAirtable(record), localId)
      }
    } else {
      await this.queueMutation('Events', 'create', localId, localEventsToAirtable(record), localId)
    }

    return record
  }

  // Update an event record (handles offline)
  async updateEventsRecord(
    eventId: string,
    updates: Partial<Pick<LocalEventsRecord, 'name' | 'date' | 'dateHeld' | 'notes' | 'type' | 'status'>>
  ): Promise<void> {
    const event = await db.events.get(eventId)
    if (!event) throw new Error('Event not found')

    // Apply updates to local record
    Object.assign(event, updates)
    event._pendingSync = true
    await db.events.put(event)

    // Prepare Airtable update data
    const updateData: Record<string, unknown> = {}
    if (updates.name !== undefined) updateData.Name = updates.name
    if (updates.date !== undefined) updateData['Date organised'] = updates.date
    if (updates.dateHeld !== undefined) updateData['Date held'] = updates.dateHeld
    if (updates.notes !== undefined) updateData.Notes = updates.notes
    if (updates.type !== undefined) updateData.Type = updates.type
    if (updates.status !== undefined) updateData.Status = updates.status

    if (navigator.onLine) {
      try {
        await airtableService.updateRecord('Events', eventId, updateData)
        event._pendingSync = false
        await db.events.put(event)
      } catch {
        await this.queueMutation('Events', 'update', eventId, updateData)
      }
    } else {
      await this.queueMutation('Events', 'update', eventId, updateData)
    }
  }

  // Create a leisure record (handles offline)
  async createLeisureRecord(
    data: Omit<LocalLeisureRecord, 'id' | 'createdTime'>
  ): Promise<LocalLeisureRecord> {
    const localId = `local_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const record: LocalLeisureRecord = {
      id: localId,
      ...data,
      createdTime: new Date().toISOString(),
      _pendingSync: true,
      _localId: localId,
    }

    await db.leisure.add(record)

    if (navigator.onLine) {
      try {
        const created = await airtableService.createRecord<LeisureRecord>(
          'Leisure',
          localLeisureToAirtable(record)
        )
        await db.leisure.delete(localId)
        const updatedRecord = transformLeisureRecord(created)
        await db.leisure.add(updatedRecord)
        return updatedRecord
      } catch {
        await this.queueMutation('Leisure', 'create', localId, localLeisureToAirtable(record), localId)
      }
    } else {
      await this.queueMutation('Leisure', 'create', localId, localLeisureToAirtable(record), localId)
    }

    return record
  }

  // Update a leisure record (handles offline)
  async updateLeisureRecord(
    leisureId: string,
    updates: Partial<Pick<LocalLeisureRecord, 'name' | 'status' | 'type' | 'dateStarted' | 'dateEnded' | 'url' | 'duration' | 'rating'>>
  ): Promise<void> {
    const leisure = await db.leisure.get(leisureId)
    if (!leisure) throw new Error('Leisure record not found')

    // Apply updates to local record
    Object.assign(leisure, updates)
    leisure._pendingSync = true
    await db.leisure.put(leisure)

    // Prepare Airtable update data
    const updateData: Record<string, unknown> = {}
    if (updates.name !== undefined) updateData.Name = updates.name
    if (updates.status !== undefined) updateData.Status = updates.status
    if (updates.type !== undefined) updateData.Type = updates.type
    if (updates.dateStarted !== undefined) updateData['Date Started'] = updates.dateStarted
    if (updates.dateEnded !== undefined) updateData['Date Ended'] = updates.dateEnded
    if (updates.url !== undefined) updateData.URL = updates.url
    if (updates.duration !== undefined) updateData.Duration = updates.duration
    if (updates.rating !== undefined) updateData.Rating = updates.rating

    if (navigator.onLine) {
      try {
        await airtableService.updateRecord('Leisure', leisureId, updateData)
        leisure._pendingSync = false
        await db.leisure.put(leisure)
      } catch {
        await this.queueMutation('Leisure', 'update', leisureId, updateData)
      }
    } else {
      await this.queueMutation('Leisure', 'update', leisureId, updateData)
    }
  }

  // Delete a leisure record (handles offline)
  async deleteLeisureRecord(leisureId: string): Promise<void> {
    const leisure = await db.leisure.get(leisureId)
    if (!leisure) throw new Error('Leisure record not found')

    await db.leisure.delete(leisureId)

    if (leisureId.startsWith('local_')) {
      return
    }

    if (navigator.onLine) {
      try {
        await airtableService.deleteRecord('Leisure', leisureId)
      } catch {
        await this.queueMutation('Leisure', 'delete', leisureId, {})
      }
    } else {
      await this.queueMutation('Leisure', 'delete', leisureId, {})
    }
  }

  // Create a threshold record (handles offline)
  async createThresholdsRecord(
    data: Omit<LocalThresholdsRecord, 'id' | 'createdTime'>
  ): Promise<LocalThresholdsRecord> {
    const localId = `local_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const record: LocalThresholdsRecord = {
      id: localId,
      ...data,
      createdTime: new Date().toISOString(),
      _pendingSync: true,
      _localId: localId,
    }

    await db.thresholds.add(record)

    if (navigator.onLine) {
      try {
        const created = await airtableService.createRecord<ThresholdsRecord>(
          'Thresholds',
          localThresholdsToAirtable(record)
        )
        await db.thresholds.delete(localId)
        const updatedRecord = transformThresholdsRecord(created)
        await db.thresholds.add(updatedRecord)
        return updatedRecord
      } catch {
        await this.queueMutation('Thresholds', 'create', localId, localThresholdsToAirtable(record), localId)
      }
    } else {
      await this.queueMutation('Thresholds', 'create', localId, localThresholdsToAirtable(record), localId)
    }

    return record
  }

  // Update a threshold record (handles offline)
  async updateThresholdsRecord(
    thresholdId: string,
    updates: Partial<Pick<LocalThresholdsRecord, 'name' | 'source' | 'healthType' | 'ideaType' | 'wordsProject' | 'aggregation' | 'days' | 'redThreshold' | 'greenThreshold' | 'lowerIsBetter' | 'ruleIds'>>
  ): Promise<void> {
    const threshold = await db.thresholds.get(thresholdId)
    if (!threshold) throw new Error('Threshold not found')

    Object.assign(threshold, updates)
    threshold._pendingSync = true
    await db.thresholds.put(threshold)

    const updateData: Record<string, unknown> = {}
    if (updates.name !== undefined) updateData.Name = updates.name
    if (updates.source !== undefined) updateData.Source = updates.source
    if (updates.healthType !== undefined) updateData['Health Type'] = updates.healthType
    if (updates.ideaType !== undefined) updateData['Idea Type'] = updates.ideaType
    if (updates.wordsProject !== undefined) updateData['Words Project'] = updates.wordsProject
    if (updates.aggregation !== undefined) updateData.Aggregation = updates.aggregation
    if (updates.days !== undefined) updateData.Days = updates.days
    if (updates.redThreshold !== undefined) updateData['Red Threshold'] = updates.redThreshold
    if (updates.greenThreshold !== undefined) updateData['Green Threshold'] = updates.greenThreshold
    if (updates.lowerIsBetter !== undefined) updateData['Lower Is Better'] = updates.lowerIsBetter
    if (updates.ruleIds !== undefined) updateData.Rules = updates.ruleIds.length > 0 ? updates.ruleIds : []

    if (navigator.onLine) {
      try {
        await airtableService.updateRecord('Thresholds', thresholdId, updateData)
        threshold._pendingSync = false
        await db.thresholds.put(threshold)
      } catch {
        await this.queueMutation('Thresholds', 'update', thresholdId, updateData)
      }
    } else {
      await this.queueMutation('Thresholds', 'update', thresholdId, updateData)
    }
  }

  // Delete a threshold record (handles offline)
  async deleteThresholdsRecord(thresholdId: string): Promise<void> {
    const threshold = await db.thresholds.get(thresholdId)
    if (!threshold) throw new Error('Threshold not found')

    await db.thresholds.delete(thresholdId)

    if (thresholdId.startsWith('local_')) {
      return
    }

    if (navigator.onLine) {
      try {
        await airtableService.deleteRecord('Thresholds', thresholdId)
      } catch {
        await this.queueMutation('Thresholds', 'delete', thresholdId, {})
      }
    } else {
      await this.queueMutation('Thresholds', 'delete', thresholdId, {})
    }
  }

  // Initialize sync listeners
  initializeListeners(): void {
    initializeListenersCallCount++
    onlineListenerCount++

    // Log if this has been called multiple times (potential issue)
    if (initializeListenersCallCount > 1) {
      console.warn(`[Sync] initializeListeners() called ${initializeListenersCallCount} times - potential duplicate listeners!`)
    }

    // Sync when coming back online
    window.addEventListener('online', () => {
      console.log('Back online, syncing...')
      debugLog('Online event triggered - starting sync')
      this.performFullSync().catch(console.error)
    })

    // Track offline status
    window.addEventListener('offline', () => {
      console.log('Gone offline')
      debugLog('Offline event triggered')
    })

    // Initial sync on app load
    if (navigator.onLine) {
      debugLog('Initial sync on app load')
      this.performFullSync().catch(console.error)
    }
  }

  // Get debug stats (for diagnostic purposes)
  getDebugStats() {
    return {
      isSyncing: this.isSyncing,
      initializeListenersCallCount,
      onlineListenerCount,
    }
  }
}

export const syncService = new SyncService()
