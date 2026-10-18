import { writeFileSync } from 'node:fs'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TrafficLightDisplay, TrafficLightWidgets } from '@/components/widgets/TrafficLightWidget'
import { Thresholds } from '@/pages/Thresholds'
import type { LocalThresholdsRecord } from '@/types/airtable'
const mock = vi.hoisted(() => ({ rows: [] as LocalThresholdsRecord[], update: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/hooks/useAirtableData', () => ({
  useThresholds: () => mock.rows, useHabitDaysSinceLast: () => 0, useHabitCountLastDays: () => 0,
  useAllThresholdColors: () => new Map(mock.rows.map(r => [r.id, 'red'])), useHabitNames: () => ['Example'],
  useCreateThreshold: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateThreshold: () => ({ mutateAsync: mock.update, isPending: false }),
  useDeleteThreshold: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))
function row(id: string, critical?: boolean): LocalThresholdsRecord {
  return { id, name: id, critical, source: 'habits', cadence: 'Daily', habit: 'Example', aggregation: 'daysSinceLast', days: 7, redThreshold: 7, greenThreshold: 1, lowerIsBetter: true, ruleIds: [], notes: null, order: 0, healthType: null, ideaType: null, ideaStatus: null, eventType: null, eventStatus: null, eventTag: null, peopleCategory: null, wordsProject: null, leisurePeriod: null, leisureType: null, sugarPeriod: null, createdTime: "2026-10-18" }
}
beforeEach(() => { mock.rows = []; mock.update.mockClear() })
describe('Critical presentation', () => {
  it('renders synthetic review evidence from the real display component', () => {
    const { container } = render(<div style={{padding: 24, maxWidth: 700}}><h1>Synthetic threshold preview</h1><div className="grid grid-cols-3 gap-3">
      <TrafficLightDisplay critical loading={false} color="red" label="Critical example" displayValue={0} thresholdHint="Saved value · demo" />
      <TrafficLightDisplay loading={false} color="red" label="Nice-to-have example" displayValue={0} thresholdHint="Saved value · demo" />
      <TrafficLightDisplay loading={false} color="grey" label="Missing example" displayValue="—" thresholdHint="No data · demo" />
    </div></div>)
    expect(screen.getAllByRole('img', {name: 'red'})).toHaveLength(2)
    writeFileSync('/tmp/dashboard-critical-preview.html', container.innerHTML)
  })
  for (const flags of [[undefined, undefined], [false, false], [true, false], [true, true]]) {
    it(`keeps every tile in source order for ${String(flags)}`, () => {
      mock.rows = flags.map((flag, i) => row(`Synthetic ${i}`, flag))
      const { container } = render(<MemoryRouter><TrafficLightWidgets /></MemoryRouter>)
      const labels = [...container.querySelectorAll('p')].filter(p => p.textContent?.startsWith('Synthetic'))
      expect(labels.map(p => p.textContent?.split(' —')[0])).toEqual(['Synthetic 0', 'Synthetic 1'])
      labels.forEach((label, i) => expect(label).toHaveClass(flags[i] === true ? 'font-bold' : 'font-normal'))
      expect(screen.getAllByRole('img', { name: 'green' })).toHaveLength(2)
    })
  }
  it('leaves RAG saturated, zero visible, and missing/loading distinct', () => {
    const { rerender } = render(<TrafficLightDisplay critical={false} loading={false} color="red" label="Synthetic" displayValue={0} thresholdHint="Saved value" />)
    expect(screen.getByRole('img', { name: 'red' })).toHaveClass('bg-red-500')
    expect(screen.getByText('0')).toBeVisible()
    rerender(<TrafficLightDisplay critical loading={false} color="grey" label="Synthetic" displayValue="—" thresholdHint="No matching data" />)
    expect(screen.getByRole('img', { name: 'No data' })).toHaveClass('bg-slate-300')
    expect(screen.getByText('—')).toBeVisible()
    rerender(<TrafficLightDisplay critical loading color="grey" label="Synthetic" displayValue="—" thresholdHint="Loading" />)
    expect(screen.getByLabelText('Loading')).toBeVisible(); expect(screen.queryByText('—')).toBeNull()
  })
  it('editor can explicitly untick Critical without changing targets', async () => {
    mock.rows = [row('Synthetic rule', true)]
    render(<MemoryRouter><Thresholds /></MemoryRouter>)
    fireEvent.click(screen.getByText('Synthetic rule'))
    const checkbox = screen.getByLabelText('Critical (display priority only)')
    expect(checkbox).toBeChecked(); fireEvent.click(checkbox)
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /save/i })) })
    expect(mock.update).toHaveBeenCalledWith(expect.objectContaining({ updates: expect.objectContaining({ critical: false, redThreshold: 7, greenThreshold: 1 }) }))
  })
})
