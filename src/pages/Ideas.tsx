import { useState } from 'react'
import {
  useIdeas,
  useCurrentWeek,
  useCreateIdea,
} from '@/hooks/useAirtableData'
import type { LocalIdeasRecord } from '@/types/airtable'

const IDEA_TYPES: LocalIdeasRecord['type'][] = [
  'Revelation',
  'Crux Test',
  'Driver',
  'Bottleneck',
  'Step',
  'Failure',
  'Bit',
  'Stage',
  'Feature',
]

const TYPE_COLORS: Record<LocalIdeasRecord['type'], string> = {
  Revelation: 'bg-purple-100 text-purple-700',
  'Crux Test': 'bg-blue-100 text-blue-700',
  Driver: 'bg-green-100 text-green-700',
  Bottleneck: 'bg-red-100 text-red-700',
  Step: 'bg-amber-100 text-amber-700',
  Failure: 'bg-rose-100 text-rose-700',
  Bit: 'bg-cyan-100 text-cyan-700',
  Stage: 'bg-indigo-100 text-indigo-700',
  Feature: 'bg-teal-100 text-teal-700',
}

export function Ideas() {
  const [showAddForm, setShowAddForm] = useState(false)
  const [ideaName, setIdeaName] = useState('')
  const [ideaType, setIdeaType] = useState<LocalIdeasRecord['type']>('Step')
  const [filterType, setFilterType] = useState<LocalIdeasRecord['type'] | 'All'>('All')

  const ideas = useIdeas()
  const currentWeek = useCurrentWeek()
  const createIdea = useCreateIdea()

  const filteredIdeas = filterType === 'All'
    ? ideas
    : ideas?.filter(idea => idea.type === filterType)

  const currentWeekIdeas = ideas?.filter(idea => idea.weekId === currentWeek?.id) ?? []

  const handleAddIdea = async () => {
    if (!ideaName.trim()) return

    await createIdea.mutateAsync({
      name: ideaName.trim(),
      type: ideaType,
      when: new Date().toISOString(),
      weekId: currentWeek?.id ?? null,
    })

    setIdeaName('')
    setIdeaType('Revelation')
    setShowAddForm(false)
  }

  const handleCancelAdd = () => {
    setIdeaName('')
    setIdeaType('Revelation')
    setShowAddForm(false)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    })
  }

  // Count ideas by type for this week
  const typeCountsThisWeek = IDEA_TYPES.reduce((acc, type) => {
    acc[type] = currentWeekIdeas.filter(i => i.type === type).length
    return acc
  }, {} as Record<LocalIdeasRecord['type'], number>)

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Ideas</h2>

      {/* This Week Summary */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-3">This Week</h3>
        <div className="flex flex-wrap gap-2">
          {IDEA_TYPES.map(type => (
            <div
              key={type}
              className={`px-3 py-1.5 rounded-full text-sm font-medium ${TYPE_COLORS[type]} ${
                typeCountsThisWeek[type] === 0 ? 'opacity-40' : ''
              }`}
            >
              {type}: {typeCountsThisWeek[type]}
            </div>
          ))}
        </div>
        <p className="text-sm text-slate-500 mt-3">
          Total: {currentWeekIdeas.length} ideas this week
        </p>
      </div>

      {/* Add Idea Form */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">Add Idea</h3>
        </div>

        {showAddForm ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Idea
              </label>
              <input
                type="text"
                value={ideaName}
                onChange={(e) => setIdeaName(e.target.value)}
                placeholder="Enter your idea"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Type
              </label>
              <select
                value={ideaType}
                onChange={(e) => setIdeaType(e.target.value as LocalIdeasRecord['type'])}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
              >
                {IDEA_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCancelAdd}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAddIdea}
                disabled={!ideaName.trim() || createIdea.isPending}
                className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50"
              >
                {createIdea.isPending ? 'Adding...' : 'Add Idea'}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full py-3 bg-blue-50 text-blue-600 rounded-lg font-medium hover:bg-blue-100 transition-colors"
          >
            + Add Idea
          </button>
        )}
      </div>

      {/* Ideas List */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">All Ideas</h3>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as LocalIdeasRecord['type'] | 'All')}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white"
          >
            <option value="All">All Types</option>
            {IDEA_TYPES.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          {filteredIdeas?.map((idea) => (
            <div
              key={idea.id}
              className="p-3 bg-slate-50 rounded-lg"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-slate-900 flex-1">
                  {idea.name}
                </p>
                <span className="text-xs text-slate-400 whitespace-nowrap">
                  {formatDate(idea.when)}
                </span>
              </div>
              <span className={`inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[idea.type]}`}>
                {idea.type}
              </span>
            </div>
          ))}

          {(!filteredIdeas || filteredIdeas.length === 0) && (
            <div className="text-center py-8 text-slate-400">
              No ideas yet
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
