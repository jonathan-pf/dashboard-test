// Base Airtable record type
export interface AirtableRecord {
  id: string
  createdTime: string
}

// Health table - tracks glucose, units, reps, willpoints
export interface HealthRecord extends AirtableRecord {
  fields: {
    Name: string // Formula field (Date - Type)
    Value: number
    Type: 'Units' | 'Glucose' | 'Reps' | 'Willpoint'
    Date: string // ISO date string
    'Week Number Name': string // Formula field
    'Week Link': string[] // Record IDs linking to Weeks table
  }
}

// Words table - tracks writing by project
export interface WordsRecord extends AirtableRecord {
  fields: {
    Name: string
    Words: number
    Project: 'Arcadia' | 'Blog' | 'Notes'
    When: string // ISO date string
    'Weekly Name': string // Formula field
    'Weekly Link': string[] // Record IDs linking to Weeks table
    Created: string // ISO datetime
  }
}

// Weeks table - central hub with rollups
export interface WeeksRecord extends AirtableRecord {
  fields: {
    Name: string // "Week X - YYYY"
    Health: string[] // Record IDs linking to Health table
    Words: string[] // Record IDs linking to Words table
    'Average Sugar': number | null // Rollup
    'Total Units': number | null // Rollup
    'Total Reps': number | null // Rollup
    'Total Willpoints': number | null // Rollup
    'Total Words': number | null // Rollup
    'Total Notes': number | null // Rollup
    'Total Fiction': number | null // Rollup
    'Total Blog': number | null // Rollup
    Ideas: string[] // Record IDs linking to Ideas table
    'Total Ideas': number | null // Rollup
    'Total Bits': number | null // Rollup
    'Week Commencing': string // ISO date string
    'This Week': 'Yes' | 'No' // Formula
    Goals: string[] // Record IDs linking to Goals table
    'Week Number': number // Formula
    'Goal Success': number | null // Rollup
    'Total Goals': number | null // Rollup
    'Goal Success Rate': number | null // Formula (percentage)
    'Last Week': 'Yes' | 'No' // Formula
    'Next Week': 'Yes' | 'No' // Formula
    'Goal Confidence': number | null // Rollup (percentage)
    Steps: number | null // Rollup
    Stages: number | null // Rollup
    'Work Link': string[] // Record IDs linking to Work table
    Scoping: number | null // Rollup
    'Work Systems': number | null // Rollup
  }
}

// Goals table
export interface GoalsRecord extends AirtableRecord {
  fields: {
    Name: string
    Area: string[] // Record IDs linking to Areas table
    'Initial Confidence': number | null // Percentage
    'Current Confidence': number | null // Percentage
    Deadline: string | null // ISO date string
    Status: 'Live' | 'Success' | 'Fail'
    'Weekly Name': string // Formula
    Weeks: string[] // Record IDs linking to Weeks table
    'This Week?': string[] // Lookup
    'Next Week?': string[] // Lookup
    Notes: string | null // Rich text
    Type: 'Weekly' | 'Monthly' | 'Annual'
    'Area Type': string // Formula
  }
}

// Areas table
export interface AreasRecord extends AirtableRecord {
  fields: {
    Name: string
    Type: 'Work' | 'Personal' | 'Health' | 'Creative'
  }
}

// Ideas table
export interface IdeasRecord extends AirtableRecord {
  fields: {
    Name: string
    Type: 'Revelation' | 'Crux Test' | 'Driver' | 'Bottleneck' | 'Step' | 'Failure' | 'Bit' | 'Stage'
    'When?': string // Created time
    'Weekly Name': string // Formula
    Weeks: string[] // Record IDs linking to Weeks table
  }
}

// Work table
export interface WorkRecord extends AirtableRecord {
  fields: {
    Name: string
    Number: number
    Type: 'Scoping' | 'System'
    'When?': string // Created time
    'Weekly Name': string // Formula
    Weeks: string[] // Record IDs linking to Weeks table
  }
}

// API response types
export interface AirtableListResponse<T> {
  records: T[]
  offset?: string // Pagination cursor
}

export interface AirtableError {
  error: {
    type: string
    message: string
  }
}

// Simplified types for local storage (without nested fields)
export interface LocalHealthRecord {
  id: string
  name: string
  value: number
  type: 'Units' | 'Glucose' | 'Reps' | 'Willpoint'
  date: string
  weekId: string | null
  createdTime: string
  _pendingSync?: boolean
  _localId?: string
}

export interface LocalWordsRecord {
  id: string
  name: string
  words: number
  project: 'Arcadia' | 'Blog' | 'Notes'
  when: string
  weekId: string | null
  createdTime: string
  _pendingSync?: boolean
  _localId?: string
}

export interface LocalWeeksRecord {
  id: string
  name: string
  weekCommencing: string
  weekNumber: number
  thisWeek: boolean
  lastWeek: boolean
  nextWeek: boolean
  averageSugar: number | null
  totalUnits: number | null
  totalReps: number | null
  totalWillpoints: number | null
  totalWords: number | null
  totalNotes: number | null
  totalFiction: number | null
  totalBlog: number | null
  totalIdeas: number | null
  goalSuccess: number | null
  totalGoals: number | null
  goalSuccessRate: number | null
  goalConfidence: number | null
  createdTime: string
}

export interface LocalGoalsRecord {
  id: string
  name: string
  areaId: string | null
  initialConfidence: number | null
  currentConfidence: number | null
  deadline: string | null
  status: 'Live' | 'Success' | 'Fail'
  weekId: string | null
  type: 'Weekly' | 'Monthly' | 'Annual'
  notes: string | null
  createdTime: string
  _pendingSync?: boolean
  _localId?: string
}

export interface LocalAreasRecord {
  id: string
  name: string
  type: 'Work' | 'Personal' | 'Health' | 'Creative'
  createdTime: string
}

// Pending mutation for offline sync
export interface PendingMutation {
  id?: number // Auto-incremented
  tableName: string
  operation: 'create' | 'update' | 'delete'
  recordId: string
  localId?: string // For new records created offline
  data: Record<string, unknown>
  timestamp: number
  retryCount: number
}

// Sync metadata
export interface SyncMeta {
  key: string
  value: string | number
}

// Table names as constants
export const TABLES = {
  HEALTH: 'Health',
  WORDS: 'Words',
  WEEKS: 'Weeks',
  GOALS: 'Goals',
  IDEAS: 'Ideas',
  WORK: 'Work',
  AREAS: 'Areas',
} as const

export type TableName = (typeof TABLES)[keyof typeof TABLES]
