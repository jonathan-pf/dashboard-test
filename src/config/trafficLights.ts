export type TrafficLightColor = 'green' | 'amber' | 'red' | 'grey'

export interface ThresholdColorConfig {
  redThreshold: number
  greenThreshold: number
  lowerIsBetter: boolean
}

/** Determine the traffic light color for a given value and threshold config */
export function getTrafficLightColor(
  value: number | null,
  def: ThresholdColorConfig
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

/** Fallback definitions used before first sync populates the thresholds table */
export const FALLBACK_DEFINITIONS: Array<{
  name: string
  source: 'health' | 'ideas' | 'words' | 'leisure' | 'sugar' | 'events'
  healthType?: string
  ideaType?: string
  wordsProject?: string
  leisurePeriod?: string
  sugarPeriod?: string
  aggregation: string
  days?: number
  redThreshold: number
  greenThreshold: number
  lowerIsBetter: boolean
}> = [
  { name: 'Tidy', source: 'health', healthType: 'Tidy', aggregation: 'lastValue', redThreshold: 3, greenThreshold: 5, lowerIsBetter: false },
  { name: 'Reps', source: 'health', healthType: 'Reps', aggregation: 'sumLast7Days', redThreshold: 30, greenThreshold: 50, lowerIsBetter: false },
  { name: 'Sugar', source: 'health', healthType: 'Glucose', aggregation: 'averageLast3', redThreshold: 9, greenThreshold: 8, lowerIsBetter: true },
  { name: 'Weight', source: 'health', healthType: 'Weight', aggregation: 'lastValue', redThreshold: 96, greenThreshold: 95, lowerIsBetter: true },
  { name: 'Steps/wk', source: 'ideas', ideaType: 'Step', aggregation: 'countLastNDays', days: 7, redThreshold: 1, greenThreshold: 3, lowerIsBetter: false },
  { name: 'Revelations/mo', source: 'ideas', ideaType: 'Revelation', aggregation: 'countLastNDays', days: 30, redThreshold: 1, greenThreshold: 3, lowerIsBetter: false },
  { name: 'Skills/mo', source: 'ideas', ideaType: 'Skill', aggregation: 'countLastNDays', days: 30, redThreshold: 1, greenThreshold: 3, lowerIsBetter: false },
  { name: 'Blogs/mo', source: 'ideas', ideaType: 'Blog', aggregation: 'countLastNDays', days: 30, redThreshold: 1, greenThreshold: 3, lowerIsBetter: false },
]
