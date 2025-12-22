import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  useGoals,
  useAreas,
  useCreateGoal,
  useUpdateGoalStatus,
  useCurrentWeek,
} from '@/hooks/useAirtableData'
import type { LocalGoalsRecord } from '@/types/airtable'

export function LongTermGoals() {
  const [showAddForm, setShowAddForm] = useState(false)
  const [goalName, setGoalName] = useState('')
  const [goalType, setGoalType] = useState<'Monthly' | 'Annual'>('Monthly')
  const [goalAreaId, setGoalAreaId] = useState<string>('')
  const [goalConfidence, setGoalConfidence] = useState<string>('')

  const allGoals = useGoals()
  const areas = useAreas()
  const currentWeek = useCurrentWeek()
  const createGoal = useCreateGoal()
  const updateGoalStatus = useUpdateGoalStatus()

  const monthlyGoals = allGoals?.filter((g) => g.type === 'Monthly') ?? []
  const annualGoals = allGoals?.filter((g) => g.type === 'Annual') ?? []

  const liveMonthly = monthlyGoals.filter((g) => g.status === 'Live')
  const completedMonthly = monthlyGoals.filter((g) => g.status === 'Success')
  const failedMonthly = monthlyGoals.filter((g) => g.status === 'Fail')

  const liveAnnual = annualGoals.filter((g) => g.status === 'Live')
  const completedAnnual = annualGoals.filter((g) => g.status === 'Success')
  const failedAnnual = annualGoals.filter((g) => g.status === 'Fail')

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
      currentConfidence: confidence,
      deadline: null,
      notes: null,
    })

    setGoalName('')
    setGoalType('Monthly')
    setGoalAreaId('')
    setGoalConfidence('')
    setShowAddForm(false)
  }

  const handleCancelAdd = () => {
    setGoalName('')
    setGoalType('Monthly')
    setGoalAreaId('')
    setGoalConfidence('')
    setShowAddForm(false)
  }

  const getAreaName = (areaId: string | null) => {
    if (!areaId) return null
    return areas?.find((a) => a.id === areaId)?.name ?? null
  }

  const renderGoalItem = (goal: LocalGoalsRecord, status: 'live' | 'completed' | 'failed') => {
    const areaName = getAreaName(goal.areaId)

    if (status === 'live') {
      return (
        <div key={goal.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
          <button
            onClick={() => handleToggleGoal(goal)}
            className="w-6 h-6 rounded-full border-2 border-blue-500 flex items-center justify-center hover:bg-blue-50 transition-colors flex-shrink-0"
            disabled={updateGoalStatus.isPending}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900">{goal.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              {areaName && (
                <span className="text-xs text-slate-500">{areaName}</span>
              )}
              {goal.currentConfidence !== null && (
                <span className="text-xs text-slate-400">
                  {Math.round(goal.currentConfidence * 100)}%
                </span>
              )}
            </div>
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
          <p className="text-sm font-medium text-slate-900 line-through opacity-60">{goal.name}</p>
        </div>
      )
    }

    return (
      <div key={goal.id} className="flex items-center gap-3 p-3 bg-red-50 rounded-lg opacity-60">
        <span className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </span>
        <p className="text-sm font-medium text-slate-900 line-through">{goal.name}</p>
      </div>
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
        <h2 className="text-2xl font-bold text-slate-900">Long-Term Goals</h2>
      </div>

      {/* Monthly Goals */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">Monthly Goals</h3>
          <span className="text-sm text-slate-500">
            {completedMonthly.length} / {monthlyGoals.length}
          </span>
        </div>

        {liveMonthly.length > 0 && (
          <div className="space-y-2 mb-4">
            <p className="text-sm font-medium text-slate-500">Active</p>
            {liveMonthly.map((goal) => renderGoalItem(goal, 'live'))}
          </div>
        )}

        {completedMonthly.length > 0 && (
          <div className="space-y-2 mb-4">
            <p className="text-sm font-medium text-green-600">Completed</p>
            {completedMonthly.map((goal) => renderGoalItem(goal, 'completed'))}
          </div>
        )}

        {failedMonthly.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-red-600">Failed</p>
            {failedMonthly.map((goal) => renderGoalItem(goal, 'failed'))}
          </div>
        )}

        {monthlyGoals.length === 0 && (
          <div className="text-center py-4 text-slate-400">
            No monthly goals
          </div>
        )}
      </div>

      {/* Annual Goals */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">Annual Goals</h3>
          <span className="text-sm text-slate-500">
            {completedAnnual.length} / {annualGoals.length}
          </span>
        </div>

        {liveAnnual.length > 0 && (
          <div className="space-y-2 mb-4">
            <p className="text-sm font-medium text-slate-500">Active</p>
            {liveAnnual.map((goal) => renderGoalItem(goal, 'live'))}
          </div>
        )}

        {completedAnnual.length > 0 && (
          <div className="space-y-2 mb-4">
            <p className="text-sm font-medium text-green-600">Completed</p>
            {completedAnnual.map((goal) => renderGoalItem(goal, 'completed'))}
          </div>
        )}

        {failedAnnual.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-red-600">Failed</p>
            {failedAnnual.map((goal) => renderGoalItem(goal, 'failed'))}
          </div>
        )}

        {annualGoals.length === 0 && (
          <div className="text-center py-4 text-slate-400">
            No annual goals
          </div>
        )}
      </div>

      {/* Add Goal Form */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-4">Add Long-Term Goal</h3>

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
                Type
              </label>
              <select
                value={goalType}
                onChange={(e) => setGoalType(e.target.value as 'Monthly' | 'Annual')}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
              >
                <option value="Monthly">Monthly</option>
                <option value="Annual">Annual</option>
              </select>
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
            + Add Long-Term Goal
          </button>
        )}
      </div>
    </div>
  )
}
