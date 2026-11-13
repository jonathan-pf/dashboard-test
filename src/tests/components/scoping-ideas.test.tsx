import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Ideas } from '@/pages/Ideas'
vi.mock('@/hooks/useAirtableData', () => ({
 useIdeas: () => [], useCurrentWeek: () => ({id:'demo-week'}),
 useCreateIdea: () => ({mutateAsync:vi.fn()}), useUpdateIdea: () => ({mutateAsync:vi.fn()}), useDeleteIdea: () => ({mutateAsync:vi.fn()}),
}))
describe('Scoping ideas', () => {
 it.each(['Scoping', 'Review'])('offers %s for filtering and creating ideas', (type) => {
  render(<MemoryRouter><Ideas /></MemoryRouter>)
  expect(screen.getByRole('option', {name:type})).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', {name:/add idea/i}))
  expect(screen.getAllByRole('option', {name:type}).length).toBeGreaterThan(1)
 })
})
