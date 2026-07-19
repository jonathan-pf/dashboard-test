import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  useHabitNames,
  useHabitLogs,
  useCreateHabitLog,
  useUpdateHabitLog,
  useDeleteHabitLog,
} from '@/hooks/useAirtableData'
import type { LocalHabitLogRecord } from '@/types/airtable'

const getToday = () => new Date().toISOString().split('T')[0]

// Whole days between a YYYY-MM-DD date and today (0 = today)
const daysSince = (dateStr: string) => {
  const ms = new Date(getToday()).getTime() - new Date(dateStr.slice(0, 10)).getTime()
  return Math.max(0, Math.round(ms / 86400000))
}

const lastDoneLabel = (dateStr: string | null) => {
  if (!dateStr) return 'Never'
  const days = daysSince(dateStr)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
}

export function Habits() {
  const [newHabitName, setNewHabitName] = useState('')
  const [showAddHabit, setShowAddHabit] = useState(false)
  const [editingLogId, setEditingLogId] = useState<string | null>(null)
  const [editDate, setEditDate] = useState('')

  const habitNames = useHabitNames()
  const logs = useHabitLogs()
  const createLog = useCreateHabitLog()
  const updateLog = useUpdateHabitLog()
  const deleteLog = useDeleteHabitLog()

  const today = getToday()

  // Per-habit stats from the log
  const stats = useMemo(() => {
    const map = new Map<string, { lastDate: string | null; count7: number; count30: number; todayCount: number }>()
    for (const name of habitNames ?? []) {
      map.set(name, { lastDate: null, count7: 0, count30: 0, todayCount: 0 })
    }
    const cutoff7 = new Date()
    cutoff7.setDate(cutoff7.getDate() - 7)
    const cutoff7Str = cutoff7.toISOString().split('T')[0]
    const cutoff30 = new Date()
    cutoff30.setDate(cutoff30.getDate() - 30)
    const cutoff30Str = cutoff30.toISOString().split('T')[0]

    for (const log of logs ?? []) {
      const entry = map.get(log.habit)
      if (!entry) continue
      if (!entry.lastDate || log.date > entry.lastDate) entry.lastDate = log.date
      if (log.date >= cutoff7Str) entry.count7++
      if (log.date >= cutoff30Str) entry.count30++
      if (log.date.slice(0, 10) === today) entry.todayCount++
    }
    return map
  }, [habitNames, logs, today])

  // Every tap logs another occurrence; remove mistakes via the Recent Log list
  const handleDone = async (habit: string) => {
    await createLog.mutateAsync({
      name: `${habit} - ${today}`,
      habit,
      date: today,
    })
  }

  const startEditDate = (log: LocalHabitLogRecord) => {
    setEditingLogId(log.id)
    setEditDate(log.date.slice(0, 10))
  }

  const handleSaveDate = async (log: LocalHabitLogRecord) => {
    if (!editDate) return
    await updateLog.mutateAsync({
      habitLogId: log.id,
      updates: {
        date: editDate,
        name: `${log.habit} - ${editDate}`,
      },
    })
    setEditingLogId(null)
    setEditDate('')
  }

  const handleAddHabit = async () => {
    const habit = newHabitName.trim()
    if (!habit) return
    // A new habit starts life with its first log (today)
    await createLog.mutateAsync({
      name: `${habit} - ${today}`,
      habit,
      date: today,
    })
    setNewHabitName('')
    setShowAddHabit(false)
  }

  const recentLogs = (logs ?? []).slice(0, 10)

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/health"
          className="p-2 -ml-2 text-slate-500 hover:text-slate-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h2 className="text-2xl font-bold text-slate-900">Habits</h2>
      </div>

      {/* Habit list with one-tap logging */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 gap-y-1 items-center mb-1">
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wide">Habit</div>
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wide text-center w-16">Last</div>
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wide text-center w-8">7d</div>
          <div className="w-20" />
        </div>
        <div className="divide-y divide-slate-100">
          {(habitNames ?? []).map((habit) => {
            const s = stats.get(habit)
            const todayCount = s?.todayCount ?? 0
            const doneToday = todayCount > 0
            const stale = s?.lastDate ? daysSince(s.lastDate) >= 7 : true
            return (
              <div key={habit} className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 items-center py-2.5">
                <p className="text-sm font-medium text-slate-900 min-w-0 truncate">{habit}</p>
                <p className={`text-xs text-center w-16 ${stale ? 'text-red-500 font-medium' : 'text-slate-500'}`}>
                  {lastDoneLabel(s?.lastDate ?? null)}
                </p>
                <p className={`text-sm text-center w-8 font-semibold ${(s?.count7 ?? 0) > 0 ? 'text-slate-900' : 'text-slate-300'}`}>
                  {s?.count7 ?? 0}
                </p>
                <button
                  onClick={() => handleDone(habit)}
                  disabled={createLog.isPending || deleteLog.isPending}
                  className={`w-20 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                    doneToday
                      ? 'bg-green-500 text-white hover:bg-green-600'
                      : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                  }`}
                  title={doneToday ? 'Logged today - tap to log again' : 'Log for today'}
                >
                  {doneToday ? (todayCount > 1 ? `✓ ×${todayCount}` : '✓ Today') : 'Done'}
                </button>
              </div>
            )
          })}
          {(!habitNames || habitNames.length === 0) && (
            <p className="text-sm text-slate-400 text-center py-4">No habits yet</p>
          )}
        </div>

        {/* Add habit */}
        {showAddHabit ? (
          <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
            <input
              type="text"
              value={newHabitName}
              onChange={(e) => setNewHabitName(e.target.value)}
              placeholder="New habit name"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              autoFocus
            />
            <p className="text-xs text-slate-400">
              Adding a habit logs its first completion for today.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setNewHabitName(''); setShowAddHabit(false) }}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAddHabit}
                disabled={!newHabitName.trim() || createLog.isPending}
                className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50"
              >
                {createLog.isPending ? 'Adding...' : 'Add & Log'}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddHabit(true)}
            className="w-full mt-4 py-3 bg-slate-50 text-slate-600 rounded-lg font-medium hover:bg-slate-100 transition-colors"
          >
            + New Habit
          </button>
        )}
      </div>

      {/* Recent log with undo */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-4">Recent Log</h3>
        <div className="space-y-1">
          {recentLogs.map((log: LocalHabitLogRecord) => (
            <div key={log.id} className="border-b border-slate-100 last:border-0">
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                  <span className="text-sm text-slate-900 truncate">{log.habit}</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => editingLogId === log.id ? setEditingLogId(null) : startEditDate(log)}
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
              {editingLogId === log.id && (
                <div className="flex items-center gap-2 pb-2 pl-4">
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
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
                    onClick={() => handleSaveDate(log)}
                    disabled={!editDate || updateLog.isPending}
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
    </div>
  )
}
