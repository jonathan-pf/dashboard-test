import { useState } from 'react'
import { Link } from 'react-router-dom'
import { GoalProgressRing } from '@/components/charts/GoalProgressRing'
import {
  useNextMonthGoals,
  useAnnualGoals,
  useAreas,
  useCreateGoal,
  useUpdateGoalStatus,
  useUpdateGoalConfidence,
  useUpdateGoalDetails,
} from '@/hooks/useAirtableData'
import type { LocalGoalsRecord } from '@/types/airtable'

function getNextMonthInfo() {
  const now = new Date()
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const monthName = nextMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  // Default deadline to end of next month
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 2, 0)
  const defaultDeadline = lastDay.toISOString().split('T')[0]
  return { monthName, defaultDeadline }
}

export function NextMonthGoals() {
  const [showAddForm, setShowAddForm] = useState(false)
  const [goalName, setGoalName] = useState('')
  const [goalAreaId, setGoalAreaId] = useState<string>('')
  const [goalConfidence, setGoalConfidence] = useState<string>('')
  const [goalDeadline, setGoalDeadline] = useState<string>('')

  // Action sheet state
  const [selectedGoal, setSelectedGoal] = useState<LocalGoalsRecord | null>(null)
  const [editingConfidence, setEditingConfidence] = useState(false)
  const [newConfidence, setNewConfidence] = useState<string>('')
  const [editingDetails, setEditingDetails] = useState(false)
  const [editName, setEditName] = useState<string>('')
  const [editAreaId, setEditAreaId] = useState<string>('')

  const nextMonthGoals = useNextMonthGoals()
  const annualGoals = useAnnualGoals()
  const areas = useAreas()
  const createGoal = useCreateGoal()
  const updateGoalStatus = useUpdateGoalStatus()
  const updateGoalConfidence = useUpdateGoalConfidence()
  const updateGoalDetails = useUpdateGoalDetails()

  const { monthName, defaultDeadline } = getNextMonthInfo()

  const liveGoals = nextMonthGoals?.filter((g) => g.status === 'Live') ?? []
  const completedGoals = nextMonthGoals?.filter((g) => g.status === 'Success') ?? []
  const failedGoals = nextMonthGoals?.filter((g) => g.status === 'Fail') ?? []

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

  const handleAddGoal = async () => {
    if (!goalName.trim()) return

    const confidence = goalConfidence ? parseFloat(goalConfidence) / 100 : null

    await createGoal.mutateAsync({
      name: goalName.trim(),
      type: 'Monthly',
      status: 'Live',
      weekId: null,
      areaId: goalAreaId || null,
      initialConfidence: confidence,
      currentConfidence: confidence,
      deadline: goalDeadline || defaultDeadline,
      notes: null,
    })

    setGoalName('')
    setGoalAreaId('')
    setGoalConfidence('')
    setGoalDeadline('')
    setShowAddForm(false)
  }

  const handleCancelAdd = () => {
    setGoalName('')
    setGoalAreaId('')
    setGoalConfidence('')
    setGoalDeadline('')
    setShowAddForm(false)
  }

  const isPending = updateGoalStatus.isPending || updateGoalConfidence.isPending || updateGoalDetails.isPending

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Next Month's Goals</h2>
        <Link
          to="/goals"
          className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
        >
          This Week
        </Link>
      </div>

      <p className="text-sm text-slate-500">
        {monthName}
      </p>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">Goals for Next Month</h3>
          <span className="text-sm text-slate-500">
            {completedGoals.length} / {nextMonthGoals?.length ?? 0}
          </span>
        </div>

        <div className="flex justify-center mb-6">
          <GoalProgressRing
            completed={completedGoals.length}
            total={nextMonthGoals?.length ?? 0}
            size={140}
          />
        </div>

        {liveGoals.length > 0 && (
          <div className="space-y-2 mb-4">
            <p className="text-sm font-medium text-slate-500">Active</p>
            {liveGoals.map((goal) => (
              <button
                key={goal.id}
                onClick={() => openActionSheet(goal)}
                className="w-full flex items-center gap-3 p-3 bg-slate-50 rounded-lg text-left hover:bg-slate-100 transition-colors"
              >
                <span className="w-6 h-6 rounded-full border-2 border-blue-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900">{goal.name}</p>
                  {goal.currentConfidence !== null && (
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
        )}

        {completedGoals.length > 0 && (
          <div className="space-y-2 mb-4">
            <p className="text-sm font-medium text-green-600">Completed</p>
            {completedGoals.map((goal) => (
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

        {failedGoals.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-red-600">Failed</p>
            {failedGoals.map((goal) => (
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

        {(!nextMonthGoals || nextMonthGoals.length === 0) && !showAddForm && (
          <div className="text-center py-8 text-slate-400">
            No goals for next month yet
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
                Deadline
              </label>
              <input
                type="date"
                value={goalDeadline || defaultDeadline}
                onChange={(e) => setGoalDeadline(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
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

      {/* Annual Goals Reference Section */}
      {annualGoals && annualGoals.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <h3 className="font-semibold text-slate-900 mb-3">Annual Goals (Reference)</h3>
          <div className="space-y-2">
            {annualGoals.map((goal) => (
              <div
                key={goal.id}
                className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg"
              >
                <span className="w-6 h-6 rounded-full border-2 border-purple-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900">{goal.name}</p>
                  {goal.currentConfidence !== null && (
                    <p className="text-xs text-slate-500">
                      Confidence: {Math.round(goal.currentConfidence * 100)}%
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
