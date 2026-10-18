import { writeFileSync } from 'node:fs'
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Header } from '@/components/layout/Header'
const state = vi.hoisted(() => ({ isSyncing:false, lastSyncTime:0 as number|null, pendingCount:0 }))
vi.mock('@/stores/syncStore', () => ({ useSyncStore: () => state }))
vi.mock('@/hooks/useAirtableData', () => ({ useCurrentWeek: () => ({weekNumber:42}) }))
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-18T12:00:00Z')); state.lastSyncTime=Date.now(); state.isSyncing=false; state.pendingCount=0 })
afterEach(() => { cleanup(); vi.useRealTimers() })
describe('Header version and freshness', () => {
 it('keeps version beside freshness as minutes and hours pass', () => {
  render(<Header />)
  const group=screen.getByTestId('sync-freshness-version')
  expect(group).toHaveTextContent('Just now·v1.99.1')
  act(() => vi.advanceTimersByTime(60_000)); expect(group).toHaveTextContent('1m ago·v1.99.1')
  act(() => vi.advanceTimersByTime(3_540_000)); expect(group).toHaveTextContent('1h ago·v1.99.1')
 })
 it('keeps version visible when never synced and while syncing', () => {
  state.lastSyncTime=null; const {rerender}=render(<Header />)
  expect(screen.getByTestId('sync-freshness-version')).toHaveTextContent('Never synced·v1.99.1')
  state.isSyncing=true; rerender(<Header />)
  expect(screen.getByText('Syncing...')).toBeVisible(); expect(screen.getByText('v1.99.1')).toBeVisible()
 })
 it('exports real header markup for narrow layout inspection', () => {
  state.pendingCount=3
  const {container}=render(<Header />)
  writeFileSync('/tmp/dashboard-header-preview.html',container.innerHTML)
 })
})
