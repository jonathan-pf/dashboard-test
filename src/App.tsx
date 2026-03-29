import { Routes, Route } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Dashboard } from './pages/Dashboard'
import { Health } from './pages/Health'
import { Words } from './pages/Words'
import { Goals } from './pages/Goals'
import { MonthlyGoals } from './pages/MonthlyGoals'
import { AnnualGoals } from './pages/AnnualGoals'
import { NextWeekGoals } from './pages/NextWeekGoals'
import { NextMonthGoals } from './pages/NextMonthGoals'
import { Ideas } from './pages/Ideas'
import { Revelations } from './pages/Revelations'
import { Cruxes } from './pages/Cruxes'
import { Features } from './pages/Features'
import { Blog } from './pages/Blog'
import { Questions } from './pages/Questions'
import { Skills } from './pages/Skills'
import { Gen } from './pages/Gen'
import { Model } from './pages/Model'
import { Agenda } from './pages/Agenda'
import { Events } from './pages/Events'
import { Leisure } from './pages/Leisure'
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
          <Route path="/goals/this-month" element={<MonthlyGoals />} />
          <Route path="/goals/this-year" element={<AnnualGoals />} />
          <Route path="/goals/next-week" element={<NextWeekGoals />} />
          <Route path="/goals/next-month" element={<NextMonthGoals />} />
          <Route path="/ideas" element={<Ideas />} />
          <Route path="/ideas/revelations" element={<Revelations />} />
          <Route path="/ideas/cruxes" element={<Cruxes />} />
          <Route path="/ideas/features" element={<Features />} />
          <Route path="/ideas/blog" element={<Blog />} />
          <Route path="/ideas/questions" element={<Questions />} />
          <Route path="/ideas/skills" element={<Skills />} />
          <Route path="/ideas/gen" element={<Gen />} />
          <Route path="/ideas/model" element={<Model />} />
          <Route path="/ideas/agenda" element={<Agenda />} />
          <Route path="/events" element={<Events />} />
          <Route path="/leisure" element={<Leisure />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </AppShell>
    </ErrorBoundary>
  )
}

export default App
