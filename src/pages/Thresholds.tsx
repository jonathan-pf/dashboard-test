import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useThresholds, useCreateThreshold, useUpdateThreshold, useDeleteThreshold, useAllThresholdColors, useHabitNames } from '@/hooks/useAirtableData'
import { DEFAULT_HABITS } from '@/types/airtable'
import type { EventTag, LocalThresholdsRecord, LocalEventsRecord, LocalHealthRecord, LocalIdeasRecord, LocalLeisureRecord, LocalWordsRecord, SugarThresholdPeriod, ThresholdCadence } from '@/types/airtable'
import type { TrafficLightColor } from '@/config/trafficLights'
import { NoteIndicator } from '@/components/widgets/NoteIndicator'

type ThresholdSource = 'health' | 'ideas' | 'words' | 'leisure' | 'sugar' | 'events' | 'habits' | 'people'

const CADENCES: ThresholdCadence[] = ['Daily', 'Weekly']

const HEALTH_TYPES: LocalHealthRecord['type'][] = ['Units', 'Glucose', 'Reps', 'Willpoint', 'Tidy', 'Weight', 'Frog', 'Treat', 'Consumption']
const IDEA_TYPES: LocalIdeasRecord['type'][] = ['Revelation', 'Crux', 'Driver', 'Bottleneck', 'Step', 'Failure', 'Bit', 'Stage', 'Feature', 'Blog', 'Question', 'Skill', 'Gen', 'Model', 'Agenda']
// 'All' means the threshold covers every event type; 'Any' every status
type EventTypeFilter = LocalEventsRecord['type'] | 'All'
const EVENT_TYPE_FILTERS: EventTypeFilter[] = ['All', 'Meal', 'Party', 'Cinema', 'Theatre', 'Holiday', 'Event', 'Work Trip', 'Hobby', 'Adventure']
type EventStatusFilter = LocalEventsRecord['status'] | 'Any'
const EVENT_STATUS_FILTERS: EventStatusFilter[] = ['Any', 'Planned', 'Held', 'Cancelled']
type EventTagFilter = EventTag | 'Any'
const EVENT_TAG_FILTERS: EventTagFilter[] = ['Any', 'Adventure', 'Date', 'Social', 'Group', 'Family']
// 'Any' means the threshold counts ideas of every status
type IdeaStatusFilter = NonNullable<LocalThresholdsRecord['ideaStatus']> | 'Any'
const IDEA_STATUS_FILTERS: IdeaStatusFilter[] = ['Any', 'Planned', 'Researched', 'Shipped', 'Active']
const WORDS_PROJECTS: (LocalWordsRecord['project'] | 'All')[] = ['All', 'Arcadia', 'Blog', 'Notes', 'Novella', 'Scoping', 'Cruxes']
const AGGREGATIONS: LocalThresholdsRecord['aggregation'][] = ['lastValue', 'sumLast7Days', 'averageLast3', 'countLastNDays', 'sumLastNDays', 'averageLastNDays']
// Blood-sugar thresholds check an average, so only these aggregations make sense.
const SUGAR_AGGREGATIONS: LocalThresholdsRecord['aggregation'][] = ['lastValue', 'averageLast3', 'averageLastNDays']
const SUGAR_PERIODS: SugarThresholdPeriod[] = ['01:00-07:00', '07:00-13:00', '13:00-19:00', '19:00-01:00', 'All day']
// Ideas thresholds count over a window looking back or forward from today.
const IDEAS_AGGREGATIONS: { value: LocalThresholdsRecord['aggregation']; label: string }[] = [
  { value: 'countLastNDays', label: 'Last N days' },
  { value: 'countNextNDays', label: 'Next N days' },
]
const ideasAggregation = (agg: LocalThresholdsRecord['aggregation']): LocalThresholdsRecord['aggregation'] =>
  agg === 'countNextNDays' ? 'countNextNDays' : 'countLastNDays'
// Habits track recency ("days since last done") or frequency (count in window)
const HABITS_AGGREGATIONS: { value: LocalThresholdsRecord['aggregation']; label: string }[] = [
  { value: 'daysSinceLast', label: 'Days since last' },
  { value: 'countLastNDays', label: 'Count last N days' },
]
const habitsAggregation = (agg: LocalThresholdsRecord['aggregation']): LocalThresholdsRecord['aggregation'] =>
  agg === 'countLastNDays' ? 'countLastNDays' : 'daysSinceLast'
// People track upkeep (distinct people seen in a window) or neglect (overdue count)
const PEOPLE_AGGREGATIONS: { value: LocalThresholdsRecord['aggregation']; label: string }[] = [
  { value: 'countLastNDays', label: 'People seen last N days' },
  { value: 'overdueCount', label: 'Overdue count' },
]
const peopleAggregation = (agg: LocalThresholdsRecord['aggregation']): LocalThresholdsRecord['aggregation'] =>
  agg === 'overdueCount' ? 'overdueCount' : 'countLastNDays'
type PeopleCategoryFilter = 'All' | 'Work' | 'Social'
const PEOPLE_CATEGORY_FILTERS: PeopleCategoryFilter[] = ['All', 'Work', 'Social']

// Aggregations that need a "Days" window
const usesDays = (agg: LocalThresholdsRecord['aggregation']) =>
  agg === 'countLastNDays' || agg === 'countNextNDays' || agg === 'sumLastNDays' || agg === 'averageLastNDays'

const COLOR_CLASSES: Record<TrafficLightColor, string> = {
  green: 'bg-green-500',
  amber: 'bg-amber-400',
  red: 'bg-red-500',
  grey: 'bg-slate-300',
}

type LeisurePeriod = NonNullable<LocalThresholdsRecord['leisurePeriod']>
// 'Planned Queue' tracks the size of the leisure backlog (item count) rather than
// weekly hours; 'Planned Queue Hours' sums the backlog's durations instead
const LEISURE_PERIODS: LeisurePeriod[] = ['This Week', 'Last Week', 'Planned Queue', 'Planned Queue Hours']
// 'All' means the threshold covers every leisure type
type LeisureTypeFilter = LocalLeisureRecord['type'] | 'All'
const LEISURE_TYPE_FILTERS: LeisureTypeFilter[] = ['All', 'Article', 'Book', 'Film', 'TV Show', 'Game', 'Play', 'Cinema', 'Immersive', 'Museum']

const SOURCE_COLORS: Record<ThresholdSource, string> = {
  health: 'bg-purple-100 text-purple-700',
  ideas: 'bg-blue-100 text-blue-700',
  words: 'bg-orange-100 text-orange-700',
  leisure: 'bg-green-100 text-green-700',
  sugar: 'bg-amber-100 text-amber-700',
  events: 'bg-cyan-100 text-cyan-700',
  habits: 'bg-rose-100 text-rose-700',
  people: 'bg-indigo-100 text-indigo-700',
}

export function Thresholds() {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCadence, setNewCadence] = useState<ThresholdCadence>('Daily')
  const [newSource, setNewSource] = useState<ThresholdSource>('health')
  const [newHealthType, setNewHealthType] = useState<LocalHealthRecord['type']>('Tidy')
  const [newIdeaType, setNewIdeaType] = useState<LocalIdeasRecord['type']>('Revelation')
  const [newIdeaStatus, setNewIdeaStatus] = useState<IdeaStatusFilter>('Any')
  const [newEventType, setNewEventType] = useState<EventTypeFilter>('All')
  const [newEventStatus, setNewEventStatus] = useState<EventStatusFilter>('Any')
  const [newEventTag, setNewEventTag] = useState<EventTagFilter>('Any')
  const [newHabit, setNewHabit] = useState<string>(DEFAULT_HABITS[0])
  const [newPeopleCategory, setNewPeopleCategory] = useState<PeopleCategoryFilter>('All')
  const [newWordsProject, setNewWordsProject] = useState<LocalWordsRecord['project'] | 'All'>('All')
  const [newLeisurePeriod, setNewLeisurePeriod] = useState<LeisurePeriod>('This Week')
  const [newLeisureType, setNewLeisureType] = useState<LeisureTypeFilter>('All')
  const [newSugarPeriod, setNewSugarPeriod] = useState<SugarThresholdPeriod>('All day')
  const [newAggregation, setNewAggregation] = useState<LocalThresholdsRecord['aggregation']>('lastValue')
  const [newDays, setNewDays] = useState('7')
  const [newRedThreshold, setNewRedThreshold] = useState('')
  const [newGreenThreshold, setNewGreenThreshold] = useState('')
  const [newLowerIsBetter, setNewLowerIsBetter] = useState(false)
  const [newNotes, setNewNotes] = useState('')

  const [editingThreshold, setEditingThreshold] = useState<LocalThresholdsRecord | null>(null)
  const [editName, setEditName] = useState('')
  const [editCadence, setEditCadence] = useState<ThresholdCadence>('Daily')
  const [editSource, setEditSource] = useState<ThresholdSource>('health')
  const [editHealthType, setEditHealthType] = useState<LocalHealthRecord['type']>('Tidy')
  const [editIdeaType, setEditIdeaType] = useState<LocalIdeasRecord['type']>('Revelation')
  const [editIdeaStatus, setEditIdeaStatus] = useState<IdeaStatusFilter>('Any')
  const [editEventType, setEditEventType] = useState<EventTypeFilter>('All')
  const [editEventStatus, setEditEventStatus] = useState<EventStatusFilter>('Any')
  const [editEventTag, setEditEventTag] = useState<EventTagFilter>('Any')
  const [editHabit, setEditHabit] = useState<string>(DEFAULT_HABITS[0])
  const [editPeopleCategory, setEditPeopleCategory] = useState<PeopleCategoryFilter>('All')
  const [editWordsProject, setEditWordsProject] = useState<LocalWordsRecord['project'] | 'All'>('All')
  const [editLeisurePeriod, setEditLeisurePeriod] = useState<LeisurePeriod>('This Week')
  const [editLeisureType, setEditLeisureType] = useState<LeisureTypeFilter>('All')
  const [editSugarPeriod, setEditSugarPeriod] = useState<SugarThresholdPeriod>('All day')
  const [editAggregation, setEditAggregation] = useState<LocalThresholdsRecord['aggregation']>('lastValue')
  const [editDays, setEditDays] = useState('7')
  const [editRedThreshold, setEditRedThreshold] = useState('')
  const [editGreenThreshold, setEditGreenThreshold] = useState('')
  const [editLowerIsBetter, setEditLowerIsBetter] = useState(false)
  const [editNotes, setEditNotes] = useState('')

  const [deletingId, setDeletingId] = useState<string | null>(null)

  const thresholds = useThresholds()
  const thresholdColors = useAllThresholdColors()
  const habitNames = useHabitNames() ?? DEFAULT_HABITS
  const createThreshold = useCreateThreshold()
  const updateThreshold = useUpdateThreshold()
  const deleteThreshold = useDeleteThreshold()

  const colorCounts = { green: 0, amber: 0, red: 0, grey: 0 }
  if (thresholdColors) {
    for (const color of thresholdColors.values()) {
      colorCounts[color]++
    }
  }

  // Daily and Weekly thresholds are separate columns, each with its own order
  // sequence. useThresholds sorts globally by order, so filtering preserves
  // each group's relative order.
  const groups: Record<ThresholdCadence, LocalThresholdsRecord[]> = {
    Daily: thresholds?.filter((t) => t.cadence !== 'Weekly') ?? [],
    Weekly: thresholds?.filter((t) => t.cadence === 'Weekly') ?? [],
  }

  const handleSourceChange = (source: ThresholdSource, setAgg: (v: LocalThresholdsRecord['aggregation']) => void) => {
    if (source === 'health') {
      setAgg('lastValue')
    } else if (source === 'ideas' || source === 'events') {
      setAgg('countLastNDays')
    } else if (source === 'habits') {
      setAgg('daysSinceLast')
    } else if (source === 'people') {
      setAgg('countLastNDays')
    } else if (source === 'leisure') {
      setAgg('lastValue')
    } else if (source === 'sugar') {
      setAgg('averageLastNDays')
    } else {
      setAgg('sumLast7Days')
    }
  }

  const handleCreate = async () => {
    if (!newName.trim()) return

    await createThreshold.mutateAsync({
      name: newName.trim(),
      cadence: newCadence,
      source: newSource,
      healthType: newSource === 'health' ? newHealthType : null,
      ideaType: newSource === 'ideas' ? newIdeaType : null,
      ideaStatus: newSource === 'ideas' && newIdeaStatus !== 'Any' ? newIdeaStatus : null,
      eventType: newSource === 'events' && newEventType !== 'All' ? newEventType : null,
      eventStatus: newSource === 'events' && newEventStatus !== 'Any' ? newEventStatus : null,
      eventTag: newSource === 'events' && newEventTag !== 'Any' ? newEventTag : null,
      habit: newSource === 'habits' ? newHabit || null : null,
      peopleCategory: newSource === 'people' && newPeopleCategory !== 'All' ? newPeopleCategory : null,
      wordsProject: newSource === 'words' ? newWordsProject : null,
      leisurePeriod: newSource === 'leisure' ? newLeisurePeriod : null,
      leisureType: newSource === 'leisure' && newLeisureType !== 'All' ? newLeisureType : null,
      sugarPeriod: newSource === 'sugar' ? newSugarPeriod : null,
      aggregation: newSource === 'ideas' || newSource === 'events' ? ideasAggregation(newAggregation) : newSource === 'habits' ? habitsAggregation(newAggregation) : newSource === 'people' ? peopleAggregation(newAggregation) : newSource === 'leisure' ? 'lastValue' : newAggregation,
      days: usesDays(newAggregation) || newSource === 'ideas' || newSource === 'events' ? Number(newDays) || 7 : null,
      redThreshold: Number(newRedThreshold) || 0,
      greenThreshold: Number(newGreenThreshold) || 0,
      lowerIsBetter: newLowerIsBetter,
      order: groups[newCadence].length, // append to the end of its cadence column
      ruleIds: [],
      notes: newNotes.trim() || null,
    })

    setNewName('')
    setNewCadence('Daily')
    setNewSource('health')
    setNewHealthType('Tidy')
    setNewIdeaType('Revelation')
    setNewIdeaStatus('Any')
    setNewEventType('All')
    setNewEventStatus('Any')
    setNewEventTag('Any')
    setNewHabit(DEFAULT_HABITS[0])
    setNewPeopleCategory('All')
    setNewWordsProject('All')
    setNewLeisurePeriod('This Week')
    setNewLeisureType('All')
    setNewSugarPeriod('All day')
    setNewAggregation('lastValue')
    setNewDays('7')
    setNewRedThreshold('')
    setNewGreenThreshold('')
    setNewLowerIsBetter(false)
    setNewNotes('')
    setShowCreateForm(false)
  }

  const handleCancelCreate = () => {
    setNewName('')
    setShowCreateForm(false)
  }

  const startEditing = (t: LocalThresholdsRecord) => {
    setEditingThreshold(t)
    setEditName(t.name)
    setEditCadence(t.cadence === 'Weekly' ? 'Weekly' : 'Daily')
    setEditSource(t.source)
    setEditHealthType((t.healthType as LocalHealthRecord['type']) ?? 'Tidy')
    setEditIdeaType((t.ideaType as LocalIdeasRecord['type']) ?? 'Revelation')
    setEditIdeaStatus(t.ideaStatus ?? 'Any')
    setEditEventType(t.eventType ?? 'All')
    setEditEventStatus(t.eventStatus ?? 'Any')
    setEditEventTag(t.eventTag ?? 'Any')
    setEditHabit(t.habit ?? DEFAULT_HABITS[0])
    setEditPeopleCategory(t.peopleCategory ?? 'All')
    setEditWordsProject((t.wordsProject as LocalWordsRecord['project'] | 'All') ?? 'All')
    setEditLeisurePeriod(t.leisurePeriod ?? 'This Week')
    setEditLeisureType(t.leisureType ?? 'All')
    setEditSugarPeriod(t.sugarPeriod ?? 'All day')
    setEditAggregation(t.aggregation)
    setEditDays(String(t.days ?? 7))
    setEditRedThreshold(String(t.redThreshold))
    setEditGreenThreshold(String(t.greenThreshold))
    setEditLowerIsBetter(t.lowerIsBetter)
    setEditNotes(t.notes ?? '')
  }

  const handleUpdate = async () => {
    if (!editingThreshold || !editName.trim()) return

    await updateThreshold.mutateAsync({
      thresholdId: editingThreshold.id,
      updates: {
        name: editName.trim(),
        cadence: editCadence,
        // Moving to the other cadence column appends the row to that column's end
        ...(editCadence !== editingThreshold.cadence ? { order: groups[editCadence].length } : {}),
        source: editSource,
        healthType: editSource === 'health' ? editHealthType : null,
        ideaType: editSource === 'ideas' ? editIdeaType : null,
        ideaStatus: editSource === 'ideas' && editIdeaStatus !== 'Any' ? editIdeaStatus : null,
        eventType: editSource === 'events' && editEventType !== 'All' ? editEventType : null,
        eventStatus: editSource === 'events' && editEventStatus !== 'Any' ? editEventStatus : null,
        eventTag: editSource === 'events' && editEventTag !== 'Any' ? editEventTag : null,
        habit: editSource === 'habits' ? editHabit || null : null,
        peopleCategory: editSource === 'people' && editPeopleCategory !== 'All' ? editPeopleCategory : null,
        wordsProject: editSource === 'words' ? editWordsProject : null,
        leisurePeriod: editSource === 'leisure' ? editLeisurePeriod : null,
        leisureType: editSource === 'leisure' && editLeisureType !== 'All' ? editLeisureType : null,
        sugarPeriod: editSource === 'sugar' ? editSugarPeriod : null,
        aggregation: editSource === 'ideas' || editSource === 'events' ? ideasAggregation(editAggregation) : editSource === 'habits' ? habitsAggregation(editAggregation) : editSource === 'people' ? peopleAggregation(editAggregation) : editSource === 'leisure' ? 'lastValue' : editAggregation,
        days: usesDays(editAggregation) || editSource === 'ideas' || editSource === 'events' ? Number(editDays) || 7 : null,
        redThreshold: Number(editRedThreshold) || 0,
        greenThreshold: Number(editGreenThreshold) || 0,
        lowerIsBetter: editLowerIsBetter,
        notes: editNotes.trim() || null,
      },
    })

    setEditingThreshold(null)
  }

  const handleCancelEdit = () => {
    setEditingThreshold(null)
    setDeletingId(null)
  }

  const handleDelete = async (id: string) => {
    if (deletingId === id) {
      await deleteThreshold.mutateAsync(id)
      setDeletingId(null)
      setEditingThreshold(null)
    } else {
      setDeletingId(id)
    }
  }

  // Move a threshold up/down within its cadence column. Normalises order values
  // to the current display index within the column (covers records with no
  // Order yet), then swaps the moved row with its neighbour. Only changed
  // records are written.
  const moveThreshold = async (group: LocalThresholdsRecord[], id: string, direction: -1 | 1) => {
    if (updateThreshold.isPending) return
    const idx = group.findIndex((t) => t.id === id)
    const target = idx + direction
    if (idx < 0 || target < 0 || target >= group.length) return

    const updates: Array<{ id: string; order: number }> = []
    group.forEach((t, i) => {
      const newOrder = i === idx ? target : i === target ? idx : i
      if (t.order !== newOrder) updates.push({ id: t.id, order: newOrder })
    })
    for (const u of updates) {
      await updateThreshold.mutateAsync({ thresholdId: u.id, updates: { order: u.order } })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link to="/" className="p-2 -ml-2 text-slate-500 hover:text-slate-700">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h2 className="text-2xl font-bold text-slate-900">Thresholds</h2>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <p className="text-xs text-slate-500">Total</p>
          <p className="text-2xl font-bold text-slate-900">{thresholds?.length ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <p className="text-xs text-green-600">Green</p>
          <p className="text-2xl font-bold text-green-600">{colorCounts.green}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <p className="text-xs text-amber-600">Amber</p>
          <p className="text-2xl font-bold text-amber-600">{colorCounts.amber}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <p className="text-xs text-red-600">Red</p>
          <p className="text-2xl font-bold text-red-600">{colorCounts.red}</p>
        </div>
      </div>

      {/* Create Form */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        {showCreateForm ? (
          <ThresholdForm
            title="New Threshold"
            name={newName} setName={setNewName}
            cadence={newCadence} setCadence={setNewCadence}
            source={newSource} setSource={(s) => { setNewSource(s); handleSourceChange(s, setNewAggregation) }}
            healthType={newHealthType} setHealthType={setNewHealthType}
            ideaType={newIdeaType} setIdeaType={setNewIdeaType}
            ideaStatus={newIdeaStatus} setIdeaStatus={setNewIdeaStatus}
            eventType={newEventType} setEventType={setNewEventType}
            eventStatus={newEventStatus} setEventStatus={setNewEventStatus}
            eventTag={newEventTag} setEventTag={setNewEventTag}
            habit={newHabit} setHabit={setNewHabit} habitNames={habitNames}
            peopleCategory={newPeopleCategory} setPeopleCategory={setNewPeopleCategory}
            wordsProject={newWordsProject} setWordsProject={setNewWordsProject}
            leisurePeriod={newLeisurePeriod} setLeisurePeriod={setNewLeisurePeriod}
            leisureType={newLeisureType} setLeisureType={setNewLeisureType}
            sugarPeriod={newSugarPeriod} setSugarPeriod={setNewSugarPeriod}
            aggregation={newAggregation} setAggregation={setNewAggregation}
            days={newDays} setDays={setNewDays}
            redThreshold={newRedThreshold} setRedThreshold={setNewRedThreshold}
            greenThreshold={newGreenThreshold} setGreenThreshold={setNewGreenThreshold}
            lowerIsBetter={newLowerIsBetter} setLowerIsBetter={setNewLowerIsBetter}
            notes={newNotes} setNotes={setNewNotes}
            onSave={handleCreate}
            onCancel={handleCancelCreate}
            saving={createThreshold.isPending}
            saveLabel="Create"
          />
        ) : (
          <button
            onClick={() => setShowCreateForm(true)}
            className="w-full py-3 bg-slate-50 text-slate-600 rounded-lg font-medium hover:bg-slate-100 transition-colors"
          >
            + Add Threshold
          </button>
        )}
      </div>

      {/* Threshold Lists - Daily and Weekly side by side, each with its own order */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:items-start">
        {CADENCES.map((cadence) => {
        const group = groups[cadence]
        return (
      <div key={cadence} className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-4">{cadence} Thresholds</h3>
        <div className="space-y-3">
          {group.map((t, i) => (
            <div key={t.id}>
              {editingThreshold?.id === t.id ? (
                <div className="space-y-4">
                  <ThresholdForm
                    title="Edit Threshold"
                    name={editName} setName={setEditName}
                    cadence={editCadence} setCadence={setEditCadence}
                    source={editSource} setSource={(s) => { setEditSource(s); handleSourceChange(s, setEditAggregation) }}
                    healthType={editHealthType} setHealthType={setEditHealthType}
                    ideaType={editIdeaType} setIdeaType={setEditIdeaType}
                    ideaStatus={editIdeaStatus} setIdeaStatus={setEditIdeaStatus}
                    eventType={editEventType} setEventType={setEditEventType}
                    eventStatus={editEventStatus} setEventStatus={setEditEventStatus}
                    eventTag={editEventTag} setEventTag={setEditEventTag}
                    habit={editHabit} setHabit={setEditHabit} habitNames={habitNames}
                    peopleCategory={editPeopleCategory} setPeopleCategory={setEditPeopleCategory}
                    wordsProject={editWordsProject} setWordsProject={setEditWordsProject}
                    leisurePeriod={editLeisurePeriod} setLeisurePeriod={setEditLeisurePeriod}
                    leisureType={editLeisureType} setLeisureType={setEditLeisureType}
                    sugarPeriod={editSugarPeriod} setSugarPeriod={setEditSugarPeriod}
                    aggregation={editAggregation} setAggregation={setEditAggregation}
                    days={editDays} setDays={setEditDays}
                    redThreshold={editRedThreshold} setRedThreshold={setEditRedThreshold}
                    greenThreshold={editGreenThreshold} setGreenThreshold={setEditGreenThreshold}
                    lowerIsBetter={editLowerIsBetter} setLowerIsBetter={setEditLowerIsBetter}
                    notes={editNotes} setNotes={setEditNotes}
                    onSave={handleUpdate}
                    onCancel={handleCancelEdit}
                    saving={updateThreshold.isPending}
                    saveLabel="Save"
                    onDelete={() => handleDelete(t.id)}
                    deleteConfirming={deletingId === t.id}
                    deleting={deleteThreshold.isPending}
                  />
                </div>
              ) : (
                <div className="flex items-stretch gap-2">
                  <div
                    onClick={() => startEditing(t)}
                    className="flex-1 min-w-0 text-left p-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full shrink-0 ${COLOR_CLASSES[thresholdColors?.get(t.id) ?? 'grey']}`} />
                        <p className="text-sm font-medium text-slate-900">
                          {t.name}
                          <NoteIndicator notes={t.notes} />
                        </p>
                      </div>
                      <div className="flex gap-1.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${SOURCE_COLORS[t.source]}`}>
                          {t.source}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {t.source === 'health' ? t.healthType : t.source === 'ideas' ? `${t.ideaType}${t.ideaStatus ? ` · ${t.ideaStatus}` : ''}` : t.source === 'events' ? `${t.eventTag ?? t.eventType ?? 'All'}${t.eventTag && t.eventType ? ` · ${t.eventType}` : ''}${t.eventStatus ? ` · ${t.eventStatus}` : ''}` : t.source === 'habits' ? t.habit : t.source === 'people' ? `${t.peopleCategory ?? 'All'}${t.aggregation === 'overdueCount' ? ' · overdue' : ''}` : t.source === 'words' ? t.wordsProject : t.source === 'sugar' ? t.sugarPeriod : `${t.leisurePeriod}${t.leisureType ? ` · ${t.leisureType}` : ''}`}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500 ml-5">
                      <span>Red: {t.lowerIsBetter ? '≥' : '≤'} {t.redThreshold}</span>
                      <span>Green: {t.lowerIsBetter ? '≤' : '≥'} {t.greenThreshold}</span>
                      {t.aggregation !== 'lastValue' && <span>{t.aggregation}</span>}
                      {t.days && <span>{t.aggregation === 'countNextNDays' ? `next ${t.days}d` : `${t.days}d`}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 justify-center shrink-0">
                    <button
                      onClick={() => moveThreshold(group, t.id, -1)}
                      disabled={i === 0 || updateThreshold.isPending}
                      aria-label={`Move ${t.name} up`}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-slate-700 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-white transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => moveThreshold(group, t.id, 1)}
                      disabled={i === group.length - 1 || updateThreshold.isPending}
                      aria-label={`Move ${t.name} down`}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-slate-700 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-white transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {group.length === 0 && (
            <div className="text-center py-8 text-slate-400">
              No {cadence.toLowerCase()} thresholds defined
            </div>
          )}
        </div>
      </div>
        )
        })}
      </div>
    </div>
  )
}

function ThresholdForm({
  title,
  name, setName,
  cadence, setCadence,
  source, setSource,
  healthType, setHealthType,
  ideaType, setIdeaType,
  ideaStatus, setIdeaStatus,
  eventType, setEventType,
  eventStatus, setEventStatus,
  eventTag, setEventTag,
  habit, setHabit, habitNames,
  peopleCategory, setPeopleCategory,
  wordsProject, setWordsProject,
  leisurePeriod, setLeisurePeriod,
  leisureType, setLeisureType,
  sugarPeriod, setSugarPeriod,
  aggregation, setAggregation,
  days, setDays,
  redThreshold, setRedThreshold,
  greenThreshold, setGreenThreshold,
  lowerIsBetter, setLowerIsBetter,
  notes, setNotes,
  onSave,
  onCancel,
  saving,
  saveLabel,
  onDelete,
  deleteConfirming,
  deleting,
}: {
  title: string
  name: string; setName: (v: string) => void
  cadence: ThresholdCadence; setCadence: (v: ThresholdCadence) => void
  source: ThresholdSource; setSource: (v: ThresholdSource) => void
  healthType: LocalHealthRecord['type']; setHealthType: (v: LocalHealthRecord['type']) => void
  ideaType: LocalIdeasRecord['type']; setIdeaType: (v: LocalIdeasRecord['type']) => void
  ideaStatus: IdeaStatusFilter; setIdeaStatus: (v: IdeaStatusFilter) => void
  eventType: EventTypeFilter; setEventType: (v: EventTypeFilter) => void
  eventStatus: EventStatusFilter; setEventStatus: (v: EventStatusFilter) => void
  eventTag: EventTagFilter; setEventTag: (v: EventTagFilter) => void
  habit: string; setHabit: (v: string) => void; habitNames: string[]
  peopleCategory: PeopleCategoryFilter; setPeopleCategory: (v: PeopleCategoryFilter) => void
  wordsProject: LocalWordsRecord['project'] | 'All'; setWordsProject: (v: LocalWordsRecord['project'] | 'All') => void
  leisurePeriod: LeisurePeriod; setLeisurePeriod: (v: LeisurePeriod) => void
  leisureType: LeisureTypeFilter; setLeisureType: (v: LeisureTypeFilter) => void
  sugarPeriod: SugarThresholdPeriod; setSugarPeriod: (v: SugarThresholdPeriod) => void
  aggregation: LocalThresholdsRecord['aggregation']; setAggregation: (v: LocalThresholdsRecord['aggregation']) => void
  days: string; setDays: (v: string) => void
  redThreshold: string; setRedThreshold: (v: string) => void
  greenThreshold: string; setGreenThreshold: (v: string) => void
  lowerIsBetter: boolean; setLowerIsBetter: (v: boolean) => void
  notes: string; setNotes: (v: string) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
  saveLabel: string
  onDelete?: () => void
  deleteConfirming?: boolean
  deleting?: boolean
}) {
  return (
    <div className="p-4 rounded-lg border border-blue-300 bg-blue-50 space-y-4">
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Sugar, Steps/wk"
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Cadence</label>
        <div className="grid grid-cols-2 gap-2">
          {CADENCES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCadence(c)}
              className={`py-3 rounded-lg font-medium transition-colors ${
                cadence === c
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Source</label>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value as ThresholdSource)}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          >
            <option value="health">Health</option>
            <option value="ideas">Ideas</option>
            <option value="events">Events</option>
            <option value="habits">Habits</option>
            <option value="people">People</option>
            <option value="words">Words</option>
            <option value="leisure">Leisure</option>
            <option value="sugar">Blood Sugar</option>
          </select>
        </div>
        {source === 'health' ? (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Health Type</label>
            <select
              value={healthType}
              onChange={(e) => setHealthType(e.target.value as LocalHealthRecord['type'])}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              {HEALTH_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        ) : source === 'ideas' ? (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Idea Type</label>
            <select
              value={ideaType}
              onChange={(e) => setIdeaType(e.target.value as LocalIdeasRecord['type'])}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              {IDEA_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        ) : source === 'events' ? (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Event Type</label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value as EventTypeFilter)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              {EVENT_TYPE_FILTERS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        ) : source === 'habits' ? (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Habit</label>
            <select
              value={habit}
              onChange={(e) => setHabit(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              {habitNames.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
        ) : source === 'people' ? (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
            <select
              value={peopleCategory}
              onChange={(e) => setPeopleCategory(e.target.value as PeopleCategoryFilter)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              {PEOPLE_CATEGORY_FILTERS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        ) : source === 'words' ? (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Words Project</label>
            <select
              value={wordsProject}
              onChange={(e) => setWordsProject(e.target.value as LocalWordsRecord['project'] | 'All')}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              {WORDS_PROJECTS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        ) : source === 'leisure' ? (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Leisure Period</label>
            <select
              value={leisurePeriod}
              onChange={(e) => setLeisurePeriod(e.target.value as LeisurePeriod)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              {LEISURE_PERIODS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Sugar Period</label>
            <select
              value={sugarPeriod}
              onChange={(e) => setSugarPeriod(e.target.value as SugarThresholdPeriod)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              {SUGAR_PERIODS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {source === 'leisure' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Leisure Type</label>
            <select
              value={leisureType}
              onChange={(e) => setLeisureType(e.target.value as LeisureTypeFilter)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              {LEISURE_TYPE_FILTERS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        )}
        {source === 'ideas' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Idea Status</label>
            <select
              value={ideaStatus}
              onChange={(e) => setIdeaStatus(e.target.value as IdeaStatusFilter)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              {IDEA_STATUS_FILTERS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}
        {source === 'events' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Event Tag</label>
            <select
              value={eventTag}
              onChange={(e) => setEventTag(e.target.value as EventTagFilter)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              {EVENT_TAG_FILTERS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        )}
        {source === 'events' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Event Status</label>
            <select
              value={eventStatus}
              onChange={(e) => setEventStatus(e.target.value as EventStatusFilter)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              {EVENT_STATUS_FILTERS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}
        {(source === 'ideas' || source === 'events') && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Period</label>
            <select
              value={ideasAggregation(aggregation)}
              onChange={(e) => setAggregation(e.target.value as LocalThresholdsRecord['aggregation'])}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              {IDEAS_AGGREGATIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>
        )}
        {source === 'habits' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Measure</label>
            <select
              value={habitsAggregation(aggregation)}
              onChange={(e) => setAggregation(e.target.value as LocalThresholdsRecord['aggregation'])}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              {HABITS_AGGREGATIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>
        )}
        {source === 'people' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Measure</label>
            <select
              value={peopleAggregation(aggregation)}
              onChange={(e) => setAggregation(e.target.value as LocalThresholdsRecord['aggregation'])}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              {PEOPLE_AGGREGATIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>
        )}
        {(source === 'health' || source === 'words' || source === 'sugar') && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Aggregation</label>
            <select
              value={aggregation}
              onChange={(e) => setAggregation(e.target.value as LocalThresholdsRecord['aggregation'])}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              {(source === 'sugar' ? SUGAR_AGGREGATIONS : AGGREGATIONS).map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        )}
        {(usesDays(aggregation) || source === 'ideas' || source === 'events') && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Days</label>
            <input
              type="number"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              placeholder="7"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
            />
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Red Threshold</label>
          <input
            type="number"
            step="any"
            value={redThreshold}
            onChange={(e) => setRedThreshold(e.target.value)}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Green Threshold</label>
          <input
            type="number"
            step="any"
            value={greenThreshold}
            onChange={(e) => setGreenThreshold(e.target.value)}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={lowerIsBetter}
          onChange={(e) => setLowerIsBetter(e.target.checked)}
          className="rounded border-slate-300"
        />
        Lower is better (e.g. Sugar, Weight)
      </label>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. what each score means"
          rows={3}
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none bg-white"
        />
      </div>
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-lg font-medium"
        >
          Cancel
        </button>
        {onDelete && (
          <button
            onClick={onDelete}
            disabled={deleting}
            className={`py-3 px-4 rounded-lg font-medium ${
              deleteConfirming
                ? 'bg-red-600 text-white'
                : 'bg-red-50 text-red-600'
            }`}
          >
            {deleting ? '...' : deleteConfirming ? 'Confirm' : 'Delete'}
          </button>
        )}
        <button
          onClick={onSave}
          disabled={!name.trim() || saving}
          className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50"
        >
          {saving ? 'Saving...' : saveLabel}
        </button>
      </div>
    </div>
  )
}
