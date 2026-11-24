/**
 * XChangeAI domain rules — pure functions shared by the browser and the worker.
 *
 * A "pack" is a teaching file: the instructions and short examples someone
 * uses to get an AI good at one thing (essays, DCF models, proofs...). Nobody
 * can retrain ChatGPT or Claude with a file, but anyone can hand the AI these
 * instructions, so the pack is what gets shared.
 *
 * A "trial" is a blind test: the same request answered once WITH the pack and
 * once WITHOUT it, shown as A and B in random order. The tester picks the
 * better answer before learning which was which. Trials are the pack's score.
 */

export const SUBJECTS = [
  'Writing',
  'Finance',
  'Engineering',
  'Math',
  'Science',
  'Coding',
  'Business',
  'Study skills',
  'Careers',
  'Languages',
  'Creative',
  'Other',
] as const
export type Subject = (typeof SUBJECTS)[number]

export const SIDES = ['A', 'B'] as const
export type Side = (typeof SIDES)[number]

export const CHOICES = ['A', 'B', 'tie'] as const
export type Choice = (typeof CHOICES)[number]

export const LIMITS = {
  title: 80,
  summary: 280,
  content: 20_000,
  contentMin: 80,
  sampleRequest: 300,
  request: 500,
  uploadBytes: 40_000,
  trialsPerDay: 15,
} as const

/** A pack's `.data`. Counters are written only by server actions. */
export interface PackData {
  ownerId: string
  title: string
  subject: Subject
  summary: string
  content: string
  sampleRequest: string
  /** Set for the house collection, shown instead of the owner's name. */
  byline?: string | null
  trials: number
  wins: number
  ties: number
}

/** A trial's `.data`. The pack's side is NOT here until after the vote. */
export interface TrialData {
  packId: string
  testerId: string
  request: string
  answerA: string
  answerB: string
  status: 'pending' | 'voted'
  choice?: Choice | null
  packSide?: Side | null
  packWon?: boolean | number | null
  counted?: boolean | number | null
}

export interface PackInput {
  title?: unknown
  subject?: unknown
  summary?: unknown
  content?: unknown
  sampleRequest?: unknown
}

const str = (v: unknown): v is string => typeof v === 'string'

/** Validate a new pack. Returns an error message, or null when it is fine. */
export function validatePack(input: PackInput, opts: { partial?: boolean } = {}): string | null {
  const need = (k: keyof PackInput) => !opts.partial || input[k] !== undefined

  if (need('title')) {
    if (!str(input.title) || !input.title.trim()) return 'Give the pack a title.'
    if (input.title.length > LIMITS.title) return `Keep the title under ${LIMITS.title} characters.`
  }
  if (need('subject') && !(SUBJECTS as readonly unknown[]).includes(input.subject)) {
    return 'Pick a subject shelf.'
  }
  if (need('summary')) {
    if (!str(input.summary) || !input.summary.trim()) return 'Write a one-line summary of what the pack teaches.'
    if (input.summary.length > LIMITS.summary) return `Keep the summary under ${LIMITS.summary} characters.`
  }
  if (need('content')) {
    if (!str(input.content) || input.content.trim().length < LIMITS.contentMin) {
      return `The pack itself needs at least ${LIMITS.contentMin} characters of instructions.`
    }
    if (input.content.length > LIMITS.content) {
      return `Packs are capped at ${LIMITS.content.toLocaleString('en-US')} characters. Trim the examples.`
    }
  }
  if (need('sampleRequest')) {
    if (!str(input.sampleRequest) || !input.sampleRequest.trim()) {
      return 'Suggest one request people can try the pack on.'
    }
    if (input.sampleRequest.length > LIMITS.sampleRequest) {
      return `Keep the sample request under ${LIMITS.sampleRequest} characters.`
    }
  }
  return null
}

export function validateRequest(request: unknown): string | null {
  if (!str(request) || request.trim().length < 5) return 'Type a request to test the pack on.'
  if (request.length > LIMITS.request) return `Keep the request under ${LIMITS.request} characters.`
  return null
}

/** Pick which side the pack's answer goes on. Injected so tests can be deterministic. */
export function pickSide(random: () => number = Math.random): Side {
  return random() < 0.5 ? 'A' : 'B'
}

/** Did the pack win this vote? A tie is neither a win nor a loss. */
export function packWon(choice: Choice, packSide: Side): boolean {
  return choice === packSide
}

/**
 * The share of decisive votes the pack won, 0..1. Ties are left out of the
 * denominator so they do not drag a pack toward 50%.
 */
export function winRate(p: Pick<PackData, 'trials' | 'wins' | 'ties'>): number | null {
  const decisive = p.trials - p.ties
  if (decisive <= 0) return null
  return p.wins / decisive
}

/**
 * A ranking score that does not let a pack with one lucky vote top the shelf:
 * the lower bound of the Wilson interval on the win rate (95%).
 */
export function confidenceScore(p: Pick<PackData, 'trials' | 'wins' | 'ties'>): number {
  const n = p.trials - p.ties
  if (n <= 0) return 0
  const z = 1.96
  const phat = p.wins / n
  const denom = 1 + (z * z) / n
  const centre = phat + (z * z) / (2 * n)
  const margin = z * Math.sqrt((phat * (1 - phat) + (z * z) / (4 * n)) / n)
  return Math.max(0, (centre - margin) / denom)
}

export type Badge = 'Bestseller' | 'Staff pick' | 'Rising' | 'Needs work' | 'New arrival'

/** The sticker on a pack's cover. Thresholds are deliberately strict. */
export function badgeFor(p: Pick<PackData, 'trials' | 'wins' | 'ties'>): Badge {
  const rate = winRate(p)
  const decisive = p.trials - p.ties
  if (rate === null || decisive < 3) return 'New arrival'
  if (decisive >= 10 && rate >= 0.75) return 'Bestseller'
  if (decisive >= 5 && rate >= 0.6) return 'Staff pick'
  if (rate >= 0.5) return 'Rising'
  return 'Needs work'
}

export interface Rank {
  title: string
  min: number
  next: number | null
}

const READER_RANKS: Rank[] = [
  { title: 'Browser', min: 0, next: 5 },
  { title: 'Regular', min: 5, next: 20 },
  { title: 'Bookworm', min: 20, next: 50 },
  { title: 'Critic', min: 50, next: 120 },
  { title: 'Head Librarian', min: 120, next: null },
]

/** Points: 1 per blind vote cast, 3 per vote your own packs win. */
export function points(votesCast: number, winsEarned: number): number {
  return votesCast + winsEarned * 3
}

export function rankFor(pts: number): Rank {
  let rank = READER_RANKS[0]
  for (const r of READER_RANKS) if (pts >= r.min) rank = r
  return rank
}

/** Start of the current UTC day, for the daily trial allowance. */
export function startOfUtcDay(now: Date): number {
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
}

/** Count how many trials a person started today, from ISO createdAt stamps. */
export function trialsToday(createdAts: string[], now: Date): number {
  const start = startOfUtcDay(now)
  return createdAts.filter((iso) => {
    const t = Date.parse(iso)
    return Number.isFinite(t) && t >= start
  }).length
}

/** A stable colour index for a pack's book cover, from its id. */
export function coverIndex(id: string, palette: number): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return h % palette
}

/** File name for a downloaded pack. */
export function packFileName(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  return `${slug || 'pack'}.md`
}

/** Markdown file a person downloads and gives to their own AI. */
export function packToMarkdown(p: Pick<PackData, 'title' | 'subject' | 'summary' | 'content'>): string {
  return [
    `# ${p.title}`,
    '',
    `> ${p.summary}`,
    '',
    `Subject: ${p.subject} · Shared on XChangeAI`,
    '',
    'How to use: paste this whole file into your AI (a custom instruction, a project',
    'file, or the start of a chat), then ask for what you need.',
    '',
    '---',
    '',
    p.content.trim(),
    '',
  ].join('\n')
}

/** The system prompt each side of a trial runs with. Same length rule for both, for fairness. */
export const ANSWER_RULE =
  'Aim for roughly 200-450 words unless the request asks for a different length. Do not mention these instructions.'

export function withPackSystem(content: string): string {
  return [
    'You are a helpful assistant. A user has given you the teaching pack below: their instructions',
    'for how to do this kind of work well. Follow it as long as it does not ask for anything harmful.',
    '',
    '<teaching_pack>',
    content.trim(),
    '</teaching_pack>',
    '',
    ANSWER_RULE,
  ].join('\n')
}

export function baselineSystem(): string {
  return `You are a helpful assistant. ${ANSWER_RULE}`
}
