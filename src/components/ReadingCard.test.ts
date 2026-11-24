import { describe, expect, it } from 'vitest'
import { tallyPoints } from './ReadingCard'

const rec = <T,>(recordId: string, data: T) => ({ recordId, data, createdBy: '', createdAt: '', updatedAt: '' })

describe('tallyPoints', () => {
  it('counts votes cast and wins on your own packs, but not house-collection packs', () => {
    const packs = [
      rec('mine', { ownerId: 'me', byline: null }),
      rec('house', { ownerId: 'me', byline: 'House collection' }),
    ] as never
    const trials = [
      rec('t1', { testerId: 'me', packId: 'x', status: 'voted', counted: 1, packWon: 0 }),
      rec('t2', { testerId: 'bob', packId: 'mine', status: 'voted', counted: 1, packWon: 1 }),
      rec('t3', { testerId: 'bob', packId: 'house', status: 'voted', counted: 1, packWon: 1 }),
      rec('t4', { testerId: 'me', packId: 'x', status: 'pending' }),
    ] as never
    expect(tallyPoints('me', trials, packs)).toEqual({ votes: 1, wins: 1, pts: 4 })
  })
})
