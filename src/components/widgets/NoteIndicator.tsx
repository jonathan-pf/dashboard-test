import { useState } from 'react'
import { createPortal } from 'react-dom'

interface NoteIndicatorProps {
  notes: string | null
}

// Small tappable icon shown next to a goal's name when it has notes.
// Rendered inside clickable rows, so it stops propagation and portals
// its popover to document.body to avoid nesting inside row buttons.
export function NoteIndicator({ notes }: NoteIndicatorProps) {
  const [open, setOpen] = useState(false)

  if (!notes) return null

  return (
    <>
      <span
        role="button"
        tabIndex={0}
        aria-label="View note"
        title="View note"
        onClick={(e) => {
          e.stopPropagation()
          e.preventDefault()
          setOpen(true)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.stopPropagation()
            e.preventDefault()
            setOpen(true)
          }
        }}
        className="inline-flex items-center justify-center align-middle ml-1.5 w-5 h-5 rounded-full bg-amber-100 text-amber-600 hover:bg-amber-200 active:bg-amber-300 transition-colors flex-shrink-0 cursor-pointer"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </span>
      {open &&
        createPortal(
          <div
            className="fixed inset-0 bg-black/30 z-[60] flex items-center justify-center p-6"
            onClick={(e) => {
              e.stopPropagation()
              setOpen(false)
            }}
          >
            <div
              className="bg-white w-full max-w-sm rounded-xl shadow-xl p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">
                Notes
              </p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{notes}</p>
              <button
                onClick={() => setOpen(false)}
                className="w-full mt-4 py-2.5 bg-slate-100 text-slate-600 rounded-lg font-medium hover:bg-slate-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
