import type { LocalHealthRecord, LocalIdeasRecord } from '@/types/airtable'

export type TrafficLightColor = 'green' | 'amber' | 'red' | 'grey'

export type AggregationType = 'lastValue' | 'sumLast7Days'

export interface HealthTrafficLightDefinition {
  source: 'health'
  /** Display label */
  label: string
  /** Health record type to query */
  healthType: LocalHealthRecord['type']
  /** How to aggregate the data */
  aggregation: AggregationType
  /** Value at or below which the light is red (for 'lower is bad' metrics) or at or above which it's red (for 'lower is good' metrics) */
  redThreshold: number
  /** Value at or above which the light is green (for 'lower is bad' metrics) or at or below which it's green (for 'lower is good' metrics) */
  greenThreshold: number
  /** Whether lower values are better (e.g., sugar, weight) */
  lowerIsBetter: boolean
}

export interface IdeasTrafficLightDefinition {
  source: 'ideas'
  /** Display label */
  label: string
  /** Idea type to count */
  ideaType: LocalIdeasRecord['type']
  /** Number of days to look back */
  days: number
  redThreshold: number
  greenThreshold: number
  lowerIsBetter: boolean
}

export type TrafficLightDefinition = HealthTrafficLightDefinition | IdeasTrafficLightDefinition

/**
 * Traffic light widget definitions.
 *
 * To adjust thresholds, edit the redThreshold and greenThreshold values below.
 * Values between red and green thresholds will show as amber.
 */
export const TRAFFIC_LIGHT_DEFINITIONS: TrafficLightDefinition[] = [
  {
    source: 'health',
    label: 'Tidy',
    healthType: 'Tidy',
    aggregation: 'lastValue',
    redThreshold: 3,
    greenThreshold: 5,
    lowerIsBetter: false,
  },
  {
    source: 'health',
    label: 'Reps',
    healthType: 'Reps',
    aggregation: 'sumLast7Days',
    redThreshold: 30,
    greenThreshold: 50,
    lowerIsBetter: false,
  },
  {
    source: 'health',
    label: 'Sugar',
    healthType: 'Glucose',
    aggregation: 'lastValue',
    redThreshold: 9,
    greenThreshold: 8,
    lowerIsBetter: true,
  },
  {
    source: 'health',
    label: 'Weight',
    healthType: 'Weight',
    aggregation: 'lastValue',
    redThreshold: 96,
    greenThreshold: 95,
    lowerIsBetter: true,
  },
  {
    source: 'ideas',
    label: 'Steps/wk',
    ideaType: 'Step',
    days: 7,
    redThreshold: 1,
    greenThreshold: 3,
    lowerIsBetter: false,
  },
  {
    source: 'ideas',
    label: 'Revelations/mo',
    ideaType: 'Revelation',
    days: 30,
    redThreshold: 1,
    greenThreshold: 3,
    lowerIsBetter: false,
  },
  {
    source: 'ideas',
    label: 'Skills/mo',
    ideaType: 'Skill',
    days: 30,
    redThreshold: 1,
    greenThreshold: 3,
    lowerIsBetter: false,
  },
]

/** Determine the traffic light color for a given value and definition */
export function getTrafficLightColor(
  value: number | null,
  def: TrafficLightDefinition
): TrafficLightColor {
  if (value === null) return 'grey'

  if (def.lowerIsBetter) {
    // Lower is better: green when below greenThreshold, red when above redThreshold
    if (value <= def.greenThreshold) return 'green'
    if (value >= def.redThreshold) return 'red'
    return 'amber'
  } else {
    // Higher is better: green when above greenThreshold, red when below redThreshold
    if (value >= def.greenThreshold) return 'green'
    if (value <= def.redThreshold) return 'red'
    return 'amber'
  }
}
