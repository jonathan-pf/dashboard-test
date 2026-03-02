import { useState } from 'react'
import {
  useIdeas,
  useCurrentWeek,
  useCreateIdea,
  useUpdateIdea,
  useDeleteIdea,
} from '@/hooks/useAirtableData'
import type { LocalIdeasRecord } from '@/types/airtable'

const IDEA_TYPES: LocalIdeasRecord['type'][] = [
  'Revelation',
  'Crux',
  'Driver',
  'Bottleneck',
  'Step',
  'Failure',
  'Bit',
  'Stage',
  'Feature',
  'Blog',
  'Question',
  'Skill',
]

// Types shown in the summary grid (hide unused types)
const SUMMARY_TYPES: LocalIdeasRecord['type'][] = [
  'Revelation',
  'Crux',
  'Step',
  'Bit',
  'Feature',
  'Blog',
  'Question',
  'Skill',
]

const TYPE_COLORS: Record<LocalIdeasRecord['type'], string> = {
  Revelation: 'bg-purple-100 text-purple-700',
  'Crux': 'bg-blue-100 text-blue-700',
  Driver: 'bg-green-100 text-green-700',
  Bottleneck: 'bg-red-100 text-red-700',
  Step: 'bg-amber-100 text-amber-700',
  Failure: 'bg-rose-100 text-rose-700',
  Bit: 'bg-cyan-100 text-cyan-700',
  Stage: 'bg-indigo-100 text-indigo-700',
  Feature: 'bg-teal-100 text-teal-700',
  Blog: 'bg-orange-100 text-orange-700',
  Question: 'bg-yellow-100 text-yellow-700',
  Skill: 'bg-pink-100 text-pink-700',
}

export function Ideas() {
  const [showAddForm, setShowAddForm] = useState(false)
  const [ideaName, setIdeaName] = useState('')
  const [ideaType, setIdeaType] = useState<LocalIdeasRecord['type']>('Step')
  const [ideaDate, setIdeaDate] = useState('')
  const [filterType, setFilterType] = useState<LocalIdeasRecord['type'] | 'All'>('All')
  const [editingIdea, setEditingIdea] = useState<LocalIdeasRecord | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const ideas = useIdeas()
  const currentWeek = useCurrentWeek()
  const createIdea = useCreateIdea()
  const updateIdea = useUpdateIdea()
  const deleteIdea = useDeleteIdea()

  const filteredIdeas = filterType === 'All'
    ? ideas
    : ideas?.filter(idea => idea.type === filterType)

  const currentWeekIdeas = ideas?.filter(idea => idea.weekId === currentWeek?.id) ?? []

  const currentYear = new Date().getFullYear()
  const currentYearIdeas = ideas?.filter(idea => {
    const ideaYear = new Date(idea.when).getFullYear()
    return ideaYear === currentYear
  }) ?? []

  const handleAddIdea = async () => {
    if (!ideaName.trim()) return

    await createIdea.mutateAsync({
      name: ideaName.trim(),
      type: ideaType,
      when: new Date().toISOString(),
      weekId: currentWeek?.id ?? null,
      notes: null,
      status: null,
    })

    setIdeaName('')
    setIdeaType('Revelation')
    setShowAddForm(false)
  }

  const handleCancelAdd = () => {
    setIdeaName('')
    setIdeaType('Revelation')
    setIdeaDate('')
    setShowAddForm(false)
    setEditingIdea(null)
  }

  const handleEditClick = (idea: LocalIdeasRecord) => {
    setEditingIdea(idea)
    setIdeaName(idea.name)
    setIdeaType(idea.type)
    // Convert ISO date string to YYYY-MM-DD format for the date input
    setIdeaDate(idea.when.split('T')[0])
    setShowAddForm(true)
  }

  const handleUpdateIdea = async () => {
    if (!editingIdea || !ideaName.trim()) return

    await updateIdea.mutateAsync({
      ideaId: editingIdea.id,
      updates: {
        name: ideaName.trim(),
        type: ideaType,
        when: new Date(ideaDate).toISOString(),
      },
    })

    setIdeaName('')
    setIdeaType('Revelation')
    setIdeaDate('')
    setShowAddForm(false)
    setEditingIdea(null)
  }

  const handleDeleteIdea = async (ideaId: string) => {
    await deleteIdea.mutateAsync(ideaId)
    setDeleteConfirmId(null)
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

  // Count ideas by type for this year
  const typeCountsThisYear = IDEA_TYPES.reduce((acc, type) => {
    acc[type] = currentYearIdeas.filter(i => i.type === type).length
    return acc
  }, {} as Record<LocalIdeasRecord['type'], number>)

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-1.5 items-center">
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wide">Type</div>
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wide text-center w-12">Week</div>
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wide text-center w-12">Year</div>

          {SUMMARY_TYPES.map(type => (
            <>
              <div key={`${type}-label`} className={`px-2.5 py-1 rounded-md text-sm font-medium ${TYPE_COLORS[type]}`}>
                {type}
              </div>
              <div
                key={`${type}-week`}
                className={`text-center text-sm font-semibold ${typeCountsThisWeek[type] > 0 ? 'text-slate-900' : 'text-slate-300'}`}
              >
                {typeCountsThisWeek[type]}
              </div>
              <div
                key={`${type}-year`}
                className={`text-center text-sm font-semibold ${typeCountsThisYear[type] > 0 ? 'text-slate-900' : 'text-slate-300'}`}
              >
                {typeCountsThisYear[type]}
              </div>
            </>
          ))}

          <div className="pt-2 border-t border-slate-100 mt-1 text-sm font-semibold text-slate-700">Total</div>
          <div className="pt-2 border-t border-slate-100 mt-1 text-center text-sm font-bold text-slate-900">{currentWeekIdeas.length}</div>
          <div className="pt-2 border-t border-slate-100 mt-1 text-center text-sm font-bold text-slate-900">{currentYearIdeas.length}</div>
        </div>
      </div>

      {/* Add/Edit Idea Form */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">
            {editingIdea ? 'Edit Idea' : 'Add Idea'}
          </h3>
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
            {editingIdea && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={ideaDate}
                  onChange={(e) => setIdeaDate(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                />
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleCancelAdd}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={editingIdea ? handleUpdateIdea : handleAddIdea}
                disabled={!ideaName.trim() || createIdea.isPending || updateIdea.isPending}
                className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50"
              >
                {editingIdea
                  ? (updateIdea.isPending ? 'Saving...' : 'Save Changes')
                  : (createIdea.isPending ? 'Adding...' : 'Add Idea')
                }
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
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 whitespace-nowrap">
                    {formatDate(idea.when)}
                  </span>
                  <button
                    onClick={() => handleEditClick(idea)}
                    className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                    title="Edit"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(idea.id)}
                    className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                    title="Delete"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              <span className={`inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[idea.type]}`}>
                {idea.type}
              </span>

              {/* Delete Confirmation */}
              {deleteConfirmId === idea.id && (
                <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-sm text-red-700 mb-2">Delete this idea?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDeleteConfirmId(null)}
                      className="flex-1 py-2 bg-white text-slate-600 rounded border border-slate-300 text-sm font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleDeleteIdea(idea.id)}
                      disabled={deleteIdea.isPending}
                      className="flex-1 py-2 bg-red-600 text-white rounded text-sm font-medium disabled:opacity-50"
                    >
                      {deleteIdea.isPending ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              )}
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
