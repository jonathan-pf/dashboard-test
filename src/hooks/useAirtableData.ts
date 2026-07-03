import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { syncService } from '@/services/sync'
import type {
  LocalHealthRecord,
  LocalWordsRecord,
  LocalGoalsRecord,
  LocalIdeasRecord,
  LocalRulesRecord,
  LocalEventsRecord,
  LocalLeisureRecord,
  LocalThresholdsRecord,
} from '@/types/airtable'
import type { SugarThresholdPeriod } from '@/types/airtable'
import { getTrafficLightColor, type TrafficLightColor } from '@/config/trafficLights'
import { periodDailySeries, aggregateSeries } from '@/utils/sugar'

// Query keys
export const queryKeys = {
  health: ['health'] as const,
  words: ['words'] as const,
  weeks: ['weeks'] as const,
  goals: ['goals'] as const,
  areas: ['areas'] as const,
  ideas: ['ideas'] as const,
  career: ['career'] as const,
  rules: ['rules'] as const,
  events: ['events'] as const,
  leisure: ['leisure'] as const,
  thresholds: ['thresholds'] as const,
  currentWeek: ['weeks', 'current'] as const,
  healthByType: (type: string) => ['health', 'type', type] as const,
  wordsByWeek: (weekId: string) => ['words', 'week', weekId] as const,
}

// Use Dexie's live queries for reactive local data
export function useHealth() {
  return useLiveQuery(() => db.health.orderBy('date').reverse().toArray(), [])
}

export function useHealthByType(type: LocalHealthRecord['type']) {
  return useLiveQuery(
    () => db.health.where('type').equals(type).reverse().sortBy('date'),
    [type]
  )
}

export function useWords() {
  return useLiveQuery(() => db.words.orderBy('when').reverse().toArray(), [])
}

export function useWordsByWeek(weekId: string | null) {
  return useLiveQuery(
    () => (weekId ? db.words.where('weekId').equals(weekId).toArray() : []),
    [weekId]
  )
}

export function useWeeks() {
  return useLiveQuery(() => db.weeks.orderBy('weekCommencing').reverse().toArray(), [])
}

export function useCurrentWeek() {
  return useLiveQuery(() => db.weeks.filter((w) => w.thisWeek).first(), [])
}

export function useLastWeek() {
  return useLiveQuery(() => db.weeks.filter((w) => w.lastWeek).first(), [])
}

export function useNextWeek() {
  return useLiveQuery(() => db.weeks.filter((w) => w.nextWeek).first(), [])
}

export function useGoals() {
  return useLiveQuery(() => db.goals.toArray(), [])
}

export function useAreas() {
  return useLiveQuery(() => db.areas.orderBy('name').toArray(), [])
}

export function useIdeas() {
  return useLiveQuery(() => db.ideas.orderBy('when').reverse().toArray(), [])
}

export function useIdeasByStatus(status: NonNullable<LocalIdeasRecord['status']>) {
  return useLiveQuery(
    () => db.ideas.where('status').equals(status).reverse().sortBy('when'),
    [status]
  )
}

export function useIdeasByType(type: LocalIdeasRecord['type']) {
  return useLiveQuery(
    () => db.ideas.where('type').equals(type).reverse().sortBy('when'),
    [type]
  )
}

export function useCareerTotals() {
  return useLiveQuery(
    () => db.career.toCollection().first(),
    []
  )
}

export function useRules() {
  return useLiveQuery(() => db.rules.toArray(), [])
}

export function useRulesByStatus(status: LocalRulesRecord['status']) {
  return useLiveQuery(
    () => db.rules.where('status').equals(status).toArray(),
    [status]
  )
}

export function useEvents() {
  return useLiveQuery(() => db.events.orderBy('date').reverse().toArray(), [])
}

export function useLeisure() {
  return useLiveQuery(() => db.leisure.orderBy('dateStarted').reverse().toArray(), [])
}

// Thresholds sorted by their explicit display order (unordered ones last, by name).
// The Dashboard traffic-light grid and the Thresholds page both use this.
export function useThresholds() {
  return useLiveQuery(async () => {
    const all = await db.thresholds.toArray()
    return all.sort(
      (a, b) =>
        (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER) ||
        a.name.localeCompare(b.name)
    )
  }, [])
}

// Sugar Summary (CGM) records within the last N days, sorted ascending by date
export function useSugarSummary(days = 30) {
  const start = new Date()
  start.setDate(start.getDate() - days)
  const startStr = start.toISOString().split('T')[0]
  return useLiveQuery(
    () => db.sugarSummary.where('date').aboveOrEqual(startStr).sortBy('date'),
    [startStr]
  )
}

// Aggregated glucose value for a bucket (or whole day), for a threshold definition
export function useSugarPeriodValue(
  period: SugarThresholdPeriod,
  aggregation: string,
  days: number | null
) {
  return useLiveQuery(
    async () => {
      const records = await db.sugarSummary.toArray()
      const series = periodDailySeries(records, period)
      return aggregateSeries(series, aggregation, days)
    },
    [period, aggregation, days]
  )
}

export function useAllThresholdColors() {
  return useLiveQuery(async () => {
    const thresholds = await db.thresholds.toArray()
    if (!thresholds || thresholds.length === 0) return new Map<string, TrafficLightColor>()

    const colors = new Map<string, TrafficLightColor>()

    for (const t of thresholds) {
      let value: number | null = null

      if (t.source === 'health' && t.healthType) {
        const getHealthInRange = async (days: number) => {
          const cutoff = new Date()
          cutoff.setDate(cutoff.getDate() - days)
          const cutoffStr = cutoff.toISOString().split('T')[0]
          return db.health.where('type').equals(t.healthType!).and(r => r.date >= cutoffStr).toArray()
        }

        if (t.aggregation === 'lastValue') {
          const records = await db.health.where('type').equals(t.healthType).toArray()
          const sorted = records.sort((a, b) => b.date.localeCompare(a.date))
          value = sorted[0]?.value ?? null
        } else if (t.aggregation === 'sumLast7Days') {
          const records = await getHealthInRange(7)
          value = records.reduce((sum, r) => sum + r.value, 0)
        } else if (t.aggregation === 'sumLastNDays') {
          const records = await getHealthInRange(t.days ?? 7)
          value = records.reduce((sum, r) => sum + r.value, 0)
        } else if (t.aggregation === 'averageLast3') {
          const records = await db.health.where('type').equals(t.healthType).toArray()
          const sorted = records.sort((a, b) => b.date.localeCompare(a.date))
          if (sorted.length > 0) {
            const slice = sorted.slice(0, 3)
            value = slice.reduce((sum, r) => sum + r.value, 0) / slice.length
          }
        } else if (t.aggregation === 'averageLastNDays') {
          const records = await getHealthInRange(t.days ?? 7)
          if (records.length > 0) {
            value = records.reduce((sum, r) => sum + r.value, 0) / records.length
          }
        }
      } else if (t.source === 'ideas' && t.ideaType) {
        const days = t.days ?? 7
        const cutoff = new Date()
        cutoff.setDate(cutoff.getDate() - days)
        const cutoffStr = cutoff.toISOString().split('T')[0]
        const records = await db.ideas.where('type').equals(t.ideaType).and(r => r.when >= cutoffStr).toArray()
        if (t.aggregation === 'sumLastNDays') {
          value = records.length // for ideas, sum = count
        } else if (t.aggregation === 'averageLastNDays') {
          value = days > 0 ? records.length / (days / 7) : records.length // per-week average
        } else {
          value = records.length
        }
      } else if (t.source === 'words' && t.wordsProject) {
        const days = t.days ?? 7
        const cutoff = new Date()
        cutoff.setDate(cutoff.getDate() - days)
        const cutoffStr = cutoff.toISOString().split('T')[0]

        const getWordsRecords = async () => {
          if (t.wordsProject === 'All') {
            return db.words.filter(r => r.when >= cutoffStr).toArray()
          }
          return db.words.where('project').equals(t.wordsProject!).and(r => r.when >= cutoffStr).toArray()
        }

        if (t.aggregation === 'sumLast7Days' || t.aggregation === 'countLastNDays' || t.aggregation === 'sumLastNDays') {
          const records = await getWordsRecords()
          value = records.reduce((sum, r) => sum + r.words, 0)
        } else if (t.aggregation === 'averageLastNDays') {
          const records = await getWordsRecords()
          if (records.length > 0) {
            value = records.reduce((sum, r) => sum + r.words, 0) / records.length
          }
        } else if (t.aggregation === 'lastValue') {
          let records
          if (t.wordsProject === 'All') {
            records = await db.words.orderBy('when').reverse().toArray()
          } else {
            records = await db.words.where('project').equals(t.wordsProject!).reverse().sortBy('when')
          }
          value = records[0]?.words ?? null
        } else if (t.aggregation === 'averageLast3') {
          let records
          if (t.wordsProject === 'All') {
            records = await db.words.orderBy('when').reverse().toArray()
          } else {
            records = await db.words.where('project').equals(t.wordsProject!).reverse().sortBy('when')
          }
          if (records.length > 0) {
            const slice = records.slice(0, 3)
            value = slice.reduce((sum, r) => sum + r.words, 0) / slice.length
          }
        }
      } else if (t.source === 'leisure' && t.leisurePeriod) {
        const week = t.leisurePeriod === 'This Week'
          ? await db.weeks.filter(w => w.thisWeek).first()
          : await db.weeks.filter(w => w.lastWeek).first()

        if (week) {
          const weekStartStr = week.weekCommencing
          const weekEndStr = addDays(weekStartStr, 6)
          const today = todayStr()

          const items = await db.leisure
            .filter(item =>
              (item.status === 'Consumed' || item.status === 'Live') &&
              item.dateStarted !== null &&
              item.duration !== null &&
              item.duration > 0
            )
            .toArray()

          let totalSeconds = 0
          for (const item of items) {
            const itemStartStr = item.dateStarted!
            const itemEndStr = item.status === 'Live' && !item.dateEnded
              ? today
              : item.dateEnded ?? itemStartStr
            if (itemEndStr < weekStartStr || itemStartStr > weekEndStr) continue
            const overlapStartStr = itemStartStr > weekStartStr ? itemStartStr : weekStartStr
            const overlapEndStr = itemEndStr < weekEndStr ? itemEndStr : weekEndStr
            const overlapDays = daysBetweenInclusive(overlapStartStr, overlapEndStr)
            if (overlapDays <= 0) continue
            const totalDays = Math.max(1, daysBetweenInclusive(itemStartStr, itemEndStr))
            totalSeconds += (overlapDays / totalDays) * item.duration!
          }

          value = Math.round(totalSeconds / 3600) // hours
        }
      } else if (t.source === 'sugar' && t.sugarPeriod) {
        const records = await db.sugarSummary.toArray()
        const series = periodDailySeries(records, t.sugarPeriod)
        value = aggregateSeries(series, t.aggregation, t.days)
      }

      colors.set(t.id, getTrafficLightColor(value, t))
    }

    return colors
  }, [])
}

export function useCurrentWeekIdeas() {
  return useLiveQuery(async () => {
    const currentWeek = await db.weeks.filter((w) => w.thisWeek).first()
    if (!currentWeek) return []
    return db.ideas.where('weekId').equals(currentWeek.id).reverse().sortBy('when')
  }, [])
}

export function useGoalsByStatus(status: LocalGoalsRecord['status']) {
  return useLiveQuery(
    () => db.goals.where('status').equals(status).toArray(),
    [status]
  )
}

export function useCurrentWeekGoals() {
  const currentWeek = useCurrentWeek()
  return useLiveQuery(
    () =>
      currentWeek
        ? db.goals.where('weekId').equals(currentWeek.id).toArray()
        : [],
    [currentWeek?.id]
  )
}

export function useNextWeekGoals() {
  const nextWeek = useNextWeek()
  return useLiveQuery(
    () =>
      nextWeek
        ? db.goals.where('weekId').equals(nextWeek.id).toArray()
        : [],
    [nextWeek?.id]
  )
}

export function useNextMonthGoals() {
  return useLiveQuery(async () => {
    const now = new Date()
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const nextMonthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0)

    const nextMonthStart = nextMonth.toISOString().split('T')[0]
    const nextMonthEndStr = nextMonthEnd.toISOString().split('T')[0]

    // Get monthly goals with deadline in next month
    const goals = await db.goals
      .filter((g) =>
        g.type === 'Monthly' &&
        g.deadline !== null &&
        g.deadline >= nextMonthStart &&
        g.deadline <= nextMonthEndStr
      )
      .toArray()

    return goals
  }, [])
}

export function useCurrentMonthGoals() {
  return useLiveQuery(async () => {
    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    const currentMonthStartStr = currentMonthStart.toISOString().split('T')[0]
    const currentMonthEndStr = currentMonthEnd.toISOString().split('T')[0]

    // Get live monthly goals with deadline in current month
    const goals = await db.goals
      .filter((g) =>
        g.type === 'Monthly' &&
        g.status === 'Live' &&
        g.deadline !== null &&
        g.deadline >= currentMonthStartStr &&
        g.deadline <= currentMonthEndStr
      )
      .toArray()

    return goals
  }, [])
}

export function useAnnualGoals() {
  return useLiveQuery(
    () => db.goals.filter((g) => g.type === 'Annual' && g.status === 'Live').toArray(),
    []
  )
}

// Helper: get the start/end YYYY-MM-DD of the quarter `offset` quarters from the
// one containing `from` (offset 0 = current quarter, 1 = next quarter).
function getQuarterRange(from: Date, offset: number): { start: string; end: string } {
  const baseQuarter = Math.floor(from.getMonth() / 3)
  const startMonth = baseQuarter * 3 + offset * 3
  const start = new Date(from.getFullYear(), startMonth, 1)
  const end = new Date(from.getFullYear(), startMonth + 3, 0)
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  }
}

export function useCurrentQuarterGoals() {
  return useLiveQuery(async () => {
    const { start, end } = getQuarterRange(new Date(), 0)
    return db.goals
      .filter((g) =>
        g.type === 'Quarterly' &&
        g.deadline !== null &&
        g.deadline >= start &&
        g.deadline <= end
      )
      .toArray()
  }, [])
}

export function useNextQuarterGoals() {
  return useLiveQuery(async () => {
    const { start, end } = getQuarterRange(new Date(), 1)
    return db.goals
      .filter((g) =>
        g.type === 'Quarterly' &&
        g.deadline !== null &&
        g.deadline >= start &&
        g.deadline <= end
      )
      .toArray()
  }, [])
}

// Helper: add N days to a YYYY-MM-DD string, returns YYYY-MM-DD
function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().split('T')[0]
}

// Helper: count days between two YYYY-MM-DD strings (inclusive)
function daysBetweenInclusive(a: string, b: string): number {
  const msA = Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10))
  const msB = Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10))
  return Math.round((msB - msA) / 86400000) + 1
}

// Helper: get today as YYYY-MM-DD in local time
function todayStr(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

// Weekly leisure duration with pro-rated attribution
export function useWeeklyLeisureDuration(weekCommencing: string | null) {
  const result = useLiveQuery(
    async () => {
      if (!weekCommencing) return 0

      const weekStartStr = weekCommencing
      const weekEndStr = addDays(weekCommencing, 6)
      const today = todayStr()

      const items = await db.leisure
        .filter(
          (item) =>
            (item.status === 'Consumed' || item.status === 'Live') &&
            item.dateStarted !== null &&
            item.duration !== null &&
            item.duration > 0
        )
        .toArray()

      let totalSeconds = 0

      for (const item of items) {
        const itemStartStr = item.dateStarted!
        const itemEndStr = item.status === 'Live' && !item.dateEnded
          ? today
          : item.dateEnded ?? itemStartStr

        // No overlap if item ends before week starts or starts after week ends
        if (itemEndStr < weekStartStr || itemStartStr > weekEndStr) continue

        const overlapStartStr = itemStartStr > weekStartStr ? itemStartStr : weekStartStr
        const overlapEndStr = itemEndStr < weekEndStr ? itemEndStr : weekEndStr

        const overlapDays = daysBetweenInclusive(overlapStartStr, overlapEndStr)
        if (overlapDays <= 0) continue

        const totalDays = Math.max(1, daysBetweenInclusive(itemStartStr, itemEndStr))
        totalSeconds += (overlapDays / totalDays) * item.duration!
      }

      return totalSeconds
    },
    [weekCommencing]
  )

  return {
    totalSeconds: result ?? 0,
    loading: result === undefined,
  }
}

// Sync hook
export function useSync() {
  const queryClient = useQueryClient()

  const syncMutation = useMutation({
    mutationFn: () => syncService.performFullSync(),
    onSuccess: () => {
      // Invalidate all queries to refresh from local DB
      queryClient.invalidateQueries()
    },
  })

  return {
    sync: syncMutation.mutate,
    isSyncing: syncMutation.isPending,
    error: syncMutation.error,
  }
}

// Create health record mutation
export function useCreateHealth() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Omit<LocalHealthRecord, 'id' | 'name' | 'createdTime'>) =>
      syncService.createHealthRecord(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.health })
    },
  })
}

// Update health record mutation
export function useUpdateHealth() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      healthId,
      updates,
    }: {
      healthId: string
      updates: Partial<Pick<LocalHealthRecord, 'value' | 'date' | 'unitsType'>>
    }) => syncService.updateHealthRecord(healthId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.health })
    },
  })
}

// Create words record mutation
export function useCreateWords() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Omit<LocalWordsRecord, 'id' | 'createdTime'>) =>
      syncService.createWordsRecord(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.words })
    },
  })
}

// Create goal record mutation
export function useCreateGoal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Omit<LocalGoalsRecord, 'id' | 'createdTime'>) =>
      syncService.createGoalRecord(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goals })
    },
  })
}

// Update goal status mutation
export function useUpdateGoalStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      goalId,
      status,
    }: {
      goalId: string
      status: LocalGoalsRecord['status']
    }) => syncService.updateGoalStatus(goalId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goals })
    },
  })
}

// Update goal confidence mutation
export function useUpdateGoalConfidence() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      goalId,
      confidence,
    }: {
      goalId: string
      confidence: number
    }) => syncService.updateGoalConfidence(goalId, confidence),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goals })
    },
  })
}

// Update goal details (name and area) mutation
export function useUpdateGoalDetails() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      goalId,
      updates,
    }: {
      goalId: string
      updates: { name?: string; areaId?: string | null }
    }) => syncService.updateGoalDetails(goalId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goals })
    },
  })
}

// Create idea record mutation
export function useCreateIdea() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Omit<LocalIdeasRecord, 'id' | 'createdTime'>) =>
      syncService.createIdeaRecord(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ideas })
    },
  })
}

// Update idea record mutation
export function useUpdateIdea() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      ideaId,
      updates,
    }: {
      ideaId: string
      updates: Partial<Pick<LocalIdeasRecord, 'name' | 'type' | 'when' | 'notes' | 'status'>>
    }) => syncService.updateIdeaRecord(ideaId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ideas })
    },
  })
}

// Delete idea record mutation
export function useDeleteIdea() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (ideaId: string) => syncService.deleteIdeaRecord(ideaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ideas })
    },
  })
}

// Create rule record mutation
export function useCreateRule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Omit<LocalRulesRecord, 'id' | 'createdTime'>) =>
      syncService.createRulesRecord(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.rules })
    },
  })
}

// Update rule record mutation
export function useUpdateRule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      ruleId,
      updates,
    }: {
      ruleId: string
      updates: Partial<Pick<LocalRulesRecord, 'name' | 'select' | 'status' | 'confidence' | 'currentConfidence' | 'deadline' | 'outputGoal' | 'exceptions' | 'thresholdTrigger' | 'thresholdIds'>>
    }) => syncService.updateRulesRecord(ruleId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.rules })
    },
  })
}

// Create event record mutation
export function useCreateEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Omit<LocalEventsRecord, 'id' | 'createdTime'>) =>
      syncService.createEventsRecord(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events })
    },
  })
}

// Update event record mutation
export function useUpdateEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      eventId,
      updates,
    }: {
      eventId: string
      updates: Partial<Pick<LocalEventsRecord, 'name' | 'date' | 'dateHeld' | 'notes' | 'type' | 'status'>>
    }) => syncService.updateEventsRecord(eventId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events })
    },
  })
}

// Create leisure record mutation
export function useCreateLeisure() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Omit<LocalLeisureRecord, 'id' | 'createdTime'>) =>
      syncService.createLeisureRecord(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leisure })
    },
  })
}

// Update leisure record mutation
export function useUpdateLeisure() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      leisureId,
      updates,
    }: {
      leisureId: string
      updates: Partial<Pick<LocalLeisureRecord, 'name' | 'status' | 'type' | 'dateStarted' | 'dateEnded' | 'url' | 'duration' | 'rating'>>
    }) => syncService.updateLeisureRecord(leisureId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leisure })
    },
  })
}

// Delete leisure record mutation
export function useDeleteLeisure() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (leisureId: string) => syncService.deleteLeisureRecord(leisureId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leisure })
    },
  })
}

// Average of health values over last N days
export function useHealthAverageLastDays(type: LocalHealthRecord['type'], days: number = 7) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  const startDateStr = startDate.toISOString().split('T')[0]

  return useLiveQuery(
    async () => {
      const records = await db.health
        .where('type')
        .equals(type)
        .and((r) => r.date >= startDateStr)
        .toArray()
      if (records.length === 0) return null
      return records.reduce((sum, r) => sum + (r.value ?? 0), 0) / records.length
    },
    [type, startDateStr]
  )
}

// Sum of words for a project (or all) over last N days
export function useWordsSumLastDays(project: LocalWordsRecord['project'] | 'All', days: number = 7) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  const startDateStr = startDate.toISOString().split('T')[0]

  return useLiveQuery(
    async () => {
      let records
      if (project === 'All') {
        records = await db.words.filter((r) => r.when >= startDateStr).toArray()
      } else {
        records = await db.words.where('project').equals(project).and((r) => r.when >= startDateStr).toArray()
      }
      return records.reduce((sum, r) => sum + (r.words ?? 0), 0)
    },
    [project, startDateStr]
  )
}

// Last recorded words value for a project (or all)
export function useLastWordsValue(project: LocalWordsRecord['project'] | 'All') {
  return useLiveQuery(
    async () => {
      let records
      if (project === 'All') {
        records = await db.words.orderBy('when').reverse().toArray()
      } else {
        records = await db.words.where('project').equals(project).reverse().sortBy('when')
      }
      if (records.length === 0) return null
      return records[0].words
    },
    [project]
  )
}

// Average of last N words entries for a project (or all)
export function useWordsAverageLast(project: LocalWordsRecord['project'] | 'All', count: number) {
  return useLiveQuery(
    async () => {
      let records
      if (project === 'All') {
        records = await db.words.orderBy('when').reverse().toArray()
      } else {
        records = await db.words.where('project').equals(project).reverse().sortBy('when')
      }
      if (records.length === 0) return null
      const slice = records.slice(0, count)
      return slice.reduce((sum, r) => sum + r.words, 0) / slice.length
    },
    [project, count]
  )
}

// Average of words for a project (or all) over last N days
export function useWordsAverageLastDays(project: LocalWordsRecord['project'] | 'All', days: number = 7) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  const startDateStr = startDate.toISOString().split('T')[0]

  return useLiveQuery(
    async () => {
      let records
      if (project === 'All') {
        records = await db.words.filter((r) => r.when >= startDateStr).toArray()
      } else {
        records = await db.words.where('project').equals(project).and((r) => r.when >= startDateStr).toArray()
      }
      if (records.length === 0) return null
      return records.reduce((sum, r) => sum + (r.words ?? 0), 0) / records.length
    },
    [project, startDateStr]
  )
}

// Create threshold record mutation
export function useCreateThreshold() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Omit<LocalThresholdsRecord, 'id' | 'createdTime'>) =>
      syncService.createThresholdsRecord(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.thresholds })
    },
  })
}

// Update threshold record mutation
export function useUpdateThreshold() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      thresholdId,
      updates,
    }: {
      thresholdId: string
      updates: Partial<Pick<LocalThresholdsRecord, 'name' | 'source' | 'healthType' | 'ideaType' | 'wordsProject' | 'leisurePeriod' | 'sugarPeriod' | 'aggregation' | 'days' | 'redThreshold' | 'greenThreshold' | 'lowerIsBetter' | 'order' | 'ruleIds'>>
    }) => syncService.updateThresholdsRecord(thresholdId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.thresholds })
    },
  })
}

// Delete threshold record mutation
export function useDeleteThreshold() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (thresholdId: string) => syncService.deleteThresholdsRecord(thresholdId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.thresholds })
    },
  })
}

// Aggregate data hooks
export function useWeeklyStats(weekId: string | null) {
  const week = useLiveQuery(
    () => (weekId ? db.weeks.get(weekId) : undefined),
    [weekId]
  )

  return {
    week,
    stats: week
      ? {
          totalWords: week.totalWords ?? 0,
          totalFiction: week.totalFiction ?? 0,
          totalBlog: week.totalBlog ?? 0,
          totalNotes: week.totalNotes ?? 0,
          averageSugar: week.averageSugar ?? 0,
          totalUnits: week.totalUnits ?? 0,
          totalReps: week.totalReps ?? 0,
          goalSuccessRate: week.goalSuccessRate ?? 0,
          totalGoals: week.totalGoals ?? 0,
          goalSuccess: week.goalSuccess ?? 0,
        }
      : null,
  }
}

// Health trends over last N days
export function useHealthTrends(type: LocalHealthRecord['type'], days: number = 30) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  const startDateStr = startDate.toISOString().split('T')[0]

  return useLiveQuery(
    () =>
      db.health
        .where('type')
        .equals(type)
        .and((r) => r.date >= startDateStr)
        .sortBy('date'),
    [type, startDateStr]
  )
}

// Last recorded value for a health type
export function useLastHealthValue(type: LocalHealthRecord['type']) {
  return useLiveQuery(
    async () => {
      const records = await db.health
        .where('type')
        .equals(type)
        .reverse()
        .sortBy('date')
      if (records.length === 0) return null
      return records[0].value
    },
    [type]
  )
}

// Average of last N recorded values for a health type
export function useHealthAverageLast(type: LocalHealthRecord['type'], count: number) {
  return useLiveQuery(
    async () => {
      const records = await db.health
        .where('type')
        .equals(type)
        .reverse()
        .sortBy('date')
      if (records.length === 0) return null
      const slice = records.slice(0, count)
      return slice.reduce((sum, r) => sum + r.value, 0) / slice.length
    },
    [type, count]
  )
}

// Sum of health values over last N days
export function useHealthSumLastDays(type: LocalHealthRecord['type'], days: number = 7) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  const startDateStr = startDate.toISOString().split('T')[0]

  return useLiveQuery(
    async () => {
      const records = await db.health
        .where('type')
        .equals(type)
        .and((r) => r.date >= startDateStr)
        .toArray()
      return records.reduce((sum, r) => sum + (r.value ?? 0), 0)
    },
    [type, startDateStr]
  )
}

// Count of ideas of a given type over last N days
export function useIdeasCountLastDays(type: LocalIdeasRecord['type'], days: number) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  const startDateStr = startDate.toISOString().split('T')[0]

  return useLiveQuery(
    async () => {
      const records = await db.ideas
        .where('type')
        .equals(type)
        .and((r) => r.when >= startDateStr)
        .toArray()
      return records.length
    },
    [type, startDateStr]
  )
}

// Words by project for current week
export function useCurrentWeekWordsByProject() {
  const currentWeek = useCurrentWeek()
  const words = useWordsByWeek(currentWeek?.id ?? null)

  const byProject = {
    Arcadia: 0,
    Blog: 0,
    Notes: 0,
    Novella: 0,
    Scoping: 0,
  }

  if (words) {
    words.forEach((w) => {
      byProject[w.project] += w.words
    })
  }

  return byProject
}

// Scoping words summed per week from local records
// (the Weeks table has no Total Scoping rollup, unlike the other projects)
export function useScopingWordsByWeek() {
  return useLiveQuery(async () => {
    const records = await db.words.where('project').equals('Scoping').toArray()
    const byWeek: Record<string, number> = {}
    records.forEach((r) => {
      if (r.weekId) byWeek[r.weekId] = (byWeek[r.weekId] ?? 0) + r.words
    })
    return byWeek
  })
}

// Units per week average for a given year
export function useYearlyUnitsPerWeek(year: number = 2026) {
  const yearStart = `${year}-01-01`

  const totalUnits = useLiveQuery(
    async () => {
      // Sum all Units entries on or after Jan 1 of the year
      const entries = await db.health
        .filter((h) => h.type === 'Units' && h.date >= yearStart)
        .toArray()

      return entries.reduce((sum, entry) => sum + (entry.value ?? 0), 0)
    },
    [yearStart]
  )

  // Calculate current week number of the year
  const now = new Date()
  const janFirst = new Date(year, 0, 1)
  const diffMs = now.getTime() - janFirst.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const weekNumber = Math.floor(diffDays / 7) + 1

  if (totalUnits === undefined || weekNumber <= 0) {
    return { unitsPerWeek: 0, totalUnits: 0, weekNumber: 0, loading: true }
  }

  return {
    unitsPerWeek: totalUnits / weekNumber,
    totalUnits,
    weekNumber,
    loading: false,
  }
}

// Features per week average for a given year
export function useYearlyFeaturesPerWeek(year: number = 2026) {
  const yearStart = `${year}-01-01`

  const totalFeatures = useLiveQuery(
    async () => {
      const features = await db.ideas
        .where('type')
        .equals('Feature')
        .and((idea) => idea.when >= yearStart)
        .toArray()

      return features.length
    },
    [yearStart]
  )

  // Calculate current week number of the year
  const now = new Date()
  const janFirst = new Date(year, 0, 1)
  const diffMs = now.getTime() - janFirst.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const weekNumber = Math.floor(diffDays / 7) + 1

  if (totalFeatures === undefined || weekNumber <= 0) {
    return { featuresPerWeek: 0, totalFeatures: 0, weekNumber: 0, loading: true }
  }

  return {
    featuresPerWeek: totalFeatures / weekNumber,
    totalFeatures,
    weekNumber,
    loading: false,
  }
}

// Events per week average for a given year
export function useYearlyEventsPerWeek(year: number = 2026) {
  const yearStart = `${year}-01-01`

  const totalEvents = useLiveQuery(
    async () => {
      const events = await db.events
        .filter((event) => event.date >= yearStart)
        .toArray()

      return events.length
    },
    [yearStart]
  )

  // Calculate current week number of the year
  const now = new Date()
  const janFirst = new Date(year, 0, 1)
  const diffMs = now.getTime() - janFirst.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const weekNumber = Math.floor(diffDays / 7) + 1

  if (totalEvents === undefined || weekNumber <= 0) {
    return { eventsPerWeek: 0, totalEvents: 0, weekNumber: 0, loading: true }
  }

  return {
    eventsPerWeek: totalEvents / weekNumber,
    totalEvents,
    weekNumber,
    loading: false,
  }
}

// Words per week average for a given year
export function useYearlyWordsPerWeek(year: number = 2026) {
  const yearStart = `${year}-01-01`

  const totalWords = useLiveQuery(
    async () => {
      const words = await db.words
        .filter((w) => w.when >= yearStart)
        .toArray()

      return words.reduce((sum, w) => sum + (w.words ?? 0), 0)
    },
    [yearStart]
  )

  // Calculate current week number of the year
  const now = new Date()
  const janFirst = new Date(year, 0, 1)
  const diffMs = now.getTime() - janFirst.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const weekNumber = Math.floor(diffDays / 7) + 1

  if (totalWords === undefined || weekNumber <= 0) {
    return { wordsPerWeek: 0, totalWords: 0, weekNumber: 0, loading: true }
  }

  return {
    wordsPerWeek: totalWords / weekNumber,
    totalWords,
    weekNumber,
    loading: false,
  }
}

// Revelations per week average for a given year
export function useYearlyRevelationsPerWeek(year: number = 2026) {
  const yearStart = `${year}-01-01`

  const totalRevelations = useLiveQuery(
    async () => {
      const revelations = await db.ideas
        .where('type')
        .equals('Revelation')
        .and((idea) => idea.when >= yearStart)
        .toArray()

      return revelations.length
    },
    [yearStart]
  )

  // Calculate current week number of the year
  const now = new Date()
  const janFirst = new Date(year, 0, 1)
  const diffMs = now.getTime() - janFirst.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const weekNumber = Math.floor(diffDays / 7) + 1

  if (totalRevelations === undefined || weekNumber <= 0) {
    return { revelationsPerWeek: 0, totalRevelations: 0, weekNumber: 0, loading: true }
  }

  return {
    revelationsPerWeek: totalRevelations / weekNumber,
    totalRevelations,
    weekNumber,
    loading: false,
  }
}

// Cruxes per week average for a given year
export function useYearlyCruxesPerWeek(year: number = 2026) {
  const yearStart = `${year}-01-01`

  const totalCruxes = useLiveQuery(
    async () => {
      const cruxes = await db.ideas
        .where('type')
        .equals('Crux')
        .and((idea) => idea.when >= yearStart)
        .toArray()

      return cruxes.length
    },
    [yearStart]
  )

  // Calculate current week number of the year
  const now = new Date()
  const janFirst = new Date(year, 0, 1)
  const diffMs = now.getTime() - janFirst.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const weekNumber = Math.floor(diffDays / 7) + 1

  if (totalCruxes === undefined || weekNumber <= 0) {
    return { cruxesPerWeek: 0, totalCruxes: 0, weekNumber: 0, loading: true }
  }

  return {
    cruxesPerWeek: totalCruxes / weekNumber,
    totalCruxes,
    weekNumber,
    loading: false,
  }
}

// Reps per week average for a given year
export function useYearlyRepsPerWeek(year: number = 2026) {
  const yearStart = `${year}-01-01`

  const totalReps = useLiveQuery(
    async () => {
      // Sum all Reps entries on or after Jan 1 of the year
      const entries = await db.health
        .filter((h) => h.type === 'Reps' && h.date >= yearStart)
        .toArray()

      return entries.reduce((sum, entry) => sum + (entry.value ?? 0), 0)
    },
    [yearStart]
  )

  // Calculate current week number of the year
  const now = new Date()
  const janFirst = new Date(year, 0, 1)
  const diffMs = now.getTime() - janFirst.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const weekNumber = Math.floor(diffDays / 7) + 1

  if (totalReps === undefined || weekNumber <= 0) {
    return { repsPerWeek: 0, totalReps: 0, weekNumber: 0, loading: true }
  }

  return {
    repsPerWeek: totalReps / weekNumber,
    totalReps,
    weekNumber,
    loading: false,
  }
}
