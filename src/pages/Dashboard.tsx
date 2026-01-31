import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { CompactStatCard } from '@/components/widgets/CompactStatCard'
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
  useYearlyUnitsPerWeek,
  useYearlyFeaturesPerWeek,
  useYearlyEventsPerWeek,
  useYearlyWordsPerWeek,
  useYearlyRevelationsPerWeek,
  useYearlyCruxesPerWeek,
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
  const yearlyUnits = useYearlyUnitsPerWeek(2026)
  const features2026 = useYearlyFeaturesPerWeek(2026)
  const events2026 = useYearlyEventsPerWeek(2026)
  const words2026 = useYearlyWordsPerWeek(2026)
  const revelations2026 = useYearlyRevelationsPerWeek(2026)
  const cruxes2026 = useYearlyCruxesPerWeek(2026)

  // Initialize sync on mount
  useEffect(() => {
    syncService.initializeListeners()
  }, [])

  const loading = !currentWeek

  const liveGoals = currentWeekGoals?.filter((g) => g.status === 'Live') ?? []
  const completedGoals = currentWeekGoals?.filter((g) => g.status === 'Success') ?? []

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-2 text-sm">Totals</h3>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg px-3 py-2">
            <p className="text-xs text-blue-600 font-medium">Donations</p>
            {!careerTotals ? (
              <div className="h-6 w-12 bg-blue-200 animate-pulse rounded mt-0.5" />
            ) : (
              <p className="text-xl font-bold text-blue-900">{(careerTotals.totalDonations ?? 0).toLocaleString()}</p>
            )}
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg px-3 py-2">
            <p className="text-xs text-green-600 font-medium">Lives Saved</p>
            {!careerTotals ? (
              <div className="h-6 w-12 bg-green-200 animate-pulse rounded mt-0.5" />
            ) : (
              <p className="text-xl font-bold text-green-900">{Math.floor(careerTotals.totalLives ?? 0).toLocaleString()}</p>
            )}
          </div>
        </div>
        <p className="text-xs text-slate-400 mb-2">2026 Weekly Averages</p>
        <div className="grid grid-cols-3 gap-2">
          <CompactStatCard
            label="Units"
            value={yearlyUnits.unitsPerWeek.toFixed(1)}
            loading={yearlyUnits.loading}
            goal={40}
            goalDirection="under"
          />
          <CompactStatCard
            label="Features"
            value={features2026.featuresPerWeek.toFixed(1)}
            loading={features2026.loading}
            goal={3}
            goalDirection="over"
          />
          <CompactStatCard
            label="Events"
            value={events2026.eventsPerWeek.toFixed(1)}
            loading={events2026.loading}
            goal={1}
            goalDirection="over"
          />
          <CompactStatCard
            label="Words"
            value={Math.round(words2026.wordsPerWeek)}
            loading={words2026.loading}
            goal={300}
            goalDirection="over"
          />
          <CompactStatCard
            label="Revelations"
            value={revelations2026.revelationsPerWeek.toFixed(2)}
            loading={revelations2026.loading}
            goal={1}
            goalDirection="over"
          />
          <CompactStatCard
            label="Cruxes"
            value={cruxes2026.cruxesPerWeek.toFixed(2)}
            loading={cruxes2026.loading}
            goal={3}
            goalDirection="over"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-2 text-sm">
          {currentWeek?.name ?? 'This Week'}
        </h3>
        <div className="grid grid-cols-3 gap-2">
          <CompactStatCard
            label="Words"
            value={stats?.totalWords ?? 0}
            loading={loading}
          />
          <CompactStatCard
            label="Goals"
            value={`${completedGoals.length}/${(currentWeekGoals?.length ?? 0)}`}
            loading={loading}
          />
          <CompactStatCard
            label="Glucose"
            value={typeof stats?.averageSugar === 'number' ? stats.averageSugar.toFixed(1) : '--'}
            loading={loading}
          />
          <CompactStatCard
            label="Units"
            value={stats?.totalUnits ?? 0}
            loading={loading}
          />
          <CompactStatCard
            label="Reps"
            value={stats?.totalReps ?? 0}
            loading={loading}
          />
          <CompactStatCard
            label="Budget"
            value={Math.max(0, Math.round(40 * yearlyUnits.weekNumber - yearlyUnits.totalUnits))}
            loading={yearlyUnits.loading}
          />
        </div>
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

      <Link
        to="/events"
        className="block bg-white rounded-xl p-4 shadow-sm border border-slate-200 hover:border-blue-300 transition-colors"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Events</h3>
          <span className="text-blue-600 text-sm">View all</span>
        </div>
        <p className="text-sm text-slate-500 mt-1">Track meals, parties, cinema trips and more</p>
      </Link>
    </div>
  )
}
