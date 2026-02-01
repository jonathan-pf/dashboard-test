import { useState, useRef, useEffect } from 'react'
import { WordsBarChart } from '@/components/charts/WordsBarChart'
import {
  useWeeks,
  useCurrentWeekWordsByProject,
  useCurrentWeek,
  useCreateWords,
  useWords,
} from '@/hooks/useAirtableData'
import type { LocalWordsRecord } from '@/types/airtable'

type ProjectType = LocalWordsRecord['project']

export function Words() {
  const [showEntry, setShowEntry] = useState(false)
  const [entryName, setEntryName] = useState('')
  const [entryWords, setEntryWords] = useState('')
  const [entryProject, setEntryProject] = useState<ProjectType>('Arcadia')
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
  const createWords = useCreateWords()

  const today = new Date().toISOString().split('T')[0]

  const handleSubmit = async () => {
    const wordCount = parseInt(entryWords)
    if (!entryName || isNaN(wordCount)) return

    await createWords.mutateAsync({
      name: entryName,
      words: wordCount,
      project: entryProject,
      when: today,
      weekId: currentWeek?.id ?? null,
    })

    setEntryName('')
    setEntryWords('')
    setShowEntry(false)
  }

  const handleCancel = () => {
    setEntryName('')
    setEntryWords('')
    setShowEntry(false)
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Words</h2>

      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-200">
          <p className="text-xs text-slate-500">Arcadia</p>
          <p className="text-2xl font-bold text-blue-600">
            {wordsByProject.Arcadia.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-200">
          <p className="text-xs text-slate-500">Blog</p>
          <p className="text-2xl font-bold text-green-600">
            {wordsByProject.Blog.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-200">
          <p className="text-xs text-slate-500">Notes</p>
          <p className="text-2xl font-bold text-purple-600">
            {wordsByProject.Notes.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-200">
          <p className="text-xs text-slate-500">Novella</p>
          <p className="text-2xl font-bold text-orange-600">
            {wordsByProject.Novella.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-4">Words by Week</h3>
        <WordsBarChart weeks={weeks} loading={!weeks} />
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-4">Quick Entry</h3>

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

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Project
              </label>
              <div className="flex gap-2">
                {(['Arcadia', 'Blog', 'Notes', 'Novella'] as const).map((project) => (
                  <button
                    key={project}
                    onClick={() => setEntryProject(project)}
                    className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                      entryProject === project
                        ? project === 'Arcadia'
                          ? 'bg-blue-600 text-white'
                          : project === 'Blog'
                          ? 'bg-green-600 text-white'
                          : project === 'Notes'
                          ? 'bg-purple-600 text-white'
                          : 'bg-orange-600 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {project}
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
              <button
                onClick={handleSubmit}
                disabled={!entryName || !entryWords || createWords.isPending}
                className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50"
              >
                {createWords.isPending ? 'Saving...' : 'Save'}
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
              className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
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
                    entry.project === 'Arcadia'
                      ? 'bg-blue-100 text-blue-700'
                      : entry.project === 'Blog'
                      ? 'bg-green-100 text-green-700'
                      : entry.project === 'Notes'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-orange-100 text-orange-700'
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
