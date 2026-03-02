import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { IdeasLayout } from './components/layout/IdeasLayout'
import { GoalsLayout } from './components/layout/GoalsLayout'
import { ErrorBoundary } from './components/ErrorBoundary'

// Lazy-loaded page components
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })))
const Health = lazy(() => import('./pages/Health').then((m) => ({ default: m.Health })))
const Rules = lazy(() => import('./pages/Rules').then((m) => ({ default: m.Rules })))
const Words = lazy(() => import('./pages/Words').then((m) => ({ default: m.Words })))
const Events = lazy(() => import('./pages/Events').then((m) => ({ default: m.Events })))
const Leisure = lazy(() => import('./pages/Leisure').then((m) => ({ default: m.Leisure })))
const Settings = lazy(() => import('./pages/Settings').then((m) => ({ default: m.Settings })))

// Ideas sub-pages
const Ideas = lazy(() => import('./pages/Ideas').then((m) => ({ default: m.Ideas })))
const Revelations = lazy(() => import('./pages/Revelations').then((m) => ({ default: m.Revelations })))
const Cruxes = lazy(() => import('./pages/Cruxes').then((m) => ({ default: m.Cruxes })))
const Features = lazy(() => import('./pages/Features').then((m) => ({ default: m.Features })))
const Blog = lazy(() => import('./pages/Blog').then((m) => ({ default: m.Blog })))
const Questions = lazy(() => import('./pages/Questions').then((m) => ({ default: m.Questions })))
const Skills = lazy(() => import('./pages/Skills').then((m) => ({ default: m.Skills })))

// Goals sub-pages
const Goals = lazy(() => import('./pages/Goals').then((m) => ({ default: m.Goals })))
const NextWeekGoals = lazy(() => import('./pages/NextWeekGoals').then((m) => ({ default: m.NextWeekGoals })))
const NextMonthGoals = lazy(() => import('./pages/NextMonthGoals').then((m) => ({ default: m.NextMonthGoals })))
const LongTermGoals = lazy(() => import('./pages/LongTermGoals').then((m) => ({ default: m.LongTermGoals })))

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <AppShell>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/health" element={<Health />} />
            <Route path="/health/rules" element={<Rules />} />

            {/* Ideas — nested under layout with tab nav */}
            <Route path="/ideas" element={<IdeasLayout />}>
              <Route index element={<Ideas />} />
              <Route path="revelations" element={<Revelations />} />
              <Route path="cruxes" element={<Cruxes />} />
              <Route path="features" element={<Features />} />
              <Route path="blog" element={<Blog />} />
              <Route path="questions" element={<Questions />} />
              <Route path="skills" element={<Skills />} />
            </Route>

            {/* Goals — nested under layout with tab nav */}
            <Route path="/goals" element={<GoalsLayout />}>
              <Route index element={<Goals />} />
              <Route path="next-week" element={<NextWeekGoals />} />
              <Route path="next-month" element={<NextMonthGoals />} />
              <Route path="long-term" element={<LongTermGoals />} />
            </Route>

            <Route path="/words" element={<Words />} />
            <Route path="/events" element={<Events />} />
            <Route path="/leisure" element={<Leisure />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Suspense>
      </AppShell>
    </ErrorBoundary>
  )
}

export default App
