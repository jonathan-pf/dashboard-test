interface CompactStatCardProps {
  label: string
  value: string | number
  loading?: boolean
  goal?: number
  goalDirection?: 'under' | 'over'
}

export function CompactStatCard({ label, value, loading, goal, goalDirection }: CompactStatCardProps) {
  const numericValue = typeof value === 'string' ? parseFloat(value) : value
  const goalMet = goal !== undefined && goalDirection !== undefined
    ? goalDirection === 'under'
      ? numericValue <= goal
      : numericValue >= goal
    : undefined

  return (
    <div className="bg-slate-50 rounded-lg px-3 py-2">
      <p className="text-xs text-slate-500 truncate">{label}</p>
      {loading ? (
        <div className="h-6 w-12 bg-slate-200 animate-pulse rounded mt-0.5" />
      ) : (
        <div className="flex items-baseline gap-1">
          <p className={`text-lg font-semibold ${
            goalMet === undefined
              ? 'text-slate-900'
              : goalMet
              ? 'text-green-600'
              : 'text-red-600'
          }`}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {goal !== undefined && goalDirection !== undefined && (
            <span className="text-xs text-slate-400">
              ({goalDirection === 'under' ? '<' : '>'}{goal})
            </span>
          )}
        </div>
      )}
    </div>
  )
}
