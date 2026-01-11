import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useScoping, useCreateScoping, useUpdateScoping } from '@/hooks/useAirtableData'
import { SCOPING_TYPES, type LocalScopingRecord, type ScopingType } from '@/types/airtable'

export function Scoping() {
  const [filterType, setFilterType] = useState<ScopingType | 'All'>('All')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<ScopingType>(SCOPING_TYPES[0])

  // Edit state
  const [editingItem, setEditingItem] = useState<LocalScopingRecord | null>(null)
  const [editName, setEditName] = useState('')
  const [editType, setEditType] = useState<ScopingType>(SCOPING_TYPES[0])

  const scoping = useScoping()
  const createScoping = useCreateScoping()
  const updateScoping = useUpdateScoping()

  const filteredScoping = filterType === 'All'
    ? scoping
    : scoping?.filter(item => item.type === filterType)

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  // Group items by type for summary
  const countByType = SCOPING_TYPES.reduce((acc, type) => {
    acc[type] = scoping?.filter(s => s.type === type).length ?? 0
    return acc
  }, {} as Record<ScopingType, number>)

  const handleCreate = async () => {
    if (!newName.trim()) return

    await createScoping.mutateAsync({
      name: newName.trim(),
      type: newType,
      created: new Date().toISOString().split('T')[0],
    })

    setNewName('')
    setNewType(SCOPING_TYPES[0])
    setShowCreateForm(false)
  }

  const handleCancelCreate = () => {
    setNewName('')
    setNewType(SCOPING_TYPES[0])
    setShowCreateForm(false)
  }

  const startEditing = (item: LocalScopingRecord) => {
    setEditingItem(item)
    setEditName(item.name)
    setEditType(item.type)
  }

  const handleUpdate = async () => {
    if (!editingItem || !editName.trim()) return

    await updateScoping.mutateAsync({
      scopingId: editingItem.id,
      updates: {
        name: editName.trim(),
        type: editType,
      },
    })

    setEditingItem(null)
  }

  const handleCancelEdit = () => {
    setEditingItem(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link
          to="/"
          className="p-2 -ml-2 text-slate-500 hover:text-slate-700"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h2 className="text-2xl font-bold text-slate-900">Scoping</h2>
      </div>

      {/* Summary by Type */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-3">Summary</h3>
        <div className="grid grid-cols-3 gap-3">
          {SCOPING_TYPES.map(type => (
            <div
              key={type}
              className="p-3 bg-slate-50 rounded-lg"
            >
              <p className="text-xs text-slate-500">{type}</p>
              <p className="text-xl font-bold text-slate-900">{countByType[type]}</p>
            </div>
          ))}
        </div>
        <p className="text-sm text-slate-500 mt-3">
          Total: {scoping?.length ?? 0} items
        </p>
      </div>

      {/* Create Form */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        {showCreateForm ? (
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900">New Scoping Item</h3>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Name
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter item name"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Type
              </label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as ScopingType)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                {SCOPING_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCancelCreate}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || createScoping.isPending}
                className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50"
              >
                {createScoping.isPending ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowCreateForm(true)}
            className="w-full py-3 bg-slate-50 text-slate-600 rounded-lg font-medium hover:bg-slate-100 transition-colors"
          >
            + Add Scoping Item
          </button>
        )}
      </div>

      {/* Scoping List */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">All Items</h3>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as ScopingType | 'All')}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white"
          >
            <option value="All">All Types</option>
            {SCOPING_TYPES.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div className="space-y-3">
          {filteredScoping?.map((item) => (
            <div key={item.id}>
              {editingItem?.id === item.id ? (
                // Edit form
                <div className="p-4 rounded-lg border border-blue-300 bg-blue-50 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Type
                    </label>
                    <select
                      value={editType}
                      onChange={(e) => setEditType(e.target.value as ScopingType)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    >
                      {SCOPING_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleCancelEdit}
                      className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-lg font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleUpdate}
                      disabled={!editName.trim() || updateScoping.isPending}
                      className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50"
                    >
                      {updateScoping.isPending ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              ) : (
                // Display view
                <button
                  onClick={() => startEditing(item)}
                  className="w-full text-left p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-slate-900 flex-1">
                      {item.name}
                    </p>
                    <span className="text-xs text-slate-400 whitespace-nowrap">
                      {formatDate(item.created)}
                    </span>
                  </div>
                  {item.type && (
                    <span className="inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                      {item.type}
                    </span>
                  )}
                </button>
              )}
            </div>
          ))}

          {(!filteredScoping || filteredScoping.length === 0) && (
            <div className="text-center py-8 text-slate-400">
              No scoping items found
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
