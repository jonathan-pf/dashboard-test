import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useIdeasByType, useUpdateIdea } from '@/hooks/useAirtableData'

export function Questions() {
  const questions = useIdeasByType('Question')
  const updateIdea = useUpdateIdea()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingNotes, setEditingNotes] = useState('')

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

  const questionsByYear = useMemo(() => {
    if (!questions) return []

    const grouped = questions.reduce((acc, question) => {
      const year = getYear(question.when)
      if (!acc[year]) {
        acc[year] = []
      }
      acc[year].push(question)
      return acc
    }, {} as Record<number, typeof questions>)

    // Sort years descending (most recent first)
    return Object.entries(grouped)
      .map(([year, items]) => ({ year: Number(year), items }))
      .sort((a, b) => b.year - a.year)
  }, [questions])

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

      {questionsByYear.map(({ year, items }) => (
        <div key={year} className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">{year}</h3>
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
