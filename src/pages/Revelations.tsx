import { Link } from 'react-router-dom'
import { useIdeasByType } from '@/hooks/useAirtableData'

export function Revelations() {
  const revelations = useIdeasByType('Revelation')

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/ideas"
          className="p-2 -ml-2 text-slate-500 hover:text-slate-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h2 className="text-2xl font-bold text-slate-900">Revelations</h2>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">All Revelations</h3>
          <span className="text-sm text-slate-500">
            {revelations?.length ?? 0} total
          </span>
        </div>

        <div className="space-y-2">
          {revelations?.map((idea) => (
            <div
              key={idea.id}
              className="p-3 bg-purple-50 rounded-lg"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-slate-900 flex-1">
                  {idea.name}
                </p>
                <span className="text-xs text-slate-400 whitespace-nowrap">
                  {formatDate(idea.when)}
                </span>
              </div>
            </div>
          ))}

          {(!revelations || revelations.length === 0) && (
            <div className="text-center py-8 text-slate-400">
              No revelations yet
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
