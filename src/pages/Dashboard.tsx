import { useEffect } from 'react'
import { Link } from 'react-router-dom'
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
  useRulesByStatus,
} from '@/hooks/useAirtableData'
import { syncService } from '@/services/sync'

export function Dashboard() {
  const currentWeek = useCurrentWeek()
  const { stats } = useWeeklyStats(currentWeek?.id ?? null)
  const glucoseTrends = useHealthTrends('Glucose', 14)
  const weeks = useWeeks()
  const currentWeekGoals = useCurrentWeekGoals()
  const careerTotals = useCareerTotals()
  const liveRules = useRulesByStatus('Live')

  // Initialize sync on mount
  useEffect(() => {
    syncService.initializeListeners()
  }, [])

  const loading = !currentWeek

  const liveGoals = currentWeekGoals?.filter((g) => g.status === 'Live') ?? []
  const completedGoals = currentWeekGoals?.filter((g) => g.status === 'Success') ?? []

  // Calculate average confidence for live goals
  const goalsWithConfidence = liveGoals.filter((g) => g.currentConfidence !== null)
  const avgGoalConfidence =
    goalsWithConfidence.length > 0
      ? goalsWithConfidence.reduce((sum, g) => sum + (g.currentConfidence ?? 0), 0) /
        goalsWithConfidence.length
      : null

  return (
    <div className="space-y-6">
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
            value={Math.floor(careerTotals?.totalLives ?? 0)}
            loading={!careerTotals}
          />
        </div>
      </div>

      <h2 className="text-2xl font-bold text-slate-900">
        {currentWeek?.name ?? 'This Week'}
      </h2>

      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="Words"
          value={stats?.totalWords ?? 0}
          loading={loading}
        />
        <StatCard
          label="Goals"
          value={`${completedGoals.length}/${(currentWeekGoals?.length ?? 0)}`}
          loading={loading}
        />
        <StatCard
          label="Confidence"
          value={avgGoalConfidence !== null ? `${Math.round(avgGoalConfidence * 100)}%` : '--'}
          loading={loading}
        />
        <StatCard
          label="Glucose"
          value={typeof stats?.averageSugar === 'number' ? stats.averageSugar.toFixed(1) : '--'}
          loading={loading}
        />
        <StatCard
          label="Units"
          value={stats?.totalUnits ?? 0}
          loading={loading}
        />
        <StatCard
          label="Reps"
          value={stats?.totalReps ?? 0}
          loading={loading}
        />
        <StatCard
          label="Steps"
          value={currentWeek?.steps ?? 0}
          loading={loading}
        />
        <StatCard
          label="Stages"
          value={currentWeek?.stages ?? 0}
          loading={loading}
        />
        <StatCard
          label="Features"
          value={currentWeek?.features ?? 0}
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

      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">Live Rules</h3>
          <Link
            to="/health/rules"
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            View all
          </Link>
        </div>
        {liveRules && liveRules.length > 0 ? (
          <div className="space-y-2">
            {liveRules.slice(0, 5).map((rule) => (
              <div
                key={rule.id}
                className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      rule.select === 'Goal' ? 'bg-blue-500' : 'bg-red-500'
                    }`}
                  />
                  <span className="text-sm text-slate-700">{rule.name}</span>
                </div>
                {rule.currentConfidence !== null && (
                  <span
                    className={`text-xs font-medium ${
                      rule.currentConfidence >= 0.7
                        ? 'text-green-600'
                        : rule.currentConfidence >= 0.4
                        ? 'text-amber-600'
                        : 'text-red-600'
                    }`}
                  >
                    {Math.round(rule.currentConfidence * 100)}%
                  </span>
                )}
              </div>
            ))}
            {liveRules.length > 5 && (
              <p className="text-xs text-slate-400 pt-1">
                +{liveRules.length - 5} more
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-400 text-center py-4">
            No live rules
          </p>
        )}
      </div>
    </div>
  )
}
