import { describe, expect, it } from 'vitest'
import { HOUSE_PACKS } from './house-packs'
import {
  badgeFor,
  confidenceScore,
  coverIndex,
  packFileName,
  packToMarkdown,
  packWon,
  pickSide,
  points,
  rankFor,
  trialsToday,
  validatePack,
  validateRequest,
  winRate,
  withPackSystem,
} from './xchange'

const good = {
  title: 'Proof-writing coach',
  subject: 'Math',
  summary: 'Makes the AI write proofs step by step and name each technique.',
  content: 'x'.repeat(100),
  sampleRequest: 'Prove there are infinitely many primes.',
}

describe('validation', () => {
  it('accepts a complete pack and rejects each bad field', () => {
    expect(validatePack(good)).toBeNull()
    expect(validatePack({ ...good, title: ' ' })).toMatch(/title/i)
    expect(validatePack({ ...good, subject: 'Astrology' })).toMatch(/subject/i)
    expect(validatePack({ ...good, summary: '' })).toMatch(/summary/i)
    expect(validatePack({ ...good, content: 'short' })).toMatch(/80/)
    expect(validatePack({ ...good, content: 'x'.repeat(20_001) })).toMatch(/capped/i)
    expect(validatePack({ ...good, sampleRequest: '' })).toMatch(/request/i)
  })
  it('in partial mode only checks keys present', () => {
    expect(validatePack({ summary: 'New' }, { partial: true })).toBeNull()
    expect(validatePack({ title: '' }, { partial: true })).toMatch(/title/i)
  })
  it('checks test requests', () => {
    expect(validateRequest('Explain NPV to a first-year')).toBeNull()
    expect(validateRequest('hi')).not.toBeNull()
    expect(validateRequest(42)).not.toBeNull()
  })
})

describe('blind test mechanics', () => {
  it('splits sides on the coin', () => {
    expect(pickSide(() => 0.2)).toBe('A')
    expect(pickSide(() => 0.7)).toBe('B')
  })
  it('only a vote for the pack side is a win', () => {
    expect(packWon('A', 'A')).toBe(true)
    expect(packWon('B', 'A')).toBe(false)
    expect(packWon('tie', 'A')).toBe(false)
  })
  it('wraps the pack as data inside the system prompt', () => {
    const s = withPackSystem('Be rigorous.')
    expect(s).toContain('<teaching_pack>\nBe rigorous.\n</teaching_pack>')
    expect(s).toMatch(/200-450 words/)
  })
})

describe('scoring', () => {
  it('leaves ties out of the win rate', () => {
    expect(winRate({ trials: 0, wins: 0, ties: 0 })).toBeNull()
    expect(winRate({ trials: 4, wins: 0, ties: 4 })).toBeNull()
    expect(winRate({ trials: 5, wins: 3, ties: 1 })).toBe(0.75)
  })
  it('ranks a proven pack above a one-vote wonder', () => {
    const lucky = confidenceScore({ trials: 1, wins: 1, ties: 0 })
    const proven = confidenceScore({ trials: 40, wins: 30, ties: 0 })
    expect(proven).toBeGreaterThan(lucky)
    expect(confidenceScore({ trials: 0, wins: 0, ties: 0 })).toBe(0)
  })
  it('awards badges only with enough evidence', () => {
    expect(badgeFor({ trials: 2, wins: 2, ties: 0 })).toBe('New arrival')
    expect(badgeFor({ trials: 12, wins: 10, ties: 0 })).toBe('Bestseller')
    expect(badgeFor({ trials: 6, wins: 4, ties: 0 })).toBe('Staff pick')
    expect(badgeFor({ trials: 4, wins: 2, ties: 0 })).toBe('Rising')
    expect(badgeFor({ trials: 5, wins: 1, ties: 0 })).toBe('Needs work')
  })
})

describe('game layer', () => {
  it('scores points and climbs ranks', () => {
    expect(points(4, 2)).toBe(10)
    expect(rankFor(0).title).toBe('Browser')
    expect(rankFor(5).title).toBe('Regular')
    expect(rankFor(119).title).toBe('Critic')
    expect(rankFor(500)).toMatchObject({ title: 'Head Librarian', next: null })
  })
  it('counts only today’s trials (UTC)', () => {
    const now = new Date('2026-11-24T10:00:00Z')
    expect(trialsToday(['2026-11-24T00:00:00Z', '2026-11-24T09:59:00Z', '2026-11-23T23:59:59Z', 'garbage'], now)).toBe(2)
  })
})

describe('files and covers', () => {
  it('makes a safe file name', () => {
    expect(packFileName('DCF: Models / That Hold Up!')).toBe('dcf-models-that-hold-up.md')
    expect(packFileName('!!!')).toBe('pack.md')
  })
  it('exports a usable markdown file', () => {
    const md = packToMarkdown({ title: 'T', subject: 'Math', summary: 'S', content: '  Body  ' })
    expect(md).toContain('# T')
    expect(md).toContain('How to use')
    expect(md.trim().endsWith('Body')).toBe(true)
  })
  it('gives each pack a stable cover colour', () => {
    expect(coverIndex('abc', 6)).toBe(coverIndex('abc', 6))
    expect(coverIndex('abc', 6)).toBeLessThan(6)
  })
})

describe('house collection', () => {
  it('every pack passes the same validation as a user-published pack', () => {
    for (const p of HOUSE_PACKS) expect(validatePack(p), p.title).toBeNull()
  })
  it('covers every section and has unique titles', () => {
    expect(new Set(HOUSE_PACKS.map((p) => p.subject)).size).toBe(12)
    expect(new Set(HOUSE_PACKS.map((p) => p.title)).size).toBe(HOUSE_PACKS.length)
    expect(HOUSE_PACKS.length).toBeGreaterThanOrEqual(25)
  })
})
