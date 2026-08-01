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

// Pick an existing group, no group, or reveal a text input for a new one
function SubcategoryPicker({ value, onChange, options }: {
  value: string
  onChange: (v: string) => void
  options: string[]
}) {
  const [creating, setCreating] = useState(false)

  if (creating) {
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="New group name"
        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        autoFocus
      />
    )
  }

  return (
    <select
      value={value}
      onChange={(e) => {
        if (e.target.value === '__new__') {
          setCreating(true)
          onChange('')
        } else {
          onChange(e.target.value)
        }
      }}
      className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
    >
      <option value="">No group</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
      <option value="__new__">New group…</option>
    </select>
  )
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
            warmth !== null && n <= warmth ? 'text-amber-500' : 'text-slate-200'
          }`}
        >
          ●
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
  const [formSubcategory, setFormSubcategory] = useState('')
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
  // Staleness is about actually meeting people; reach-outs are tracked separately
  const metByPerson = useMemo(
    () => latestContactByPerson((logs ?? []).filter((l) => (l.type ?? 'Met') === 'Met')),
    [logs]
  )
  const outByPerson = useMemo(
    () => latestContactByPerson((logs ?? []).filter((l) => l.type === 'Reached out')),
    [logs]
  )

  const subcategoriesFor = (category: 'Work' | 'Social') =>
    [...new Set((people ?? []).filter((p) => p.category === category && p.subcategory).map((p) => p.subcategory as string))].sort()
  const peopleById = useMemo(() => {
    const map = new Map<string, LocalPersonRecord>()
    for (const p of people ?? []) map.set(p.id, p)
    return map
  }, [people])

  // Active people, category-filtered, most neglected first relative to their
  // warmth cadence (never-contacted at the top)
  const visiblePeople = useMemo(() => {
    const list = (people ?? []).filter(
      (p) =>
        (showArchived ? p.status === 'Archived' : p.status === 'Active') &&
        (filter === 'All' || p.category === filter)
    )
    const score = (p: LocalPersonRecord) => {
      const last = metByPerson.get(p.id)
      if (!last) return Infinity
      return daysSinceDate(last) / cadenceDays(p.warmth)
    }
    return list.sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name))
  }, [people, filter, showArchived, metByPerson])

  // Group by category + subcategory, keeping the staleness order within groups;
  // ungrouped people last within their category
  const groupedPeople = useMemo(() => {
    const map = new Map<string, { category: string; sub: string; members: LocalPersonRecord[] }>()
    for (const p of visiblePeople) {
      const key = `${p.category}|${p.subcategory ?? ''}`
      if (!map.has(key)) map.set(key, { category: p.category, sub: p.subcategory ?? '', members: [] })
      map.get(key)!.members.push(p)
    }
    return [...map.values()].sort(
      (a, b) =>
        a.category.localeCompare(b.category) ||
        (a.sub === '' ? 1 : b.sub === '' ? -1 : a.sub.localeCompare(b.sub))
    )
  }, [visiblePeople])

  const resetForm = () => {
    setFormName('')
    setFormCategory('Social')
    setFormSubcategory('')
    setFormWarmth(3)
    setFormNotes('')
    setShowAddForm(false)
  }

  const handleAddPerson = async () => {
    if (!formName.trim()) return
    await createPerson.mutateAsync({
      name: formName.trim(),
      category: formCategory,
      subcategory: formSubcategory.trim() || null,
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
      type: 'Met',
      note: null,
    })
  }

  const handleReachedOut = async (person: LocalPersonRecord) => {
    await createLog.mutateAsync({
      name: `${person.name} - ${today}`,
      personId: person.id,
      date: today,
      type: 'Reached out',
      note: null,
    })
  }

  // Detail sheet edit state
  const [editName, setEditName] = useState('')
  const [editCategory, setEditCategory] = useState<'Work' | 'Social'>('Social')
  const [editSubcategory, setEditSubcategory] = useState('')
  const [editWarmth, setEditWarmth] = useState<number | null>(3)
  const [editNotes, setEditNotes] = useState('')

  const openSheet = (person: LocalPersonRecord) => {
    setSelectedPerson(person)
    setEditName(person.name)
    setEditCategory(person.category)
    setEditSubcategory(person.subcategory ?? '')
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
        subcategory: editSubcategory.trim() || null,
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

  // Any log's date can be edited (backfilling): rebuild the Name to match
  const handleSaveAnyLogDate = async (log: LocalContactLogRecord) => {
    if (!editLogDate) return
    const personName = log.personId ? peopleById.get(log.personId)?.name : null
    await updateLog.mutateAsync({
      contactLogId: log.id,
      updates: {
        date: editLogDate,
        name: personName ? `${personName} - ${editLogDate}` : log.name,
      },
    })
    setEditingLogId(null)
    setEditLogDate('')
  }

  const personLogs = selectedPerson
    ? (logs ?? []).filter((l) => l.personId === selectedPerson.id).slice(0, 8)
    : []

  const recentLogs = (logs ?? []).slice(0, 15)

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

      {/* People list, grouped by category + subcategory */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <div className="space-y-4">
          {groupedPeople.map(({ category, sub, members }) => (
            <div key={`${category}|${sub}`}>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                {filter === 'All' ? `${category} · ${sub || 'No Group'}` : sub || 'No Group'}
              </p>
              <div className="divide-y divide-slate-100">
                {members.map((person) => {
                  const lastMet = metByPerson.get(person.id)
                  const lastOut = outByPerson.get(person.id)
                  const ratio = lastMet ? daysSinceDate(lastMet) / cadenceDays(person.warmth) : Infinity
                  const staleClass = ratio >= 1 ? 'text-red-500 font-medium' : ratio >= 0.7 ? 'text-amber-600' : 'text-slate-500'
                  return (
                    <div key={person.id} className="flex items-center gap-2 py-2.5">
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
                          <span className={`text-xs ${staleClass}`}>{lastSeenLabel(lastMet)}</span>
                          {lastOut && (
                            <span className="text-xs text-amber-600" title="Last reached out">
                              ✉ {lastSeenLabel(lastOut)}
                            </span>
                          )}
                        </div>
                      </button>
                      {!showArchived && (
                        <>
                          <button
                            onClick={() => handleReachedOut(person)}
                            disabled={isPending}
                            className="p-2 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors disabled:opacity-50 shrink-0"
                            title="Log that you reached out today"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleSeen(person)}
                            disabled={isPending}
                            className="w-14 py-2 rounded-lg text-sm font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors disabled:opacity-50 shrink-0"
                            title="Log that you saw them today"
                          >
                            Seen
                          </button>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Group (optional)</label>
                <SubcategoryPicker
                  key={`new-${formCategory}`}
                  value={formSubcategory}
                  onChange={setFormSubcategory}
                  options={subcategoriesFor(formCategory)}
                />
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

      {/* Recent contacts across everyone, with date editing for backfill */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-4">Recent Contacts</h3>
        <div className="space-y-1">
          {recentLogs.map((log) => (
            <div key={log.id} className="border-b border-slate-100 last:border-0">
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                  <span className="text-sm text-slate-900 truncate">
                    {log.personId ? peopleById.get(log.personId)?.name ?? 'Unknown' : 'Unknown'}
                  </span>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${
                      log.type === 'Reached out' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {log.type === 'Reached out' ? 'Out' : 'Met'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      if (editingLogId === log.id) {
                        setEditingLogId(null)
                      } else {
                        setEditingLogId(log.id)
                        setEditLogDate(log.date.slice(0, 10))
                      }
                    }}
                    className="text-xs text-slate-400 hover:text-blue-600 transition-colors"
                    title="Edit date"
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
              </div>
              {editingLogId === log.id && !selectedPerson && (
                <div className="flex items-center gap-2 pb-2 pl-4">
                  <input
                    type="date"
                    value={editLogDate}
                    onChange={(e) => setEditLogDate(e.target.value)}
                    max={today}
                    className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                  <button
                    onClick={() => setEditingLogId(null)}
                    className="px-3 py-2 text-sm bg-slate-100 text-slate-600 rounded-lg font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSaveAnyLogDate(log)}
                    disabled={!editLogDate || updateLog.isPending}
                    className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50"
                  >
                    {updateLog.isPending ? '...' : 'Save'}
                  </button>
                </div>
              )}
            </div>
          ))}
          {recentLogs.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">Nothing logged yet</p>
          )}
        </div>
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Group</label>
                <SubcategoryPicker
                  key={`${selectedPerson.id}-${editCategory}`}
                  value={editSubcategory}
                  onChange={setEditSubcategory}
                  options={subcategoriesFor(editCategory)}
                />
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
                          <div className="flex items-center gap-2">
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
                            <span
                              className={`text-xs px-1.5 py-0.5 rounded-full ${
                                log.type === 'Reached out' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                              }`}
                            >
                              {log.type === 'Reached out' ? 'Out' : 'Met'}
                            </span>
                          </div>
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
                              onClick={() => handleSaveAnyLogDate(log)}
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
