import { useState } from 'react'
import { useSyncStore, type DebugLogEntry } from '@/stores/syncStore'

function LogEntry({ entry }: { entry: DebugLogEntry }) {
  const levelColors = {
    info: 'text-slate-600',
    warn: 'text-amber-600',
    error: 'text-red-600',
    success: 'text-green-600',
  }

  const levelIcons = {
    info: '',
    warn: ' \u26A0\uFE0F',
    error: ' \u274C',
    success: ' \u2705',
  }

  return (
    <div className={`font-mono text-xs ${levelColors[entry.level]}`}>
      <span className="text-slate-400">[{entry.timestamp}]</span>{' '}
      {entry.message}
      {levelIcons[entry.level]}
    </div>
  )
}

export function DebugLog() {
  const { debugLogs, clearDebugLogs } = useSyncStore()
  const [copied, setCopied] = useState(false)

  const formatLogsForCopy = () => {
    const header = [
      '=== SYNC DEBUG LOG ===',
      `App Version: v1.9.5`,
      `Exported: ${new Date().toISOString()}`,
      `User Agent: ${navigator.userAgent}`,
      `Online: ${navigator.onLine}`,
      '',
      '--- LOG ENTRIES ---',
      '',
    ].join('\n')

    const logLines = debugLogs.map((entry) => {
      const levelMarker = entry.level === 'warn' ? ' [WARN]' :
                          entry.level === 'error' ? ' [ERROR]' :
                          entry.level === 'success' ? ' [OK]' : ''
      return `[${entry.timestamp}]${levelMarker} ${entry.message}`
    }).join('\n')

    return header + logLines
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formatLogsForCopy())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy logs:', err)
    }
  }

  if (debugLogs.length === 0) {
    return (
      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
        <p className="text-sm text-slate-500 text-center">
          No debug logs yet. Tap "Sync Now" to generate logs.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-slate-900 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-slate-800">
        <span className="text-xs font-medium text-slate-300">
          Debug Log ({debugLogs.length} entries)
        </span>
        <div className="flex gap-2">
          <button
            onClick={clearDebugLogs}
            className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1"
          >
            Clear
          </button>
          <button
            onClick={handleCopy}
            className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
          >
            {copied ? 'Copied!' : 'Copy Logs'}
          </button>
        </div>
      </div>
      <div className="p-3 max-h-64 overflow-y-auto space-y-0.5 bg-slate-950">
        {debugLogs.map((entry, index) => (
          <LogEntry key={index} entry={entry} />
        ))}
      </div>
    </div>
  )
}
