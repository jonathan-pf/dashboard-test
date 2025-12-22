interface StatCardProps {
  label: string
  value: string | number
  suffix?: string
  trend?: 'up' | 'down' | 'neutral'
  loading?: boolean
}

export function StatCard({ label, value, suffix, trend, loading }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
      <p className="text-sm text-slate-500">{label}</p>
      <div className="flex items-baseline gap-1">
        {loading ? (
          <div className="h-9 w-16 bg-slate-200 animate-pulse rounded" />
        ) : (
          <>
            <p className="text-3xl font-bold text-slate-900">
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
    </div>
  )
}
