import type { LocalWeeksRecord } from '@/types/airtable'

export type WeekFlag = 'thisWeek' | 'lastWeek' | 'nextWeek'

/**
 * Pick the single week a flag should resolve to.
 *
 * The Airtable "This Week" / "Last Week" / "Next Week" formulas compare
 * WEEKNUM only, so once the Weeks table spans more than a year each flag
 * matches one record per year (e.g. "Week 39 - 2025" and "Week 39 - 2026").
 * Taking `.first()` then depends on record ID order and can land on last
 * year's week. Among the flagged weeks, choose the one whose Week Commencing
 * is nearest to today.
 */
export function pickFlaggedWeek<T extends Pick<LocalWeeksRecord, 'weekCommencing'>>(
  weeks: T[],
  today: Date = new Date()
): T | undefined {
  if (weeks.length === 0) return undefined
  if (weeks.length === 1) return weeks[0]

  const todayMs = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  let best: T | undefined
  let bestDistance = Infinity

  for (const week of weeks) {
    const start = Date.parse(week.weekCommencing)
    const distance = Number.isNaN(start) ? Infinity : Math.abs(start - todayMs)
    if (distance < bestDistance) {
      best = week
      bestDistance = distance
    }
  }

  return best ?? weeks[0]
}
