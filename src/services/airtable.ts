import type {
  AirtableListResponse,
  AirtableRecord,
  TableName,
} from '@/types/airtable'

const BASE_URL = 'https://api.airtable.com/v0'
const RATE_LIMIT_DELAY = 200 // 5 requests per second = 200ms between requests

class RateLimiter {
  private lastRequestTime = 0
  private queue: Array<() => void> = []
  private processing = false

  async acquire(): Promise<void> {
    return new Promise((resolve) => {
      this.queue.push(resolve)
      this.processQueue()
    })
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return
    this.processing = true

    while (this.queue.length > 0) {
      const now = Date.now()
      const timeSinceLastRequest = now - this.lastRequestTime

      if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
        await new Promise((r) => setTimeout(r, RATE_LIMIT_DELAY - timeSinceLastRequest))
      }

      this.lastRequestTime = Date.now()
      const resolve = this.queue.shift()
      resolve?.()
    }

    this.processing = false
  }
}

const rateLimiter = new RateLimiter()

export class AirtableService {
  private pat: string
  private baseId: string

  constructor() {
    this.pat = import.meta.env.VITE_AIRTABLE_PAT
    this.baseId = import.meta.env.VITE_AIRTABLE_BASE_ID

    if (!this.pat || !this.baseId) {
      console.error('Airtable credentials not configured')
    }
  }

  private get headers(): HeadersInit {
    return {
      Authorization: `Bearer ${this.pat}`,
      'Content-Type': 'application/json',
    }
  }

  private buildUrl(tableName: string, recordId?: string): string {
    const base = `${BASE_URL}/${this.baseId}/${encodeURIComponent(tableName)}`
    return recordId ? `${base}/${recordId}` : base
  }

  async fetchTable<T extends AirtableRecord>(
    tableName: TableName,
    options?: {
      filterByFormula?: string
      sort?: Array<{ field: string; direction?: 'asc' | 'desc' }>
      fields?: string[]
      maxRecords?: number
      pageSize?: number
      offset?: string
    }
  ): Promise<AirtableListResponse<T>> {
    await rateLimiter.acquire()

    const url = new URL(this.buildUrl(tableName))

    if (options?.filterByFormula) {
      url.searchParams.set('filterByFormula', options.filterByFormula)
    }
    if (options?.sort) {
      options.sort.forEach((s, i) => {
        url.searchParams.set(`sort[${i}][field]`, s.field)
        if (s.direction) {
          url.searchParams.set(`sort[${i}][direction]`, s.direction)
        }
      })
    }
    if (options?.fields) {
      options.fields.forEach((f) => url.searchParams.append('fields[]', f))
    }
    if (options?.maxRecords) {
      url.searchParams.set('maxRecords', String(options.maxRecords))
    }
    if (options?.pageSize) {
      url.searchParams.set('pageSize', String(options.pageSize))
    }
    if (options?.offset) {
      url.searchParams.set('offset', options.offset)
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.headers,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new AirtableError(
        error.error?.message || 'Failed to fetch records',
        response.status
      )
    }

    return response.json()
  }

  async fetchAllRecords<T extends AirtableRecord>(
    tableName: TableName,
    options?: {
      filterByFormula?: string
      sort?: Array<{ field: string; direction?: 'asc' | 'desc' }>
      fields?: string[]
    }
  ): Promise<T[]> {
    const allRecords: T[] = []
    let offset: string | undefined

    do {
      const response = await this.fetchTable<T>(tableName, {
        ...options,
        pageSize: 100,
        offset,
      })
      allRecords.push(...response.records)
      offset = response.offset
    } while (offset)

    return allRecords
  }

  async fetchRecord<T extends AirtableRecord>(
    tableName: TableName,
    recordId: string
  ): Promise<T> {
    await rateLimiter.acquire()

    const response = await fetch(this.buildUrl(tableName, recordId), {
      method: 'GET',
      headers: this.headers,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new AirtableError(
        error.error?.message || 'Failed to fetch record',
        response.status
      )
    }

    return response.json()
  }

  async createRecord<T extends AirtableRecord>(
    tableName: TableName,
    fields: Record<string, unknown>
  ): Promise<T> {
    await rateLimiter.acquire()

    const response = await fetch(this.buildUrl(tableName), {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ fields }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new AirtableError(
        error.error?.message || 'Failed to create record',
        response.status
      )
    }

    return response.json()
  }

  async updateRecord<T extends AirtableRecord>(
    tableName: TableName,
    recordId: string,
    fields: Record<string, unknown>
  ): Promise<T> {
    await rateLimiter.acquire()

    const response = await fetch(this.buildUrl(tableName, recordId), {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify({ fields }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new AirtableError(
        error.error?.message || 'Failed to update record',
        response.status
      )
    }

    return response.json()
  }

  async deleteRecord(tableName: TableName, recordId: string): Promise<void> {
    await rateLimiter.acquire()

    const response = await fetch(this.buildUrl(tableName, recordId), {
      method: 'DELETE',
      headers: this.headers,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new AirtableError(
        error.error?.message || 'Failed to delete record',
        response.status
      )
    }
  }

  // Batch operations (Airtable supports up to 10 records per batch)
  async createRecords<T extends AirtableRecord>(
    tableName: TableName,
    records: Array<{ fields: Record<string, unknown> }>
  ): Promise<T[]> {
    const results: T[] = []
    const batches = this.chunkArray(records, 10)

    for (const batch of batches) {
      await rateLimiter.acquire()

      const response = await fetch(this.buildUrl(tableName), {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ records: batch }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new AirtableError(
          error.error?.message || 'Failed to create records',
          response.status
        )
      }

      const data = await response.json()
      results.push(...data.records)
    }

    return results
  }

  async updateRecords<T extends AirtableRecord>(
    tableName: TableName,
    records: Array<{ id: string; fields: Record<string, unknown> }>
  ): Promise<T[]> {
    const results: T[] = []
    const batches = this.chunkArray(records, 10)

    for (const batch of batches) {
      await rateLimiter.acquire()

      const response = await fetch(this.buildUrl(tableName), {
        method: 'PATCH',
        headers: this.headers,
        body: JSON.stringify({ records: batch }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new AirtableError(
          error.error?.message || 'Failed to update records',
          response.status
        )
      }

      const data = await response.json()
      results.push(...data.records)
    }

    return results
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }
}

export class AirtableError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message)
    this.name = 'AirtableError'
  }

  get isRateLimit(): boolean {
    return this.statusCode === 429
  }

  get isUnauthorized(): boolean {
    return this.statusCode === 401 || this.statusCode === 403
  }

  get isNotFound(): boolean {
    return this.statusCode === 404
  }

  get isNetworkError(): boolean {
    return this.statusCode === 0
  }
}

// Singleton instance
export const airtableService = new AirtableService()
