interface GoalProgressRingProps {
  completed: number
  total: number
  failed?: number
  size?: number
  strokeWidth?: number
}

export function GoalProgressRing({
  completed,
  total,
  failed = 0,
  size = 120,
  strokeWidth = 10,
}: GoalProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI

  // Calculate percentages
  const completedPercent = total > 0 ? (completed / total) * 100 : 0
  const failedPercent = total > 0 ? (failed / total) * 100 : 0

  // Calculate stroke dash offsets
  // Completed arc starts at the top (0 degrees)
  const completedOffset = circumference - (completedPercent / 100) * circumference
  // Failed arc starts where completed ends
  const failedOffset = circumference - (failedPercent / 100) * circumference
  // Rotation for failed arc to start after completed arc
  const failedRotation = (completedPercent / 100) * 360

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
        {/* Completed circle (green) */}
        {completed > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#10b981"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={completedOffset}
            strokeLinecap="round"
            className="transition-all duration-500 ease-out"
          />
        )}
        {/* Failed circle (red) */}
        {failed > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#ef4444"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={failedOffset}
            strokeLinecap="round"
            className="transition-all duration-500 ease-out"
            style={{ transform: `rotate(${failedRotation}deg)`, transformOrigin: 'center' }}
          />
        )}
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
