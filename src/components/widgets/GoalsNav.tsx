import { NavLink } from 'react-router-dom'

const GOAL_VIEWS = [
  { to: '/goals', label: 'This Week' },
  { to: '/goals/next-week', label: 'Next Week' },
  { to: '/goals/this-month', label: 'This Month' },
  { to: '/goals/next-month', label: 'Next Month' },
  { to: '/goals/this-quarter', label: 'This Quarter' },
  { to: '/goals/next-quarter', label: 'Next Quarter' },
  { to: '/goals/this-year', label: 'This Year' },
]

// Shared strip of links between the goal views so every page can jump
// straight to any other without going back through the main Goals page.
export function GoalsNav() {
  return (
    <nav
      aria-label="Goal views"
      className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {GOAL_VIEWS.map((view) => (
        <NavLink
          key={view.to}
          to={view.to}
          end
          className={({ isActive }) =>
            `flex-shrink-0 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              isActive
                ? 'bg-blue-600 text-white'
                : 'text-blue-600 bg-blue-50 hover:bg-blue-100'
            }`
          }
        >
          {view.label}
        </NavLink>
      ))}
    </nav>
  )
}
