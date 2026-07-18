import { useState, useRef, useEffect } from 'react'
import { WordsBarChart } from '@/components/charts/WordsBarChart'
import {
  useWeeks,
  useCurrentWeekWordsByProject,
  useCurrentWeek,
  useCreateWords,
  useUpdateWords,
  useDeleteWords,
  useWords,
  useLocalWordsByWeek,
} from '@/hooks/useAirtableData'
import type { LocalWordsRecord } from '@/types/airtable'

type ProjectType = LocalWordsRecord['project']

const PROJECTS: {
  name: ProjectType
  statText: string
  buttonActive: string
  badge: string
}[] = [
  { name: 'Arcadia', statText: 'text-blue-600', buttonActive: 'bg-blue-600 text-white', badge: 'bg-blue-100 text-blue-700' },
  { name: 'Blog', statText: 'text-green-600', buttonActive: 'bg-green-600 text-white', badge: 'bg-green-100 text-green-700' },
  { name: 'Notes', statText: 'text-purple-600', buttonActive: 'bg-purple-600 text-white', badge: 'bg-purple-100 text-purple-700' },
  { name: 'Novella', statText: 'text-orange-600', buttonActive: 'bg-orange-600 text-white', badge: 'bg-orange-100 text-orange-700' },
  { name: 'Scoping', statText: 'text-pink-600', buttonActive: 'bg-pink-600 text-white', badge: 'bg-pink-100 text-pink-700' },
  { name: 'Cruxes', statText: 'text-teal-600', buttonActive: 'bg-teal-600 text-white', badge: 'bg-teal-100 text-teal-700' },
]

export function Words() {
  const [showEntry, setShowEntry] = useState(false)
  const [entryName, setEntryName] = useState('')
  const [entryWords, setEntryWords] = useState('')
  const [entryProject, setEntryProject] = useState<ProjectType>('Arcadia')
  const [entryWhen, setEntryWhen] = useState('')
  const [editingEntry, setEditingEntry] = useState<LocalWordsRecord | null>(null)
  const [deleteConfirming, setDeleteConfirming] = useState(false)
  const titleInputRef = useRef<HTMLInputElement>(null)

  // Focus input without scrolling to prevent iPad keyboard jump bug
  useEffect(() => {
    if (showEntry && titleInputRef.current) {
      // Small delay to let layout settle, then focus without scrolling
      const timer = setTimeout(() => {
        titleInputRef.current?.focus({ preventScroll: true })
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [showEntry])

  const weeks = useWeeks()
  const currentWeek = useCurrentWeek()
  const wordsByProject = useCurrentWeekWordsByProject()
  const words = useWords()
  const localWordsByWeek = useLocalWordsByWeek()
  const createWords = useCreateWords()
  const updateWords = useUpdateWords()
  const deleteWords = useDeleteWords()

  const today = new Date().toISOString().split('T')[0]

  const resetForm = () => {
    setEntryName('')
    setEntryWords('')
    setEntryWhen('')
    setEditingEntry(null)
    setDeleteConfirming(false)
    setShowEntry(false)
  }

  const handleSubmit = async () => {
    const wordCount = parseInt(entryWords)
    if (!entryName || isNaN(wordCount)) return

    if (editingEntry) {
      await updateWords.mutateAsync({
        wordsId: editingEntry.id,
        updates: {
          name: entryName,
          words: wordCount,
          project: entryProject,
          when: entryWhen || editingEntry.when,
        },
      })
    } else {
      await createWords.mutateAsync({
        name: entryName,
        words: wordCount,
        project: entryProject,
        when: today,
        weekId: currentWeek?.id ?? null,
      })
    }

    resetForm()
  }

  const handleCancel = () => {
    resetForm()
  }

  const startEdit = (entry: LocalWordsRecord) => {
    setEditingEntry(entry)
    setEntryName(entry.name)
    setEntryWords(String(entry.words))
    setEntryProject(entry.project)
    setEntryWhen(entry.when.slice(0, 10))
    setDeleteConfirming(false)
    setShowEntry(true)
  }

  const handleDelete = async () => {
    if (!editingEntry) return
    if (!deleteConfirming) {
      setDeleteConfirming(true)
      return
    }
    await deleteWords.mutateAsync(editingEntry.id)
    resetForm()
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Words</h2>

      <div className="grid grid-cols-3 gap-3">
        {PROJECTS.map((project) => (
          <div key={project.name} className="bg-white rounded-xl p-3 shadow-sm border border-slate-200">
            <p className="text-xs text-slate-500">{project.name}</p>
            <p className={`text-2xl font-bold ${project.statText}`}>
              {wordsByProject[project.name].toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-4">Words by Week</h3>
        <WordsBarChart weeks={weeks} localWordsByWeek={localWordsByWeek} loading={!weeks} />
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-4">
          {editingEntry ? 'Edit Entry' : 'Quick Entry'}
        </h3>

        {showEntry ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Title
              </label>
              <input
                ref={titleInputRef}
                type="text"
                value={entryName}
                onChange={(e) => setEntryName(e.target.value)}
                placeholder="What did you write?"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Word Count
              </label>
              <input
                type="number"
                value={entryWords}
                onChange={(e) => setEntryWords(e.target.value)}
                placeholder="How many words?"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            {editingEntry && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={entryWhen}
                  onChange={(e) => setEntryWhen(e.target.value)}
                  max={today}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Project
              </label>
              <div className="grid grid-cols-3 gap-2">
                {PROJECTS.map((project) => (
                  <button
                    key={project.name}
                    onClick={() => setEntryProject(project.name)}
                    className={`py-2 rounded-lg font-medium transition-colors ${
                      entryProject === project.name
                        ? project.buttonActive
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {project.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-lg font-medium"
              >
                Cancel
              </button>
              {editingEntry && (
                <button
                  onClick={handleDelete}
                  disabled={deleteWords.isPending}
                  className={`py-3 px-4 rounded-lg font-medium ${
                    deleteConfirming
                      ? 'bg-red-600 text-white'
                      : 'bg-red-50 text-red-600'
                  }`}
                >
                  {deleteWords.isPending ? '...' : deleteConfirming ? 'Confirm' : 'Delete'}
                </button>
              )}
              <button
                onClick={handleSubmit}
                disabled={!entryName || !entryWords || createWords.isPending || updateWords.isPending}
                className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50"
              >
                {createWords.isPending || updateWords.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowEntry(true)}
            className="w-full py-3 bg-blue-50 text-blue-600 rounded-lg font-medium hover:bg-blue-100 transition-colors"
          >
            + Log Words
          </button>
        )}
      </div>

      {/* Recent entries */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-4">Recent Entries</h3>
        <div className="space-y-2">
          {(words?.slice(0, 10) ?? []).map((entry) => (
            <div
              key={entry.id}
              onClick={() => startEdit(entry)}
              className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0 cursor-pointer hover:bg-slate-50 rounded transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {entry.name}
                </p>
                <p className="text-xs text-slate-500">
                  {new Date(entry.when).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    PROJECTS.find((p) => p.name === entry.project)?.badge ??
                    'bg-slate-100 text-slate-700'
                  }`}
                >
                  {entry.project}
                </span>
                <span className="font-medium text-slate-900">
                  {entry.words.toLocaleString()}
                </span>
              </div>
            </div>
          ))}
          {(!words || words.length === 0) && (
            <p className="text-sm text-slate-400 text-center py-4">
              No entries yet
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
