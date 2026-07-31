import type { LocalContactLogRecord, LocalPersonRecord } from '@/types/airtable'

// How often we'd ideally see someone of a given warmth, in days.
// Unrated people fall back to warmth 3.
export const WARMTH_CADENCE_DAYS: Record<number, number> = {
  5: 30,
  4: 45,
  3: 90,
  2: 180,
  1: 365,
}

export const cadenceDays = (warmth: number | null) =>
  WARMTH_CADENCE_DAYS[warmth ?? 3] ?? 90

// Whole days between a YYYY-MM-DD date and today (0 = today)
export const daysSinceDate = (dateStr: string) => {
  const today = new Date().toISOString().split('T')[0]
  const ms = new Date(today).getTime() - new Date(dateStr.slice(0, 10)).getTime()
  return Math.max(0, Math.round(ms / 86400000))
}

// Latest contact date per person id
export const latestContactByPerson = (logs: LocalContactLogRecord[]) => {
  const map = new Map<string, string>()
  for (const log of logs) {
    if (!log.personId) continue
    const current = map.get(log.personId)
    if (!current || log.date > current) map.set(log.personId, log.date)
  }
  return map
}

// Staleness relative to the person's warmth cadence: 1 = exactly due,
// >1 = overdue. Never-contacted people count as overdue.
export const overdueRatio = (person: LocalPersonRecord, lastDate: string | undefined) => {
  if (!lastDate) return Infinity
  return daysSinceDate(lastDate) / cadenceDays(person.warmth)
}
