import { describe, it, expect, vi } from 'vitest'
const database = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/db', () => ({ db: { thresholds: database } }))
vi.mock('@/services/airtable', () => ({ airtableService: {}, AirtableError: class extends Error {} }))
import { transformThresholdsRecord, localThresholdsToAirtable, syncService } from '@/services/sync'
import type { ThresholdsRecord } from '@/types/airtable'
describe('Critical field mapping', () => {
  it('queues an explicit false offline and preserves calculations', async () => {
    const row = transformThresholdsRecord({ id: 'synthetic', createdTime: '2026-10-18', fields: { Name: 'Example', Critical: true, Source: 'health', Aggregation: 'lastValue', 'Red Threshold': 1, 'Green Threshold': 3 } } as ThresholdsRecord)
    database.get.mockResolvedValue(row)
    const queue = vi.spyOn(syncService, 'queueMutation').mockResolvedValue(undefined)
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    try {
      await syncService.updateThresholdsRecord(row.id, { critical: false })
      expect(queue).toHaveBeenCalledWith('Thresholds', 'update', row.id, { Critical: false })
      expect(row.critical).toBe(false); expect(row.redThreshold).toBe(1); expect(row.greenThreshold).toBe(3)
    } finally { queue.mockRestore(); online.mockRestore() }
  })
  it('treats old records as noncritical and round-trips true without new defaults', () => {
    const record = { id: 'synthetic', createdTime: '2026-10-18', fields: { Name: 'Example', Source: 'health', Aggregation: 'lastValue', 'Red Threshold': 1, 'Green Threshold': 3 } } as ThresholdsRecord
    const old = transformThresholdsRecord(record)
    expect(old.critical).toBe(false)
    expect(localThresholdsToAirtable(old)).not.toHaveProperty('Critical')
    record.fields.Critical = true
    const critical = transformThresholdsRecord(record)
    expect(critical.critical).toBe(true)
    expect(localThresholdsToAirtable(critical).Critical).toBe(true)
    expect(critical.redThreshold).toBe(old.redThreshold)
    expect(critical.greenThreshold).toBe(old.greenThreshold)
  })
})
