import { NavLink, Outlet } from 'react-router-dom'

const tabs = [
  { path: '/ideas', label: 'Overview', end: true },
  { path: '/ideas/revelations', label: 'Revelations' },
  { path: '/ideas/cruxes', label: 'Cruxes' },
  { path: '/ideas/features', label: 'Features' },
  { path: '/ideas/blog', label: 'Blog' },
  { path: '/ideas/questions', label: 'Questions' },
  { path: '/ideas/skills', label: 'Skills' },
]

export function IdeasLayout() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-slate-900">Ideas</h2>
      <nav className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {tabs.map(({ path, label, end }) => (
          <NavLink
            key={path}
            to={path}
            end={end}
            className={({ isActive }) =>
              `whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex-shrink-0 ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  )
}
