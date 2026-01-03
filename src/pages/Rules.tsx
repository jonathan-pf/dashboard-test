import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useRules } from '@/hooks/useAirtableData'
import type { LocalRulesRecord } from '@/types/airtable'

const STATUS_COLORS: Record<LocalRulesRecord['status'], string> = {
  Live: 'bg-green-100 text-green-700',
  Backlog: 'bg-amber-100 text-amber-700',
  Archive: 'bg-slate-100 text-slate-500',
}

const SELECT_COLORS: Record<LocalRulesRecord['select'], string> = {
  Goal: 'bg-blue-100 text-blue-700',
  Limit: 'bg-red-100 text-red-700',
}

export function Rules() {
  const [filterStatus, setFilterStatus] = useState<LocalRulesRecord['status'] | 'All'>('All')
  const rules = useRules()

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
            <option value="Backlog">Backlog</option>
            <option value="Archive">Archive</option>
          </select>
        </div>

        <div className="space-y-3">
          {filteredRules?.map((rule) => (
            <div
              key={rule.id}
              className={`p-4 rounded-lg border ${
                rule.status === 'Archive' ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className={`text-sm font-medium flex-1 ${
                  rule.status === 'Archive' ? 'text-slate-400' : 'text-slate-900'
                }`}>
                  {rule.name}
                </p>
                <div className="flex gap-1.5">
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
