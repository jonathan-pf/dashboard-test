import { useOfflineStatus } from '@/hooks/useOfflineStatus'

export function OfflineBanner() {
  const isOffline = useOfflineStatus()

  if (!isOffline) return null

  return (
    <div className="bg-amber-500 text-white text-center py-2 px-4 text-sm font-medium">
      You're offline. Changes will sync when you're back online.
    </div>
  )
}
