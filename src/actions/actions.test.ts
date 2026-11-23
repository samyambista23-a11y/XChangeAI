/**
 * Server-action tests against an in-memory fake of ActionTools, with the AI
 * mocked. They prove the scoring rules hold at the API layer.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ActionResult, ActionTools } from 'deepspace/worker'

vi.mock('ai', () => ({ generateText: vi.fn() }))
vi.mock('deepspace/worker', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('deepspace/worker').catch(() => ({}))
  return {
    ...actual,
    createDeepSpaceAI: vi.fn(() => (id: string) => ({ id })),
    resolveDeepSpaceAgentModel: vi.fn(() => ({ modelId: 'test-model', provider: 'anthropic' })),
  }
})

import { generateText } from 'ai'
import { actions, deps } from './index'

type Row = { recordId: string; data: Record<string, unknown>; createdAt: string }

function makeTools(opts: { failCreateIn?: string } = {}) {
  const db: Record<string, Row[]> = { packs: [], trials: [], trial_keys: [] }
  let n = 0
  const ok = <T,>(data: T) => ({ success: true, data }) as ActionResult<T>
  const tools = {
    async create(c: string, data: Record<string, unknown>) {
      if (opts.failCreateIn === c) return { success: false, error: 'boom' }
      const recordId = `${c}-${++n}`
      db[c].push({ recordId, data: { ...data }, createdAt: deps.now().toISOString() })
      return ok({ recordId })
    },
    async update(c: string, id: string, patch: Record<string, unknown>) {
      const row = db[c].find((r) => r.recordId === id)
      if (!row) return { success: false, error: 'not found' }
      Object.assign(row.data, patch)
      return ok({ recordId: id })
    },
    async remove(c: string, id: string) {
      db[c] = db[c].filter((r) => r.recordId !== id)
      return ok({ recordId: id })
    },
    async get(c: string, id: string) {
      const row = db[c].find((r) => r.recordId === id)
      return row ? ok({ record: row }) : { success: false, error: 'not found' }
    },
    async query(c: string, o?: { where?: Record<string, unknown>; limit?: number }) {
      const where = o?.where ?? {}
      const records = db[c]
        .filter((r) => Object.entries(where).every(([k, v]) => r.data[k] === v))
        .slice(0, o?.limit ?? 50)
      return ok({ records, count: records.length })
    },
    async deleteWhere(c: string, where: Record<string, unknown>, limit = 100) {
      const match = db[c].filter((r) => Object.entries(where).every(([k, v]) => r.data[k] === v)).slice(0, limit)
      db[c] = db[c].filter((r) => !match.includes(r))
      return ok({ deleted: match.length })
    },
  } as unknown as ActionTools
  return { tools, db }
}

const env = {} as never
const run = (name: string, userId: string, params: Record<string, unknown>, tools: ActionTools) =>
  actions[name]({ userId, params, tools, env, callerJwt: 'jwt' })

const pack = {
  title: 'DCF models that hold up',
  subject: 'Finance',
  summary: 'Teaches the AI to build and sanity-check a discounted cash flow model.',
  content:
    'When building a DCF: state every assumption in a table first; use mid-year discounting; ' +
    'show terminal value as a share of total value and flag anything over 75%; end with a sensitivity grid.',
  sampleRequest: 'Value a coffee chain growing revenue 8% a year.',
}

function mockAnswers() {
  vi.mocked(generateText).mockImplementation((async (o: { system: string }) => ({
    text: o.system.includes('<teaching_pack>') ? 'PACK ANSWER' : 'PLAIN ANSWER',
  })) as never)
}

beforeEach(() => {
  vi.mocked(generateText).mockReset()
  deps.random = () => 0.1 // pack on side A
  deps.now = () => new Date('2026-11-24T12:00:00Z')
})

async function published(ctx = makeTools()) {
  const r = await run('publishPack', 'alice', pack, ctx.tools)
  expect(r.success).toBe(true)
  return { ...ctx, packId: ctx.db.packs[0].recordId }
}

describe('publishing', () => {
  it('stamps the caller as owner and zeroes the counters, ignoring forged values', async () => {
    const { tools, db } = makeTools()
    await run('publishPack', 'alice', { ...pack, ownerId: 'mallory', wins: 999, trials: 999 }, tools)
    expect(db.packs[0].data).toMatchObject({ ownerId: 'alice', trials: 0, wins: 0, ties: 0 })
  })

  it('rejects an invalid pack', async () => {
    const { tools, db } = makeTools()
    expect((await run('publishPack', 'alice', { ...pack, content: 'too short' }, tools)).success).toBe(false)
    expect((await run('publishPack', 'alice', { ...pack, subject: 'Astrology' }, tools)).success).toBe(false)
    expect(db.packs).toHaveLength(0)
  })

  it('lets only the author edit cover details, and never the pack text or counters', async () => {
    const { tools, db, packId } = await published()
    const edit = (u: string, patch: Record<string, unknown>) =>
      run('updatePackDetails', u, { packId, patch }, tools)

    expect((await edit('alice', { summary: 'Sharper summary.' })).success).toBe(true)
    expect((await edit('mallory', { summary: 'hijacked' })).success).toBe(false)
    const contentEdit = await edit('alice', { content: 'x'.repeat(200) })
    expect(contentEdit.success).toBe(false)
    expect((contentEdit as { error: string }).error).toMatch(/final/i)
    expect((await edit('alice', { wins: 50 })).success).toBe(false)
    expect(db.packs[0].data).toMatchObject({ summary: 'Sharper summary.', wins: 0, content: pack.content })
  })
})

describe('blind trials', () => {
  it('stores the answers without the side, and the key in a separate table', async () => {
    const { tools, db, packId } = await published()
    mockAnswers()
    const r = await run('startTrial', 'bob', { packId, request: 'Value a bakery.' }, tools)
    expect(r.success).toBe(true)

    const trial = db.trials[0].data
    expect(trial).toMatchObject({ testerId: 'bob', status: 'pending', answerA: 'PACK ANSWER', answerB: 'PLAIN ANSWER' })
    expect(trial.packSide).toBeUndefined()
    expect(db.trial_keys[0].data).toEqual({ trialId: db.trials[0].recordId, packSide: 'A' })
    expect(generateText).toHaveBeenCalledTimes(2)
  })

  it('puts the pack on side B when the coin lands that way', async () => {
    const { tools, db, packId } = await published()
    mockAnswers()
    deps.random = () => 0.9
    await run('startTrial', 'bob', { packId, request: 'Value a bakery.' }, tools)
    expect(db.trials[0].data).toMatchObject({ answerA: 'PLAIN ANSWER', answerB: 'PACK ANSWER' })
    expect(db.trial_keys[0].data.packSide).toBe('B')
  })

  it('enforces the daily allowance', async () => {
    const { tools, db, packId } = await published()
    mockAnswers()
    for (let i = 0; i < 15; i++) {
      expect((await run('startTrial', 'bob', { packId, request: `Request number ${i}` }, tools)).success).toBe(true)
    }
    const over = await run('startTrial', 'bob', { packId, request: 'One more please' }, tools)
    expect(over.success).toBe(false)
    expect(db.trials).toHaveLength(15)

    deps.now = () => new Date('2026-11-25T00:30:00Z') // next UTC day
    expect((await run('startTrial', 'bob', { packId, request: 'New day request' }, tools)).success).toBe(true)
  })

  it('saves nothing when the AI fails, and cleans up if the key cannot be stored', async () => {
    const ctx = await published()
    vi.mocked(generateText).mockRejectedValueOnce(new Error('down'))
    expect((await run('startTrial', 'bob', { packId: ctx.packId, request: 'Value a bakery.' }, ctx.tools)).success).toBe(false)
    expect(ctx.db.trials).toHaveLength(0)

    const broken = makeTools({ failCreateIn: 'trial_keys' })
    const p2 = await published(broken)
    mockAnswers()
    expect((await run('startTrial', 'bob', { packId: p2.packId, request: 'Value a bakery.' }, broken.tools)).success).toBe(false)
    expect(broken.db.trials).toHaveLength(0)
  })

  it('validates the request', async () => {
    const { tools, packId } = await published()
    expect((await run('startTrial', 'bob', { packId, request: 'hi' }, tools)).success).toBe(false)
    expect((await run('startTrial', 'bob', { packId, request: 'x'.repeat(501) }, tools)).success).toBe(false)
    expect(generateText).not.toHaveBeenCalled()
  })
})

describe('voting', () => {
  async function trialFor(tester: string) {
    const ctx = await published()
    mockAnswers()
    await run('startTrial', tester, { packId: ctx.packId, request: 'Value a bakery.' }, ctx.tools)
    return { ...ctx, trialId: ctx.db.trials[0].recordId }
  }

  it('a vote for the pack side counts as a win and reveals the side', async () => {
    const { tools, db, trialId } = await trialFor('bob')
    expect((await run('castVote', 'bob', { trialId, choice: 'A' }, tools)).success).toBe(true)
    expect(db.trials[0].data).toMatchObject({ status: 'voted', packSide: 'A', packWon: 1, counted: 1 })
    expect(db.packs[0].data).toMatchObject({ trials: 1, wins: 1, ties: 0 })
  })

  it('a vote for the plain side is a loss; a tie is recorded as a tie', async () => {
    const lose = await trialFor('bob')
    await run('castVote', 'bob', { trialId: lose.trialId, choice: 'B' }, lose.tools)
    expect(lose.db.packs[0].data).toMatchObject({ trials: 1, wins: 0, ties: 0 })

    const tie = await trialFor('bob')
    await run('castVote', 'bob', { trialId: tie.trialId, choice: 'tie' }, tie.tools)
    expect(tie.db.packs[0].data).toMatchObject({ trials: 1, wins: 0, ties: 1 })
  })

  it('cannot be cast twice, by someone else, or with a bad choice', async () => {
    const { tools, db, trialId } = await trialFor('bob')
    expect((await run('castVote', 'mallory', { trialId, choice: 'A' }, tools)).success).toBe(false)
    expect((await run('castVote', 'bob', { trialId, choice: 'C' }, tools)).success).toBe(false)
    expect((await run('castVote', 'bob', { trialId, choice: 'A' }, tools)).success).toBe(true)
    expect((await run('castVote', 'bob', { trialId, choice: 'A' }, tools)).success).toBe(false)
    expect(db.packs[0].data.trials).toBe(1)
  })

  it('an author testing their own pack never moves its score', async () => {
    const { tools, db, trialId } = await trialFor('alice')
    expect((await run('castVote', 'alice', { trialId, choice: 'A' }, tools)).success).toBe(true)
    expect(db.trials[0].data.counted).toBe(0)
    expect(db.packs[0].data).toMatchObject({ trials: 0, wins: 0 })
  })
})

describe('deleting', () => {
  it('is author-only and removes the pack, its trials and their keys', async () => {
    const { tools, db, packId } = await published()
    mockAnswers()
    await run('startTrial', 'bob', { packId, request: 'Value a bakery.' }, tools)
    expect((await run('deletePack', 'mallory', { packId }, tools)).success).toBe(false)
    expect(db.packs).toHaveLength(1)
    expect((await run('deletePack', 'alice', { packId }, tools)).success).toBe(true)
    expect(db.packs).toHaveLength(0)
    expect(db.trials).toHaveLength(0)
    expect(db.trial_keys).toHaveLength(0)
  })
})
