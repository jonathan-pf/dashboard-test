import type { LocalGoalsRecord, LocalAreasRecord } from '@/types/airtable'

export interface AreaGoalGroup {
  name: string
  goals: LocalGoalsRecord[]
}

/**
 * Groups goals by their area, preserving the order areas are defined in and
 * placing ungrouped ("No Area") goals last. Only areas that have at least one
 * goal are returned.
 */
export function groupGoalsByArea(
  goals: LocalGoalsRecord[],
  areas: LocalAreasRecord[] | undefined
): AreaGoalGroup[] {
  const areaMap = new Map<string | null, AreaGoalGroup>()

  // Build area groups in area order
  if (areas) {
    for (const area of areas) {
      areaMap.set(area.id, { name: area.name, goals: [] })
    }
  }
  // Null for ungrouped
  areaMap.set(null, { name: 'No Area', goals: [] })

  for (const goal of goals) {
    const key = goal.areaId ?? null
    const group = areaMap.get(key)
    if (group) {
      group.goals.push(goal)
    } else {
      // Area exists in goal but not in areas list — put in ungrouped
      areaMap.get(null)!.goals.push(goal)
    }
  }

  // Return only groups that have goals, with ungrouped last
  return [...areaMap.entries()]
    .filter(([, group]) => group.goals.length > 0)
    .sort(([keyA], [keyB]) => {
      if (keyA === null) return 1
      if (keyB === null) return -1
      return 0
    })
    .map(([, group]) => group)
}
