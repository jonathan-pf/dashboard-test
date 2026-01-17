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
  return useLiveQuery(() => db.weeks.orderBy('weekNumber').reverse().toArray(), [])
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
