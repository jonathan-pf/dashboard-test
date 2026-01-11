import { Link } from 'react-router-dom'
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
        <div className="flex items-center gap-3 text-sm text-slate-500">
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
          <Link
            to="/settings"
            className="p-1.5 text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </Link>
        </div>
      </div>
    </header>
  )
}
