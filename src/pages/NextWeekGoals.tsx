import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  useNextWeekGoals,
  useNextWeek,
  useGoals,
  useAreas,
  useCreateGoal,
  useUpdateGoalStatus,
  useUpdateGoalConfidence,
} from '@/hooks/useAirtableData'
import type { LocalGoalsRecord, LocalAreasRecord } from '@/types/airtable'

export function NextWeekGoals() {
  const [showAddForm, setShowAddForm] = useState(false)
  const [goalName, setGoalName] = useState('')
  const [goalAreaId, setGoalAreaId] = useState<string>('')
  const [goalConfidence, setGoalConfidence] = useState<string>('')

  // Action sheet state
  const [selectedGoal, setSelectedGoal] = useState<LocalGoalsRecord | null>(null)
  const [editingConfidence, setEditingConfidence] = useState(false)
  const [editingGoal, setEditingGoal] = useState(false)
  const [newConfidence, setNewConfidence] = useState<string>('')
  const [editGoalName, setEditGoalName] = useState('')
  const [editGoalAreaId, setEditGoalAreaId] = useState<string>('')

  const nextWeek = useNextWeek()
  const nextWeekGoals = useNextWeekGoals()
  const allGoals = useGoals()
  const areas = useAreas()
  const createGoal = useCreateGoal()
  const updateGoalStatus = useUpdateGoalStatus()
  const updateGoalConfidence = useUpdateGoalConfidence()

  // Get live monthly goals as reminders
  const liveMonthlyGoals = useMemo(() => {
    return allGoals?.filter((g) => g.type === 'Monthly' && g.status === 'Live') ?? []
  }, [allGoals])

  // Group goals by status, then by area
  const groupedGoals = useMemo(() => {
    const goals = nextWeekGoals ?? []
    const liveGoals = goals.filter((g) => g.status === 'Live')
    const completedGoals = goals.filter((g) => g.status === 'Success')
    const failedGoals = goals.filter((g) => g.status === 'Fail')

    const groupByArea = (goalList: LocalGoalsRecord[]) => {
      const grouped = new Map<string | null, LocalGoalsRecord[]>()

      // Sort areas alphabetically, with "No Area" at the end
      goalList.forEach((goal) => {
        const existing = grouped.get(goal.areaId) ?? []
        grouped.set(goal.areaId, [...existing, goal])
      })

      // Convert to sorted array
      const sorted = Array.from(grouped.entries()).sort(([aId], [bId]) => {
        if (aId === null) return 1
        if (bId === null) return -1
        const aName = areas?.find((a) => a.id === aId)?.name ?? ''
        const bName = areas?.find((a) => a.id === bId)?.name ?? ''
        return aName.localeCompare(bName)
      })

      return sorted
    }

    return {
      live: groupByArea(liveGoals),
      completed: groupByArea(completedGoals),
      failed: groupByArea(failedGoals),
    }
  }, [nextWeekGoals, areas])

  const getAreaName = (areaId: string | null) => {
    if (!areaId) return 'No Area'
    return areas?.find((a) => a.id === areaId)?.name ?? 'Unknown'
  }

  // Calculate end of next week (Sunday)
  const getNextWeekEndDate = () => {
    if (!nextWeek?.weekCommencing) return null
    const weekStart = new Date(nextWeek.weekCommencing)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6) // Sunday of that week
    return weekEnd.toISOString().split('T')[0]
  }

  const openActionSheet = (goal: LocalGoalsRecord) => {
    setSelectedGoal(goal)
    setNewConfidence(
      goal.currentConfidence !== null
        ? Math.round(goal.currentConfidence * 100).toString()
        : ''
    )
    setEditGoalName(goal.name)
    setEditGoalAreaId(goal.areaId ?? '')
    setEditingConfidence(false)
    setEditingGoal(false)
  }

  const closeActionSheet = () => {
    setSelectedGoal(null)
    setEditingConfidence(false)
    setEditingGoal(false)
    setNewConfidence('')
    setEditGoalName('')
    setEditGoalAreaId('')
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

  const handleAddGoal = async () => {
    if (!goalName.trim()) return

    const confidence = goalConfidence ? parseFloat(goalConfidence) / 100 : null
    const deadline = getNextWeekEndDate()

    await createGoal.mutateAsync({
      name: goalName.trim(),
      type: 'Weekly',
      status: 'Live',
      weekId: nextWeek?.id ?? null,
      areaId: goalAreaId || null,
      initialConfidence: confidence,
      currentConfidence: confidence,
      deadline,
      notes: null,
    })

    setGoalName('')
    setGoalAreaId('')
    setGoalConfidence('')
    setShowAddForm(false)
  }

  const handleCancelAdd = () => {
    setGoalName('')
    setGoalAreaId('')
    setGoalConfidence('')
    setShowAddForm(false)
  }

  const isPending = updateGoalStatus.isPending || updateGoalConfidence.isPending

  const renderGoalsByArea = (
    groupedByArea: [string | null, LocalGoalsRecord[]][],
    status: 'live' | 'completed' | 'failed'
  ) => {
    if (groupedByArea.length === 0) return null

    return groupedByArea.map(([areaId, goals]) => (
      <div key={areaId ?? 'no-area'} className="mb-3">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2 px-1">
          {getAreaName(areaId)}
        </p>
        <div className="space-y-2">
          {goals.map((goal) => (
            <button
              key={goal.id}
              onClick={() => openActionSheet(goal)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                status === 'live'
                  ? 'bg-slate-50 hover:bg-slate-100'
                  : status === 'completed'
                  ? 'bg-green-50 hover:bg-green-100'
                  : 'bg-red-50 opacity-60 hover:opacity-80'
              }`}
            >
              {status === 'live' && (
                <span className="w-6 h-6 rounded-full border-2 border-blue-500 flex-shrink-0" />
              )}
              {status === 'completed' && (
                <span className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              )}
              {status === 'failed' && (
                <span className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </span>
              )}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium text-slate-900 ${status !== 'live' ? 'line-through opacity-60' : ''}`}>
                  {goal.name}
                </p>
                {status === 'live' && goal.currentConfidence !== null && (
                  <p className="text-xs text-slate-500">
                    Confidence: {Math.round(goal.currentConfidence * 100)}%
                  </p>
                )}
              </div>
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>
      </div>
    ))
  }

  const totalGoals = nextWeekGoals?.length ?? 0
  const completedCount = nextWeekGoals?.filter((g) => g.status === 'Success').length ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/goals"
          className="p-2 -ml-2 text-slate-500 hover:text-slate-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h2 className="text-2xl font-bold text-slate-900">Next Week's Goals</h2>
      </div>

      {nextWeek && (
        <p className="text-sm text-slate-500 -mt-4">
          Week {nextWeek.weekNumber} • {new Date(nextWeek.weekCommencing).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - {new Date(new Date(nextWeek.weekCommencing).getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
        </p>
      )}

      {/* Monthly Goals Reminder */}
      {liveMonthlyGoals.length > 0 && (
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
          <h3 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Monthly Goals to Ladder Up To
          </h3>
          <ul className="space-y-1">
            {liveMonthlyGoals.map((goal) => (
              <li key={goal.id} className="text-sm text-amber-800 flex items-start gap-2">
                <span className="text-amber-600 mt-0.5">•</span>
                <span>{goal.name}</span>
                {goal.areaId && (
                  <span className="text-xs text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">
                    {getAreaName(goal.areaId)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Next Week's Goals */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">Goals</h3>
          <span className="text-sm text-slate-500">
            {completedCount} / {totalGoals}
          </span>
        </div>

        {/* Active Goals */}
        {groupedGoals.live.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-medium text-slate-500 mb-2">Active</p>
            {renderGoalsByArea(groupedGoals.live, 'live')}
          </div>
        )}

        {/* Completed Goals */}
        {groupedGoals.completed.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-medium text-green-600 mb-2">Completed</p>
            {renderGoalsByArea(groupedGoals.completed, 'completed')}
          </div>
        )}

        {/* Failed Goals */}
        {groupedGoals.failed.length > 0 && (
          <div>
            <p className="text-sm font-medium text-red-600 mb-2">Failed</p>
            {renderGoalsByArea(groupedGoals.failed, 'failed')}
          </div>
        )}

        {totalGoals === 0 && !showAddForm && (
          <div className="text-center py-8 text-slate-400">
            No goals for next week yet
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
            + Add Goal for Next Week
          </button>
        )}
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
              {selectedGoal.areaId && ` • ${getAreaName(selectedGoal.areaId)}`}
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
