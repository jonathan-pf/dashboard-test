import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AirtableService, AirtableError } from '@/services/airtable'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('AirtableService', () => {
  let service: AirtableService

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock import.meta.env
    vi.stubEnv('VITE_AIRTABLE_PAT', 'test-pat')
    vi.stubEnv('VITE_AIRTABLE_BASE_ID', 'test-base')
    service = new AirtableService()
  })

  describe('fetchTable', () => {
    it('should fetch records from a table', async () => {
      const mockResponse = {
        records: [
          { id: 'rec1', fields: { Name: 'Test' }, createdTime: '2023-01-01' },
        ],
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await service.fetchTable('Health')

      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(result.records).toHaveLength(1)
      expect(result.records[0].id).toBe('rec1')
    })

    it('should throw AirtableError on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: { message: 'Unauthorized' } }),
      })

      await expect(service.fetchTable('Health')).rejects.toThrow(AirtableError)
    })

    it('should include filter parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ records: [] }),
      })

      await service.fetchTable('Health', {
        filterByFormula: '{Type}="Glucose"',
      })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('filterByFormula'),
        expect.any(Object)
      )
    })
  })

  describe('createRecord', () => {
    it('should create a new record', async () => {
      const mockResponse = {
        id: 'rec123',
        fields: { Value: 5.5, Type: 'Glucose' },
        createdTime: '2023-01-01',
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await service.createRecord('Health', {
        Value: 5.5,
        Type: 'Glucose',
      })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ fields: { Value: 5.5, Type: 'Glucose' }, typecast: true }),
        })
      )
      expect(result.id).toBe('rec123')
    })
  })

  describe('updateRecord', () => {
    it('should update an existing record', async () => {
      const mockResponse = {
        id: 'rec123',
        fields: { Status: 'Success' },
        createdTime: '2023-01-01',
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await service.updateRecord('Goals', 'rec123', {
        Status: 'Success',
      })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('rec123'),
        expect.objectContaining({
          method: 'PATCH',
        })
      )
      expect((result as unknown as { fields: { Status: string } }).fields.Status).toBe('Success')
    })
  })

  describe('AirtableError', () => {
    it('should identify rate limit errors', () => {
      const error = new AirtableError('Rate limited', 429)
      expect(error.isRateLimit).toBe(true)
      expect(error.isUnauthorized).toBe(false)
    })

    it('should identify unauthorized errors', () => {
      const error = new AirtableError('Unauthorized', 401)
      expect(error.isUnauthorized).toBe(true)
      expect(error.isRateLimit).toBe(false)
    })

    it('should identify not found errors', () => {
      const error = new AirtableError('Not found', 404)
      expect(error.isNotFound).toBe(true)
    })
  })
})
