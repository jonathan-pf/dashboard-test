import { useState } from 'react'
import { Link } from 'react-router-dom'
import { GoalProgressRing } from '@/components/charts/GoalProgressRing'
import {
  useCurrentWeekGoals,
  useCurrentWeek,
  useGoals,
  useAreas,
  useCreateGoal,
  useUpdateGoalStatus,
  useWeeks,
} from '@/hooks/useAirtableData'
import type { LocalGoalsRecord } from '@/types/airtable'

export function Goals() {
  const [showAddForm, setShowAddForm] = useState(false)
  const [goalName, setGoalName] = useState('')
  const [goalType, setGoalType] = useState<'Weekly' | 'Monthly' | 'Annual'>('Weekly')
  const [goalAreaId, setGoalAreaId] = useState<string>('')
  const [goalConfidence, setGoalConfidence] = useState<string>('')

  const currentWeek = useCurrentWeek()
  const currentWeekGoals = useCurrentWeekGoals()
  const allGoals = useGoals()
  const areas = useAreas()
  const weeks = useWeeks()
  const createGoal = useCreateGoal()
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

  const handleAddGoal = async () => {
    if (!goalName.trim()) return

    const confidence = goalConfidence ? parseFloat(goalConfidence) / 100 : null

    await createGoal.mutateAsync({
      name: goalName.trim(),
      type: goalType,
      status: 'Live',
      weekId: currentWeek?.id ?? null,
      areaId: goalAreaId || null,
      initialConfidence: confidence,
      currentConfidence: confidence, // Copy initial to current for new goals
      deadline: null,
      notes: null,
    })

    setGoalName('')
    setGoalType('Weekly')
    setGoalAreaId('')
    setGoalConfidence('')
    setShowAddForm(false)
  }

  const handleCancelAdd = () => {
    setGoalName('')
    setGoalType('Weekly')
    setGoalAreaId('')
    setGoalConfidence('')
    setShowAddForm(false)
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
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Goals</h2>
        <Link
          to="/goals/long-term"
          className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
        >
          Monthly & Annual
        </Link>
      </div>

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

        {(!currentWeekGoals || currentWeekGoals.length === 0) && !showAddForm && (
          <div className="text-center py-8 text-slate-400">
            No goals for this week
          </div>
        )}

        {/* Add Goal Form */}
        {showAddForm ? (
          <div className="mt-4 space-y-4 pt-4 border-t border-slate-200">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Goal Name
              </label>
              <input
                type="text"
                value={goalName}
                onChange={(e) => setGoalName(e.target.value)}
                placeholder="Enter goal name"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Area
              </label>
              <select
                value={goalAreaId}
                onChange={(e) => setGoalAreaId(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
              >
                <option value="">No area</option>
                {areas?.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Type
              </label>
              <select
                value={goalType}
                onChange={(e) => setGoalType(e.target.value as 'Weekly' | 'Monthly' | 'Annual')}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
              >
                <option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option>
                <option value="Annual">Annual</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Initial Confidence (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="5"
                value={goalConfidence}
                onChange={(e) => setGoalConfidence(e.target.value)}
                placeholder="e.g. 70"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCancelAdd}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAddGoal}
                disabled={!goalName.trim() || createGoal.isPending}
                className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50"
              >
                {createGoal.isPending ? 'Adding...' : 'Add Goal'}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full mt-4 py-3 bg-blue-50 text-blue-600 rounded-lg font-medium hover:bg-blue-100 transition-colors"
          >
            + Add Goal
          </button>
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
