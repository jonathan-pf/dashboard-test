import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useRules, useCreateRule, useUpdateRule, useThresholds } from '@/hooks/useAirtableData'
import type { LocalRulesRecord } from '@/types/airtable'

const STATUS_COLORS: Record<LocalRulesRecord['status'], string> = {
  Live: 'bg-green-100 text-green-700',
  Testing: 'bg-purple-100 text-purple-700',
  Backlog: 'bg-amber-100 text-amber-700',
  Archive: 'bg-slate-100 text-slate-500',
}

const SELECT_COLORS: Record<LocalRulesRecord['select'], string> = {
  Goal: 'bg-blue-100 text-blue-700',
  Limit: 'bg-red-100 text-red-700',
}

export function Rules() {
  const [filterStatus, setFilterStatus] = useState<LocalRulesRecord['status'] | 'All'>('Live')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newRuleName, setNewRuleName] = useState('')
  const [newRuleSelect, setNewRuleSelect] = useState<LocalRulesRecord['select']>('Goal')
  const [newRuleStatus, setNewRuleStatus] = useState<LocalRulesRecord['status']>('Backlog')

  // Edit state
  const [editingRule, setEditingRule] = useState<LocalRulesRecord | null>(null)
  const [editName, setEditName] = useState('')
  const [editSelect, setEditSelect] = useState<LocalRulesRecord['select']>('Goal')
  const [editStatus, setEditStatus] = useState<LocalRulesRecord['status']>('Live')
  const [editConfidence, setEditConfidence] = useState('')
  const [editDeadline, setEditDeadline] = useState('')
  const [editExceptions, setEditExceptions] = useState('')
  const [editThresholdTrigger, setEditThresholdTrigger] = useState<'red' | 'amber' | 'amberOnly'>('red')
  const [editThresholdIds, setEditThresholdIds] = useState<string[]>([])

  const rules = useRules()
  const createRule = useCreateRule()
  const updateRule = useUpdateRule()
  const thresholds = useThresholds()

  const filteredRules = filterStatus === 'All'
    ? rules
    : rules?.filter(rule => rule.status === filterStatus)

  const liveRules = rules?.filter(r => r.status === 'Live') ?? []
  const backlogRules = rules?.filter(r => r.status === 'Backlog') ?? []

  const formatConfidence = (value: number | null) => {
    if (value === null) return '-'
    return `${Math.round(value * 100)}%`
  }

  const formatDeadline = (dateStr: string | null) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    })
  }

  const handleCreateRule = async () => {
    if (!newRuleName.trim()) return

    await createRule.mutateAsync({
      name: newRuleName.trim(),
      select: newRuleSelect,
      status: newRuleStatus,
      confidence: null,
      currentConfidence: null,
      deadline: null,
      outputGoal: null,
      exceptions: null,
      thresholdTrigger: 'red' as const,
      week: null,
      thresholdIds: [],
    })

    setNewRuleName('')
    setNewRuleSelect('Goal')
    setNewRuleStatus('Backlog')
    setShowCreateForm(false)
  }

  const handleCancelCreate = () => {
    setNewRuleName('')
    setNewRuleSelect('Goal')
    setNewRuleStatus('Backlog')
    setShowCreateForm(false)
  }

  const startEditing = (rule: LocalRulesRecord) => {
    setEditingRule(rule)
    setEditName(rule.name)
    setEditSelect(rule.select)
    setEditStatus(rule.status)
    setEditConfidence(rule.currentConfidence !== null ? String(Math.round(rule.currentConfidence * 100)) : '')
    setEditDeadline(rule.deadline ?? '')
    setEditExceptions(rule.exceptions ?? '')
    setEditThresholdTrigger(rule.thresholdTrigger ?? 'red')
    setEditThresholdIds(rule.thresholdIds ?? [])
  }

  const handleUpdateRule = async () => {
    if (!editingRule || !editName.trim()) return

    const confidenceValue = editConfidence.trim() === '' ? null : Number(editConfidence) / 100
    const deadlineValue = editDeadline.trim() === '' ? null : editDeadline

    await updateRule.mutateAsync({
      ruleId: editingRule.id,
      updates: {
        name: editName.trim(),
        select: editSelect,
        status: editStatus,
        currentConfidence: confidenceValue,
        deadline: deadlineValue,
        exceptions: editExceptions.trim() || null,
        thresholdTrigger: editThresholdTrigger,
        thresholdIds: editThresholdIds,
      },
    })

    setEditingRule(null)
  }

  const handleCancelEdit = () => {
    setEditingRule(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link
          to="/health"
          className="p-2 -ml-2 text-slate-500 hover:text-slate-700"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h2 className="text-2xl font-bold text-slate-900">Rules</h2>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <p className="text-xs text-slate-500">Live</p>
          <p className="text-2xl font-bold text-green-600">{liveRules.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <p className="text-xs text-slate-500">Backlog</p>
          <p className="text-2xl font-bold text-amber-600">{backlogRules.length}</p>
        </div>
      </div>

      {/* Create Rule */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        {showCreateForm ? (
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900">New Rule</h3>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Name
              </label>
              <input
                type="text"
                value={newRuleName}
                onChange={(e) => setNewRuleName(e.target.value)}
                placeholder="Enter rule name"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Type
                </label>
                <select
                  value={newRuleSelect}
                  onChange={(e) => setNewRuleSelect(e.target.value as LocalRulesRecord['select'])}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="Goal">Goal</option>
                  <option value="Limit">Limit</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Status
                </label>
                <select
                  value={newRuleStatus}
                  onChange={(e) => setNewRuleStatus(e.target.value as LocalRulesRecord['status'])}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="Live">Live</option>
                  <option value="Testing">Testing</option>
                  <option value="Backlog">Backlog</option>
                  <option value="Archive">Archive</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCancelCreate}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRule}
                disabled={!newRuleName.trim() || createRule.isPending}
                className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50"
              >
                {createRule.isPending ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowCreateForm(true)}
            className="w-full py-3 bg-slate-50 text-slate-600 rounded-lg font-medium hover:bg-slate-100 transition-colors"
          >
            + Add Rule
          </button>
        )}
      </div>

      {/* Rules List */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">All Rules</h3>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as LocalRulesRecord['status'] | 'All')}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white"
          >
            <option value="All">All Status</option>
            <option value="Live">Live</option>
            <option value="Testing">Testing</option>
            <option value="Backlog">Backlog</option>
            <option value="Archive">Archive</option>
          </select>
        </div>

        <div className="space-y-3">
          {filteredRules?.map((rule) => (
            <div key={rule.id}>
              {editingRule?.id === rule.id ? (
                // Edit form
                <div className="p-4 rounded-lg border border-blue-300 bg-blue-50 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                      autoFocus
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Type
                      </label>
                      <select
                        value={editSelect}
                        onChange={(e) => setEditSelect(e.target.value as LocalRulesRecord['select'])}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      >
                        <option value="Goal">Goal</option>
                        <option value="Limit">Limit</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Status
                      </label>
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value as LocalRulesRecord['status'])}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      >
                        <option value="Live">Live</option>
                        <option value="Testing">Testing</option>
                        <option value="Backlog">Backlog</option>
                        <option value="Archive">Archive</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Confidence %
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={editConfidence}
                        onChange={(e) => setEditConfidence(e.target.value)}
                        placeholder="0-100"
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Deadline
                      </label>
                      <input
                        type="date"
                        value={editDeadline}
                        onChange={(e) => setEditDeadline(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Exceptions
                    </label>
                    <textarea
                      value={editExceptions}
                      onChange={(e) => setEditExceptions(e.target.value)}
                      placeholder="Any exceptions to this rule..."
                      rows={3}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white resize-none"
                    />
                  </div>
                  {thresholds && thresholds.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Thresholds
                      </label>
                      <div className="space-y-1 max-h-32 overflow-y-auto border border-slate-300 rounded-lg p-2 bg-white">
                        {thresholds.map((t) => (
                          <label key={t.id} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={editThresholdIds.includes(t.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setEditThresholdIds([...editThresholdIds, t.id])
                                } else {
                                  setEditThresholdIds(editThresholdIds.filter(id => id !== t.id))
                                }
                              }}
                              className="rounded border-slate-300"
                            />
                            {t.name}
                          </label>
                        ))}
                      </div>
                      {editThresholdIds.length > 0 && (
                        <div className="mt-2">
                          <label className="block text-xs text-slate-500 mb-1">Show rule when threshold is</label>
                          <select
                            value={editThresholdTrigger}
                            onChange={(e) => setEditThresholdTrigger(e.target.value as 'red' | 'amber' | 'amberOnly')}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm"
                          >
                            <option value="red">Red only</option>
                            <option value="amber">Red or Amber</option>
                            <option value="amberOnly">Amber only</option>
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button
                      onClick={handleCancelEdit}
                      className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-lg font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleUpdateRule}
                      disabled={!editName.trim() || updateRule.isPending}
                      className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50"
                    >
                      {updateRule.isPending ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              ) : (
                // Display view
                <button
                  onClick={() => startEditing(rule)}
                  className={`w-full text-left p-4 rounded-lg border transition-colors ${
                    rule.status === 'Archive'
                      ? 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className={`text-sm font-medium flex-1 ${
                      rule.status === 'Archive' ? 'text-slate-400' : 'text-slate-900'
                    }`}>
                      {rule.name}
                    </p>
                    <div className="flex gap-1.5">
                      {rule.thresholdIds?.length > 0 && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          rule.thresholdTrigger === 'red' ? 'bg-red-50 text-red-600' :
                          rule.thresholdTrigger === 'amberOnly' ? 'bg-amber-50 text-amber-600' :
                          'bg-orange-50 text-orange-600'
                        }`}>
                          Catch-up
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${SELECT_COLORS[rule.select]}`}>
                        {rule.select}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[rule.status]}`}>
                        {rule.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    {rule.currentConfidence !== null && (
                      <div className="flex items-center gap-1">
                        <span>Confidence:</span>
                        <span className={`font-medium ${
                          rule.currentConfidence >= 0.7 ? 'text-green-600' :
                          rule.currentConfidence >= 0.4 ? 'text-amber-600' :
                          'text-red-600'
                        }`}>
                          {formatConfidence(rule.currentConfidence)}
                        </span>
                      </div>
                    )}
                    {rule.deadline && (
                      <div className="flex items-center gap-1">
                        <span>Deadline:</span>
                        <span className="font-medium text-slate-700">
                          {formatDeadline(rule.deadline)}
                        </span>
                      </div>
                    )}
                    {rule.outputGoal && (
                      <div className="flex items-center gap-1">
                        <span>Target:</span>
                        <span className="font-medium text-slate-700">
                          {rule.outputGoal}
                        </span>
                      </div>
                    )}
                  </div>
                  {rule.exceptions && (
                    <p className="text-xs text-slate-400 mt-1 ml-0 whitespace-pre-line">
                      {rule.exceptions}
                    </p>
                  )}
                </button>
              )}
            </div>
          ))}

          {(!filteredRules || filteredRules.length === 0) && (
            <div className="text-center py-8 text-slate-400">
              No rules found
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
