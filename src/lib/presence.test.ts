import { describe, expect, it } from 'vitest'
import { activityOf, dedupePeers, describeActivity, firstName } from './presence'

describe('presence helpers', () => {
  it('parses untrusted peer state defensively', () => {
    expect(activityOf({ page: 'pack', packId: 'p1', packTitle: 'DCF', testing: true })).toMatchObject({ page: 'pack', packId: 'p1', testing: true })
    expect(activityOf({ page: 'hacker', testing: 'yes', packTitle: 'x'.repeat(500) })).toMatchObject({ page: 'other', testing: false, packTitle: null })
    expect(activityOf({})).toMatchObject({ page: 'other', packId: null })
  })
  it('keeps one entry per person across tabs', () => {
    const peers = [
      { userId: 'a', userName: 'A', joinedAt: '2026-11-23T10:00:00Z', state: { page: 'shelves' } },
      { userId: 'a', userName: 'A', joinedAt: '2026-11-23T10:05:00Z', state: { page: 'publish' } },
      { userId: 'b', userName: 'B', joinedAt: '2026-11-23T10:01:00Z', state: {} },
    ]
    const out = dedupePeers(peers)
    expect(out).toHaveLength(2)
    expect(out.find((p) => p.userId === 'a')?.state.page).toBe('publish')
  })
  it('describes activity in plain words', () => {
    const base = { packId: 'p', packTitle: 'DCF', subject: 'Finance' }
    expect(describeActivity({ ...base, page: 'pack', testing: true })).toContain('blind-testing')
    expect(describeActivity({ ...base, page: 'pack', testing: false })).toContain('reading')
    expect(describeActivity({ ...base, page: 'publish', testing: false })).toBe('is writing a new pack')
    expect(describeActivity({ ...base, page: 'other', testing: false })).toBe('is in the shop')
  })
  it('uses first names', () => {
    expect(firstName('Samyam Bista')).toBe('Samyam')
    expect(firstName('  ')).toBe('A reader')
  })
})
