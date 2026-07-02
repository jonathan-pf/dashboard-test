import type { LocalSugarSummaryRecord, SugarPeriod, SugarThresholdPeriod } from '@/types/airtable'

// The four six-hour buckets, in chronological order within a day.
export const SUGAR_PERIODS: SugarPeriod[] = [
  '01:00-07:00',
  '07:00-13:00',
  '13:00-19:00',
  '19:00-01:00',
]

// Human-friendly short labels for the buckets.
export const SUGAR_PERIOD_LABELS: Record<SugarPeriod, string> = {
  '01:00-07:00': 'Night',
  '07:00-13:00': 'Morning',
  '13:00-19:00': 'Afternoon',
  '19:00-01:00': 'Evening',
}

export interface SugarDay {
  date: string
  avg: number | null
  min: number | null
  max: number | null
}

export interface SugarTimeOfDay {
  period: SugarPeriod
  label: string
  avg: number | null
}

/** Reading-weighted mean of a set of {value, weight} pairs (falls back to a
 * simple mean when weights are missing or sum to zero). */
function weightedMean(pairs: Array<{ value: number | null; weight: number | null }>): number | null {
  const valid = pairs.filter((p) => p.value != null)
  if (valid.length === 0) return null
  const totalWeight = valid.reduce((sum, p) => sum + (p.weight ?? 0), 0)
  if (totalWeight > 0) {
    return valid.reduce((sum, p) => sum + p.value! * (p.weight ?? 0), 0) / totalWeight
  }
  return valid.reduce((sum, p) => sum + p.value!, 0) / valid.length
}

/** Roll the (up to four) buckets for each day into a single per-day figure.
 * `avg` is reading-weighted across the day's buckets; `min`/`max` are the
 * extremes across buckets. Returned sorted ascending by date. */
export function dailySeries(records: LocalSugarSummaryRecord[]): SugarDay[] {
  const byDate = new Map<string, LocalSugarSummaryRecord[]>()
  for (const r of records) {
    if (!r.date) continue
    const bucket = byDate.get(r.date)
    if (bucket) bucket.push(r)
    else byDate.set(r.date, [r])
  }

  return Array.from(byDate.entries())
    .map(([date, rows]) => {
      const mins = rows.map((r) => r.min).filter((v): v is number => v != null)
      const maxes = rows.map((r) => r.max).filter((v): v is number => v != null)
      return {
        date,
        avg: weightedMean(rows.map((r) => ({ value: r.avgGlucose, weight: r.readings }))),
        min: mins.length ? Math.min(...mins) : null,
        max: maxes.length ? Math.max(...maxes) : null,
      }
    })
    .sort((a, b) => a.date.localeCompare(b.date))
}

/** Per-day average for a single bucket, or the reading-weighted whole-day
 * average when `period === 'All day'`. Sorted ascending by date. */
export function periodDailySeries(
  records: LocalSugarSummaryRecord[],
  period: SugarThresholdPeriod
): Array<{ date: string; value: number | null }> {
  if (period === 'All day') {
    return dailySeries(records).map((d) => ({ date: d.date, value: d.avg }))
  }
  return records
    .filter((r) => r.period === period)
    .map((r) => ({ date: r.date, value: r.avgGlucose }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

/** Latest-day, 7-day and 30-day reading-weighted average glucose. */
export function headlineStats(records: LocalSugarSummaryRecord[]): {
  latest: number | null
  avg7: number | null
  avg30: number | null
} {
  const days = dailySeries(records)
  const latest = days.length ? days[days.length - 1].avg : null

  const windowAvg = (n: number): number | null => {
    const cutoff = daysAgoStr(n)
    const rows = records.filter((r) => r.date >= cutoff)
    return weightedMean(rows.map((r) => ({ value: r.avgGlucose, weight: r.readings })))
  }

  return { latest, avg7: windowAvg(7), avg30: windowAvg(30) }
}

/** Mean average-glucose per bucket across the whole window, ordered
 * overnight → morning → afternoon → evening. */
export function timeOfDayAverages(records: LocalSugarSummaryRecord[]): SugarTimeOfDay[] {
  return SUGAR_PERIODS.map((period) => {
    const rows = records.filter((r) => r.period === period)
    return {
      period,
      label: SUGAR_PERIOD_LABELS[period],
      avg: weightedMean(rows.map((r) => ({ value: r.avgGlucose, weight: r.readings }))),
    }
  })
}

/** Apply a threshold aggregation to a per-day number series. Only the
 * aggregations offered for the sugar source are handled; anything else falls
 * back to the most recent value. */
export function aggregateSeries(
  series: Array<{ date: string; value: number | null }>,
  aggregation: string,
  days: number | null
): number | null {
  const clean = series
    .filter((p) => p.value != null)
    .sort((a, b) => b.date.localeCompare(a.date)) as Array<{ date: string; value: number }>
  if (clean.length === 0) return null

  if (aggregation === 'averageLast3') {
    const slice = clean.slice(0, 3)
    return slice.reduce((sum, p) => sum + p.value, 0) / slice.length
  }
  if (aggregation === 'averageLastNDays') {
    const cutoff = daysAgoStr(days ?? 7)
    const slice = clean.filter((p) => p.date >= cutoff)
    if (slice.length === 0) return null
    return slice.reduce((sum, p) => sum + p.value, 0) / slice.length
  }
  // lastValue (and any unexpected aggregation)
  return clean[0].value
}

/** YYYY-MM-DD for `n` days before today (local time). */
function daysAgoStr(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}
