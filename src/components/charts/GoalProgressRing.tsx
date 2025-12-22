interface GoalProgressRingProps {
  completed: number
  total: number
  size?: number
  strokeWidth?: number
}

export function GoalProgressRing({
  completed,
  total,
  size = 120,
  strokeWidth = 10,
}: GoalProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const percent = total > 0 ? (completed / total) * 100 : 0
  const offset = circumference - (percent / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={percent >= 100 ? '#10b981' : percent >= 50 ? '#3b82f6' : '#f59e0b'}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-slate-900">
          {completed}/{total}
        </span>
        <span className="text-xs text-slate-500">goals</span>
      </div>
    </div>
  )
}
