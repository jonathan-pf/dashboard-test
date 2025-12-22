import { ReactNode } from 'react'
import { Header } from './Header'
import { BottomNav } from './BottomNav'
import { OfflineBanner } from './OfflineBanner'

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <OfflineBanner />
      <Header />
      <main className="flex-1 overflow-auto pb-20 px-4 py-4">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
