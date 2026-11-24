/**
 * "Who's in the shop" — DeepSpace presence.
 *
 * One presence room for the whole shop, joined once in the signed-in layout.
 * Each reader shares a small activity (which page, which pack, whether they're
 * running a blind test). Nothing is stored: presence lives in memory and a
 * reader disappears from everyone's screen within a second of leaving.
 * Identity (userId, userName) comes from the verified sign-in, so it can't be
 * spoofed; the activity itself is treated as untrusted and parsed defensively.
 */
import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { getUserColor, usePresenceRoom } from 'deepspace'
import { activityOf, dedupePeers, describeActivity, firstName, type Peer, type ShopActivity } from '../lib/presence'

const ROOM = 'shop:floor'

interface Ctx {
  peers: Peer[]
  connected: boolean
  updateState: (s: Record<string, unknown>) => void
}

const PresenceCtx = createContext<Ctx>({ peers: [], connected: false, updateState: () => undefined })

export function ShopPresenceProvider({ children }: { children: ReactNode }) {
  const { peers, connected, updateState } = usePresenceRoom(ROOM)
  const value = useMemo(() => ({ peers: dedupePeers(peers as Peer[]), connected, updateState }), [peers, connected, updateState])
  return <PresenceCtx.Provider value={value}>{children}</PresenceCtx.Provider>
}

/** Everyone else currently in the shop, with their parsed activity. */
export function useShopPeers() {
  const { peers } = useContext(PresenceCtx)
  return useMemo(() => peers.map((p) => ({ ...p, activity: activityOf(p.state) })), [peers])
}

/**
 * Tell the shop what you're doing. Every field is sent each time (presence
 * merges shallowly, so a stale packId would otherwise linger), and it is
 * re-sent after a reconnect, which resets presence state.
 */
export function useAnnounce(a: ShopActivity) {
  const { connected, updateState } = useContext(PresenceCtx)
  useEffect(() => {
    if (!connected) return
    updateState({ page: a.page, packId: a.packId, packTitle: a.packTitle, subject: a.subject, testing: a.testing })
  }, [connected, updateState, a.page, a.packId, a.packTitle, a.subject, a.testing])
}

/** A small round initial in the reader's own colour. */
export function ReaderDot({ userId, name, size = 26, ring = true }: { userId: string; name: string; size?: number; ring?: boolean }) {
  return (
    <span
      title={name}
      className={`inline-grid shrink-0 place-items-center rounded-full font-display font-semibold text-white ${ring ? 'ring-2 ring-[#fffaf0]' : ''}`}
      style={{ width: size, height: size, fontSize: size * 0.45, backgroundColor: getUserColor(userId) }}
    >
      {firstName(name).charAt(0).toUpperCase()}
    </span>
  )
}

/** The live strip at the top of the shelves: who's here and what they're up to. */
export function InTheShop() {
  const peers = useShopPeers()
  return (
    <div className="paper flex flex-wrap items-center gap-x-4 gap-y-2 rounded-full px-4 py-2" aria-live="polite">
      <span className="flex items-center gap-2 text-sm font-medium text-ink">
        <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#4f9a6a] opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#2f7a4c]" />
        </span>
        {peers.length === 0 ? 'Just you in the shop right now' : `${peers.length + 1} in the shop right now`}
      </span>
      {peers.slice(0, 4).map((p) => (
        <span key={p.userId} className="flex items-center gap-1.5 text-sm text-[#5a4a35]">
          <ReaderDot userId={p.userId} name={p.userName} size={22} ring={false} />
          <span>
            <span className="font-medium text-ink">{firstName(p.userName)}</span> {describeActivity(p.activity)}
          </span>
        </span>
      ))}
      {peers.length > 4 && <span className="text-sm text-[#8a7658]">and {peers.length - 4} more</span>}
    </div>
  )
}

/** Stacked dots for readers currently on one pack, shown on its cover. */
export function ReadersOn({ packId }: { packId: string }) {
  const here = useShopPeers().filter((p) => p.activity.page === 'pack' && p.activity.packId === packId)
  if (here.length === 0) return null
  return (
    <span className="absolute -bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full bg-[#fffaf0] py-0.5 pl-0.5 pr-2 shadow-md">
      <span className="flex -space-x-1.5">
        {here.slice(0, 3).map((p) => (
          <ReaderDot key={p.userId} userId={p.userId} name={p.userName} size={20} />
        ))}
      </span>
      <span className="whitespace-nowrap text-[11px] font-medium text-ink">
        {here.some((p) => p.activity.testing) ? 'testing now' : 'reading now'}
      </span>
    </span>
  )
}

/** On a pack page: who else is here, and whether they're mid-test. */
export function AlsoHere({ packId }: { packId: string }) {
  const here = useShopPeers().filter((p) => p.activity.page === 'pack' && p.activity.packId === packId)
  if (here.length === 0) return null
  return (
    <div className="animate-rise mt-6 inline-flex flex-wrap items-center gap-2 rounded-full bg-[#dfe6d3] px-4 py-1.5 text-sm text-[#24432f]">
      <span className="flex -space-x-1.5">
        {here.slice(0, 4).map((p) => (
          <ReaderDot key={p.userId} userId={p.userId} name={p.userName} size={22} />
        ))}
      </span>
      {here.length === 1
        ? `${firstName(here[0].userName)} ${here[0].activity.testing ? 'is running a blind test on this pack right now' : 'is reading this pack too'}`
        : `${here.length} other readers are on this pack right now`}
    </div>
  )
}
