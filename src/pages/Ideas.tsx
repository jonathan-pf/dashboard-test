import { useState } from 'react'
import { Link } from 'react-router-dom'
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
    setEditingIdea(null)
  }

  const handleEditClick = (idea: LocalIdeasRecord) => {
    setEditingIdea(idea)
    setIdeaName(idea.name)
    setIdeaType(idea.type)
    setShowAddForm(true)
  }

  const handleUpdateIdea = async () => {
    if (!editingIdea || !ideaName.trim()) return

    await updateIdea.mutateAsync({
      ideaId: editingIdea.id,
      updates: {
        name: ideaName.trim(),
        type: ideaType,
      },
    })

    setIdeaName('')
    setIdeaType('Revelation')
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

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Ideas</h2>

      {/* Quick Links */}
      <div className="flex gap-2">
        <Link
          to="/ideas/revelations"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm font-medium hover:bg-purple-200 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          Revelations
        </Link>
      </div>

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
