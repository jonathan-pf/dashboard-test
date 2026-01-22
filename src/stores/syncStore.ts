import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface DebugLogEntry {
  timestamp: string
  message: string
  level: 'info' | 'warn' | 'error' | 'success'
}

interface SyncState {
  isSyncing: boolean
  lastSyncTime: number | null
  pendingCount: number
  error: string | null

  // Debug mode
  debugMode: boolean
  debugLogs: DebugLogEntry[]

  // Actions
  setSyncing: (syncing: boolean) => void
  setLastSyncTime: (time: number) => void
  setPendingCount: (count: number) => void
  setError: (error: string | null) => void
  incrementPending: () => void
  decrementPending: () => void

  // Debug actions
  toggleDebugMode: () => void
  addDebugLog: (message: string, level?: DebugLogEntry['level']) => void
  clearDebugLogs: () => void
}

// Helper to get formatted timestamp
function getTimestamp(): string {
  const now = new Date()
  return now.toTimeString().split(' ')[0] + '.' + now.getMilliseconds().toString().padStart(3, '0')
}

export const useSyncStore = create<SyncState>()(
  persist(
    (set) => ({
      isSyncing: false,
      lastSyncTime: null,
      pendingCount: 0,
      error: null,
      debugMode: false,
      debugLogs: [],

      setSyncing: (syncing) => set({ isSyncing: syncing }),
      setLastSyncTime: (time) => set({ lastSyncTime: time }),
      setPendingCount: (count) => set({ pendingCount: count }),
      setError: (error) => set({ error }),
      incrementPending: () => set((state) => ({ pendingCount: state.pendingCount + 1 })),
      decrementPending: () => set((state) => ({ pendingCount: Math.max(0, state.pendingCount - 1) })),

      toggleDebugMode: () => set((state) => ({ debugMode: !state.debugMode })),
      addDebugLog: (message, level = 'info') => set((state) => ({
        debugLogs: [...state.debugLogs, { timestamp: getTimestamp(), message, level }]
      })),
      clearDebugLogs: () => set({ debugLogs: [] }),
    }),
    {
      name: 'sync-storage',
      partialize: (state) => ({ lastSyncTime: state.lastSyncTime, debugMode: state.debugMode }),
    }
  )
)
