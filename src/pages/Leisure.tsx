import { useState, useMemo } from 'react'
import {
  useLeisure,
  useCreateLeisure,
  useUpdateLeisure,
  useDeleteLeisure,
  useCurrentWeek,
} from '@/hooks/useAirtableData'
import {
  LEISURE_TYPES,
  LEISURE_TYPE_COLORS,
  LEISURE_STATUSES,
  LEISURE_STATUS_COLORS,
} from '@/types/airtable'
import type { LocalLeisureRecord } from '@/types/airtable'
import { formatDuration } from '@/utils/formatDuration'

const TYPE_BAR_COLORS: Record<LocalLeisureRecord['type'], string> = {
  'Article': '#3b82f6',
  'Book': '#06b6d4',
  'Film': '#14b8a6',
  'TV Show': '#22c55e',
  'Game': '#eab308',
  'Play': '#f97316',
  'Cinema': '#ef4444',
  'Immersive': '#ec4899',
  'Museum': '#a855f7',
}

function StarRating({
  value,
  onChange,
  readonly = false,
}: {
  value: number | null
  onChange?: (rating: number | null) => void
  readonly?: boolean
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => {
            if (readonly || !onChange) return
            onChange(value === star ? null : star)
          }}
          className={`text-lg ${readonly ? 'cursor-default' : 'cursor-pointer'} ${
            value !== null && star <= value ? 'text-amber-400' : 'text-slate-300'
          }`}
        >
          ★
        </button>
      ))}
    </div>
  )
}

export function Leisure() {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingItem, setEditingItem] = useState<LocalLeisureRecord | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<string>('all')

  // Form state
  const [formName, setFormName] = useState('')
  const [formType, setFormType] = useState<LocalLeisureRecord['type']>('Film')
  const [formStatus, setFormStatus] = useState<LocalLeisureRecord['status']>('Planned')
  const [formDateStarted, setFormDateStarted] = useState('')
  const [formDateEnded, setFormDateEnded] = useState('')
  const [formUrl, setFormUrl] = useState('')
  const [formDurationHours, setFormDurationHours] = useState('')
  const [formDurationMinutes, setFormDurationMinutes] = useState('')
  const [formRating, setFormRating] = useState<number | null>(null)

  const leisure = useLeisure()
  const currentWeek = useCurrentWeek()
  const createLeisure = useCreateLeisure()
  const updateLeisure = useUpdateLeisure()
  const deleteLeisure = useDeleteLeisure()

  // Stats
  const stats = useMemo(() => {
    if (!leisure) return null
    const now = new Date()
    const yearStart = `${now.getFullYear()}-01-01`
    const janFirst = new Date(now.getFullYear(), 0, 1)
    const diffMs = now.getTime() - janFirst.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const weekNumber = Math.floor(diffDays / 7) + 1

    const items2026 = leisure.filter(
      (item) =>
        (item.dateStarted && item.dateStarted >= yearStart) ||
        (item.dateEnded && item.dateEnded >= yearStart)
    )

    const totalDuration = items2026.reduce((sum, item) => sum + (item.duration ?? 0), 0)
    const avgPerWeek = weekNumber > 0 ? totalDuration / weekNumber : 0

    const ratedItems = leisure.filter((item) => item.rating !== null && item.rating > 0)
    const avgRating =
      ratedItems.length > 0
        ? ratedItems.reduce((sum, item) => sum + (item.rating ?? 0), 0) / ratedItems.length
        : null

    // Type breakdown for 2026
    const typeBreakdown: Record<string, { duration: number; count: number }> = {}
    for (const type of LEISURE_TYPES) {
      typeBreakdown[type] = { duration: 0, count: 0 }
    }
    for (const item of items2026) {
      typeBreakdown[item.type].duration += item.duration ?? 0
      typeBreakdown[item.type].count += 1
    }

    return { totalDuration, avgPerWeek, avgRating, typeBreakdown }
  }, [leisure])

  const filteredItems = useMemo(() => {
    if (!leisure) return []
    if (filterType === 'all') return leisure
    return leisure.filter((item) => item.type === filterType)
  }, [leisure, filterType])

  const weeklyBreakdown = useMemo(() => {
    if (!leisure || !currentWeek?.weekCommencing) return null

    const weekStartStr = currentWeek.weekCommencing
    const weekEndDate = new Date(weekStartStr + 'T00:00:00Z')
    weekEndDate.setUTCDate(weekEndDate.getUTCDate() + 6)
    const weekEndStr = weekEndDate.toISOString().split('T')[0]

    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

    const items: { name: string; type: LocalLeisureRecord['type']; attributedSeconds: number }[] = []
    let totalSeconds = 0

    for (const item of leisure) {
      if (item.status !== 'Consumed' && item.status !== 'Live') continue
      if (!item.dateStarted || !item.duration || item.duration <= 0) continue

      const itemStartStr = item.dateStarted
      const itemEndStr = item.status === 'Live'
        ? today
        : item.dateEnded ?? itemStartStr

      // No overlap if item ends before week starts or starts after week ends
      if (itemEndStr < weekStartStr || itemStartStr > weekEndStr) continue

      const overlapStartStr = itemStartStr > weekStartStr ? itemStartStr : weekStartStr
      const overlapEndStr = itemEndStr < weekEndStr ? itemEndStr : weekEndStr

      const msA = Date.UTC(+overlapStartStr.slice(0, 4), +overlapStartStr.slice(5, 7) - 1, +overlapStartStr.slice(8, 10))
      const msB = Date.UTC(+overlapEndStr.slice(0, 4), +overlapEndStr.slice(5, 7) - 1, +overlapEndStr.slice(8, 10))
      const overlapDays = Math.round((msB - msA) / 86400000) + 1
      if (overlapDays <= 0) continue

      const msStart = Date.UTC(+itemStartStr.slice(0, 4), +itemStartStr.slice(5, 7) - 1, +itemStartStr.slice(8, 10))
      const msEnd = Date.UTC(+itemEndStr.slice(0, 4), +itemEndStr.slice(5, 7) - 1, +itemEndStr.slice(8, 10))
      const totalDays = Math.max(1, Math.round((msEnd - msStart) / 86400000) + 1)

      const attributed = (overlapDays / totalDays) * item.duration
      items.push({ name: item.name, type: item.type, attributedSeconds: attributed })
      totalSeconds += attributed
    }

    items.sort((a, b) => b.attributedSeconds - a.attributedSeconds)
    return { items, totalSeconds }
  }, [leisure, currentWeek?.weekCommencing])

  const resetForm = () => {
    setFormName('')
    setFormType('Film')
    setFormStatus('Planned')
    setFormDateStarted('')
    setFormDateEnded('')
    setFormUrl('')
    setFormDurationHours('')
    setFormDurationMinutes('')
    setFormRating(null)
  }

  const getDurationSeconds = (): number | null => {
    const hours = parseInt(formDurationHours) || 0
    const minutes = parseInt(formDurationMinutes) || 0
    if (hours === 0 && minutes === 0) return null
    return hours * 3600 + minutes * 60
  }

  const handleAdd = async () => {
    if (!formName.trim()) return

    await createLeisure.mutateAsync({
      name: formName.trim(),
      type: formType,
      status: formStatus,
      dateStarted: formDateStarted || null,
      dateEnded: formDateEnded || null,
      url: formUrl.trim() || null,
      duration: getDurationSeconds(),
      rating: formRating,
    })

    resetForm()
    setShowAddForm(false)
  }

  const handleUpdate = async () => {
    if (!editingItem || !formName.trim()) return

    await updateLeisure.mutateAsync({
      leisureId: editingItem.id,
      updates: {
        name: formName.trim(),
        type: formType,
        status: formStatus,
        dateStarted: formDateStarted || null,
        dateEnded: formDateEnded || null,
        url: formUrl.trim() || null,
        duration: getDurationSeconds(),
        rating: formRating,
      },
    })

    resetForm()
    setEditingItem(null)
  }

  const handleEditClick = (item: LocalLeisureRecord) => {
    setEditingItem(item)
    setFormName(item.name)
    setFormType(item.type)
    setFormStatus(item.status)
    setFormDateStarted(item.dateStarted || '')
    setFormDateEnded(item.dateEnded || '')
    setFormUrl(item.url || '')
    const hours = item.duration ? Math.floor(item.duration / 3600) : 0
    const minutes = item.duration ? Math.floor((item.duration % 3600) / 60) : 0
    setFormDurationHours(hours > 0 ? String(hours) : '')
    setFormDurationMinutes(minutes > 0 ? String(minutes) : '')
    setFormRating(item.rating)
    setShowAddForm(false)
  }

  const handleDelete = async (id: string) => {
    await deleteLeisure.mutateAsync(id)
    setDeletingId(null)
  }

  const handleCancelForm = () => {
    resetForm()
    setShowAddForm(false)
    setEditingItem(null)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const isFormOpen = showAddForm || editingItem !== null

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Leisure</h2>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-200 text-center">
            <p className="text-xs text-slate-500 font-medium">Total 2026</p>
            <p className="text-lg font-bold text-slate-900">
              {formatDuration(stats.totalDuration) || '0h'}
            </p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-200 text-center">
            <p className="text-xs text-slate-500 font-medium">Avg / Week</p>
            <p className="text-lg font-bold text-slate-900">
              {formatDuration(stats.avgPerWeek) || '0h'}
            </p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-200 text-center">
            <p className="text-xs text-slate-500 font-medium">Avg Rating</p>
            <p className="text-lg font-bold text-slate-900">
              {stats.avgRating !== null ? stats.avgRating.toFixed(1) : '--'}
            </p>
          </div>
        </div>
      )}

      {/* Add/Edit Form */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">
            {editingItem ? 'Edit Item' : 'Add Item'}
          </h3>
          {!isFormOpen && (
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="text-sm border border-slate-300 rounded-lg px-2 py-1 bg-white"
            >
              <option value="all">All Types</option>
              {LEISURE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          )}
        </div>

        {isFormOpen ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Enter name"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                <select
                  value={formType}
                  onChange={(e) =>
                    setFormType(e.target.value as LocalLeisureRecord['type'])
                  }
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                >
                  {LEISURE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select
                  value={formStatus}
                  onChange={(e) =>
                    setFormStatus(e.target.value as LocalLeisureRecord['status'])
                  }
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                >
                  {LEISURE_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Date Started
                </label>
                <input
                  type="date"
                  value={formDateStarted}
                  onChange={(e) => setFormDateStarted(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Date Ended
                </label>
                <input
                  type="date"
                  value={formDateEnded}
                  onChange={(e) => setFormDateEnded(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">URL (optional)</label>
              <input
                type="url"
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Duration</label>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  min="0"
                  value={formDurationHours}
                  onChange={(e) => setFormDurationHours(e.target.value)}
                  placeholder="0"
                  className="w-20 px-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                <span className="text-sm text-slate-500">hours</span>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={formDurationMinutes}
                  onChange={(e) => setFormDurationMinutes(e.target.value)}
                  placeholder="0"
                  className="w-20 px-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                <span className="text-sm text-slate-500">minutes</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Rating</label>
              <StarRating value={formRating} onChange={setFormRating} />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCancelForm}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={editingItem ? handleUpdate : handleAdd}
                disabled={
                  !formName.trim() || createLeisure.isPending || updateLeisure.isPending
                }
                className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50"
              >
                {createLeisure.isPending || updateLeisure.isPending
                  ? 'Saving...'
                  : editingItem
                  ? 'Update'
                  : 'Add'}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full py-3 bg-blue-50 text-blue-600 rounded-lg font-medium hover:bg-blue-100 transition-colors"
          >
            + Add Item
          </button>
        )}
      </div>

      {/* Type Breakdown Chart */}
      {stats && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <h3 className="font-semibold text-slate-900 mb-3 text-sm">Time by Type (2026)</h3>
          <div className="space-y-2">
            {(() => {
              const maxDuration = Math.max(
                ...LEISURE_TYPES.map((t) => stats.typeBreakdown[t].duration)
              )
              return LEISURE_TYPES.filter(
                (t) => stats.typeBreakdown[t].duration > 0 || stats.typeBreakdown[t].count > 0
              ).map((type) => {
                const { duration, count } = stats.typeBreakdown[type]
                const widthPct = maxDuration > 0 ? (duration / maxDuration) * 100 : 0
                return (
                  <div key={type} className="flex items-center gap-2">
                    <span className="text-xs text-slate-600 w-16 shrink-0">{type}</span>
                    <div className="flex-1 h-5 bg-slate-100 rounded overflow-hidden">
                      {widthPct > 0 && (
                        <div
                          className="h-full rounded"
                          style={{
                            width: `${Math.max(widthPct, 4)}%`,
                            backgroundColor: TYPE_BAR_COLORS[type],
                          }}
                        />
                      )}
                    </div>
                    <span className="text-xs text-slate-500 w-14 text-right shrink-0">
                      {duration > 0 ? formatDuration(duration) : `${count}`}
                    </span>
                  </div>
                )
              })
            })()}
          </div>
        </div>
      )}

      {/* This Week Breakdown */}
      {weeklyBreakdown && weeklyBreakdown.items.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900 text-sm">This Week</h3>
            <span className="text-sm font-bold text-slate-900">
              {formatDuration(weeklyBreakdown.totalSeconds) || '0h'}
            </span>
          </div>
          <div className="space-y-2">
            {weeklyBreakdown.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium shrink-0 ${LEISURE_TYPE_COLORS[item.type]}`}
                  >
                    {item.type}
                  </span>
                  <span className="text-sm text-slate-700 truncate">{item.name}</span>
                </div>
                <span className="text-sm text-slate-500 font-medium shrink-0 ml-2">
                  {formatDuration(item.attributedSeconds) || '<1m'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Items List */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-4">Items</h3>

        <div className="space-y-2">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors relative"
            >
              <div
                onClick={() => handleEditClick(item)}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-slate-900 flex-1">{item.name}</p>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${LEISURE_STATUS_COLORS[item.status]}`}
                  >
                    {item.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${LEISURE_TYPE_COLORS[item.type]}`}
                  >
                    {item.type}
                  </span>
                  {item.dateStarted && (
                    <span className="text-xs text-slate-400">
                      {formatDate(item.dateStarted)}
                      {item.dateEnded && item.dateEnded !== item.dateStarted && (
                        <> – {formatDate(item.dateEnded)}</>
                      )}
                    </span>
                  )}
                  {item.duration && item.duration > 0 && (
                    <span className="text-xs text-slate-500">{formatDuration(item.duration)}</span>
                  )}
                  {item.rating !== null && item.rating > 0 && (
                    <StarRating value={item.rating} readonly />
                  )}
                </div>
                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs text-blue-600 hover:underline mt-1 block truncate"
                  >
                    {item.url.replace(/^https?:\/\//, '').slice(0, 50)}
                  </a>
                )}
              </div>
              {/* Delete button */}
              {deletingId === item.id ? (
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-xs px-3 py-1 bg-red-600 text-white rounded font-medium"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setDeletingId(null)}
                    className="text-xs px-3 py-1 bg-slate-200 text-slate-600 rounded font-medium"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setDeletingId(item.id)
                  }}
                  className="absolute top-2 right-2 text-slate-300 hover:text-red-500 text-xs p-1"
                  title="Delete"
                >
                  ✕
                </button>
              )}
            </div>
          ))}

          {filteredItems.length === 0 && (
            <div className="text-center py-8 text-slate-400">No items yet</div>
          )}
        </div>
      </div>
    </div>
  )
}
