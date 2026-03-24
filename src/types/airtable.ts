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
    Type: 'Units' | 'Glucose' | 'Reps' | 'Willpoint' | 'Tidy' | 'Weight'
    Date: string // ISO date string
    'Week Number Name': string // Formula field
    'Week Link': string[] // Record IDs linking to Weeks table
    'Units Type'?: 'Theory' | 'Social' | null // Single select for Units classification
  }
}

// Words table - tracks writing by project
export interface WordsRecord extends AirtableRecord {
  fields: {
    Name: string
    Words: number
    Project: 'Arcadia' | 'Blog' | 'Notes' | 'Novella'
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
    'Total Novella': number | null // Rollup
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
    Type: 'Revelation' | 'Crux' | 'Driver' | 'Bottleneck' | 'Step' | 'Failure' | 'Bit' | 'Stage' | 'Feature' | 'Blog' | 'Question' | 'Skill'
    'When?': string // Created time
    'Weekly Name': string // Formula
    Weeks: string[] // Record IDs linking to Weeks table
    Notes?: string // Long text
    Status?: 'Planned' | 'Researched' | 'Shipped' // Single select
    'Question Category'?: string // Single select
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

// Events table
export interface EventsRecord extends AirtableRecord {
  fields: {
    Name: string
    'Date organised': string // ISO date string
    'Date held'?: string // ISO date string - when event actually happened
    Notes?: string
    Type: 'Meal' | 'Party' | 'Cinema' | 'Theatre' | 'Holiday' | 'Event' | 'Work Trip' | 'Hobby' | 'Adventure'
    Status?: 'Planned' | 'Held' | 'Cancelled'
  }
}

// Career table - tracks lifetime totals
export interface CareerRecord extends AirtableRecord {
  fields: {
    Name: string
    'Total Donations': number | null
    'Total Lives': number | null
  }
}

// Rules table - tracks personal rules and limits
export interface RulesRecord extends AirtableRecord {
  fields: {
    Name: string
    Select: 'Goal' | 'Limit'
    Status: 'Live' | 'Backlog' | 'Archive'
    Confidence: number | null // Initial confidence 0-1
    'Current Confidence': number | null // Current confidence 0-1
    Deadline: string | null // ISO date string
    'Output Goal': string | null // Optional goal description
    Week: number | null // Week number
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
  type: 'Units' | 'Glucose' | 'Reps' | 'Willpoint' | 'Tidy' | 'Weight'
  date: string
  weekId: string | null
  unitsType: 'Theory' | 'Social' | null
  createdTime: string
  _pendingSync?: boolean
  _localId?: string
}

export const UNITS_TYPES = ['Theory', 'Social'] as const
export type UnitsType = LocalHealthRecord['unitsType']

export interface LocalWordsRecord {
  id: string
  name: string
  words: number
  project: 'Arcadia' | 'Blog' | 'Notes' | 'Novella'
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
  totalNovella: number | null
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

export interface LocalIdeasRecord {
  id: string
  name: string
  type: 'Revelation' | 'Crux' | 'Driver' | 'Bottleneck' | 'Step' | 'Failure' | 'Bit' | 'Stage' | 'Feature' | 'Blog' | 'Question' | 'Skill' | 'Gen' | 'Model'
  when: string
  weekId: string | null
  notes: string | null
  status: 'Planned' | 'Researched' | 'Shipped' | null
  questionCategory: string | null
  createdTime: string
  _pendingSync?: boolean
  _localId?: string
}

export const IDEA_STATUSES = ['Planned', 'Researched', 'Shipped'] as const
export type IdeaStatus = LocalIdeasRecord['status']

export const IDEA_STATUS_COLORS: Record<NonNullable<IdeaStatus>, string> = {
  'Planned': 'bg-blue-100 text-blue-700',
  'Researched': 'bg-cyan-100 text-cyan-700',
  'Shipped': 'bg-teal-100 text-teal-700',
}

export interface LocalCareerRecord {
  id: string
  name: string
  totalDonations: number | null
  totalLives: number | null
  createdTime: string
}

export interface LocalRulesRecord {
  id: string
  name: string
  select: 'Goal' | 'Limit'
  status: 'Live' | 'Backlog' | 'Archive'
  confidence: number | null
  currentConfidence: number | null
  deadline: string | null
  outputGoal: string | null
  week: number | null
  createdTime: string
  _pendingSync?: boolean
  _localId?: string
}

export interface LocalEventsRecord {
  id: string
  name: string
  date: string // Date organised
  dateHeld: string | null // Date actually held
  notes: string | null
  type: 'Meal' | 'Party' | 'Cinema' | 'Theatre' | 'Holiday' | 'Event' | 'Work Trip' | 'Hobby' | 'Adventure'
  status: 'Planned' | 'Held' | 'Cancelled'
  createdTime: string
  _pendingSync?: boolean
  _localId?: string
}

export const EVENT_STATUSES = ['Planned', 'Held', 'Cancelled'] as const
export type EventStatus = LocalEventsRecord['status']

export const EVENT_STATUS_COLORS: Record<EventStatus, string> = {
  'Planned': 'bg-blue-100 text-blue-700',
  'Held': 'bg-green-100 text-green-700',
  'Cancelled': 'bg-red-100 text-red-700',
}

export const EVENT_TYPES = [
  'Meal',
  'Party',
  'Cinema',
  'Theatre',
  'Holiday',
  'Event',
  'Work Trip',
  'Hobby',
  'Adventure',
] as const

export type EventType = LocalEventsRecord['type']

export const EVENT_TYPE_COLORS: Record<EventType, string> = {
  'Meal': 'bg-blue-100 text-blue-700',
  'Party': 'bg-cyan-100 text-cyan-700',
  'Cinema': 'bg-teal-100 text-teal-700',
  'Theatre': 'bg-green-100 text-green-700',
  'Holiday': 'bg-yellow-100 text-yellow-700',
  'Event': 'bg-orange-100 text-orange-700',
  'Work Trip': 'bg-red-100 text-red-700',
  'Hobby': 'bg-pink-100 text-pink-700',
  'Adventure': 'bg-purple-100 text-purple-700',
}

// Leisure table
export interface LeisureRecord extends AirtableRecord {
  fields: {
    Name: string
    Status?: 'Planned' | 'Consumed' | 'Live'
    Type?: 'Article' | 'Book' | 'Film' | 'TV Show' | 'Game' | 'Play' | 'Cinema' | 'Immersive' | 'Museum'
    'Date Started'?: string
    'Date Ended'?: string
    URL?: string
    Duration?: number // seconds
    Rating?: number // 1-5
  }
}

export interface LocalLeisureRecord {
  id: string
  name: string
  status: 'Planned' | 'Consumed' | 'Live'
  type: 'Article' | 'Book' | 'Film' | 'TV Show' | 'Game' | 'Play' | 'Cinema' | 'Immersive' | 'Museum'
  dateStarted: string | null
  dateEnded: string | null
  url: string | null
  duration: number | null // seconds
  rating: number | null // 1-5
  createdTime: string
  _pendingSync?: boolean
  _localId?: string
}

export const LEISURE_STATUSES = ['Planned', 'Consumed', 'Live'] as const
export type LeisureStatus = LocalLeisureRecord['status']

export const LEISURE_STATUS_COLORS: Record<LeisureStatus, string> = {
  'Planned': 'bg-blue-100 text-blue-700',
  'Consumed': 'bg-green-100 text-green-700',
  'Live': 'bg-amber-100 text-amber-700',
}

export const LEISURE_TYPES = [
  'Article',
  'Book',
  'Film',
  'TV Show',
  'Game',
  'Play',
  'Cinema',
  'Immersive',
  'Museum',
] as const

export type LeisureType = LocalLeisureRecord['type']

export const LEISURE_TYPE_COLORS: Record<LeisureType, string> = {
  'Article': 'bg-blue-100 text-blue-700',
  'Book': 'bg-cyan-100 text-cyan-700',
  'Film': 'bg-teal-100 text-teal-700',
  'TV Show': 'bg-green-100 text-green-700',
  'Game': 'bg-yellow-100 text-yellow-700',
  'Play': 'bg-orange-100 text-orange-700',
  'Cinema': 'bg-red-100 text-red-700',
  'Immersive': 'bg-pink-100 text-pink-700',
  'Museum': 'bg-purple-100 text-purple-700',
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
  CAREER: 'Career',
  RULES: 'Rules',
  EVENTS: 'Events',
  LEISURE: 'Leisure',
} as const

export type TableName = (typeof TABLES)[keyof typeof TABLES]
