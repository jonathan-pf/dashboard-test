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
  useUpdateGoalConfidence,
  useUpdateGoalDetails,
  useWeeks,
} from '@/hooks/useAirtableData'
import type { LocalGoalsRecord } from '@/types/airtable'

export function Goals() {
  const [showAddForm, setShowAddForm] = useState(false)
  const [goalName, setGoalName] = useState('')
  const [goalType, setGoalType] = useState<'Weekly' | 'Monthly' | 'Annual'>('Weekly')
  const [goalAreaId, setGoalAreaId] = useState<string>('')
  const [goalConfidence, setGoalConfidence] = useState<string>('')

  // Action sheet state
  const [selectedGoal, setSelectedGoal] = useState<LocalGoalsRecord | null>(null)
  const [editingConfidence, setEditingConfidence] = useState(false)
  const [newConfidence, setNewConfidence] = useState<string>('')
  const [editingDetails, setEditingDetails] = useState(false)
  const [editName, setEditName] = useState<string>('')
  const [editAreaId, setEditAreaId] = useState<string>('')

  const currentWeek = useCurrentWeek()
  const currentWeekGoals = useCurrentWeekGoals()
  const allGoals = useGoals()
  const areas = useAreas()
  const weeks = useWeeks()
  const createGoal = useCreateGoal()
  const updateGoalStatus = useUpdateGoalStatus()
  const updateGoalConfidence = useUpdateGoalConfidence()
  const updateGoalDetails = useUpdateGoalDetails()

  // Helper to get goals by status within a group
  const getGoalsByStatus = (goals: LocalGoalsRecord[], status: 'Live' | 'Success' | 'Fail') =>
    goals.filter((g) => g.status === status)

  // Get current month's monthly goals (by deadline OR createdTime)
  const currentMonthMonthlyGoals = (() => {
    if (!allGoals) return []
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    const start = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0]
    const end = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0]
    return allGoals.filter((g) => {
      if (g.type !== 'Monthly') return false
      // Match by deadline in current month
      if (g.deadline !== null && g.deadline >= start && g.deadline <= end) return true
      // Match by createdTime in current month (same logic as LongTermGoals page)
      const created = new Date(g.createdTime)
      return created.getMonth() === currentMonth && created.getFullYear() === currentYear
    })
  })()

  // Merge weekly goals (by weekId) with monthly goals (by deadline), deduplicating
  const allCurrentGoals = (() => {
    const weekGoals = currentWeekGoals ?? []
    const seen = new Set(weekGoals.map((g) => g.id))
    const merged = [...weekGoals]
    for (const g of currentMonthMonthlyGoals) {
      if (!seen.has(g.id)) {
        merged.push(g)
      }
    }
    return merged
  })()

  // Group goals by area
  const goalsByArea = (() => {
    const goals = allCurrentGoals
    const areaMap = new Map<string | null, { name: string; goals: LocalGoalsRecord[] }>()

    // Build area groups in area order
    if (areas) {
      for (const area of areas) {
        areaMap.set(area.id, { name: area.name, goals: [] })
      }
    }
    // Null for ungrouped
    areaMap.set(null, { name: 'No Area', goals: [] })

    for (const goal of goals) {
      const key = goal.areaId ?? null
      const group = areaMap.get(key)
      if (group) {
        group.goals.push(goal)
      } else {
        // Area exists in goal but not in areas list — put in ungrouped
        areaMap.get(null)!.goals.push(goal)
      }
    }

    // Return only groups that have goals, with ungrouped last
    return [...areaMap.entries()]
      .filter(([, group]) => group.goals.length > 0)
      .sort(([keyA], [keyB]) => {
        if (keyA === null) return 1
        if (keyB === null) return -1
        return 0
      })
      .map(([, group]) => group)
  })()

  // Progress calculation using all current goals
  const completedGoals = allCurrentGoals.filter((g) => g.status === 'Success')
  const failedGoals = allCurrentGoals.filter((g) => g.status === 'Fail')

  const openActionSheet = (goal: LocalGoalsRecord) => {
    setSelectedGoal(goal)
    setNewConfidence(
      goal.currentConfidence !== null
        ? Math.round(goal.currentConfidence * 100).toString()
        : ''
    )
    setEditName(goal.name)
    setEditAreaId(goal.areaId ?? '')
    setEditingConfidence(false)
    setEditingDetails(false)
  }

  const closeActionSheet = () => {
    setSelectedGoal(null)
    setEditingConfidence(false)
    setEditingDetails(false)
    setNewConfidence('')
    setEditName('')
    setEditAreaId('')
  }

  const handleMarkSuccess = async () => {
    if (!selectedGoal) return
    await updateGoalStatus.mutateAsync({ goalId: selectedGoal.id, status: 'Success' })
    closeActionSheet()
  }

  const handleMarkFailed = async () => {
    if (!selectedGoal) return
    await updateGoalStatus.mutateAsync({ goalId: selectedGoal.id, status: 'Fail' })
    closeActionSheet()
  }

  const handleReactivate = async () => {
    if (!selectedGoal) return
    await updateGoalStatus.mutateAsync({ goalId: selectedGoal.id, status: 'Live' })
    closeActionSheet()
  }

  const handleSaveConfidence = async () => {
    if (!selectedGoal || !newConfidence) return
    const confidence = parseFloat(newConfidence) / 100
    await updateGoalConfidence.mutateAsync({
      goalId: selectedGoal.id,
      confidence,
    })
    closeActionSheet()
  }

  const handleSaveDetails = async () => {
    if (!selectedGoal || !editName.trim()) return
    await updateGoalDetails.mutateAsync({
      goalId: selectedGoal.id,
      updates: {
        name: editName.trim(),
        areaId: editAreaId || null,
      },
    })
    closeActionSheet()
  }

  const handleQuickConfidenceChange = async (
    e: React.MouseEvent,
    goal: LocalGoalsRecord,
    delta: number
  ) => {
    e.stopPropagation()
    const currentConfidence = goal.currentConfidence ?? 0.5
    const newConfidence = Math.max(0, Math.min(1, currentConfidence + delta))
    await updateGoalConfidence.mutateAsync({
      goalId: goal.id,
      confidence: newConfidence,
    })
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
      currentConfidence: confidence,
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

  const isPending = updateGoalStatus.isPending || updateGoalConfidence.isPending || updateGoalDetails.isPending

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Goals</h2>
        <div className="flex gap-2">
          <Link
            to="/goals/next-week"
            className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            Next Week
          </Link>
          <Link
            to="/goals/next-month"
            className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            Next Month
          </Link>
          <Link
            to="/goals/long-term"
            className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            Monthly & Annual
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">This Week's Goals</h3>
          <span className="text-sm text-slate-500">
            {completedGoals.length} / {allCurrentGoals.length}
          </span>
        </div>

        <div className="flex justify-center mb-6">
          <GoalProgressRing
            completed={completedGoals.length}
            failed={failedGoals.length}
            total={allCurrentGoals.length}
            size={140}
          />
        </div>

        {/* Render goal sections by area */}
        {goalsByArea.map(({ name, goals }) => {
          const live = getGoalsByStatus(goals, 'Live')
          const completed = getGoalsByStatus(goals, 'Success')
          const failed = getGoalsByStatus(goals, 'Fail')

          return (
            <div key={name} className="mb-6 last:mb-0">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                {name}
              </p>

              {live.length > 0 && (
                <div className="space-y-2 mb-3">
                  <p className="text-sm font-medium text-slate-500">Active</p>
                  {live.map((goal) => (
                    <div
                      key={goal.id}
                      className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg"
                    >
                      <button
                        onClick={() => openActionSheet(goal)}
                        className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-70 transition-opacity"
                      >
                        <span className="w-6 h-6 rounded-full border-2 border-blue-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900">{goal.name}</p>
                        </div>
                      </button>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={(e) => handleQuickConfidenceChange(e, goal, -0.1)}
                          disabled={updateGoalConfidence.isPending}
                          className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300 active:bg-slate-400 transition-colors text-sm font-medium disabled:opacity-50"
                          title="Decrease confidence by 10%"
                        >
                          -
                        </button>
                        <span className="w-12 text-center text-xs font-medium text-slate-600">
                          {goal.currentConfidence !== null
                            ? `${Math.round(goal.currentConfidence * 100)}%`
                            : '50%'}
                        </span>
                        <button
                          onClick={(e) => handleQuickConfidenceChange(e, goal, 0.1)}
                          disabled={updateGoalConfidence.isPending}
                          className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300 active:bg-slate-400 transition-colors text-sm font-medium disabled:opacity-50"
                          title="Increase confidence by 10%"
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={() => openActionSheet(goal)}
                        className="flex-shrink-0 p-1 hover:bg-slate-200 rounded transition-colors"
                      >
                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {completed.length > 0 && (
                <div className="space-y-2 mb-3">
                  <p className="text-sm font-medium text-green-600">Completed</p>
                  {completed.map((goal) => (
                    <button
                      key={goal.id}
                      onClick={() => openActionSheet(goal)}
                      className="w-full flex items-center gap-3 p-3 bg-green-50 rounded-lg text-left hover:bg-green-100 transition-colors"
                    >
                      <span className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                      <p className="text-sm font-medium text-slate-900 line-through opacity-60 flex-1">
                        {goal.name}
                      </p>
                      <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ))}
                </div>
              )}

              {failed.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-red-600">Failed</p>
                  {failed.map((goal) => (
                    <button
                      key={goal.id}
                      onClick={() => openActionSheet(goal)}
                      className="w-full flex items-center gap-3 p-3 bg-red-50 rounded-lg opacity-60 text-left hover:opacity-80 transition-opacity"
                    >
                      <span className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </span>
                      <p className="text-sm font-medium text-slate-900 line-through flex-1">
                        {goal.name}
                      </p>
                      <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {allCurrentGoals.length === 0 && !showAddForm && (
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

      {/* Action Sheet Modal */}
      {selectedGoal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
          onClick={closeActionSheet}
        >
          <div
            className="bg-white w-full max-w-lg rounded-t-2xl p-4 pb-8 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto mb-4" />

            <h3 className="text-lg font-semibold text-slate-900 mb-1">
              {selectedGoal.name}
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              {selectedGoal.currentConfidence !== null
                ? `Current confidence: ${Math.round(selectedGoal.currentConfidence * 100)}%`
                : 'No confidence set'}
            </p>

            {editingConfidence ? (
              <div className="space-y-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    New Confidence (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="5"
                    value={newConfidence}
                    onChange={(e) => setNewConfidence(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    autoFocus
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setEditingConfidence(false)}
                    className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-lg font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveConfidence}
                    disabled={!newConfidence || isPending}
                    className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50"
                  >
                    {isPending ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            ) : editingDetails ? (
              <div className="space-y-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Goal Name
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Area
                  </label>
                  <select
                    value={editAreaId}
                    onChange={(e) => setEditAreaId(e.target.value)}
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
                <div className="flex gap-3">
                  <button
                    onClick={() => setEditingDetails(false)}
                    className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-lg font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveDetails}
                    disabled={!editName.trim() || isPending}
                    className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50"
                  >
                    {isPending ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedGoal.status === 'Live' && (
                  <>
                    <button
                      onClick={handleMarkSuccess}
                      disabled={isPending}
                      className="w-full py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors disabled:opacity-50"
                    >
                      {isPending ? 'Updating...' : 'Mark as Success'}
                    </button>
                    <button
                      onClick={handleMarkFailed}
                      disabled={isPending}
                      className="w-full py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
                    >
                      {isPending ? 'Updating...' : 'Mark as Failed'}
                    </button>
                    <button
                      onClick={() => setEditingConfidence(true)}
                      className="w-full py-3 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors"
                    >
                      Edit Confidence
                    </button>
                  </>
                )}
                {(selectedGoal.status === 'Success' || selectedGoal.status === 'Fail') && (
                  <button
                    onClick={handleReactivate}
                    disabled={isPending}
                    className="w-full py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
                  >
                    {isPending ? 'Updating...' : 'Reactivate Goal'}
                  </button>
                )}
                <button
                  onClick={() => setEditingDetails(true)}
                  className="w-full py-3 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors"
                >
                  Edit Goal
                </button>
                <button
                  onClick={closeActionSheet}
                  className="w-full py-3 bg-slate-100 text-slate-600 rounded-lg font-medium hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.2s ease-out;
        }
      `}</style>
    </div>
  )
}
