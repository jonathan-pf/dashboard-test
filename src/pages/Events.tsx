import { useState } from 'react'
import {
  useEvents,
  useCreateEvent,
  useUpdateEvent,
} from '@/hooks/useAirtableData'
import { EVENT_TYPES, EVENT_TYPE_COLORS } from '@/types/airtable'
import type { LocalEventsRecord } from '@/types/airtable'

export function Events() {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState<LocalEventsRecord | null>(null)
  const [eventName, setEventName] = useState('')
  const [eventType, setEventType] = useState<LocalEventsRecord['type']>('Event')
  const [eventDate, setEventDate] = useState('')
  const [eventNotes, setEventNotes] = useState('')

  const events = useEvents()
  const createEvent = useCreateEvent()
  const updateEvent = useUpdateEvent()

  const recentEvents = events?.slice(0, 10) ?? []

  const handleAddEvent = async () => {
    if (!eventName.trim() || !eventDate) return

    await createEvent.mutateAsync({
      name: eventName.trim(),
      type: eventType,
      date: eventDate,
      notes: eventNotes.trim() || null,
    })

    resetForm()
    setShowAddForm(false)
  }

  const handleUpdateEvent = async () => {
    if (!editingEvent || !eventName.trim() || !eventDate) return

    await updateEvent.mutateAsync({
      eventId: editingEvent.id,
      updates: {
        name: eventName.trim(),
        type: eventType,
        date: eventDate,
        notes: eventNotes.trim() || null,
      },
    })

    resetForm()
    setEditingEvent(null)
  }

  const handleEditClick = (event: LocalEventsRecord) => {
    setEditingEvent(event)
    setEventName(event.name)
    setEventType(event.type)
    setEventDate(event.date)
    setEventNotes(event.notes || '')
    setShowAddForm(false)
  }

  const resetForm = () => {
    setEventName('')
    setEventType('Event')
    setEventDate('')
    setEventNotes('')
  }

  const handleCancelAdd = () => {
    resetForm()
    setShowAddForm(false)
  }

  const handleCancelEdit = () => {
    resetForm()
    setEditingEvent(null)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const isFormOpen = showAddForm || editingEvent !== null

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Events</h2>

      {/* Add/Edit Event Form */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">
            {editingEvent ? 'Edit Event' : 'Add Event'}
          </h3>
        </div>

        {isFormOpen ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Name
              </label>
              <input
                type="text"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="Enter event name"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Type
              </label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value as LocalEventsRecord['type'])}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
              >
                {EVENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Date
              </label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Notes (optional)
              </label>
              <textarea
                value={eventNotes}
                onChange={(e) => setEventNotes(e.target.value)}
                placeholder="Add any notes..."
                rows={3}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={editingEvent ? handleCancelEdit : handleCancelAdd}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={editingEvent ? handleUpdateEvent : handleAddEvent}
                disabled={
                  !eventName.trim() ||
                  !eventDate ||
                  createEvent.isPending ||
                  updateEvent.isPending
                }
                className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50"
              >
                {createEvent.isPending || updateEvent.isPending
                  ? 'Saving...'
                  : editingEvent
                  ? 'Update Event'
                  : 'Add Event'}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full py-3 bg-blue-50 text-blue-600 rounded-lg font-medium hover:bg-blue-100 transition-colors"
          >
            + Add Event
          </button>
        )}
      </div>

      {/* Recent Events List */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-4">Recent Events</h3>

        <div className="space-y-2">
          {recentEvents.map((event) => (
            <div
              key={event.id}
              onClick={() => handleEditClick(event)}
              className="p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-slate-900 flex-1">
                  {event.name}
                </p>
                <span className="text-xs text-slate-400 whitespace-nowrap">
                  {formatDate(event.date)}
                </span>
              </div>
              <span
                className={`inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium ${EVENT_TYPE_COLORS[event.type]}`}
              >
                {event.type}
              </span>
              {event.notes && (
                <p className="text-xs text-slate-500 mt-2 line-clamp-2">
                  {event.notes}
                </p>
              )}
            </div>
          ))}

          {recentEvents.length === 0 && (
            <div className="text-center py-8 text-slate-400">No events yet</div>
          )}
        </div>
      </div>
    </div>
  )
}
