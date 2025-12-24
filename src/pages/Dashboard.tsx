import { useEffect } from 'react'
import { StatCard } from '@/components/widgets/StatCard'
import { HealthTrendChart } from '@/components/charts/HealthTrendChart'
import { WordsBarChart } from '@/components/charts/WordsBarChart'
import { GoalProgressRing } from '@/components/charts/GoalProgressRing'
import {
  useCurrentWeek,
  useWeeklyStats,
  useHealthTrends,
  useWeeks,
  useCurrentWeekGoals,
  useCareerTotals,
} from '@/hooks/useAirtableData'
import { syncService } from '@/services/sync'

export function Dashboard() {
  const currentWeek = useCurrentWeek()
  const { stats } = useWeeklyStats(currentWeek?.id ?? null)
  const glucoseTrends = useHealthTrends('Glucose', 14)
  const weeks = useWeeks()
  const currentWeekGoals = useCurrentWeekGoals()
  const careerTotals = useCareerTotals()

  // Initialize sync on mount
  useEffect(() => {
    syncService.initializeListeners()
  }, [])

  const loading = !currentWeek

  const liveGoals = currentWeekGoals?.filter((g) => g.status === 'Live') ?? []
  const completedGoals = currentWeekGoals?.filter((g) => g.status === 'Success') ?? []

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">
        {currentWeek?.name ?? 'This Week'}
      </h2>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-3">Totals</h3>
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            label="Total Donations"
            value={careerTotals?.totalDonations ?? 0}
            loading={!careerTotals}
          />
          <StatCard
            label="Total Lives"
            value={careerTotals?.totalLives ?? 0}
            loading={!careerTotals}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard
          label="Words Written"
          value={stats?.totalWords ?? 0}
          loading={loading}
        />
        <StatCard
          label="Goals Complete"
          value={`${completedGoals.length}/${(currentWeekGoals?.length ?? 0)}`}
          loading={loading}
        />
        <StatCard
          label="Avg Glucose"
          value={typeof stats?.averageSugar === 'number' ? stats.averageSugar.toFixed(1) : '--'}
          loading={loading}
        />
        <StatCard
          label="Total Units"
          value={stats?.totalUnits ?? 0}
          loading={loading}
        />
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-4">Glucose Trend (14 days)</h3>
        <HealthTrendChart
          data={glucoseTrends}
          type="Glucose"
          loading={!glucoseTrends}
        />
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-4">Words by Week</h3>
        <WordsBarChart weeks={weeks} loading={!weeks} />
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-4">Goal Progress</h3>
        <div className="flex justify-center">
          <GoalProgressRing
            completed={completedGoals.length}
            total={currentWeekGoals?.length ?? 0}
          />
        </div>
        {liveGoals.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm text-slate-500 font-medium">Active goals:</p>
            {liveGoals.slice(0, 3).map((goal) => (
              <div
                key={goal.id}
                className="flex items-center gap-2 text-sm text-slate-700"
              >
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                {goal.name}
              </div>
            ))}
            {liveGoals.length > 3 && (
              <p className="text-xs text-slate-400">
                +{liveGoals.length - 3} more
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
