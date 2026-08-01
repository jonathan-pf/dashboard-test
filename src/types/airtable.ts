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
    Type: 'Units' | 'Glucose' | 'Reps' | 'Willpoint' | 'Tidy' | 'Weight' | 'Frog' | 'Treat' | 'Consumption'
    Date: string // ISO date string
    'Week Number Name': string // Formula field
    'Week Link': string[] // Record IDs linking to Weeks table
    'Units Type'?: 'Theory' | 'Social' | null // Single select for Units classification
  }
}

// Sugar Summary table - auto-populated CGM data, 4 six-hour buckets per day (read-only)
export type SugarPeriod = '01:00-07:00' | '07:00-13:00' | '13:00-19:00' | '19:00-01:00'
export type SugarThresholdPeriod = SugarPeriod | 'All day'

export interface SugarSummaryRecord extends AirtableRecord {
  fields: {
    'Summary key'?: string // e.g. "2026-07-02 01:00-07:00"
    Date: string // ISO date string
    Period?: SugarPeriod // Single select bucket
    'Avg glucose'?: number
    Readings?: number
    Min?: number
    Max?: number
  }
}

// Words table - tracks writing by project
export interface WordsRecord extends AirtableRecord {
  fields: {
    Name: string
    Words: number
    Project: 'Arcadia' | 'Blog' | 'Notes' | 'Novella' | 'Scoping' | 'Cruxes'
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
    Type: 'Weekly' | 'Monthly' | 'Quarterly' | 'Annual'
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
    Type: 'Revelation' | 'Crux' | 'Driver' | 'Bottleneck' | 'Step' | 'Failure' | 'Bit' | 'Stage' | 'Feature' | 'Blog' | 'Question' | 'Skill' | 'Agenda'
    'When?': string // Created time
    'Weekly Name': string // Formula
    Weeks: string[] // Record IDs linking to Weeks table
    Notes?: string // Long text
    Status?: 'Planned' | 'Researched' | 'Shipped' | 'Active' // Single select
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
    Tags?: ('Adventure' | 'Date' | 'Social' | 'Group' | 'Family')[] // Multiple selects
  }
}

// Metrics table - externally-modelled numbers recorded per model run
// (e.g. Life Expectancy, Arcadia ETA). Read-only in the app; the dashboard
// shows the latest record per metric.
export interface MetricsRecord extends AirtableRecord {
  fields: {
    Name: string // Formula
    Metric?: string // Single select, e.g. "Life Expectancy"
    Created: string // Created time
    Type?: 'Number' | 'Date'
    'Value - Number'?: number | null
    'Value - Date'?: string | null
    Source?: string | null // URL of the model behind the value
  }
}

// Metric Config table - per-metric display settings for the app: whether a
// metric shows on the Home page and in what order. One row per metric name.
export interface MetricConfigRecord extends AirtableRecord {
  fields: {
    Metric: string // Must match the Metric select name in the Metrics table
    'Show on Home'?: boolean
    Order?: number | null
  }
}

// People table - mini CRM: one row per person. Last-met is derived from
// the Contact Log table.
export interface PeopleRecord extends AirtableRecord {
  fields: {
    Name: string
    Category?: 'Work' | 'Social'
    Subcategory?: string | null // Free-form group within the category
    Warmth?: number | null // Rating 1-5
    Notes?: string | null
    Status?: 'Active' | 'Archived'
  }
}

// Contact Log table - one row per interaction with a person
export interface ContactLogRecord extends AirtableRecord {
  fields: {
    Name: string // "Person - Date", filled by the app
    Person?: string[] // Record IDs linking to People (single link used)
    Date: string // ISO date string
    Type?: 'Met' | 'Reached out'
    Note?: string | null
  }
}

// Habit Log table - one row per habit completion. Habits are defined by the
// Habit select's options; the app derives its habit list from logged values.
export interface HabitLogRecord extends AirtableRecord {
  fields: {
    Name: string // "Habit - Date", filled by the app
    Habit: string
    Date: string // ISO date string
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
    Status: 'Live' | 'Testing' | 'Bonus' | 'Backlog' | 'Archive'
    Confidence: number | null // Initial confidence 0-1
    'Current Confidence': number | null // Current confidence 0-1
    Deadline: string | null // ISO date string
    'Output Goal': string | null // Optional goal description
    Exceptions: string | null // Long text
    Notes?: string | null // Long text
    'Threshold Trigger'?: 'red' | 'amber' | 'amberOnly' | null
    Week: number | null // Week number
    Thresholds?: string[] // Linked record IDs (auto-created by Airtable)
    Order?: number | null // Manual display order within status group
  }
}

// Thresholds table - traffic light definitions
export interface ThresholdsRecord extends AirtableRecord {
  fields: {
    Name: string
    Source: 'health' | 'ideas' | 'words' | 'leisure' | 'sugar' | 'events' | 'habits' | 'people'
    'Health Type'?: 'Units' | 'Glucose' | 'Reps' | 'Willpoint' | 'Tidy' | 'Weight' | 'Frog' | 'Treat' | 'Consumption' | null
    'Idea Type'?: 'Revelation' | 'Crux' | 'Driver' | 'Bottleneck' | 'Step' | 'Failure' | 'Bit' | 'Stage' | 'Feature' | 'Blog' | 'Question' | 'Skill' | 'Gen' | 'Model' | 'Agenda' | null
    'Idea Status'?: 'Planned' | 'Researched' | 'Shipped' | 'Active' | null
    'Event Type'?: 'Meal' | 'Party' | 'Cinema' | 'Theatre' | 'Holiday' | 'Event' | 'Work Trip' | 'Hobby' | 'Adventure' | null
    'Event Status'?: 'Planned' | 'Held' | 'Cancelled' | null
    'Event Tag'?: 'Adventure' | 'Date' | 'Social' | 'Group' | 'Family' | null
    'Habit'?: string | null
    'People Category'?: 'Work' | 'Social' | null
    'Words Project'?: 'All' | 'Arcadia' | 'Blog' | 'Notes' | 'Novella' | 'Scoping' | 'Cruxes' | null
    'Leisure Period'?: 'This Week' | 'Last Week' | 'Planned Queue' | 'Planned Queue Hours' | null
    'Leisure Type'?: 'Article' | 'Book' | 'Film' | 'TV Show' | 'Game' | 'Play' | 'Cinema' | 'Immersive' | 'Museum' | null
    'Sugar Period'?: SugarThresholdPeriod | null
    Aggregation: 'lastValue' | 'sumLast7Days' | 'averageLast3' | 'countLastNDays' | 'countNextNDays' | 'sumLastNDays' | 'averageLastNDays' | 'daysSinceLast' | 'overdueCount'
    Days?: number | null
    Notes?: string | null // Long text - e.g. what a score means
    'Red Threshold': number
    'Green Threshold': number
    'Lower Is Better'?: boolean
    Order?: number | null // Display order in the dashboard grid (0 = first)
    Rules?: string[] // Linked record IDs
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
  type: 'Units' | 'Glucose' | 'Reps' | 'Willpoint' | 'Tidy' | 'Weight' | 'Frog' | 'Treat' | 'Consumption'
  date: string
  weekId: string | null
  unitsType: 'Theory' | 'Social' | null
  createdTime: string
  _pendingSync?: boolean
  _localId?: string
}

export const UNITS_TYPES = ['Theory', 'Social'] as const
export type UnitsType = LocalHealthRecord['unitsType']

// Local cache format for Sugar Summary (read-only, externally populated)
export interface LocalSugarSummaryRecord {
  id: string
  summaryKey: string
  date: string
  period: SugarPeriod | null
  avgGlucose: number | null
  readings: number | null
  min: number | null
  max: number | null
  createdTime: string
}

export interface LocalWordsRecord {
  id: string
  name: string
  words: number
  project: 'Arcadia' | 'Blog' | 'Notes' | 'Novella' | 'Scoping' | 'Cruxes'
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
  type: 'Weekly' | 'Monthly' | 'Quarterly' | 'Annual'
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
  type: 'Revelation' | 'Crux' | 'Driver' | 'Bottleneck' | 'Step' | 'Failure' | 'Bit' | 'Stage' | 'Feature' | 'Blog' | 'Question' | 'Skill' | 'Gen' | 'Model' | 'Agenda'
  when: string
  weekId: string | null
  notes: string | null
  status: 'Planned' | 'Researched' | 'Shipped' | 'Active' | null
  createdTime: string
  _pendingSync?: boolean
  _localId?: string
}

export const IDEA_STATUSES = ['Planned', 'Active', 'Researched', 'Shipped'] as const
export type IdeaStatus = LocalIdeasRecord['status']

export const IDEA_STATUS_COLORS: Record<NonNullable<IdeaStatus>, string> = {
  'Planned': 'bg-blue-100 text-blue-700',
  'Active': 'bg-amber-100 text-amber-700',
  'Researched': 'bg-cyan-100 text-cyan-700',
  'Shipped': 'bg-teal-100 text-teal-700',
}

export interface LocalMetricsRecord {
  id: string
  name: string
  metric: string
  type: 'Number' | 'Date' | null
  valueNumber: number | null
  valueDate: string | null
  source: string | null
  createdTime: string
  _pendingSync?: boolean
  _localId?: string
}

// Fixed Totals-row tiles computed by the app rather than read from the Metrics
// table. They can be hidden via Metric Config rows using these names: no row
// (or Show on Home checked) = shown, row with it unchecked = hidden.
export const BUILT_IN_TILE_NAMES = ['Countdown', 'Donations', 'Lives Saved', 'Reps 2026', 'Words 2026'] as const
export type BuiltInTileName = (typeof BUILT_IN_TILE_NAMES)[number]

export interface LocalMetricConfigRecord {
  id: string
  metric: string
  showOnHome: boolean
  order: number | null
  createdTime: string
  _pendingSync?: boolean
  _localId?: string
}

export interface LocalPersonRecord {
  id: string
  name: string
  category: 'Work' | 'Social'
  subcategory: string | null
  warmth: number | null // 1-5
  notes: string | null
  status: 'Active' | 'Archived'
  createdTime: string
  _pendingSync?: boolean
  _localId?: string
}

export interface LocalContactLogRecord {
  id: string
  name: string
  personId: string | null
  date: string
  type: 'Met' | 'Reached out'
  note: string | null
  createdTime: string
  _pendingSync?: boolean
  _localId?: string
}

export interface LocalHabitLogRecord {
  id: string
  name: string
  habit: string
  date: string
  createdTime: string
  _pendingSync?: boolean
  _localId?: string
}

// Shown on the Habits page and in threshold habit filters before any logs exist
export const DEFAULT_HABITS = ['Outline', 'Low carb meal', 'Hoover']

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
  status: 'Live' | 'Testing' | 'Bonus' | 'Backlog' | 'Archive'
  confidence: number | null
  currentConfidence: number | null
  deadline: string | null
  outputGoal: string | null
  exceptions: string | null
  notes: string | null
  thresholdTrigger: 'red' | 'amber' | 'amberOnly'
  week: number | null
  thresholdIds: string[]
  order: number | null
  createdTime: string
  _pendingSync?: boolean
  _localId?: string
}

export interface LocalThresholdsRecord {
  id: string
  name: string
  source: 'health' | 'ideas' | 'words' | 'leisure' | 'sugar' | 'events' | 'habits' | 'people'
  healthType: LocalHealthRecord['type'] | null
  ideaType: LocalIdeasRecord['type'] | null
  ideaStatus: 'Planned' | 'Researched' | 'Shipped' | 'Active' | null
  eventType: LocalEventsRecord['type'] | null
  eventStatus: LocalEventsRecord['status'] | null
  eventTag: EventTag | null
  habit: string | null
  peopleCategory: 'Work' | 'Social' | null
  wordsProject: LocalWordsRecord['project'] | 'All' | null
  leisurePeriod: 'This Week' | 'Last Week' | 'Planned Queue' | 'Planned Queue Hours' | null
  leisureType: LocalLeisureRecord['type'] | null
  sugarPeriod: SugarThresholdPeriod | null
  aggregation: 'lastValue' | 'sumLast7Days' | 'averageLast3' | 'countLastNDays' | 'countNextNDays' | 'sumLastNDays' | 'averageLastNDays' | 'daysSinceLast' | 'overdueCount'
  days: number | null
  redThreshold: number
  greenThreshold: number
  lowerIsBetter: boolean
  order: number | null
  ruleIds: string[]
  notes: string | null
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
  tags: EventTag[]
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

// Cross-cutting roles an event can play (an event can have several):
// what it means, vs Type which is its format
export const EVENT_TAGS = ['Adventure', 'Date', 'Social', 'Group', 'Family'] as const
export type EventTag = (typeof EVENT_TAGS)[number]

export const EVENT_TAG_COLORS: Record<EventTag, string> = {
  'Adventure': 'bg-purple-100 text-purple-700',
  'Date': 'bg-pink-100 text-pink-700',
  'Social': 'bg-blue-100 text-blue-700',
  'Group': 'bg-teal-100 text-teal-700',
  'Family': 'bg-green-100 text-green-700',
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
  THRESHOLDS: 'Thresholds',
  SUGAR_SUMMARY: 'Sugar Summary',
  HABIT_LOG: 'Habit Log',
  METRICS: 'Metrics',
  METRIC_CONFIG: 'Metric Config',
  PEOPLE: 'People',
  CONTACT_LOG: 'Contact Log',
} as const

export type TableName = (typeof TABLES)[keyof typeof TABLES]
