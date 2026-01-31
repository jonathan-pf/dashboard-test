import { useState } from 'react'
import { useSyncStore } from '@/stores/syncStore'
import { syncService } from '@/services/sync'
import { clearAllData } from '@/db'
import { useOfflineStatus } from '@/hooks/useOfflineStatus'
import { DebugLog } from '@/components/DebugLog'

export function Settings() {
  const { lastSyncTime, pendingCount, isSyncing, debugMode, toggleDebugMode, clearDebugLogs } = useSyncStore()
  const isOffline = useOfflineStatus()
  const [clearing, setClearing] = useState(false)

  const handleSync = async () => {
    if (debugMode) {
      clearDebugLogs()
    }
    try {
      await syncService.performFullSync()
    } catch (error) {
      console.error('Sync failed:', error)
    }
  }

  const handleClearCache = async () => {
    if (!confirm('Are you sure? This will delete all cached data.')) return

    setClearing(true)
    try {
      await clearAllData()
      window.location.reload()
    } catch (error) {
      console.error('Failed to clear cache:', error)
    } finally {
      setClearing(false)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Settings</h2>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 divide-y divide-slate-200">
        <div className="p-4">
          <h3 className="font-semibold text-slate-900 mb-1">Sync Status</h3>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`w-2 h-2 rounded-full ${
                isOffline
                  ? 'bg-amber-500'
                  : isSyncing
                  ? 'bg-blue-500 animate-pulse'
                  : 'bg-green-500'
              }`}
            />
            <span className="text-sm text-slate-600">
              {isOffline ? 'Offline' : isSyncing ? 'Syncing...' : 'Online'}
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Last synced:{' '}
            {lastSyncTime ? new Date(lastSyncTime).toLocaleString() : 'Never'}
          </p>
          {pendingCount > 0 && (
            <p className="text-sm text-amber-600 mt-1">
              {pendingCount} changes pending sync
            </p>
          )}
        </div>

        <div className="p-4">
          <button
            onClick={handleSync}
            disabled={isSyncing || isOffline}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSyncing ? 'Syncing...' : isOffline ? 'Offline' : 'Sync Now'}
          </button>
        </div>

        <div className="p-4">
          <button
            onClick={handleClearCache}
            disabled={clearing}
            className="w-full py-3 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
          >
            {clearing ? 'Clearing...' : 'Clear Cache'}
          </button>
          <p className="text-xs text-slate-500 mt-2 text-center">
            This will remove all cached data. You'll need to sync again.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-2">Storage Info</h3>
        <div className="space-y-2 text-sm text-slate-600">
          <div className="flex justify-between">
            <span>Pending mutations</span>
            <span className="font-medium">{pendingCount}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900">Debug Mode</h3>
            <p className="text-xs text-slate-500 mt-0.5">Show verbose sync logs</p>
          </div>
          <button
            onClick={toggleDebugMode}
            className={`relative w-12 h-7 rounded-full transition-colors ${
              debugMode ? 'bg-blue-600' : 'bg-slate-300'
            }`}
          >
            <span
              className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                debugMode ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {debugMode && (
        <div className="space-y-2">
          <h3 className="font-semibold text-slate-900">Sync Debug Log</h3>
          <DebugLog />
        </div>
      )}

      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-2">About</h3>
        <p className="text-sm text-slate-500">Airtable Dashboard PWA v1.23.0</p>
        <p className="text-xs text-slate-400 mt-1">
          Offline-first personal dashboard
        </p>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-2">Install App</h3>
        <p className="text-sm text-slate-500">
          On iPhone: Tap the share button, then "Add to Home Screen"
        </p>
        <p className="text-xs text-slate-400 mt-1">
          The app will work offline once installed
        </p>
      </div>
    </div>
  )
}
