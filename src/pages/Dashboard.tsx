import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { CompactStatCard } from '@/components/widgets/CompactStatCard'
import { TrafficLightWidgets } from '@/components/widgets/TrafficLightWidget'
import { HealthTrendChart } from '@/components/charts/HealthTrendChart'
import { WordsBarChart } from '@/components/charts/WordsBarChart'
import { GoalProgressRing } from '@/components/charts/GoalProgressRing'
import {
  useCurrentWeek,
  useLastWeek,
  useWeeklyStats,
  useHealthTrends,
  useWeeks,
  useCurrentWeekGoals,
  useCareerTotals,
  useDonations,
  useHomeMetrics,
  useHiddenBuiltInTiles,
  useRulesByStatus,
  useYearlyUnitsPerWeek,
  useYearlyFeaturesPerWeek,
  useYearlyEventsPerWeek,
  useYearlyWordsPerWeek,
  useYearlyRevelationsPerWeek,
  useYearlyCruxesPerWeek,
  useYearlyRepsPerWeek,
  useWeeklyLeisureDuration,
  useIdeasByStatus,
  useAllThresholdColors,
  useLocalWordsByWeek,
} from '@/hooks/useAirtableData'
import { formatDuration } from '@/utils/formatDuration'
import { syncService } from '@/services/sync'
import type { LocalMetricsRecord, LocalRulesRecord } from '@/types/airtable'

// Static class sets so Tailwind keeps them; cycled per pinned metric tile
const METRIC_TILE_STYLES = [
  { bg: 'from-teal-50 to-teal-100', label: 'text-teal-600', value: 'text-teal-900' },
  { bg: 'from-rose-50 to-rose-100', label: 'text-rose-600', value: 'text-rose-900' },
  { bg: 'from-indigo-50 to-indigo-100', label: 'text-indigo-600', value: 'text-indigo-900' },
  { bg: 'from-cyan-50 to-cyan-100', label: 'text-cyan-600', value: 'text-cyan-900' },
  { bg: 'from-lime-50 to-lime-100', label: 'text-lime-600', value: 'text-lime-900' },
  { bg: 'from-fuchsia-50 to-fuchsia-100', label: 'text-fuchsia-600', value: 'text-fuchsia-900' },
]

// Same ordering as the Rules page groups: explicit order first, unordered last
const byRuleOrder = (a: LocalRulesRecord, b: LocalRulesRecord) =>
  (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER) || a.name.localeCompare(b.name)

const formatMetricValue = (latest: LocalMetricsRecord | null) => {
  if (!latest) return '--'
  if (latest.valueNumber !== null) {
    return Number.isInteger(latest.valueNumber)
      ? latest.valueNumber.toLocaleString()
      : latest.valueNumber.toFixed(1)
  }
  if (latest.valueDate) {
    return new Date(latest.valueDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
  }
  return '--'
}

export function Dashboard() {
  const currentWeek = useCurrentWeek()
  const { stats } = useWeeklyStats(currentWeek?.id ?? null)
  const glucoseTrends = useHealthTrends('Glucose', 14)
  const weeks = useWeeks()
  const localWordsByWeek = useLocalWordsByWeek()
  const currentWeekGoals = useCurrentWeekGoals()
  const careerTotals = useCareerTotals()
  const donations = useDonations()

  // Per-type donation totals (EA / LW / ...), for the split under the tile total
  const donationsByType = useMemo(() => {
    const map = new Map<string, number>()
    for (const d of donations ?? []) {
      const key = d.type ?? 'Other'
      map.set(key, (map.get(key) ?? 0) + d.amount)
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [donations])
  const homeMetrics = useHomeMetrics()
  const hiddenTiles = useHiddenBuiltInTiles()
  const testingRules = useRulesByStatus('Testing')
  const liveRules = useRulesByStatus('Live')
  const thresholdColors = useAllThresholdColors()

  // A rule is triggered when any linked threshold matches its trigger setting
  const isRuleTriggered = (rule: LocalRulesRecord) => {
    if (!rule.thresholdIds || rule.thresholdIds.length === 0 || !thresholdColors) return false
    const trigger = rule.thresholdTrigger ?? 'red'
    return rule.thresholdIds.some(id => {
      const c = thresholdColors.get(id)
      if (trigger === 'red') return c === 'red'
      if (trigger === 'amberOnly') return c === 'amber'
      return c === 'red' || c === 'amber'
    })
  }

  // Home shows the top 3 Testing rules plus 1 Live rule. The Live pick is
  // pseudo-random but seeded by the date, so it rotates daily instead of
  // reshuffling on every render.
  const topTestingRules = [...(testingRules ?? [])].sort(byRuleOrder).slice(0, 3)
  const dailyLiveRule = useMemo(() => {
    if (!liveRules || liveRules.length === 0) return null
    const sorted = [...liveRules].sort(byRuleOrder)
    const daySeed = Math.floor(Date.now() / 86_400_000)
    return sorted[(daySeed * 31 + 7) % sorted.length]
  }, [liveRules])
  const homeRules = dailyLiveRule ? [...topTestingRules, dailyLiveRule] : topTestingRules
  const yearlyUnits = useYearlyUnitsPerWeek(2026)
  const features2026 = useYearlyFeaturesPerWeek(2026)
  const events2026 = useYearlyEventsPerWeek(2026)
  const words2026 = useYearlyWordsPerWeek(2026)
  const revelations2026 = useYearlyRevelationsPerWeek(2026)
  const cruxes2026 = useYearlyCruxesPerWeek(2026)
  const reps2026 = useYearlyRepsPerWeek(2026)
  const lastWeek = useLastWeek()
  const weeklyLeisure = useWeeklyLeisureDuration(currentWeek?.weekCommencing ?? null)
  const lastWeekLeisure = useWeeklyLeisureDuration(lastWeek?.weekCommencing ?? null)
  const activeIdeas = useIdeasByStatus('Active')

  // Initialize sync on mount
  useEffect(() => {
    syncService.initializeListeners()
  }, [])

  const loading = !currentWeek

  const liveGoals = currentWeekGoals?.filter((g) => g.status === 'Live') ?? []
  const completedGoals = currentWeekGoals?.filter((g) => g.status === 'Success') ?? []
  const failedGoals = currentWeekGoals?.filter((g) => g.status === 'Fail') ?? []

  // Average confidence for this week's goals
  const goalsWithConfidence = currentWeekGoals?.filter((g) => g.currentConfidence !== null) ?? []
  const avgConfidence = goalsWithConfidence.length > 0
    ? goalsWithConfidence.reduce((sum, g) => sum + (g.currentConfidence ?? 0), 0) / goalsWithConfidence.length
    : null

  const daysRemaining = useMemo(() => {
    const now = new Date()
    const target = new Date(2032, 3, 1) // April 1st 2032
    const diffMs = target.getTime() - now.getTime()
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  }, [])

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-200">
        <Link to="/metrics" className="block font-semibold text-slate-900 mb-2 text-sm hover:text-blue-600 transition-colors">Totals</Link>
        <div className="grid grid-cols-4 gap-2 mb-3">
          {!hiddenTiles?.has('Countdown') && (
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg px-3 py-2">
              <p className="text-xs text-amber-600 font-medium">Countdown</p>
              <p className="text-xl font-bold text-amber-900">{daysRemaining.toLocaleString()}</p>
            </div>
          )}
          {!hiddenTiles?.has('Donations') && (
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg px-3 py-2">
              <p className="text-xs text-blue-600 font-medium">Donations</p>
              {!careerTotals ? (
                <div className="h-6 w-12 bg-blue-200 animate-pulse rounded mt-0.5" />
              ) : (
                <>
                  <p className="text-xl font-bold text-blue-900">{(careerTotals.totalDonations ?? 0).toLocaleString()}</p>
                  {donationsByType.length > 0 && (
                    <p className="text-[10px] text-blue-600 leading-tight">
                      {donationsByType.map(([type, total]) => `${type} ${Math.round(total).toLocaleString()}`).join(' · ')}
                    </p>
                  )}
                </>
              )}
            </div>
          )}
          {!hiddenTiles?.has('Lives Saved') && (
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg px-3 py-2">
              <p className="text-xs text-green-600 font-medium">Lives Saved</p>
              {!careerTotals ? (
                <div className="h-6 w-12 bg-green-200 animate-pulse rounded mt-0.5" />
              ) : (
                <p className="text-xl font-bold text-green-900">{Math.floor(careerTotals.totalLives ?? 0).toLocaleString()}</p>
              )}
            </div>
          )}
          {!hiddenTiles?.has('Reps 2026') && (
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg px-3 py-2">
              <p className="text-xs text-purple-600 font-medium">Reps 2026</p>
              {reps2026.loading ? (
                <div className="h-6 w-12 bg-purple-200 animate-pulse rounded mt-0.5" />
              ) : (
                <p className="text-xl font-bold text-purple-900">{reps2026.totalReps.toLocaleString()}</p>
              )}
            </div>
          )}
          {!hiddenTiles?.has('Words 2026') && (
            <div className="bg-gradient-to-br from-sky-50 to-sky-100 rounded-lg px-3 py-2">
              <p className="text-xs text-sky-600 font-medium">Words 2026</p>
              {words2026.loading ? (
                <div className="h-6 w-12 bg-sky-200 animate-pulse rounded mt-0.5" />
              ) : (
                <p className="text-xl font-bold text-sky-900">{Math.round(words2026.totalWords).toLocaleString()}</p>
              )}
            </div>
          )}
          {(homeMetrics ?? []).map(({ metric, latest }, i) => {
            const tile = METRIC_TILE_STYLES[i % METRIC_TILE_STYLES.length]
            return (
              <div key={metric} className={`bg-gradient-to-br ${tile.bg} rounded-lg px-3 py-2`}>
                <p className={`text-xs font-medium ${tile.label}`}>{metric}</p>
                <p className={`text-xl font-bold ${tile.value}`}>{formatMetricValue(latest)}</p>
              </div>
            )
          })}
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
            goal={1000}
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

      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">Rules</h3>
          <Link
            to="/health/rules"
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            View all
          </Link>
        </div>
        {homeRules.length > 0 ? (
          <div className="space-y-2">
            {homeRules.map((rule) => {
              const isTesting = rule.status === 'Testing'
              const isTriggered = !isTesting && isRuleTriggered(rule)
              let triggerColor: 'red' | 'amber' | null = null
              if (isTriggered && thresholdColors) {
                const hasRed = rule.thresholdIds.some(id => thresholdColors.get(id) === 'red')
                triggerColor = hasRed ? 'red' : 'amber'
              }

              return (
                <div
                  key={rule.id}
                  className={`flex items-center justify-between py-2 px-2 rounded-lg ${
                    triggerColor === 'red' ? 'bg-red-50 border border-red-200' :
                    triggerColor === 'amber' ? 'bg-amber-50 border border-amber-200' :
                    'border-b border-slate-100 last:border-0'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isTesting ? 'bg-purple-500' :
                        triggerColor === 'red' ? 'bg-red-500' :
                        triggerColor === 'amber' ? 'bg-amber-400' :
                        rule.select === 'Goal' ? 'bg-blue-500' : 'bg-red-500'
                      }`}
                    />
                    <span className={`text-sm ${
                      triggerColor ? 'font-medium text-slate-900' : 'text-slate-700'
                    }`}>{rule.name}</span>
                  </div>
                  {isTesting ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                      Testing
                    </span>
                  ) : triggerColor ? (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      triggerColor === 'red' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      Catch-up
                    </span>
                  ) : rule.currentConfidence !== null ? (
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
                  ) : null}
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-400 text-center py-4">
            No rules to show
          </p>
        )}
      </div>

      <TrafficLightWidgets />

      {activeIdeas && activeIdeas.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <h3 className="font-semibold text-slate-900 mb-3 text-sm">Active Ideas</h3>
          <div className="space-y-2">
            {activeIdeas.map((idea) => (
              <div
                key={idea.id}
                className="flex items-start gap-2 text-sm"
              >
                <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 shrink-0">
                  {idea.type}
                </span>
                <span className="text-slate-700">{idea.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

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
          <CompactStatCard
            label="Leisure"
            value={formatDuration(weeklyLeisure.totalSeconds) || '0h'}
            loading={weeklyLeisure.loading}
          />
          <CompactStatCard
            label="LW Leisure"
            value={formatDuration(lastWeekLeisure.totalSeconds) || '0h'}
            loading={lastWeekLeisure.loading}
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
        <WordsBarChart weeks={weeks} localWordsByWeek={localWordsByWeek} loading={!weeks} />
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">Goal Progress</h3>
          {avgConfidence !== null && (
            <span className={`text-sm font-medium ${
              avgConfidence >= 0.6 ? 'text-green-600' : avgConfidence >= 0.4 ? 'text-amber-600' : 'text-red-600'
            }`}>
              Avg: {Math.round(avgConfidence * 100)}%
            </span>
          )}
        </div>
        <div className="flex justify-center">
          <GoalProgressRing
            completed={completedGoals.length}
            failed={failedGoals.length}
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

      <Link
        to="/leisure"
        className="block bg-white rounded-xl p-4 shadow-sm border border-slate-200 hover:border-blue-300 transition-colors"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Leisure</h3>
          <span className="text-blue-600 text-sm">View all</span>
        </div>
        <p className="text-sm text-slate-500 mt-1">Track books, films, TV shows, games and more</p>
      </Link>
    </div>
  )
}
