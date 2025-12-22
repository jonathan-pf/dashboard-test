import { GoalProgressRing } from '@/components/charts/GoalProgressRing'
import {
  useCurrentWeekGoals,
  useGoals,
  useUpdateGoalStatus,
  useWeeks,
} from '@/hooks/useAirtableData'
import type { LocalGoalsRecord } from '@/types/airtable'

export function Goals() {
  const currentWeekGoals = useCurrentWeekGoals()
  const allGoals = useGoals()
  const weeks = useWeeks()
  const updateGoalStatus = useUpdateGoalStatus()

  const liveGoals = currentWeekGoals?.filter((g) => g.status === 'Live') ?? []
  const completedGoals = currentWeekGoals?.filter((g) => g.status === 'Success') ?? []
  const failedGoals = currentWeekGoals?.filter((g) => g.status === 'Fail') ?? []

  const handleToggleGoal = async (goal: LocalGoalsRecord) => {
    const newStatus = goal.status === 'Success' ? 'Live' : 'Success'
    await updateGoalStatus.mutateAsync({ goalId: goal.id, status: newStatus })
  }

  const handleMarkFailed = async (goalId: string) => {
    await updateGoalStatus.mutateAsync({ goalId, status: 'Fail' })
  }

  // Calculate historical success rates
  const historicalData = weeks?.slice(0, 8).map((week) => {
    const weekGoals = allGoals?.filter((g) => g.weekId === week.id) ?? []
    const successCount = weekGoals.filter((g) => g.status === 'Success').length
    const total = weekGoals.length
    return {
      week: `W${week.weekNumber}`,
      rate: total > 0 ? Math.round((successCount / total) * 100) : 0,
      total,
    }
  }) ?? []

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Goals</h2>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">This Week's Goals</h3>
          <span className="text-sm text-slate-500">
            {completedGoals.length} / {currentWeekGoals?.length ?? 0}
          </span>
        </div>

        <div className="flex justify-center mb-6">
          <GoalProgressRing
            completed={completedGoals.length}
            total={currentWeekGoals?.length ?? 0}
            size={140}
          />
        </div>

        {liveGoals.length > 0 && (
          <div className="space-y-2 mb-4">
            <p className="text-sm font-medium text-slate-500">Active</p>
            {liveGoals.map((goal) => (
              <div
                key={goal.id}
                className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
              >
                <button
                  onClick={() => handleToggleGoal(goal)}
                  className="w-6 h-6 rounded-full border-2 border-blue-500 flex items-center justify-center hover:bg-blue-50 transition-colors"
                  disabled={updateGoalStatus.isPending}
                >
                  {updateGoalStatus.isPending ? (
                    <span className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  ) : null}
                </button>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">{goal.name}</p>
                  {goal.currentConfidence !== null && (
                    <p className="text-xs text-slate-500">
                      Confidence: {Math.round(goal.currentConfidence * 100)}%
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleMarkFailed(goal.id)}
                  className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                  disabled={updateGoalStatus.isPending}
                >
                  Fail
                </button>
              </div>
            ))}
          </div>
        )}

        {completedGoals.length > 0 && (
          <div className="space-y-2 mb-4">
            <p className="text-sm font-medium text-green-600">Completed</p>
            {completedGoals.map((goal) => (
              <div
                key={goal.id}
                className="flex items-center gap-3 p-3 bg-green-50 rounded-lg"
              >
                <button
                  onClick={() => handleToggleGoal(goal)}
                  className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center hover:bg-green-600 transition-colors"
                  disabled={updateGoalStatus.isPending}
                >
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </button>
                <p className="text-sm font-medium text-slate-900 line-through opacity-60">
                  {goal.name}
                </p>
              </div>
            ))}
          </div>
        )}

        {failedGoals.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-red-600">Failed</p>
            {failedGoals.map((goal) => (
              <div
                key={goal.id}
                className="flex items-center gap-3 p-3 bg-red-50 rounded-lg opacity-60"
              >
                <span className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </span>
                <p className="text-sm font-medium text-slate-900 line-through">
                  {goal.name}
                </p>
              </div>
            ))}
          </div>
        )}

        {(!currentWeekGoals || currentWeekGoals.length === 0) && (
          <div className="text-center py-8 text-slate-400">
            No goals for this week
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-4">Weekly Success Rate</h3>
        <div className="space-y-3">
          {historicalData.reverse().map(({ week, rate, total }) => (
            <div key={week} className="flex items-center gap-3">
              <span className="w-8 text-xs text-slate-500">{week}</span>
              <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    rate >= 80
                      ? 'bg-green-500'
                      : rate >= 50
                      ? 'bg-blue-500'
                      : rate > 0
                      ? 'bg-amber-500'
                      : 'bg-slate-200'
                  }`}
                  style={{ width: `${rate}%` }}
                />
              </div>
              <span className="w-12 text-right text-sm font-medium text-slate-900">
                {total > 0 ? `${rate}%` : '--'}
              </span>
            </div>
          ))}
          {historicalData.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">
              No historical data yet
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
