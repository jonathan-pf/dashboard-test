import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useIdeasByType, useUpdateIdea } from '@/hooks/useAirtableData'
import { IDEA_STATUSES, IDEA_STATUS_COLORS, type IdeaStatus } from '@/types/airtable'
import type { LocalIdeasRecord } from '@/types/airtable'

type GroupBy = 'year' | 'status' | 'category'

export function Questions() {
  const questions = useIdeasByType('Question')
  const updateIdea = useUpdateIdea()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingNotes, setEditingNotes] = useState('')
  const [groupBy, setGroupBy] = useState<GroupBy>('year')

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    })
  }

  const getYear = (dateStr: string) => {
    return new Date(dateStr).getFullYear()
  }

  const categories = useMemo(() => {
    if (!questions) return []
    const cats = new Set<string>()
    questions.forEach((q) => {
      if (q.questionCategory) cats.add(q.questionCategory)
    })
    return Array.from(cats).sort()
  }, [questions])

  const groupedQuestions = useMemo(() => {
    if (!questions) return []

    if (groupBy === 'year') {
      const grouped = questions.reduce((acc, question) => {
        const year = getYear(question.when)
        if (!acc[year]) acc[year] = []
        acc[year].push(question)
        return acc
      }, {} as Record<number, typeof questions>)

      return Object.entries(grouped)
        .map(([year, items]) => ({ label: String(year), items }))
        .sort((a, b) => Number(b.label) - Number(a.label))
    }

    if (groupBy === 'status') {
      const statusOrder = ['Planned', 'Researched', 'Shipped', 'No Status'] as const
      const grouped: Record<string, LocalIdeasRecord[]> = {}

      questions.forEach((question) => {
        const key = question.status || 'No Status'
        if (!grouped[key]) grouped[key] = []
        grouped[key].push(question)
      })

      return statusOrder
        .filter((s) => grouped[s]?.length)
        .map((s) => ({ label: s, items: grouped[s] }))
    }

    // groupBy === 'category'
    const grouped: Record<string, LocalIdeasRecord[]> = {}

    questions.forEach((question) => {
      const key = question.questionCategory || 'Uncategorised'
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(question)
    })

    const sortedKeys = Object.keys(grouped).sort((a, b) => {
      if (a === 'Uncategorised') return 1
      if (b === 'Uncategorised') return -1
      return a.localeCompare(b)
    })

    return sortedKeys.map((key) => ({ label: key, items: grouped[key] }))
  }, [questions, groupBy])

  const handleStartEdit = (id: string, notes: string | null) => {
    setEditingId(id)
    setEditingNotes(notes || '')
  }

  const handleSaveNotes = async () => {
    if (!editingId) return
    await updateIdea.mutateAsync({
      ideaId: editingId,
      updates: { notes: editingNotes.trim() || null },
    })
    setEditingId(null)
    setEditingNotes('')
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditingNotes('')
  }

  const handleStatusChange = async (ideaId: string, status: IdeaStatus) => {
    await updateIdea.mutateAsync({
      ideaId,
      updates: { status },
    })
  }

  const handleCategoryChange = async (ideaId: string, category: string | null) => {
    await updateIdea.mutateAsync({
      ideaId,
      updates: { questionCategory: category },
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/ideas"
          className="p-2 -ml-2 text-slate-500 hover:text-slate-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h2 className="text-2xl font-bold text-slate-900">Questions</h2>
        <span className="text-sm text-slate-500">
          {questions?.length ?? 0} total
        </span>
      </div>

      {/* Group by selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-500">Group by:</span>
        {(['year', 'status', 'category'] as const).map((option) => (
          <button
            key={option}
            onClick={() => setGroupBy(option)}
            className={`px-3 py-1 text-sm rounded-full transition-all ${
              groupBy === option
                ? 'bg-yellow-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {option === 'year' ? 'Year' : option === 'status' ? 'Status' : 'Category'}
          </button>
        ))}
      </div>

      {groupedQuestions.map(({ label, items }) => (
        <div key={label} className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">{label}</h3>
            <span className="text-sm text-slate-500">
              {items.length} question{items.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="space-y-2">
            {items.map((idea) => (
              <div
                key={idea.id}
                className="p-3 bg-yellow-50 rounded-lg"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-slate-900 flex-1">
                    {idea.name}
                  </p>
                  <span className="text-xs text-slate-400 whitespace-nowrap">
                    {formatDate(idea.when)}
                  </span>
                </div>

                {/* Status buttons */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {IDEA_STATUSES.map((status) => (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(idea.id, status)}
                      disabled={updateIdea.isPending}
                      className={`px-2 py-0.5 text-xs font-medium rounded transition-all ${
                        idea.status === status
                          ? IDEA_STATUS_COLORS[status]
                          : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'
                      } disabled:opacity-50`}
                    >
                      {status}
                    </button>
                  ))}
                  {idea.status && (
                    <button
                      onClick={() => handleStatusChange(idea.id, null)}
                      disabled={updateIdea.isPending}
                      className="px-2 py-0.5 text-xs text-slate-400 hover:text-slate-600 disabled:opacity-50"
                      title="Clear status"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Category selector */}
                <div className="mt-1.5 flex items-center gap-1.5">
                  <select
                    value={idea.questionCategory || ''}
                    onChange={(e) =>
                      handleCategoryChange(idea.id, e.target.value || null)
                    }
                    disabled={updateIdea.isPending}
                    className="text-xs border border-slate-200 rounded px-1.5 py-0.5 text-slate-600 bg-white disabled:opacity-50"
                  >
                    <option value="">No category</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {editingId === idea.id ? (
                  <div className="mt-2 space-y-2">
                    <textarea
                      value={editingNotes}
                      onChange={(e) => setEditingNotes(e.target.value)}
                      placeholder="Add notes..."
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none resize-none"
                      rows={3}
                      autoFocus
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={handleCancelEdit}
                        className="px-3 py-1 text-xs text-slate-600 hover:text-slate-800"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveNotes}
                        disabled={updateIdea.isPending}
                        className="px-3 py-1 text-xs bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50"
                      >
                        {updateIdea.isPending ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => handleStartEdit(idea.id, idea.notes)}
                    className="mt-1 cursor-pointer group"
                  >
                    {idea.notes ? (
                      <p className="text-xs text-slate-600 whitespace-pre-wrap group-hover:text-slate-800">
                        {idea.notes}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 italic group-hover:text-slate-500">
                        Click to add notes...
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {(!questions || questions.length === 0) && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="text-center py-8 text-slate-400">
            No questions yet
          </div>
        </div>
      )}
    </div>
  )
}
