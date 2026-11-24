/**
 * What a reader is doing in the shop, as shared over DeepSpace presence.
 * Pure helpers so the wording and de-duplication are unit-tested.
 */

export type ShopPage = 'shelves' | 'pack' | 'publish' | 'leaderboard' | 'how-to' | 'other'

export interface ShopActivity {
  page: ShopPage
  packId: string | null
  packTitle: string | null
  subject: string | null
  testing: boolean
}

export interface Peer {
  userId: string
  userName: string
  joinedAt: string
  state: Record<string, unknown>
}

export const IDLE: ShopActivity = { page: 'other', packId: null, packTitle: null, subject: null, testing: false }

/** Read a peer's untyped state defensively: presence state is whatever another client sent. */
export function activityOf(state: Record<string, unknown>): ShopActivity {
  const str = (v: unknown) => (typeof v === 'string' && v.length <= 200 ? v : null)
  const pages: ShopPage[] = ['shelves', 'pack', 'publish', 'leaderboard', 'how-to', 'other']
  const page = pages.includes(state.page as ShopPage) ? (state.page as ShopPage) : 'other'
  return {
    page,
    packId: str(state.packId),
    packTitle: str(state.packTitle),
    subject: str(state.subject),
    testing: state.testing === true,
  }
}

/** One entry per person, even with several tabs open (keeps the most recent join). */
export function dedupePeers(peers: Peer[]): Peer[] {
  const byUser = new Map<string, Peer>()
  for (const p of peers) {
    const prev = byUser.get(p.userId)
    if (!prev || p.joinedAt > prev.joinedAt) byUser.set(p.userId, p)
  }
  return [...byUser.values()]
}

/** A short, human line: "is blind-testing DCF models that hold up". */
export function describeActivity(a: ShopActivity): string {
  if (a.page === 'pack' && a.testing && a.packTitle) return `is blind-testing “${a.packTitle}”`
  if (a.page === 'pack' && a.packTitle) return `is reading “${a.packTitle}”`
  switch (a.page) {
    case 'shelves':
      return 'is browsing the shelves'
    case 'publish':
      return 'is writing a new pack'
    case 'leaderboard':
      return 'is checking the bestseller list'
    case 'how-to':
      return 'is reading the how-to'
    default:
      return 'is in the shop'
  }
}

export function firstName(name: string): string {
  const n = name.trim().split(/\s+/)[0]
  return n || 'A reader'
}
