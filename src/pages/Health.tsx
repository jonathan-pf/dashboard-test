import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { HealthTrendChart } from '@/components/charts/HealthTrendChart'
import {
  useHealthByType,
  useHealthTrends,
  useCreateHealth,
  useUpdateHealth,
  useCurrentWeek,
} from '@/hooks/useAirtableData'
import type { LocalHealthRecord } from '@/types/airtable'

type HealthType = LocalHealthRecord['type']
type UnitsType = LocalHealthRecord['unitsType']

const getToday = () => new Date().toISOString().split('T')[0]
const getYesterday = () => {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

export function Health() {
  const [activeEntry, setActiveEntry] = useState<HealthType | null>(null)
  const [entryValue, setEntryValue] = useState('')
  const [entryDate, setEntryDate] = useState(getToday)
  const [entryUnitsType, setEntryUnitsType] = useState<UnitsType>(null)
  const [editingEntry, setEditingEntry] = useState<LocalHealthRecord | null>(null)

  const currentWeek = useCurrentWeek()
  const glucoseData = useHealthByType('Glucose')
  const unitsData = useHealthByType('Units')
  const repsData = useHealthByType('Reps')
  const tidyData = useHealthByType('Tidy')
  const weightData = useHealthByType('Weight')
  const frogsData = useHealthByType('Frog')
  const treatsData = useHealthByType('Treat')
  const glucoseTrends = useHealthTrends('Glucose', 30)
  const unitsTrends = useHealthTrends('Units', 30)
  const repsTrends = useHealthTrends('Reps', 30)
  const tidyTrends = useHealthTrends('Tidy', 30)
  const weightTrends = useHealthTrends('Weight', 30)
  const frogsTrends = useHealthTrends('Frog', 30)
  const treatsTrends = useHealthTrends('Treat', 30)

  // Combine all health entries and sort by date (most recent first)
  const recentEntries = [
    ...(glucoseData ?? []),
    ...(unitsData ?? []),
    ...(repsData ?? []),
    ...(tidyData ?? []),
    ...(weightData ?? []),
    ...(frogsData ?? []),
    ...(treatsData ?? []),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)

  const createHealth = useCreateHealth()
  const updateHealth = useUpdateHealth()

  const { theoryTotal, socialTotal } = useMemo(() => {
    if (!unitsData) return { theoryTotal: 0, socialTotal: 0 }
    return unitsData
      .filter((e) => e.date >= '2026-01-01' && e.date < '2027-01-01')
      .reduce(
        (acc, e) => {
          if (e.unitsType === 'Theory') acc.theoryTotal += e.value
          else if (e.unitsType === 'Social') acc.socialTotal += e.value
          return acc
        },
        { theoryTotal: 0, socialTotal: 0 }
      )
  }, [unitsData])

  const today = new Date().toISOString().split('T')[0]

  const handleSubmit = async (type: HealthType) => {
    const value = parseFloat(entryValue)
    if (isNaN(value)) return

    await createHealth.mutateAsync({
      value,
      type,
      date: entryDate,
      weekId: currentWeek?.id ?? null,
      unitsType: type === 'Units' ? entryUnitsType : null,
    })

    setEntryValue('')
    setEntryDate(getToday())
    setEntryUnitsType(null)
    setActiveEntry(null)
  }

  const handleCancel = () => {
    setEntryValue('')
    setEntryDate(getToday())
    setEntryUnitsType(null)
    setActiveEntry(null)
    setEditingEntry(null)
  }

  const startEntry = (type: HealthType) => {
    // Default to yesterday for Glucose and Units, today for others
    const defaultDate = type === 'Glucose' || type === 'Units' ? getYesterday() : getToday()
    setEntryDate(defaultDate)
    setEntryUnitsType(null)
    setActiveEntry(type)
    setEditingEntry(null)
  }

  const startEdit = (entry: LocalHealthRecord) => {
    setEditingEntry(entry)
    setActiveEntry(null)
  }

  const handleUpdateUnitsType = async (entry: LocalHealthRecord, unitsType: UnitsType) => {
    await updateHealth.mutateAsync({
      healthId: entry.id,
      updates: { unitsType },
    })
    if (editingEntry?.id === entry.id) {
      setEditingEntry(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Health</h2>
        <Link
          to="/health/rules"
          className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
        >
          Rules
        </Link>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-4">Quick Entry</h3>

        {activeEntry ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Date
              </label>
              <input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                max={today}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {activeEntry} Value
              </label>
              <input
                type="number"
                step="0.1"
                value={entryValue}
                onChange={(e) => setEntryValue(e.target.value)}
                placeholder={`Enter ${activeEntry.toLowerCase()} value`}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                autoFocus
              />
            </div>
            {activeEntry === 'Units' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Units Type
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEntryUnitsType('Theory')}
                    className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                      entryUnitsType === 'Theory'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                    }`}
                  >
                    Theory
                  </button>
                  <button
                    onClick={() => setEntryUnitsType('Social')}
                    className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                      entryUnitsType === 'Social'
                        ? 'bg-sky-600 text-white'
                        : 'bg-sky-50 text-sky-600 hover:bg-sky-100'
                    }`}
                  >
                    Social
                  </button>
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSubmit(activeEntry)}
                disabled={!entryValue || createHealth.isPending}
                className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50"
              >
                {createHealth.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <button
              onClick={() => startEntry('Glucose')}
              className="w-full py-3 bg-amber-50 text-amber-600 rounded-lg font-medium hover:bg-amber-100 transition-colors"
            >
              + Log Glucose
            </button>
            <button
              onClick={() => startEntry('Units')}
              className="w-full py-3 bg-blue-50 text-blue-600 rounded-lg font-medium hover:bg-blue-100 transition-colors"
            >
              + Log Units
            </button>
            <button
              onClick={() => startEntry('Reps')}
              className="w-full py-3 bg-green-50 text-green-600 rounded-lg font-medium hover:bg-green-100 transition-colors"
            >
              + Log Reps
            </button>
            <button
              onClick={() => startEntry('Willpoint')}
              className="w-full py-3 bg-purple-50 text-purple-600 rounded-lg font-medium hover:bg-purple-100 transition-colors"
            >
              + Log Willpoint
            </button>
            <button
              onClick={() => startEntry('Tidy')}
              className="w-full py-3 bg-pink-50 text-pink-600 rounded-lg font-medium hover:bg-pink-100 transition-colors"
            >
              + Log Tidy
            </button>
            <button
              onClick={() => startEntry('Weight')}
              className="w-full py-3 bg-indigo-50 text-indigo-600 rounded-lg font-medium hover:bg-indigo-100 transition-colors"
            >
              + Log Weight
            </button>
            <button
              onClick={() => startEntry('Frog')}
              className="w-full py-3 bg-teal-50 text-teal-600 rounded-lg font-medium hover:bg-teal-100 transition-colors"
            >
              + Log Frog
            </button>
            <button
              onClick={() => startEntry('Treat')}
              className="w-full py-3 bg-rose-50 text-rose-600 rounded-lg font-medium hover:bg-rose-100 transition-colors"
            >
              + Log Treat
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <p className="text-sm text-slate-500 mb-1">Theory Units (2026)</p>
          <p className="text-2xl font-bold text-indigo-600">{theoryTotal.toFixed(1)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <p className="text-sm text-slate-500 mb-1">Social Units (2026)</p>
          <p className="text-2xl font-bold text-sky-600">{socialTotal.toFixed(1)}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-4">Glucose Trend (30 days)</h3>
        <HealthTrendChart
          data={glucoseTrends}
          type="Glucose"
          loading={!glucoseTrends}
        />
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-4">Units Trend (30 days)</h3>
        <HealthTrendChart
          data={unitsTrends}
          type="Units"
          loading={!unitsTrends}
        />
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-4">Reps Trend (30 days)</h3>
        <HealthTrendChart
          data={repsTrends}
          type="Reps"
          loading={!repsTrends}
        />
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-4">Tidy Trend (30 days)</h3>
        <HealthTrendChart
          data={tidyTrends}
          type="Tidy"
          loading={!tidyTrends}
        />
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-4">Weight Trend (30 days)</h3>
        <HealthTrendChart
          data={weightTrends}
          type="Weight"
          loading={!weightTrends}
        />
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-4">Frog Trend (30 days)</h3>
        <HealthTrendChart
          data={frogsTrends}
          type="Frog"
          loading={!frogsTrends}
        />
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-4">Treat Trend (30 days)</h3>
        <HealthTrendChart
          data={treatsTrends}
          type="Treat"
          loading={!treatsTrends}
        />
      </div>

      {/* Recent entries */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-4">Recent Entries</h3>
        <div className="space-y-2">
          {recentEntries.map((entry) => (
            <div key={entry.id}>
              <div
                className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0 cursor-pointer"
                onClick={() => entry.type === 'Units' ? startEdit(entry) : undefined}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      entry.type === 'Glucose'
                        ? 'bg-amber-500'
                        : entry.type === 'Units'
                        ? 'bg-blue-500'
                        : entry.type === 'Reps'
                        ? 'bg-green-500'
                        : entry.type === 'Tidy'
                        ? 'bg-pink-500'
                        : entry.type === 'Weight'
                        ? 'bg-indigo-500'
                        : entry.type === 'Frog'
                        ? 'bg-teal-500'
                        : entry.type === 'Treat'
                        ? 'bg-rose-500'
                        : 'bg-purple-500'
                    }`}
                  />
                  <span className="text-sm text-slate-600">{entry.type}</span>
                  {entry.type === 'Units' && entry.unitsType && (
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded ${
                        entry.unitsType === 'Theory'
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-sky-100 text-sky-700'
                      }`}
                    >
                      {entry.unitsType}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium text-slate-900">{entry.value}</span>
                  <span className="text-xs text-slate-400">
                    {new Date(entry.date).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                  {entry.type === 'Units' && (
                    <span className="text-xs text-slate-300">
                      {editingEntry?.id === entry.id ? '...' : '>'}
                    </span>
                  )}
                </div>
              </div>
              {editingEntry?.id === entry.id && entry.type === 'Units' && (
                <div className="py-2 px-2 bg-slate-50 rounded-lg mt-1 mb-1">
                  <p className="text-xs text-slate-500 mb-2">Set Units Type:</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdateUnitsType(entry, 'Theory')}
                      disabled={updateHealth.isPending}
                      className={`flex-1 py-2 rounded-lg font-medium text-sm transition-colors ${
                        entry.unitsType === 'Theory'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                      }`}
                    >
                      Theory
                    </button>
                    <button
                      onClick={() => handleUpdateUnitsType(entry, 'Social')}
                      disabled={updateHealth.isPending}
                      className={`flex-1 py-2 rounded-lg font-medium text-sm transition-colors ${
                        entry.unitsType === 'Social'
                          ? 'bg-sky-600 text-white'
                          : 'bg-sky-50 text-sky-600 hover:bg-sky-100'
                      }`}
                    >
                      Social
                    </button>
                    {entry.unitsType && (
                      <button
                        onClick={() => handleUpdateUnitsType(entry, null)}
                        disabled={updateHealth.isPending}
                        className="py-2 px-3 rounded-lg font-medium text-sm bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
          {recentEntries.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">
              No entries yet
            </p>
          )}
        </div>
      </div>

      {/* Units entries for bulk editing */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-4">Units History</h3>
        <p className="text-xs text-slate-500 mb-3">Tap an entry to set its type</p>
        <div className="space-y-1">
          {(unitsData ?? []).slice(0, 20).map((entry) => (
            <div key={entry.id}>
              <div
                className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                onClick={() => setEditingEntry(editingEntry?.id === entry.id ? null : entry)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-900">{entry.value}</span>
                  <span className="text-xs text-slate-400">
                    {new Date(entry.date).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {entry.unitsType ? (
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        entry.unitsType === 'Theory'
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-sky-100 text-sky-700'
                      }`}
                    >
                      {entry.unitsType}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-300">No type</span>
                  )}
                  <span className="text-xs text-slate-300">
                    {editingEntry?.id === entry.id ? 'v' : '>'}
                  </span>
                </div>
              </div>
              {editingEntry?.id === entry.id && (
                <div className="py-2 px-2 bg-slate-50 rounded-lg mt-1 mb-1">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdateUnitsType(entry, 'Theory')}
                      disabled={updateHealth.isPending}
                      className={`flex-1 py-2 rounded-lg font-medium text-sm transition-colors ${
                        entry.unitsType === 'Theory'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                      }`}
                    >
                      Theory
                    </button>
                    <button
                      onClick={() => handleUpdateUnitsType(entry, 'Social')}
                      disabled={updateHealth.isPending}
                      className={`flex-1 py-2 rounded-lg font-medium text-sm transition-colors ${
                        entry.unitsType === 'Social'
                          ? 'bg-sky-600 text-white'
                          : 'bg-sky-50 text-sky-600 hover:bg-sky-100'
                      }`}
                    >
                      Social
                    </button>
                    {entry.unitsType && (
                      <button
                        onClick={() => handleUpdateUnitsType(entry, null)}
                        disabled={updateHealth.isPending}
                        className="py-2 px-3 rounded-lg font-medium text-sm bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
          {(unitsData ?? []).length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">
              No units entries yet
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
