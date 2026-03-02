import { useMemo, useState } from 'react'
import { useIdeasByType, useUpdateIdea } from '@/hooks/useAirtableData'

export function Revelations() {
  const revelations = useIdeasByType('Revelation')
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

  const revelationsByYear = useMemo(() => {
    if (!revelations) return []

    const grouped = revelations.reduce((acc, revelation) => {
      const year = getYear(revelation.when)
      if (!acc[year]) {
        acc[year] = []
      }
      acc[year].push(revelation)
      return acc
    }, {} as Record<number, typeof revelations>)

    // Sort years descending (most recent first)
    return Object.entries(grouped)
      .map(([year, items]) => ({ year: Number(year), items }))
      .sort((a, b) => b.year - a.year)
  }, [revelations])

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
        <span className="text-sm text-slate-500">
          {revelations?.length ?? 0} total
        </span>
      </div>

      {revelationsByYear.map(({ year, items }) => (
        <div key={year} className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">{year}</h3>
            <span className="text-sm text-slate-500">
              {items.length} revelation{items.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="space-y-2">
            {items.map((idea) => (
              <div
                key={idea.id}
                className="p-3 bg-purple-50 rounded-lg"
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
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none resize-none"
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
                        className="px-3 py-1 text-xs bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
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

      {(!revelations || revelations.length === 0) && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="text-center py-8 text-slate-400">
            No revelations yet
          </div>
        </div>
      )}
    </div>
  )
}
