import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLastHealthValue, useHealthSumLastDays, useHealthAverageLast, useHealthAverageLastDays, useIdeasCountLastDays, useEventsCountDays, useThresholds, useWordsSumLastDays, useLastWordsValue, useWordsAverageLast, useWordsAverageLastDays, useCurrentWeek, useLastWeek, useWeeklyLeisureDuration, usePlannedLeisureQueue, useSugarPeriodValue, useHabitDaysSinceLast, useHabitCountLastDays, usePeopleSeenLastDays, usePeopleOverdueCount } from '@/hooks/useAirtableData'
import { getTrafficLightColor, FALLBACK_DEFINITIONS, type TrafficLightColor } from '@/config/trafficLights'
import type { EventTag, LocalEventsRecord, LocalHealthRecord, LocalIdeasRecord, LocalLeisureRecord, LocalWordsRecord, SugarThresholdPeriod } from '@/types/airtable'

const COLOR_CLASSES: Record<TrafficLightColor, string> = {
  green: 'bg-green-500',
  amber: 'bg-amber-400',
  red: 'bg-red-500',
  grey: 'bg-slate-300',
}

interface ThresholdDef {
  name: string
  source: 'health' | 'ideas' | 'words' | 'leisure' | 'sugar' | 'events' | 'habits' | 'people'
  healthType?: string | null
  ideaType?: string | null
  ideaStatus?: string | null
  eventType?: string | null
  eventStatus?: string | null
  eventTag?: string | null
  habit?: string | null
  peopleCategory?: string | null
  wordsProject?: string | null
  leisurePeriod?: string | null
  leisureType?: string | null
  sugarPeriod?: string | null
  aggregation: string
  days?: number | null
  redThreshold: number
  greenThreshold: number
  lowerIsBetter: boolean
  notes?: string | null
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

function EventsTrafficLightItem({ definition }: { definition: ThresholdDef }) {
  const count = useEventsCountDays(
    definition.days ?? 7,
    (definition.eventType ?? null) as LocalEventsRecord['type'] | null,
    (definition.eventStatus ?? null) as LocalEventsRecord['status'] | null,
    definition.aggregation === 'countNextNDays' ? 'future' : 'past',
    (definition.eventTag ?? null) as EventTag | null
  )

  const loading = count === undefined
  const color = getTrafficLightColor(count ?? null, definition)
  const displayValue = count ?? '--'

  const thresholdHint = definition.lowerIsBetter
    ? `≤ ${definition.greenThreshold}`
    : `≥ ${definition.greenThreshold}`

  return <TrafficLightDisplay loading={loading} color={color} label={definition.name} displayValue={displayValue} thresholdHint={thresholdHint} />
}

function HabitsTrafficLightItem({ definition }: { definition: ThresholdDef }) {
  const habit = definition.habit ?? ''
  const isDaysSince = definition.aggregation === 'daysSinceLast'
  const daysSince = useHabitDaysSinceLast(habit)
  const count = useHabitCountLastDays(habit, definition.days ?? 7)

  const loading = isDaysSince ? daysSince === undefined : count === undefined
  const value = loading ? null : isDaysSince ? daysSince! : count ?? null
  const color = getTrafficLightColor(value, definition)
  const displayValue = loading || value === null ? '--' : isDaysSince ? `${value}d` : value

  const unit = isDaysSince ? 'd' : ''
  const thresholdHint = definition.lowerIsBetter
    ? `≤ ${definition.greenThreshold}${unit}`
    : `≥ ${definition.greenThreshold}${unit}`

  return <TrafficLightDisplay loading={loading} color={color} label={definition.name} displayValue={displayValue} thresholdHint={thresholdHint} />
}

function PeopleTrafficLightItem({ definition }: { definition: ThresholdDef }) {
  const category = (definition.peopleCategory ?? null) as 'Work' | 'Social' | null
  const isOverdue = definition.aggregation === 'overdueCount'
  const seen = usePeopleSeenLastDays(definition.days ?? 7, category)
  const overdue = usePeopleOverdueCount(category)

  const value = isOverdue ? overdue : seen
  const loading = value === undefined
  const color = getTrafficLightColor(value ?? null, definition)
  const displayValue = value ?? '--'

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
    <div className="bg-slate-50 rounded-lg px-2.5 py-2">
      {/* Full-width label, wrapping to two lines, so names stay readable on
          narrow screens; min-height keeps tiles in a row aligned */}
      <p className="text-xs text-slate-500 leading-tight break-words line-clamp-2 min-h-[2rem]">{label}</p>
      {loading ? (
        <div className="flex items-center gap-1.5 mt-1">
          <div className="w-3 h-3 rounded-full bg-slate-200 animate-pulse shrink-0" />
          <div className="h-5 w-8 bg-slate-200 animate-pulse rounded" />
        </div>
      ) : (
        <>
          <div className="flex items-center gap-1.5 mt-1">
            <div className={`w-3 h-3 rounded-full ${COLOR_CLASSES[color]} shrink-0`} />
            <p className="text-sm font-semibold text-slate-900">{displayValue}</p>
          </div>
          <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{thresholdHint}</p>
        </>
      )}
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
  const queue = usePlannedLeisureQueue(leisureType)

  const isQueueCount = definition.leisurePeriod === 'Planned Queue'
  const isQueueHours = definition.leisurePeriod === 'Planned Queue Hours'
  const isQueue = isQueueCount || isQueueHours
  const hours = leisure.totalSeconds / 3600
  const queueHours = (queue?.totalSeconds ?? 0) / 3600
  const loading = isQueue ? queue === undefined : leisure.loading
  const value = loading ? null : isQueueCount ? queue!.count : isQueueHours ? queueHours : hours
  const color = getTrafficLightColor(value, definition)
  const displayValue = loading ? '--' : isQueueCount ? queue!.count : (isQueueHours ? queueHours : hours).toFixed(1)

  const unit = isQueueCount ? '' : 'h'
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
  if (definition.source === 'events') {
    return <EventsTrafficLightItem definition={definition} />
  }
  if (definition.source === 'habits') {
    return <HabitsTrafficLightItem definition={definition} />
  }
  if (definition.source === 'people') {
    return <PeopleTrafficLightItem definition={definition} />
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
  const [noteFor, setNoteFor] = useState<string | null>(null)

  const definitions: ThresholdDef[] = thresholds && thresholds.length > 0
    ? thresholds
    : FALLBACK_DEFINITIONS

  const openNoteDef = definitions.find((d) => d.name === noteFor && d.notes)

  return (
    <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-200">
      <Link to="/thresholds" className="block font-semibold text-slate-900 mb-2 text-sm hover:text-blue-600 transition-colors">Thresholds</Link>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {definitions.map((def) => (
          <div
            key={def.name}
            className={`relative ${def.notes ? 'cursor-pointer' : ''}`}
            onClick={() => def.notes && setNoteFor(noteFor === def.name ? null : def.name)}
          >
            {def.notes && (
              <span
                className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-400"
                title="Has notes - tap to view"
              />
            )}
            <TrafficLightItem definition={def} />
          </div>
        ))}
      </div>
      {openNoteDef && (
        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">
            {openNoteDef.name}
          </p>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{openNoteDef.notes}</p>
        </div>
      )}
    </div>
  )
}
