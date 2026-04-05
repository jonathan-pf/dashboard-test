import { Link } from 'react-router-dom'
import { useLastHealthValue, useHealthSumLastDays, useHealthAverageLast, useIdeasCountLastDays, useThresholds } from '@/hooks/useAirtableData'
import { getTrafficLightColor, FALLBACK_DEFINITIONS, type TrafficLightColor } from '@/config/trafficLights'
import type { LocalHealthRecord, LocalIdeasRecord } from '@/types/airtable'

const COLOR_CLASSES: Record<TrafficLightColor, string> = {
  green: 'bg-green-500',
  amber: 'bg-amber-400',
  red: 'bg-red-500',
  grey: 'bg-slate-300',
}

interface ThresholdDef {
  name: string
  source: 'health' | 'ideas'
  healthType?: string | null
  ideaType?: string | null
  aggregation: string
  days?: number | null
  redThreshold: number
  greenThreshold: number
  lowerIsBetter: boolean
}

function HealthTrafficLightItem({ definition }: { definition: ThresholdDef }) {
  const lastValue = useLastHealthValue(definition.healthType as LocalHealthRecord['type'])
  const sumValue = useHealthSumLastDays(definition.healthType as LocalHealthRecord['type'], 7)
  const avgLast3Value = useHealthAverageLast(definition.healthType as LocalHealthRecord['type'], 3)

  const value = definition.aggregation === 'averageLast3' ? avgLast3Value
    : definition.aggregation === 'lastValue' ? lastValue : sumValue
  const loading = value === undefined
  const color = getTrafficLightColor(value ?? null, definition)

  const displayValue = value !== null && value !== undefined
    ? definition.aggregation === 'lastValue'
      ? Number.isInteger(value) ? value : value.toFixed(1)
      : definition.aggregation === 'averageLast3'
        ? value.toFixed(1)
        : value
    : '--'

  const thresholdHint = definition.lowerIsBetter
    ? `≤ ${definition.greenThreshold}`
    : `≥ ${definition.greenThreshold}`

  return <TrafficLightDisplay loading={loading} color={color} label={definition.name} displayValue={displayValue} thresholdHint={thresholdHint} />
}

function IdeasTrafficLightItem({ definition }: { definition: ThresholdDef }) {
  const count = useIdeasCountLastDays(definition.ideaType as LocalIdeasRecord['type'], definition.days ?? 7)

  const loading = count === undefined
  const color = getTrafficLightColor(count ?? null, definition)
  const displayValue = count ?? '--'

  const thresholdHint = definition.lowerIsBetter
    ? `≤ ${definition.greenThreshold}`
    : `≥ ${definition.greenThreshold}`

  return <TrafficLightDisplay loading={loading} color={color} label={definition.name} displayValue={displayValue} thresholdHint={thresholdHint} />
}

function TrafficLightDisplay({ loading, color, label, displayValue, thresholdHint }: {
  loading: boolean
  color: TrafficLightColor
  label: string
  displayValue: string | number
  thresholdHint: string
}) {
  return (
    <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
      {loading ? (
        <div className="w-3 h-3 rounded-full bg-slate-200 animate-pulse shrink-0" />
      ) : (
        <div className={`w-3 h-3 rounded-full ${COLOR_CLASSES[color]} shrink-0`} />
      )}
      <div className="min-w-0">
        <p className="text-xs text-slate-500 truncate">{label}</p>
        {loading ? (
          <div className="h-5 w-8 bg-slate-200 animate-pulse rounded mt-0.5" />
        ) : (
          <>
            <p className="text-sm font-semibold text-slate-900">{displayValue}</p>
            <p className="text-[10px] text-slate-400 leading-tight">{thresholdHint}</p>
          </>
        )}
      </div>
    </div>
  )
}

function TrafficLightItem({ definition }: { definition: ThresholdDef }) {
  if (definition.source === 'ideas') {
    return <IdeasTrafficLightItem definition={definition} />
  }
  return <HealthTrafficLightItem definition={definition} />
}

export function TrafficLightWidgets() {
  const thresholds = useThresholds()

  const definitions: ThresholdDef[] = thresholds && thresholds.length > 0
    ? thresholds
    : FALLBACK_DEFINITIONS

  return (
    <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-200">
      <Link to="/thresholds" className="block font-semibold text-slate-900 mb-2 text-sm hover:text-blue-600 transition-colors">Thresholds</Link>
      <div className="grid grid-cols-4 gap-2">
        {definitions.map((def) => (
          <TrafficLightItem key={def.name} definition={def} />
        ))}
      </div>
    </div>
  )
}
