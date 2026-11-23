/**
 * Server actions — POST /api/actions/:name
 *
 * Actions run with record-level RBAC bypassed, so each one checks for itself
 * who is calling and what they may change.
 *
 *   publishPack        validate and publish a teaching pack (text is final)
 *   updatePackDetails  owner edits title / summary / subject / sample request
 *   deletePack         owner removes a pack and its trials
 *   startTrial         run the blind A/B test; the answer key is stored apart
 *   castVote           tester picks A, B or tie; side revealed, score updated
 */

import { generateText } from 'ai'
import { createDeepSpaceAI, resolveDeepSpaceAgentModel } from 'deepspace/worker'
import type { ActionContext, ActionHandler, ActionResult, ActionTools } from 'deepspace/worker'
import type { Env } from '../../worker'
import {
  CHOICES,
  LIMITS,
  baselineSystem,
  packWon,
  pickSide,
  trialsToday,
  validatePack,
  validateRequest,
  withPackSystem,
  type Choice,
  type PackData,
  type Side,
  type TrialData,
} from '../lib/xchange'

type Ctx = ActionContext<Env>
type Row<T> = T & Record<string, unknown>

const fail = (error: string): ActionResult => ({ success: false, error })

/** Overridable in tests so side assignment is deterministic. */
export const deps = {
  random: Math.random,
  now: () => new Date(),
}

async function getPack(tools: ActionTools, packId: unknown) {
  if (typeof packId !== 'string' || !packId) return null
  const got = await tools.get<Row<PackData>>('packs', packId)
  return got.success ? got.data.record.data : null
}

const DETAIL_FIELDS = ['title', 'subject', 'summary', 'sampleRequest'] as const

export const actions: Record<string, ActionHandler<Env>> = {
  publishPack: async ({ userId, params, tools }: Ctx) => {
    const input = {
      title: params.title,
      subject: params.subject,
      summary: params.summary,
      content: params.content,
      sampleRequest: params.sampleRequest,
    }
    const invalid = validatePack(input)
    if (invalid) return fail(invalid)
    const data = input as Pick<PackData, 'title' | 'subject' | 'summary' | 'content' | 'sampleRequest'>
    // ownerId comes from the verified caller; counters start at zero and only castVote moves them.
    return tools.create('packs', {
      ownerId: userId,
      title: data.title.trim(),
      subject: data.subject,
      summary: data.summary.trim(),
      content: data.content.trim(),
      sampleRequest: data.sampleRequest.trim(),
      trials: 0,
      wins: 0,
      ties: 0,
    })
  },

  updatePackDetails: async ({ userId, params, tools }: Ctx) => {
    const pack = await getPack(tools, params.packId)
    if (!pack) return fail('Pack not found.')
    if (pack.ownerId !== userId) return fail('Only the author can edit this pack.')

    const patch = (params.patch ?? {}) as Record<string, unknown>
    const keys = Object.keys(patch)
    if (keys.length === 0) return fail('Nothing to update.')
    const illegal = keys.filter((k) => !(DETAIL_FIELDS as readonly string[]).includes(k))
    if (illegal.length > 0) {
      return fail(
        illegal.includes('content')
          ? 'The pack text is final once published, so its votes stay honest. Publish a new edition instead.'
          : `Cannot edit: ${illegal.join(', ')}`,
      )
    }
    const invalid = validatePack(patch, { partial: true })
    if (invalid) return fail(invalid)
    return tools.update('packs', params.packId as string, patch)
  },

  deletePack: async ({ userId, params, tools }: Ctx) => {
    const pack = await getPack(tools, params.packId)
    if (!pack) return fail('Pack not found.')
    if (pack.ownerId !== userId) return fail('Only the author can delete this pack.')
    const packId = params.packId as string

    // Cascade: answer keys, then trials, then the pack.
    for (;;) {
      const page = await tools.query<Row<TrialData>>('trials', { where: { packId }, limit: 200 })
      if (!page.success || page.data.records.length === 0) break
      for (const t of page.data.records) await tools.deleteWhere('trial_keys', { trialId: t.recordId })
      const removed = await tools.deleteWhere('trials', { packId }, 200)
      if (!removed.success || removed.data.deleted < 200) break
    }
    return tools.remove('packs', packId)
  },

  startTrial: async ({ userId, params, tools, env, callerJwt }: Ctx) => {
    const pack = await getPack(tools, params.packId)
    if (!pack) return fail('Pack not found.')
    const invalid = validateRequest(params.request)
    if (invalid) return fail(invalid)
    const request = (params.request as string).trim()

    // Daily allowance: each trial is two AI calls on the tester's credits.
    const mine = await tools.query<Row<TrialData>>('trials', { where: { testerId: userId }, limit: 500 })
    if (!mine.success) return fail('Could not check your daily allowance.')
    const used = trialsToday(
      mine.data.records.map((r) => r.createdAt),
      deps.now(),
    )
    if (used >= LIMITS.trialsPerDay) {
      return fail(`You have used today's ${LIMITS.trialsPerDay} blind tests. They refill at midnight UTC.`)
    }

    const resolved = resolveDeepSpaceAgentModel(undefined, 'application')
    if (!resolved) return fail('No AI model is available right now.')
    // Billed to the person running the test, not the app owner.
    const ai = createDeepSpaceAI(env, resolved.provider, { authToken: callerJwt })
    const model = ai(resolved.modelId)

    let withPack: string
    let baseline: string
    try {
      const [a, b] = await Promise.all([
        generateText({ model, system: withPackSystem(pack.content), prompt: request, maxOutputTokens: 700 }),
        generateText({ model, system: baselineSystem(), prompt: request, maxOutputTokens: 700 }),
      ])
      withPack = a.text.trim()
      baseline = b.text.trim()
    } catch (err) {
      console.error('[startTrial] model call failed', err instanceof Error ? err.message : err)
      return fail('The AI could not answer right now. Nothing was used from your allowance; try again shortly.')
    }
    if (!withPack || !baseline) return fail('The AI returned an empty answer. Try again.')

    const packSide: Side = pickSide(deps.random)
    const created = await tools.create('trials', {
      packId: params.packId as string,
      testerId: userId,
      request,
      answerA: packSide === 'A' ? withPack : baseline,
      answerB: packSide === 'B' ? withPack : baseline,
      status: 'pending',
    })
    if (!created.success) return created

    const key = await tools.create('trial_keys', { trialId: created.data.recordId, packSide })
    if (!key.success) {
      // Without a key the trial can never be scored, so do not leave it behind.
      await tools.remove('trials', created.data.recordId)
      return fail('Could not save the blind test. Try again.')
    }
    return created
  },

  castVote: async ({ userId, params, tools }: Ctx) => {
    const trialId = params.trialId
    const choice = params.choice
    if (typeof trialId !== 'string' || !trialId) return fail('Missing trialId.')
    if (!(CHOICES as readonly unknown[]).includes(choice)) return fail('Pick A, B, or a tie.')

    const got = await tools.get<Row<TrialData>>('trials', trialId)
    if (!got.success) return fail('Test not found.')
    const trial = got.data.record.data
    if (trial.testerId !== userId) return fail('You can only vote on your own blind tests.')
    if (trial.status !== 'pending') return fail('You already voted on this one.')

    const keys = await tools.query<Row<{ trialId: string; packSide: Side }>>('trial_keys', {
      where: { trialId },
      limit: 1,
    })
    const key = keys.success ? keys.data.records[0] : undefined
    if (!key) return fail('This test has no answer key and cannot be scored.')

    const pack = await getPack(tools, trial.packId)
    if (!pack) return fail('This pack was removed.')

    const side = key.data.packSide
    const won = packWon(choice as Choice, side)
    // Authors can try their own packs, but those votes never count toward the score.
    const counted = pack.ownerId !== userId

    const updated = await tools.update('trials', trialId, {
      status: 'voted',
      choice: choice as Choice,
      packSide: side,
      packWon: won ? 1 : 0,
      counted: counted ? 1 : 0,
    })
    if (!updated.success) return updated

    if (counted) {
      await tools.update('packs', trial.packId, {
        trials: (pack.trials ?? 0) + 1,
        wins: (pack.wins ?? 0) + (won ? 1 : 0),
        ties: (pack.ties ?? 0) + (choice === 'tie' ? 1 : 0),
      })
    }
    return updated
  },
}
