import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SyncState {
  isSyncing: boolean
  lastSyncTime: number | null
  pendingCount: number
  error: string | null

  // Actions
  setSyncing: (syncing: boolean) => void
  setLastSyncTime: (time: number) => void
  setPendingCount: (count: number) => void
  setError: (error: string | null) => void
  incrementPending: () => void
  decrementPending: () => void
}

export const useSyncStore = create<SyncState>()(
  persist(
    (set) => ({
      isSyncing: false,
      lastSyncTime: null,
      pendingCount: 0,
      error: null,

      setSyncing: (syncing) => set({ isSyncing: syncing }),
      setLastSyncTime: (time) => set({ lastSyncTime: time }),
      setPendingCount: (count) => set({ pendingCount: count }),
      setError: (error) => set({ error }),
      incrementPending: () => set((state) => ({ pendingCount: state.pendingCount + 1 })),
      decrementPending: () => set((state) => ({ pendingCount: Math.max(0, state.pendingCount - 1) })),
    }),
    {
      name: 'sync-storage',
      partialize: (state) => ({ lastSyncTime: state.lastSyncTime }),
    }
  )
)
