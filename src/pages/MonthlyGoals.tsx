import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  useGoals,
  useAreas,
  useCreateGoal,
  useUpdateGoalStatus,
  useUpdateGoalDetails,
  useDeleteGoal,
  useUpdateGoalConfidence,
  useCurrentWeek,
} from '@/hooks/useAirtableData'
import type { LocalGoalsRecord } from '@/types/airtable'

export function MonthlyGoals() {
  const [showAddForm, setShowAddForm] = useState(false)
  const [goalName, setGoalName] = useState('')
  const [goalAreaId, setGoalAreaId] = useState<string>('')
  const [goalConfidence, setGoalConfidence] = useState<string>('')

  // Action sheet state
  const [selectedGoal, setSelectedGoal] = useState<LocalGoalsRecord | null>(null)
  const [editingDetails, setEditingDetails] = useState(false)
  const [editName, setEditName] = useState<string>('')
  const [editAreaId, setEditAreaId] = useState<string>('')
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const allGoals = useGoals()
  const areas = useAreas()
  const currentWeek = useCurrentWeek()
  const createGoal = useCreateGoal()
  const updateGoalStatus = useUpdateGoalStatus()
  const updateGoalDetails = useUpdateGoalDetails()
  const deleteGoal = useDeleteGoal()
  const updateGoalConfidence = useUpdateGoalConfidence()

  // Get current month and year for filtering
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  // Filter monthly goals to current month by deadline
  const currentYearMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`
  const monthlyGoals = allGoals?.filter((g) => {
    if (g.type !== 'Monthly') return false
    return g.deadline && g.deadline.startsWith(currentYearMonth)
  }) ?? []

  // Format month name for display
  const monthName = now.toLocaleString('default', { month: 'long' })

  const completedMonthly = monthlyGoals.filter((g) => g.status === 'Success')

  // Helper to get goals by status within a group
  const getGoalsByStatus = (goals: LocalGoalsRecord[], status: 'Live' | 'Success' | 'Fail') =>
    goals.filter((g) => g.status === status)

  // Group goals by area
  const goalsByArea = (() => {
    const areaMap = new Map<string | null, { name: string; goals: LocalGoalsRecord[] }>()

    // Build area groups in area order
    if (areas) {
      for (const area of areas) {
        areaMap.set(area.id, { name: area.name, goals: [] })
      }
    }
    // Null for ungrouped
    areaMap.set(null, { name: 'No Area', goals: [] })

    for (const goal of monthlyGoals) {
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

  const openActionSheet = (goal: LocalGoalsRecord) => {
    setSelectedGoal(goal)
    setEditName(goal.name)
    setEditAreaId(goal.areaId ?? '')
    setEditingDetails(false)
    setConfirmingDelete(false)
  }

  const closeActionSheet = () => {
    setSelectedGoal(null)
    setEditingDetails(false)
    setConfirmingDelete(false)
    setEditName('')
    setEditAreaId('')
  }

  const handleToggleGoal = async (goal: LocalGoalsRecord) => {
    const newStatus = goal.status === 'Success' ? 'Live' : 'Success'
    await updateGoalStatus.mutateAsync({ goalId: goal.id, status: newStatus })
  }

  const handleMarkFailed = async (goalId: string) => {
    await updateGoalStatus.mutateAsync({ goalId, status: 'Fail' })
  }

  const handleMarkSuccess = async () => {
    if (!selectedGoal) return
    await updateGoalStatus.mutateAsync({ goalId: selectedGoal.id, status: 'Success' })
    closeActionSheet()
  }

  const handleMarkFailedFromSheet = async () => {
    if (!selectedGoal) return
    await updateGoalStatus.mutateAsync({ goalId: selectedGoal.id, status: 'Fail' })
    closeActionSheet()
  }

  const handleReactivate = async () => {
    if (!selectedGoal) return
    await updateGoalStatus.mutateAsync({ goalId: selectedGoal.id, status: 'Live' })
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

  const handleDeleteGoal = async () => {
    if (!selectedGoal) return
    await deleteGoal.mutateAsync(selectedGoal.id)
    closeActionSheet()
  }

  const isPending = updateGoalStatus.isPending || updateGoalDetails.isPending || updateGoalConfidence.isPending

  const handleAddGoal = async () => {
    if (!goalName.trim()) return

    const confidence = goalConfidence ? parseFloat(goalConfidence) / 100 : null

    await createGoal.mutateAsync({
      name: goalName.trim(),
      type: 'Monthly',
      status: 'Live',
      weekId: currentWeek?.id ?? null,
      areaId: goalAreaId || null,
      initialConfidence: confidence,
      currentConfidence: confidence,
      deadline: null,
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

  const renderGoalItem = (goal: LocalGoalsRecord, status: 'live' | 'completed' | 'failed') => {
    if (status === 'live') {
      return (
        <div key={goal.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
          <button
            onClick={() => handleToggleGoal(goal)}
            className="w-6 h-6 rounded-full border-2 border-blue-500 flex items-center justify-center hover:bg-blue-50 transition-colors flex-shrink-0"
            disabled={updateGoalStatus.isPending}
          />
          <button
            onClick={() => openActionSheet(goal)}
            className="flex-1 min-w-0 text-left"
          >
            <p className="text-sm font-medium text-slate-900">{goal.name}</p>
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
            onClick={() => handleMarkFailed(goal.id)}
            className="text-xs text-slate-400 hover:text-red-500 transition-colors"
            disabled={updateGoalStatus.isPending}
          >
            Fail
          </button>
        </div>
      )
    }

    if (status === 'completed') {
      return (
        <div key={goal.id} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
          <button
            onClick={() => handleToggleGoal(goal)}
            className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center hover:bg-green-600 transition-colors flex-shrink-0"
            disabled={updateGoalStatus.isPending}
          >
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </button>
          <button
            onClick={() => openActionSheet(goal)}
            className="flex-1 text-left"
          >
            <p className="text-sm font-medium text-slate-900 line-through opacity-60">{goal.name}</p>
          </button>
        </div>
      )
    }

    return (
      <button
        key={goal.id}
        onClick={() => openActionSheet(goal)}
        className="w-full flex items-center gap-3 p-3 bg-red-50 rounded-lg opacity-60 text-left"
      >
        <span className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </span>
        <p className="text-sm font-medium text-slate-900 line-through">{goal.name}</p>
      </button>
    )
  }

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
        <h2 className="text-2xl font-bold text-slate-900">{monthName} Goals</h2>
      </div>

      {/* Monthly Goals */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">{monthName} Goals</h3>
          <span className="text-sm text-slate-500">
            {completedMonthly.length} / {monthlyGoals.length}
          </span>
        </div>

        {/* Render goal sections grouped by area */}
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
                  {live.map((goal) => renderGoalItem(goal, 'live'))}
                </div>
              )}

              {completed.length > 0 && (
                <div className="space-y-2 mb-3">
                  <p className="text-sm font-medium text-green-600">Completed</p>
                  {completed.map((goal) => renderGoalItem(goal, 'completed'))}
                </div>
              )}

              {failed.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-red-600">Failed</p>
                  {failed.map((goal) => renderGoalItem(goal, 'failed'))}
                </div>
              )}
            </div>
          )
        })}

        {monthlyGoals.length === 0 && (
          <div className="text-center py-4 text-slate-400">
            No goals for {monthName}
          </div>
        )}
      </div>

      {/* Add Goal Form */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-4">Add Monthly Goal</h3>

        {showAddForm ? (
          <div className="space-y-4">
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
            className="w-full py-3 bg-blue-50 text-blue-600 rounded-lg font-medium hover:bg-blue-100 transition-colors"
          >
            + Add Monthly Goal
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
              Monthly Goal
              {selectedGoal.currentConfidence !== null && (
                <> &middot; {Math.round(selectedGoal.currentConfidence * 100)}% confidence</>
              )}
            </p>

            {confirmingDelete ? (
              <div className="space-y-4 mb-4">
                <p className="text-sm text-slate-600">
                  Are you sure you want to delete this goal? This cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setConfirmingDelete(false)}
                    className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-lg font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteGoal}
                    disabled={deleteGoal.isPending}
                    className="flex-1 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {deleteGoal.isPending ? 'Deleting...' : 'Delete Goal'}
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
                      onClick={handleMarkFailedFromSheet}
                      disabled={isPending}
                      className="w-full py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
                    >
                      {isPending ? 'Updating...' : 'Mark as Failed'}
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
                  onClick={() => setConfirmingDelete(true)}
                  className="w-full py-3 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition-colors"
                >
                  Delete Goal
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
