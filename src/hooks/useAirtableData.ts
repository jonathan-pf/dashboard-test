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
} from '@/types/airtable'

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
      updates: Partial<Pick<LocalRulesRecord, 'name' | 'select' | 'status' | 'confidence' | 'currentConfidence' | 'deadline' | 'outputGoal'>>
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

// Words by project for current week
export function useCurrentWeekWordsByProject() {
  const currentWeek = useCurrentWeek()
  const words = useWordsByWeek(currentWeek?.id ?? null)

  const byProject = {
    Arcadia: 0,
    Blog: 0,
    Notes: 0,
    Novella: 0,
  }

  if (words) {
    words.forEach((w) => {
      byProject[w.project] += w.words
    })
  }

  return byProject
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
