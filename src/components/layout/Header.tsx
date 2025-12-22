import { useSyncStore } from '@/stores/syncStore'

export function Header() {
  const { isSyncing, lastSyncTime, pendingCount } = useSyncStore()

  const formatLastSync = () => {
    if (!lastSyncTime) return 'Never synced'
    const diff = Date.now() - lastSyncTime
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    return new Date(lastSyncTime).toLocaleDateString()
  }

  return (
    <header className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-10">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          {isSyncing && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              Syncing...
            </span>
          )}
          {pendingCount > 0 && (
            <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs">
              {pendingCount} pending
            </span>
          )}
          {!isSyncing && (
            <span>{formatLastSync()}</span>
          )}
        </div>
      </div>
    </header>
  )
}
