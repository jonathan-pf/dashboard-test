import { describe, it, expect } from 'vitest'
import { pickFlaggedWeek } from '@/utils/weeks'

const week = (id: string, weekCommencing: string) => ({ id, weekCommencing })

describe('pickFlaggedWeek', () => {
  const today = new Date(2026, 8, 23) // 23 Sep 2026 (local)

  it('returns undefined for no weeks', () => {
    expect(pickFlaggedWeek([], today)).toBeUndefined()
  })

  it('returns the only week when there is one', () => {
    const only = week('rec1', '2026-09-21')
    expect(pickFlaggedWeek([only], today)).toBe(only)
  })

  it('prefers this year over last year regardless of record order', () => {
    const lastYear = week('recl32FP7w1YKnW9e', '2025-09-22')
    const thisYear = week('rectNFBP2FReuiWLb', '2026-09-21')
    expect(pickFlaggedWeek([lastYear, thisYear], today)).toBe(thisYear)
    expect(pickFlaggedWeek([thisYear, lastYear], today)).toBe(thisYear)
  })

  it('picks the nearest week when a future year is also present', () => {
    const lastYear = week('a', '2025-09-22')
    const thisYear = week('b', '2026-09-21')
    const nextYear = week('c', '2027-09-20')
    expect(pickFlaggedWeek([nextYear, lastYear, thisYear], today)).toBe(thisYear)
  })

  it('works for last-week and next-week style flags', () => {
    expect(
      pickFlaggedWeek([week('a', '2025-09-15'), week('b', '2026-09-14')], today)?.id
    ).toBe('b')
    expect(
      pickFlaggedWeek([week('a', '2025-09-29'), week('b', '2026-09-28')], today)?.id
    ).toBe('b')
  })
})
