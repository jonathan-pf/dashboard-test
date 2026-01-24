interface StatCardProps {
  label: string
  value: string | number
  suffix?: string
  trend?: 'up' | 'down' | 'neutral'
  loading?: boolean
  goal?: number
  goalDirection?: 'under' | 'over'
}

export function StatCard({ label, value, suffix, trend, loading, goal, goalDirection }: StatCardProps) {
  // Determine if goal is met
  const numericValue = typeof value === 'string' ? parseFloat(value) : value
  const goalMet = goal !== undefined && goalDirection !== undefined
    ? goalDirection === 'under'
      ? numericValue <= goal
      : numericValue >= goal
    : undefined

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
      <p className="text-sm text-slate-500">{label}</p>
      <div className="flex items-baseline gap-1">
        {loading ? (
          <div className="h-9 w-16 bg-slate-200 animate-pulse rounded" />
        ) : (
          <>
            <p className={`text-3xl font-bold ${
              goalMet === undefined
                ? 'text-slate-900'
                : goalMet
                ? 'text-green-600'
                : 'text-red-600'
            }`}>
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            {suffix && <span className="text-sm text-slate-500">{suffix}</span>}
          </>
        )}
        {trend && !loading && (
          <span
            className={`ml-2 text-sm ${
              trend === 'up'
                ? 'text-green-600'
                : trend === 'down'
                ? 'text-red-600'
                : 'text-slate-400'
            }`}
          >
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
          </span>
        )}
      </div>
      {goal !== undefined && goalDirection !== undefined && !loading && (
        <p className="text-xs text-slate-400 mt-1">
          Goal: {goalDirection === 'under' ? '<' : '>'}{goal}
        </p>
      )}
    </div>
  )
}
