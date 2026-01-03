import { Routes, Route } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Dashboard } from './pages/Dashboard'
import { Health } from './pages/Health'
import { Words } from './pages/Words'
import { Goals } from './pages/Goals'
import { LongTermGoals } from './pages/LongTermGoals'
import { Ideas } from './pages/Ideas'
import { Rules } from './pages/Rules'
import { Settings } from './pages/Settings'

function App() {
  return (
    <ErrorBoundary>
      <AppShell>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/health" element={<Health />} />
          <Route path="/health/rules" element={<Rules />} />
          <Route path="/words" element={<Words />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/goals/long-term" element={<LongTermGoals />} />
          <Route path="/ideas" element={<Ideas />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </AppShell>
    </ErrorBoundary>
  )
}

export default App
