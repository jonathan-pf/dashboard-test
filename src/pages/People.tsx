import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  usePeople,
  useContactLogs,
  useCreatePerson,
  useUpdatePerson,
  useCreateContactLog,
  useUpdateContactLog,
  useDeleteContactLog,
} from '@/hooks/useAirtableData'
import type { LocalPersonRecord, LocalContactLogRecord } from '@/types/airtable'
import { cadenceDays, daysSinceDate, latestContactByPerson } from '@/utils/people'

type CategoryFilter = 'All' | 'Work' | 'Social'

const getToday = () => new Date().toISOString().split('T')[0]

const lastSeenLabel = (dateStr: string | undefined) => {
  if (!dateStr) return 'Never'
  const days = daysSinceDate(dateStr)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
}

function WarmthDots({ warmth, onChange }: { warmth: number | null; onChange?: (v: number) => void }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(n)}
          className={`${onChange ? 'cursor-pointer' : 'cursor-default'} text-sm leading-none ${
            warmth !== null && n <= warmth ? 'text-red-500' : 'text-slate-200'
          }`}
        >
          ♥
        </button>
      ))}
    </span>
  )
}

export function People() {
  const [filter, setFilter] = useState<CategoryFilter>('All')
  const [showArchived, setShowArchived] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formName, setFormName] = useState('')
  const [formCategory, setFormCategory] = useState<'Work' | 'Social'>('Social')
  const [formWarmth, setFormWarmth] = useState<number | null>(3)
  const [formNotes, setFormNotes] = useState('')
  const [selectedPerson, setSelectedPerson] = useState<LocalPersonRecord | null>(null)
  const [editingLogId, setEditingLogId] = useState<string | null>(null)
  const [editLogDate, setEditLogDate] = useState('')

  const people = usePeople()
  const logs = useContactLogs()
  const createPerson = useCreatePerson()
  const updatePerson = useUpdatePerson()
  const createLog = useCreateContactLog()
  const updateLog = useUpdateContactLog()
  const deleteLog = useDeleteContactLog()

  const today = getToday()
  const latestByPerson = useMemo(() => latestContactByPerson(logs ?? []), [logs])

  // Active people, category-filtered, most neglected first relative to their
  // warmth cadence (never-contacted at the top)
  const visiblePeople = useMemo(() => {
    const list = (people ?? []).filter(
      (p) =>
        (showArchived ? p.status === 'Archived' : p.status === 'Active') &&
        (filter === 'All' || p.category === filter)
    )
    const score = (p: LocalPersonRecord) => {
      const last = latestByPerson.get(p.id)
      if (!last) return Infinity
      return daysSinceDate(last) / cadenceDays(p.warmth)
    }
    return list.sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name))
  }, [people, filter, showArchived, latestByPerson])

  const resetForm = () => {
    setFormName('')
    setFormCategory('Social')
    setFormWarmth(3)
    setFormNotes('')
    setShowAddForm(false)
  }

  const handleAddPerson = async () => {
    if (!formName.trim()) return
    await createPerson.mutateAsync({
      name: formName.trim(),
      category: formCategory,
      warmth: formWarmth,
      notes: formNotes.trim() || null,
      status: 'Active',
    })
    resetForm()
  }

  const handleSeen = async (person: LocalPersonRecord) => {
    await createLog.mutateAsync({
      name: `${person.name} - ${today}`,
      personId: person.id,
      date: today,
      note: null,
    })
  }

  // Detail sheet edit state
  const [editName, setEditName] = useState('')
  const [editCategory, setEditCategory] = useState<'Work' | 'Social'>('Social')
  const [editWarmth, setEditWarmth] = useState<number | null>(3)
  const [editNotes, setEditNotes] = useState('')

  const openSheet = (person: LocalPersonRecord) => {
    setSelectedPerson(person)
    setEditName(person.name)
    setEditCategory(person.category)
    setEditWarmth(person.warmth)
    setEditNotes(person.notes ?? '')
    setEditingLogId(null)
  }

  const closeSheet = () => {
    setSelectedPerson(null)
    setEditingLogId(null)
  }

  const handleSavePerson = async () => {
    if (!selectedPerson || !editName.trim()) return
    await updatePerson.mutateAsync({
      personId: selectedPerson.id,
      updates: {
        name: editName.trim(),
        category: editCategory,
        warmth: editWarmth,
        notes: editNotes.trim() || null,
      },
    })
    closeSheet()
  }

  const handleToggleArchive = async () => {
    if (!selectedPerson) return
    await updatePerson.mutateAsync({
      personId: selectedPerson.id,
      updates: { status: selectedPerson.status === 'Active' ? 'Archived' : 'Active' },
    })
    closeSheet()
  }

  const handleSaveLogDate = async (log: LocalContactLogRecord) => {
    if (!editLogDate || !selectedPerson) return
    await updateLog.mutateAsync({
      contactLogId: log.id,
      updates: { date: editLogDate, name: `${selectedPerson.name} - ${editLogDate}` },
    })
    setEditingLogId(null)
    setEditLogDate('')
  }

  const personLogs = selectedPerson
    ? (logs ?? []).filter((l) => l.personId === selectedPerson.id).slice(0, 8)
    : []

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

  const isPending = createLog.isPending || updatePerson.isPending

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/events" className="p-2 -ml-2 text-slate-500 hover:text-slate-700 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h2 className="text-2xl font-bold text-slate-900">People</h2>
        <span className="text-sm text-slate-500">{visiblePeople.length}</span>
      </div>

      {/* Filters */}
      <div className="flex gap-2 items-center">
        {(['All', 'Work', 'Social'] as CategoryFilter[]).map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === c ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {c}
          </button>
        ))}
        <button
          onClick={() => setShowArchived(!showArchived)}
          className={`ml-auto px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            showArchived ? 'bg-slate-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
          }`}
        >
          {showArchived ? 'Archived' : 'Active'}
        </button>
      </div>

      {/* People list */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <div className="divide-y divide-slate-100">
          {visiblePeople.map((person) => {
            const last = latestByPerson.get(person.id)
            const ratio = last ? daysSinceDate(last) / cadenceDays(person.warmth) : Infinity
            const staleClass = ratio >= 1 ? 'text-red-500 font-medium' : ratio >= 0.7 ? 'text-amber-600' : 'text-slate-500'
            return (
              <div key={person.id} className="flex items-center gap-3 py-2.5">
                <button onClick={() => openSheet(person)} className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-900 truncate">{person.name}</p>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${
                        person.category === 'Work' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {person.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <WarmthDots warmth={person.warmth} />
                    <span className={`text-xs ${staleClass}`}>{lastSeenLabel(last)}</span>
                  </div>
                </button>
                {!showArchived && (
                  <button
                    onClick={() => handleSeen(person)}
                    disabled={isPending}
                    className="w-16 py-2 rounded-lg text-sm font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors disabled:opacity-50 shrink-0"
                    title="Log that you saw them today"
                  >
                    Seen
                  </button>
                )}
              </div>
            )
          })}
          {visiblePeople.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-6">
              {showArchived ? 'No archived people' : 'No people yet'}
            </p>
          )}
        </div>

        {/* Add person */}
        {!showArchived && (
          showAddForm ? (
            <div className="mt-4 pt-4 border-t border-slate-200 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Who?"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3 items-end">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as 'Work' | 'Social')}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="Social">Social</option>
                    <option value="Work">Work</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Warmth</label>
                  <div className="px-4 py-3 border border-slate-300 rounded-lg bg-white">
                    <WarmthDots warmth={formWarmth} onChange={setFormWarmth} />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes (optional)</label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="How you know them, context..."
                  rows={2}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button onClick={resetForm} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-lg font-medium">
                  Cancel
                </button>
                <button
                  onClick={handleAddPerson}
                  disabled={!formName.trim() || createPerson.isPending}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50"
                >
                  {createPerson.isPending ? 'Adding...' : 'Add Person'}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full mt-4 py-3 bg-blue-50 text-blue-600 rounded-lg font-medium hover:bg-blue-100 transition-colors"
            >
              + Add Person
            </button>
          )
        )}
      </div>

      {/* Person detail sheet */}
      {selectedPerson && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={closeSheet}>
          <div
            className="bg-white w-full max-w-lg rounded-t-2xl p-4 pb-8 animate-slide-up max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto mb-4" />

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3 items-end">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as 'Work' | 'Social')}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="Social">Social</option>
                    <option value="Work">Work</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Warmth</label>
                  <div className="px-4 py-3 border border-slate-300 rounded-lg bg-white">
                    <WarmthDots warmth={editWarmth} onChange={setEditWarmth} />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                />
              </div>

              {/* Contact history */}
              {personLogs.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">History</p>
                  <div className="divide-y divide-slate-100">
                    {personLogs.map((log) => (
                      <div key={log.id}>
                        <div className="flex items-center justify-between py-1.5">
                          <button
                            onClick={() => {
                              if (editingLogId === log.id) {
                                setEditingLogId(null)
                              } else {
                                setEditingLogId(log.id)
                                setEditLogDate(log.date.slice(0, 10))
                              }
                            }}
                            className="text-sm text-slate-600 hover:text-blue-600 transition-colors"
                          >
                            {formatDate(log.date)}
                          </button>
                          <button
                            onClick={() => deleteLog.mutateAsync(log.id)}
                            disabled={deleteLog.isPending}
                            className="p-1 text-slate-300 hover:text-red-600 transition-colors disabled:opacity-50"
                            title="Remove this entry"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        {editingLogId === log.id && (
                          <div className="flex items-center gap-2 pb-2">
                            <input
                              type="date"
                              value={editLogDate}
                              onChange={(e) => setEditLogDate(e.target.value)}
                              max={today}
                              className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            />
                            <button
                              onClick={() => handleSaveLogDate(log)}
                              disabled={!editLogDate || updateLog.isPending}
                              className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50"
                            >
                              {updateLog.isPending ? '...' : 'Save'}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={closeSheet} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-lg font-medium">
                  Cancel
                </button>
                <button
                  onClick={handleToggleArchive}
                  disabled={updatePerson.isPending}
                  className="py-3 px-4 bg-slate-100 text-slate-600 rounded-lg font-medium disabled:opacity-50"
                >
                  {selectedPerson.status === 'Active' ? 'Archive' : 'Unarchive'}
                </button>
                <button
                  onClick={handleSavePerson}
                  disabled={!editName.trim() || updatePerson.isPending}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50"
                >
                  {updatePerson.isPending ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.2s ease-out;
        }
      `}</style>
    </div>
  )
}
