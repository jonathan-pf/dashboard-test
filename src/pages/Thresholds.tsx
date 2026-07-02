import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useThresholds, useCreateThreshold, useUpdateThreshold, useDeleteThreshold, useAllThresholdColors } from '@/hooks/useAirtableData'
import type { LocalThresholdsRecord, LocalHealthRecord, LocalIdeasRecord, LocalWordsRecord, SugarThresholdPeriod } from '@/types/airtable'
import type { TrafficLightColor } from '@/config/trafficLights'

type ThresholdSource = 'health' | 'ideas' | 'words' | 'leisure' | 'sugar'

const HEALTH_TYPES: LocalHealthRecord['type'][] = ['Units', 'Glucose', 'Reps', 'Willpoint', 'Tidy', 'Weight', 'Frog', 'Treat']
const IDEA_TYPES: LocalIdeasRecord['type'][] = ['Revelation', 'Crux', 'Driver', 'Bottleneck', 'Step', 'Failure', 'Bit', 'Stage', 'Feature', 'Blog', 'Question', 'Skill', 'Gen', 'Model', 'Agenda']
const WORDS_PROJECTS: (LocalWordsRecord['project'] | 'All')[] = ['All', 'Arcadia', 'Blog', 'Notes', 'Novella']
const AGGREGATIONS: LocalThresholdsRecord['aggregation'][] = ['lastValue', 'sumLast7Days', 'averageLast3', 'countLastNDays', 'sumLastNDays', 'averageLastNDays']
// Blood-sugar thresholds check an average, so only these aggregations make sense.
const SUGAR_AGGREGATIONS: LocalThresholdsRecord['aggregation'][] = ['lastValue', 'averageLast3', 'averageLastNDays']
const SUGAR_PERIODS: SugarThresholdPeriod[] = ['01:00-07:00', '07:00-13:00', '13:00-19:00', '19:00-01:00', 'All day']

// Aggregations that need a "Days" window
const usesDays = (agg: LocalThresholdsRecord['aggregation']) =>
  agg === 'countLastNDays' || agg === 'sumLastNDays' || agg === 'averageLastNDays'

const COLOR_CLASSES: Record<TrafficLightColor, string> = {
  green: 'bg-green-500',
  amber: 'bg-amber-400',
  red: 'bg-red-500',
  grey: 'bg-slate-300',
}

const LEISURE_PERIODS: ('This Week' | 'Last Week')[] = ['This Week', 'Last Week']

const SOURCE_COLORS: Record<ThresholdSource, string> = {
  health: 'bg-purple-100 text-purple-700',
  ideas: 'bg-blue-100 text-blue-700',
  words: 'bg-orange-100 text-orange-700',
  leisure: 'bg-green-100 text-green-700',
  sugar: 'bg-amber-100 text-amber-700',
}

export function Thresholds() {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newSource, setNewSource] = useState<ThresholdSource>('health')
  const [newHealthType, setNewHealthType] = useState<LocalHealthRecord['type']>('Tidy')
  const [newIdeaType, setNewIdeaType] = useState<LocalIdeasRecord['type']>('Revelation')
  const [newWordsProject, setNewWordsProject] = useState<LocalWordsRecord['project'] | 'All'>('All')
  const [newLeisurePeriod, setNewLeisurePeriod] = useState<'This Week' | 'Last Week'>('This Week')
  const [newSugarPeriod, setNewSugarPeriod] = useState<SugarThresholdPeriod>('All day')
  const [newAggregation, setNewAggregation] = useState<LocalThresholdsRecord['aggregation']>('lastValue')
  const [newDays, setNewDays] = useState('7')
  const [newRedThreshold, setNewRedThreshold] = useState('')
  const [newGreenThreshold, setNewGreenThreshold] = useState('')
  const [newLowerIsBetter, setNewLowerIsBetter] = useState(false)

  const [editingThreshold, setEditingThreshold] = useState<LocalThresholdsRecord | null>(null)
  const [editName, setEditName] = useState('')
  const [editSource, setEditSource] = useState<ThresholdSource>('health')
  const [editHealthType, setEditHealthType] = useState<LocalHealthRecord['type']>('Tidy')
  const [editIdeaType, setEditIdeaType] = useState<LocalIdeasRecord['type']>('Revelation')
  const [editWordsProject, setEditWordsProject] = useState<LocalWordsRecord['project'] | 'All'>('All')
  const [editLeisurePeriod, setEditLeisurePeriod] = useState<'This Week' | 'Last Week'>('This Week')
  const [editSugarPeriod, setEditSugarPeriod] = useState<SugarThresholdPeriod>('All day')
  const [editAggregation, setEditAggregation] = useState<LocalThresholdsRecord['aggregation']>('lastValue')
  const [editDays, setEditDays] = useState('7')
  const [editRedThreshold, setEditRedThreshold] = useState('')
  const [editGreenThreshold, setEditGreenThreshold] = useState('')
  const [editLowerIsBetter, setEditLowerIsBetter] = useState(false)

  const [deletingId, setDeletingId] = useState<string | null>(null)

  const thresholds = useThresholds()
  const thresholdColors = useAllThresholdColors()
  const createThreshold = useCreateThreshold()
  const updateThreshold = useUpdateThreshold()
  const deleteThreshold = useDeleteThreshold()

  const colorCounts = { green: 0, amber: 0, red: 0, grey: 0 }
  if (thresholdColors) {
    for (const color of thresholdColors.values()) {
      colorCounts[color]++
    }
  }

  const handleSourceChange = (source: ThresholdSource, setAgg: (v: LocalThresholdsRecord['aggregation']) => void) => {
    if (source === 'health') {
      setAgg('lastValue')
    } else if (source === 'ideas') {
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
      source: newSource,
      healthType: newSource === 'health' ? newHealthType : null,
      ideaType: newSource === 'ideas' ? newIdeaType : null,
      wordsProject: newSource === 'words' ? newWordsProject : null,
      leisurePeriod: newSource === 'leisure' ? newLeisurePeriod : null,
      sugarPeriod: newSource === 'sugar' ? newSugarPeriod : null,
      aggregation: newSource === 'ideas' ? 'countLastNDays' : newSource === 'leisure' ? 'lastValue' : newAggregation,
      days: usesDays(newAggregation) || newSource === 'ideas' ? Number(newDays) || 7 : null,
      redThreshold: Number(newRedThreshold) || 0,
      greenThreshold: Number(newGreenThreshold) || 0,
      lowerIsBetter: newLowerIsBetter,
      order: thresholds?.length ?? 0, // append to the end of the display order
      ruleIds: [],
    })

    setNewName('')
    setNewSource('health')
    setNewHealthType('Tidy')
    setNewIdeaType('Revelation')
    setNewWordsProject('All')
    setNewLeisurePeriod('This Week')
    setNewSugarPeriod('All day')
    setNewAggregation('lastValue')
    setNewDays('7')
    setNewRedThreshold('')
    setNewGreenThreshold('')
    setNewLowerIsBetter(false)
    setShowCreateForm(false)
  }

  const handleCancelCreate = () => {
    setNewName('')
    setShowCreateForm(false)
  }

  const startEditing = (t: LocalThresholdsRecord) => {
    setEditingThreshold(t)
    setEditName(t.name)
    setEditSource(t.source)
    setEditHealthType((t.healthType as LocalHealthRecord['type']) ?? 'Tidy')
    setEditIdeaType((t.ideaType as LocalIdeasRecord['type']) ?? 'Revelation')
    setEditWordsProject((t.wordsProject as LocalWordsRecord['project'] | 'All') ?? 'All')
    setEditLeisurePeriod(t.leisurePeriod ?? 'This Week')
    setEditSugarPeriod(t.sugarPeriod ?? 'All day')
    setEditAggregation(t.aggregation)
    setEditDays(String(t.days ?? 7))
    setEditRedThreshold(String(t.redThreshold))
    setEditGreenThreshold(String(t.greenThreshold))
    setEditLowerIsBetter(t.lowerIsBetter)
  }

  const handleUpdate = async () => {
    if (!editingThreshold || !editName.trim()) return

    await updateThreshold.mutateAsync({
      thresholdId: editingThreshold.id,
      updates: {
        name: editName.trim(),
        source: editSource,
        healthType: editSource === 'health' ? editHealthType : null,
        ideaType: editSource === 'ideas' ? editIdeaType : null,
        wordsProject: editSource === 'words' ? editWordsProject : null,
        leisurePeriod: editSource === 'leisure' ? editLeisurePeriod : null,
        sugarPeriod: editSource === 'sugar' ? editSugarPeriod : null,
        aggregation: editSource === 'ideas' ? 'countLastNDays' : editSource === 'leisure' ? 'lastValue' : editAggregation,
        days: usesDays(editAggregation) || editSource === 'ideas' ? Number(editDays) || 7 : null,
        redThreshold: Number(editRedThreshold) || 0,
        greenThreshold: Number(editGreenThreshold) || 0,
        lowerIsBetter: editLowerIsBetter,
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

  // Move a threshold up/down in the display order. Normalises order values to
  // the current display index (covers records with no Order yet), then swaps
  // the moved row with its neighbour. Only changed records are written.
  const moveThreshold = async (id: string, direction: -1 | 1) => {
    if (!thresholds || updateThreshold.isPending) return
    const idx = thresholds.findIndex((t) => t.id === id)
    const target = idx + direction
    if (idx < 0 || target < 0 || target >= thresholds.length) return

    const updates: Array<{ id: string; order: number }> = []
    thresholds.forEach((t, i) => {
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
            source={newSource} setSource={(s) => { setNewSource(s); handleSourceChange(s, setNewAggregation) }}
            healthType={newHealthType} setHealthType={setNewHealthType}
            ideaType={newIdeaType} setIdeaType={setNewIdeaType}
            wordsProject={newWordsProject} setWordsProject={setNewWordsProject}
            leisurePeriod={newLeisurePeriod} setLeisurePeriod={setNewLeisurePeriod}
            sugarPeriod={newSugarPeriod} setSugarPeriod={setNewSugarPeriod}
            aggregation={newAggregation} setAggregation={setNewAggregation}
            days={newDays} setDays={setNewDays}
            redThreshold={newRedThreshold} setRedThreshold={setNewRedThreshold}
            greenThreshold={newGreenThreshold} setGreenThreshold={setNewGreenThreshold}
            lowerIsBetter={newLowerIsBetter} setLowerIsBetter={setNewLowerIsBetter}
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

      {/* Threshold List */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-4">All Thresholds</h3>
        <div className="space-y-3">
          {thresholds?.map((t, i) => (
            <div key={t.id}>
              {editingThreshold?.id === t.id ? (
                <div className="space-y-4">
                  <ThresholdForm
                    title="Edit Threshold"
                    name={editName} setName={setEditName}
                    source={editSource} setSource={(s) => { setEditSource(s); handleSourceChange(s, setEditAggregation) }}
                    healthType={editHealthType} setHealthType={setEditHealthType}
                    ideaType={editIdeaType} setIdeaType={setEditIdeaType}
                    wordsProject={editWordsProject} setWordsProject={setEditWordsProject}
                    leisurePeriod={editLeisurePeriod} setLeisurePeriod={setEditLeisurePeriod}
                    sugarPeriod={editSugarPeriod} setSugarPeriod={setEditSugarPeriod}
                    aggregation={editAggregation} setAggregation={setEditAggregation}
                    days={editDays} setDays={setEditDays}
                    redThreshold={editRedThreshold} setRedThreshold={setEditRedThreshold}
                    greenThreshold={editGreenThreshold} setGreenThreshold={setEditGreenThreshold}
                    lowerIsBetter={editLowerIsBetter} setLowerIsBetter={setEditLowerIsBetter}
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
                        <p className="text-sm font-medium text-slate-900">{t.name}</p>
                      </div>
                      <div className="flex gap-1.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${SOURCE_COLORS[t.source]}`}>
                          {t.source}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {t.source === 'health' ? t.healthType : t.source === 'ideas' ? t.ideaType : t.source === 'words' ? t.wordsProject : t.source === 'sugar' ? t.sugarPeriod : t.leisurePeriod}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500 ml-5">
                      <span>Red: {t.lowerIsBetter ? '≥' : '≤'} {t.redThreshold}</span>
                      <span>Green: {t.lowerIsBetter ? '≤' : '≥'} {t.greenThreshold}</span>
                      {t.aggregation !== 'lastValue' && <span>{t.aggregation}</span>}
                      {t.days && <span>{t.days}d</span>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 justify-center shrink-0">
                    <button
                      onClick={() => moveThreshold(t.id, -1)}
                      disabled={i === 0 || updateThreshold.isPending}
                      aria-label={`Move ${t.name} up`}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-slate-700 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-white transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => moveThreshold(t.id, 1)}
                      disabled={i === (thresholds?.length ?? 0) - 1 || updateThreshold.isPending}
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

          {(!thresholds || thresholds.length === 0) && (
            <div className="text-center py-8 text-slate-400">
              No thresholds defined
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ThresholdForm({
  title,
  name, setName,
  source, setSource,
  healthType, setHealthType,
  ideaType, setIdeaType,
  wordsProject, setWordsProject,
  leisurePeriod, setLeisurePeriod,
  sugarPeriod, setSugarPeriod,
  aggregation, setAggregation,
  days, setDays,
  redThreshold, setRedThreshold,
  greenThreshold, setGreenThreshold,
  lowerIsBetter, setLowerIsBetter,
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
  source: ThresholdSource; setSource: (v: ThresholdSource) => void
  healthType: LocalHealthRecord['type']; setHealthType: (v: LocalHealthRecord['type']) => void
  ideaType: LocalIdeasRecord['type']; setIdeaType: (v: LocalIdeasRecord['type']) => void
  wordsProject: LocalWordsRecord['project'] | 'All'; setWordsProject: (v: LocalWordsRecord['project'] | 'All') => void
  leisurePeriod: 'This Week' | 'Last Week'; setLeisurePeriod: (v: 'This Week' | 'Last Week') => void
  sugarPeriod: SugarThresholdPeriod; setSugarPeriod: (v: SugarThresholdPeriod) => void
  aggregation: LocalThresholdsRecord['aggregation']; setAggregation: (v: LocalThresholdsRecord['aggregation']) => void
  days: string; setDays: (v: string) => void
  redThreshold: string; setRedThreshold: (v: string) => void
  greenThreshold: string; setGreenThreshold: (v: string) => void
  lowerIsBetter: boolean; setLowerIsBetter: (v: boolean) => void
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
              onChange={(e) => setLeisurePeriod(e.target.value as 'This Week' | 'Last Week')}
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
        {(aggregation === 'countLastNDays' || aggregation === 'sumLastNDays' || aggregation === 'averageLastNDays' || source === 'ideas') && (
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
