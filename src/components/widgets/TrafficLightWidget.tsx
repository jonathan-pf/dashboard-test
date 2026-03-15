import { useLastHealthValue, useHealthSumLastDays } from '@/hooks/useAirtableData'
import {
  TRAFFIC_LIGHT_DEFINITIONS,
  getTrafficLightColor,
  type TrafficLightDefinition,
  type TrafficLightColor,
} from '@/config/trafficLights'

const COLOR_CLASSES: Record<TrafficLightColor, string> = {
  green: 'bg-green-500',
  amber: 'bg-amber-400',
  red: 'bg-red-500',
  grey: 'bg-slate-300',
}

function TrafficLightItem({ definition }: { definition: TrafficLightDefinition }) {
  const lastValue = useLastHealthValue(definition.healthType)
  const sumValue = useHealthSumLastDays(definition.healthType, 7)

  const value = definition.aggregation === 'lastValue' ? lastValue : sumValue
  const loading = value === undefined
  const color = getTrafficLightColor(value ?? null, definition)

  const displayValue = value !== null && value !== undefined
    ? definition.aggregation === 'lastValue'
      ? Number.isInteger(value) ? value : value.toFixed(1)
      : value
    : '--'

  return (
    <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
      {loading ? (
        <div className="w-3 h-3 rounded-full bg-slate-200 animate-pulse shrink-0" />
      ) : (
        <div className={`w-3 h-3 rounded-full ${COLOR_CLASSES[color]} shrink-0`} />
      )}
      <div className="min-w-0">
        <p className="text-xs text-slate-500 truncate">{definition.label}</p>
        {loading ? (
          <div className="h-5 w-8 bg-slate-200 animate-pulse rounded mt-0.5" />
        ) : (
          <p className="text-sm font-semibold text-slate-900">{displayValue}</p>
        )}
      </div>
    </div>
  )
}

export function TrafficLightWidgets() {
  return (
    <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-200">
      <h3 className="font-semibold text-slate-900 mb-2 text-sm">Health Indicators</h3>
      <div className="grid grid-cols-4 gap-2">
        {TRAFFIC_LIGHT_DEFINITIONS.map((def) => (
          <TrafficLightItem key={def.label} definition={def} />
        ))}
      </div>
    </div>
  )
}
