import { Link } from 'react-router-dom'
import { useLastHealthValue, useHealthSumLastDays, useHealthAverageLast, useHealthAverageLastDays, useIdeasCountLastDays, useThresholds, useWordsSumLastDays, useLastWordsValue, useWordsAverageLast, useWordsAverageLastDays, useCurrentWeek, useLastWeek, useWeeklyLeisureDuration, usePlannedLeisureCount, useSugarPeriodValue } from '@/hooks/useAirtableData'
import { getTrafficLightColor, FALLBACK_DEFINITIONS, type TrafficLightColor } from '@/config/trafficLights'
import type { LocalHealthRecord, LocalIdeasRecord, LocalLeisureRecord, LocalWordsRecord, SugarThresholdPeriod } from '@/types/airtable'

const COLOR_CLASSES: Record<TrafficLightColor, string> = {
  green: 'bg-green-500',
  amber: 'bg-amber-400',
  red: 'bg-red-500',
  grey: 'bg-slate-300',
}

interface ThresholdDef {
  name: string
  source: 'health' | 'ideas' | 'words' | 'leisure' | 'sugar'
  healthType?: string | null
  ideaType?: string | null
  ideaStatus?: string | null
  wordsProject?: string | null
  leisurePeriod?: string | null
  leisureType?: string | null
  sugarPeriod?: string | null
  aggregation: string
  days?: number | null
  redThreshold: number
  greenThreshold: number
  lowerIsBetter: boolean
}

function HealthTrafficLightItem({ definition }: { definition: ThresholdDef }) {
  const healthType = definition.healthType as LocalHealthRecord['type']
  const days = definition.days ?? 7
  const lastValue = useLastHealthValue(healthType)
  const sumValue = useHealthSumLastDays(healthType, days)
  const avgLast3Value = useHealthAverageLast(healthType, 3)
  const avgNDaysValue = useHealthAverageLastDays(healthType, days)

  const value = definition.aggregation === 'averageLast3' ? avgLast3Value
    : definition.aggregation === 'averageLastNDays' ? avgNDaysValue
    : definition.aggregation === 'lastValue' ? lastValue
    : sumValue
  const loading = value === undefined
  const color = getTrafficLightColor(value ?? null, definition)

  const displayValue = value !== null && value !== undefined
    ? (definition.aggregation === 'lastValue'
      ? (Number.isInteger(value) ? value : value.toFixed(1))
      : (definition.aggregation === 'averageLast3' || definition.aggregation === 'averageLastNDays')
        ? value.toFixed(1)
        : value)
    : '--'

  const thresholdHint = definition.lowerIsBetter
    ? `≤ ${definition.greenThreshold}`
    : `≥ ${definition.greenThreshold}`

  return <TrafficLightDisplay loading={loading} color={color} label={definition.name} displayValue={displayValue} thresholdHint={thresholdHint} />
}

function IdeasTrafficLightItem({ definition }: { definition: ThresholdDef }) {
  const count = useIdeasCountLastDays(
    definition.ideaType as LocalIdeasRecord['type'],
    definition.days ?? 7,
    definition.ideaStatus as LocalIdeasRecord['status'] ?? null,
    definition.aggregation === 'countNextNDays' ? 'future' : 'past'
  )

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

function WordsTrafficLightItem({ definition }: { definition: ThresholdDef }) {
  const project = (definition.wordsProject ?? 'All') as LocalWordsRecord['project'] | 'All'
  const days = definition.days ?? 7
  const sumValue = useWordsSumLastDays(project, days)
  const lastValue = useLastWordsValue(project)
  const avgLast3Value = useWordsAverageLast(project, 3)
  const avgNDaysValue = useWordsAverageLastDays(project, days)

  const value = definition.aggregation === 'lastValue' ? lastValue
    : definition.aggregation === 'averageLast3' ? avgLast3Value
    : definition.aggregation === 'averageLastNDays' ? avgNDaysValue
    : sumValue
  const loading = value === undefined
  const color = getTrafficLightColor(value ?? null, definition)
  const displayValue = value !== null && value !== undefined
    ? (definition.aggregation === 'averageLast3' || definition.aggregation === 'averageLastNDays') ? value.toFixed(0) : value
    : '--'

  const thresholdHint = definition.lowerIsBetter
    ? `≤ ${definition.greenThreshold}`
    : `≥ ${definition.greenThreshold}`

  return <TrafficLightDisplay loading={loading} color={color} label={definition.name} displayValue={displayValue} thresholdHint={thresholdHint} />
}

function LeisureTrafficLightItem({ definition }: { definition: ThresholdDef }) {
  const currentWeek = useCurrentWeek()
  const lastWeek = useLastWeek()
  const weekCommencing = definition.leisurePeriod === 'Last Week'
    ? lastWeek?.weekCommencing ?? null
    : currentWeek?.weekCommencing ?? null
  const leisureType = (definition.leisureType ?? null) as LocalLeisureRecord['type'] | null
  const leisure = useWeeklyLeisureDuration(weekCommencing, leisureType)
  const plannedCount = usePlannedLeisureCount(leisureType)

  const isQueue = definition.leisurePeriod === 'Planned Queue'
  const hours = leisure.totalSeconds / 3600
  const loading = isQueue ? plannedCount === undefined : leisure.loading
  const value = isQueue ? plannedCount ?? null : loading ? null : hours
  const color = getTrafficLightColor(value, definition)
  const displayValue = loading ? '--' : isQueue ? plannedCount! : hours.toFixed(1)

  const unit = isQueue ? '' : 'h'
  const thresholdHint = definition.lowerIsBetter
    ? `≤ ${definition.greenThreshold}${unit}`
    : `≥ ${definition.greenThreshold}${unit}`

  return <TrafficLightDisplay loading={loading} color={color} label={definition.name} displayValue={displayValue} thresholdHint={thresholdHint} />
}

function SugarTrafficLightItem({ definition }: { definition: ThresholdDef }) {
  const period = (definition.sugarPeriod ?? 'All day') as SugarThresholdPeriod
  const value = useSugarPeriodValue(period, definition.aggregation, definition.days ?? 7)

  const loading = value === undefined
  const color = getTrafficLightColor(value ?? null, definition)
  const displayValue = value !== null && value !== undefined ? value.toFixed(1) : '--'

  const thresholdHint = definition.lowerIsBetter
    ? `≤ ${definition.greenThreshold}`
    : `≥ ${definition.greenThreshold}`

  return <TrafficLightDisplay loading={loading} color={color} label={definition.name} displayValue={displayValue} thresholdHint={thresholdHint} />
}

function TrafficLightItem({ definition }: { definition: ThresholdDef }) {
  if (definition.source === 'ideas') {
    return <IdeasTrafficLightItem definition={definition} />
  }
  if (definition.source === 'words') {
    return <WordsTrafficLightItem definition={definition} />
  }
  if (definition.source === 'leisure') {
    return <LeisureTrafficLightItem definition={definition} />
  }
  if (definition.source === 'sugar') {
    return <SugarTrafficLightItem definition={definition} />
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
