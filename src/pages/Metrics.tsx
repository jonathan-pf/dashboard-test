import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  useMetrics,
  useCreateMetric,
  useUpdateMetric,
  useDeleteMetric,
  useMetricConfigs,
  useCreateMetricConfig,
  useUpdateMetricConfig,
} from '@/hooks/useAirtableData'
import type { LocalMetricsRecord } from '@/types/airtable'
import { BUILT_IN_TILE_NAMES } from '@/types/airtable'

type MetricType = 'Number' | 'Date'

const formatValue = (record: LocalMetricsRecord) => {
  if (record.valueNumber !== null) {
    return Number.isInteger(record.valueNumber)
      ? record.valueNumber.toLocaleString()
      : record.valueNumber.toLocaleString(undefined, { maximumFractionDigits: 2 })
  }
  if (record.valueDate) {
    return new Date(record.valueDate).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }
  return '--'
}

const formatRecorded = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function Metrics() {
  const [showForm, setShowForm] = useState(false)
  const [editingRecord, setEditingRecord] = useState<LocalMetricsRecord | null>(null)
  const [formMetric, setFormMetric] = useState('')
  const [metricLocked, setMetricLocked] = useState(false)
  const [formType, setFormType] = useState<MetricType>('Number')
  const [formNumber, setFormNumber] = useState('')
  const [formDate, setFormDate] = useState('')
  const [formSource, setFormSource] = useState('')
  const [deleteConfirming, setDeleteConfirming] = useState(false)

  const metrics = useMetrics()
  const createMetric = useCreateMetric()
  const updateMetric = useUpdateMetric()
  const deleteMetric = useDeleteMetric()
  const configs = useMetricConfigs()
  const createConfig = useCreateMetricConfig()
  const updateConfig = useUpdateMetricConfig()

  const configFor = (name: string) => configs?.find((c) => c.metric === name)
  const pinnedConfigs = (configs ?? [])
    .filter((c) => c.showOnHome)
    .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity) || a.metric.localeCompare(b.metric))
  const configPending = createConfig.isPending || updateConfig.isPending

  const togglePin = async (name: string) => {
    const config = configFor(name)
    if (config) {
      await updateConfig.mutateAsync({ configId: config.id, updates: { showOnHome: !config.showOnHome } })
    } else {
      await createConfig.mutateAsync({ metric: name, showOnHome: true, order: pinnedConfigs.length })
    }
  }

  // Built-in Totals tiles default to shown; a config row with Show on Home
  // unchecked hides them
  const builtInShown = (name: string) => {
    const config = configFor(name)
    return !config || config.showOnHome
  }

  const toggleBuiltIn = async (name: string) => {
    const config = configFor(name)
    if (config) {
      await updateConfig.mutateAsync({ configId: config.id, updates: { showOnHome: !config.showOnHome } })
    } else {
      await createConfig.mutateAsync({ metric: name, showOnHome: false, order: null })
    }
  }

  // Swap a pinned metric with its neighbour, normalising orders to display index
  const movePin = async (name: string, direction: -1 | 1) => {
    if (configPending) return
    const idx = pinnedConfigs.findIndex((c) => c.metric === name)
    const target = idx + direction
    if (idx < 0 || target < 0 || target >= pinnedConfigs.length) return
    const updates: Array<{ id: string; order: number }> = []
    pinnedConfigs.forEach((c, i) => {
      const newOrder = i === idx ? target : i === target ? idx : i
      if (c.order !== newOrder) updates.push({ id: c.id, order: newOrder })
    })
    for (const u of updates) {
      await updateConfig.mutateAsync({ configId: u.id, updates: { order: u.order } })
    }
  }

  // Group records by metric name, newest first within each group,
  // groups ordered by their latest record
  const groups = useMemo(() => {
    const map = new Map<string, LocalMetricsRecord[]>()
    for (const record of metrics ?? []) {
      const key = record.metric || 'Unnamed'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(record)
    }
    return [...map.entries()].map(([name, records]) => ({ name, records }))
  }, [metrics])

  const resetForm = () => {
    setShowForm(false)
    setEditingRecord(null)
    setFormMetric('')
    setMetricLocked(false)
    setFormType('Number')
    setFormNumber('')
    setFormDate('')
    setFormSource('')
    setDeleteConfirming(false)
  }

  // Log a fresh value for an existing metric, prefilled from its latest record
  const startLogFor = (name: string, latest: LocalMetricsRecord) => {
    resetForm()
    setFormMetric(name)
    setMetricLocked(true)
    setFormType(latest.type === 'Date' ? 'Date' : 'Number')
    setFormSource(latest.source ?? '')
    setShowForm(true)
  }

  const startNew = () => {
    resetForm()
    setShowForm(true)
  }

  const startEdit = (record: LocalMetricsRecord) => {
    resetForm()
    setEditingRecord(record)
    setFormMetric(record.metric)
    setMetricLocked(true)
    setFormType(record.type === 'Date' ? 'Date' : 'Number')
    setFormNumber(record.valueNumber !== null ? String(record.valueNumber) : '')
    setFormDate(record.valueDate ?? '')
    setFormSource(record.source ?? '')
    setShowForm(true)
  }

  const valueValid = formType === 'Number' ? formNumber.trim() !== '' && !isNaN(parseFloat(formNumber)) : formDate !== ''

  const handleSave = async () => {
    if (!formMetric.trim() || !valueValid) return
    const valueNumber = formType === 'Number' ? parseFloat(formNumber) : null
    const valueDate = formType === 'Date' ? formDate : null

    if (editingRecord) {
      await updateMetric.mutateAsync({
        metricId: editingRecord.id,
        updates: {
          type: formType,
          valueNumber,
          valueDate,
          source: formSource.trim() || null,
        },
      })
    } else {
      await createMetric.mutateAsync({
        name: formMetric.trim(),
        metric: formMetric.trim(),
        type: formType,
        valueNumber,
        valueDate,
        source: formSource.trim() || null,
      })
    }
    resetForm()
  }

  const handleDelete = async () => {
    if (!editingRecord) return
    if (!deleteConfirming) {
      setDeleteConfirming(true)
      return
    }
    await deleteMetric.mutateAsync(editingRecord.id)
    resetForm()
  }

  const saving = createMetric.isPending || updateMetric.isPending

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/"
          className="p-2 -ml-2 text-slate-500 hover:text-slate-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h2 className="text-2xl font-bold text-slate-900">Metrics</h2>
      </div>

      {/* Add/Edit form */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        {showForm ? (
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900">
              {editingRecord ? 'Edit Entry' : metricLocked ? `Log ${formMetric}` : 'New Metric'}
            </h3>
            {!metricLocked && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Metric Name</label>
                <input
                  type="text"
                  value={formMetric}
                  onChange={(e) => setFormMetric(e.target.value)}
                  placeholder="e.g. Life Expectancy"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  autoFocus
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as MetricType)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="Number">Number</option>
                  <option value="Date">Date</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Value</label>
                {formType === 'Number' ? (
                  <input
                    type="number"
                    step="any"
                    value={formNumber}
                    onChange={(e) => setFormNumber(e.target.value)}
                    placeholder="e.g. 84.3"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                ) : (
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Source (optional)</label>
              <input
                type="url"
                value={formSource}
                onChange={(e) => setFormSource(e.target.value)}
                placeholder="Link to the model behind this value"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={resetForm}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-lg font-medium"
              >
                Cancel
              </button>
              {editingRecord && (
                <button
                  onClick={handleDelete}
                  disabled={deleteMetric.isPending}
                  className={`py-3 px-4 rounded-lg font-medium ${
                    deleteConfirming ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600'
                  }`}
                >
                  {deleteMetric.isPending ? '...' : deleteConfirming ? 'Confirm' : 'Delete'}
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={!formMetric.trim() || !valueValid || saving}
                className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={startNew}
            className="w-full py-3 bg-blue-50 text-blue-600 rounded-lg font-medium hover:bg-blue-100 transition-colors"
          >
            + New Metric
          </button>
        )}
      </div>

      {/* Built-in Totals tiles: show/hide */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-1">Home Tiles</h3>
        <p className="text-xs text-slate-400 mb-3">Built-in tiles on the Home Totals row</p>
        <div className="divide-y divide-slate-100">
          {BUILT_IN_TILE_NAMES.map((name) => {
            const shown = builtInShown(name)
            return (
              <div key={name} className="flex items-center justify-between py-2.5">
                <span className={`text-sm font-medium ${shown ? 'text-slate-900' : 'text-slate-400'}`}>
                  {name}
                </span>
                <button
                  onClick={() => toggleBuiltIn(name)}
                  disabled={configPending}
                  title={shown ? 'Shown on Home - tap to hide' : 'Hidden - tap to show'}
                  className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                    shown
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Metric groups */}
      {groups.map(({ name, records }) => {
        const latest = records[0]
        const pinned = configFor(name)?.showOnHome ?? false
        return (
          <div key={name} className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-1 gap-2">
              <h3 className="font-semibold text-slate-900 min-w-0 truncate">{name}</h3>
              <div className="flex items-center gap-1.5 shrink-0">
                {pinned && (
                  <>
                    <button
                      onClick={() => movePin(name, -1)}
                      disabled={configPending}
                      title="Move up on Home"
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 disabled:opacity-30 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => movePin(name, 1)}
                      disabled={configPending}
                      title="Move down on Home"
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 disabled:opacity-30 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </>
                )}
                <button
                  onClick={() => togglePin(name)}
                  disabled={configPending}
                  title={pinned ? 'Shown on Home - tap to remove' : 'Show on Home page'}
                  className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                    pinned
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </button>
                <button
                  onClick={() => startLogFor(name, latest)}
                  className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  Log value
                </button>
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mb-1">{formatValue(latest)}</p>
            <p className="text-xs text-slate-400 mb-3">
              recorded {formatRecorded(latest.createdTime)}
              {latest.source && (
                <>
                  {' · '}
                  <a
                    href={latest.source}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-500 hover:text-blue-700 underline"
                  >
                    source
                  </a>
                </>
              )}
            </p>
            {records.length > 1 && (
              <div className="border-t border-slate-100 pt-2 space-y-1">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">History</p>
                {records.slice(1).map((record) => (
                  <button
                    key={record.id}
                    onClick={() => startEdit(record)}
                    className="w-full flex items-center justify-between py-1.5 text-left hover:bg-slate-50 rounded px-1 transition-colors"
                  >
                    <span className="text-sm text-slate-700">{formatValue(record)}</span>
                    <span className="text-xs text-slate-400">{formatRecorded(record.createdTime)}</span>
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => startEdit(latest)}
              className="text-xs text-slate-400 hover:text-blue-600 transition-colors"
            >
              Edit latest
            </button>
          </div>
        )
      })}

      {(!metrics || metrics.length === 0) && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <p className="text-sm text-slate-400 text-center py-4">No metrics yet</p>
        </div>
      )}
    </div>
  )
}
