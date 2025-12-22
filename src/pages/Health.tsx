import { useState } from 'react'
import { StatCard } from '@/components/widgets/StatCard'
import { HealthTrendChart } from '@/components/charts/HealthTrendChart'
import {
  useHealthByType,
  useHealthTrends,
  useCreateHealth,
  useCurrentWeek,
} from '@/hooks/useAirtableData'
import type { LocalHealthRecord } from '@/types/airtable'

type HealthType = LocalHealthRecord['type']

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

  const currentWeek = useCurrentWeek()
  const glucoseData = useHealthByType('Glucose')
  const unitsData = useHealthByType('Units')
  const glucoseTrends = useHealthTrends('Glucose', 30)
  const unitsTrends = useHealthTrends('Units', 30)

  const createHealth = useCreateHealth()

  const today = new Date().toISOString().split('T')[0]
  const todayGlucose = glucoseData?.filter((h) => h.date === today) ?? []
  const todayUnits = unitsData?.filter((h) => h.date === today) ?? []

  const avgTodayGlucose =
    todayGlucose.length > 0
      ? todayGlucose.reduce((sum, h) => sum + h.value, 0) / todayGlucose.length
      : null

  const totalTodayUnits = todayUnits.reduce((sum, h) => sum + h.value, 0)

  const handleSubmit = async (type: HealthType) => {
    const value = parseFloat(entryValue)
    if (isNaN(value)) return

    await createHealth.mutateAsync({
      value,
      type,
      date: entryDate,
      weekId: currentWeek?.id ?? null,
    })

    setEntryValue('')
    setEntryDate(getToday())
    setActiveEntry(null)
  }

  const handleCancel = () => {
    setEntryValue('')
    setEntryDate(getToday())
    setActiveEntry(null)
  }

  const startEntry = (type: HealthType) => {
    // Default to yesterday for Glucose and Units, today for others
    const defaultDate = type === 'Glucose' || type === 'Units' ? getYesterday() : getToday()
    setEntryDate(defaultDate)
    setActiveEntry(type)
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Health</h2>

      <div className="grid grid-cols-2 gap-4">
        <StatCard
          label="Today's Glucose"
          value={avgTodayGlucose?.toFixed(1) ?? '--'}
          loading={!glucoseData}
        />
        <StatCard
          label="Today's Units"
          value={totalTodayUnits}
          loading={!unitsData}
        />
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
          </div>
        )}
      </div>

      {/* Recent entries */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-4">Recent Entries</h3>
        <div className="space-y-2">
          {(glucoseData?.slice(0, 5) ?? []).map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
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
                      : 'bg-purple-500'
                  }`}
                />
                <span className="text-sm text-slate-600">{entry.type}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-medium text-slate-900">{entry.value}</span>
                <span className="text-xs text-slate-400">
                  {new Date(entry.date).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
              </div>
            </div>
          ))}
          {(!glucoseData || glucoseData.length === 0) && (
            <p className="text-sm text-slate-400 text-center py-4">
              No entries yet
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
