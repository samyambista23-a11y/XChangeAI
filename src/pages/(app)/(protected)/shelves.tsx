/** /shelves — the shop floor: one wooden shelf per subject, your borrower's card on the side. */

import { useMemo, useState } from 'react'
import { useToast } from '@/components/ui'
import { attempt, callAction } from '../../../lib/api'
import { HOUSE_BYLINE, HOUSE_PACKS } from '../../../lib/house-packs'
import { Link } from 'react-router-dom'
import { useQuery, useUser, useUsers } from 'deepspace'
import { Search } from 'lucide-react'
import BookCover, { BookCaption } from '../../../components/BookCover'
import ReadingCard, { tallyPoints } from '../../../components/ReadingCard'
import Shelf, { ShelfSlot } from '../../../components/Shelf'
import { InTheShop, ReadersOn, useAnnounce } from '../../../components/ShopPresence'
import { genreOf } from '../../../lib/genres'
import { SUBJECTS, confidenceScore, type PackData, type TrialData } from '../../../lib/xchange'

type Sort = 'top' | 'new' | 'tested'

export default function ShelvesPage() {
  const { user } = useUser()
  const { users } = useUsers()
  const { records: packs, status, error } = useQuery<PackData>('packs', { orderBy: 'createdAt', orderDir: 'desc' })
  const { records: trials } = useQuery<TrialData>('trials')
  const [subject, setSubject] = useState<string>('All')
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<Sort>('top')
  useAnnounce({ page: 'shelves', packId: null, packTitle: null, subject: null, testing: false })

  const nameOf = (id: string) => (id === user?.id ? 'You' : users.find((u) => u.id === id)?.name ?? 'A reader')

  const shelves = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const list = packs.filter(
      (p) =>
        (subject === 'All' || p.data.subject === subject) &&
        (!needle || `${p.data.title} ${p.data.summary} ${p.data.subject}`.toLowerCase().includes(needle)),
    )
    if (sort === 'top') list.sort((a, b) => confidenceScore(b.data) - confidenceScore(a.data))
    if (sort === 'tested') list.sort((a, b) => b.data.trials - a.data.trials)
    return SUBJECTS.map((s) => ({ subject: s, packs: list.filter((p) => p.data.subject === s) })).filter(
      (s) => s.packs.length > 0,
    )
  }, [packs, subject, q, sort])

  const counts = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of packs) m.set(p.data.subject, (m.get(p.data.subject) ?? 0) + 1)
    return m
  }, [packs])

  const me = user ? tallyPoints(user.id, trials, packs) : { votes: 0, wins: 0 }
  const houseCount = packs.filter((p) => p.data.byline === HOUSE_BYLINE).length
  const isAdmin = user?.role === 'admin'

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
      <header className="grid items-end gap-8 lg:grid-cols-[1fr_300px]">
        <div className="animate-rise">
          <p className="font-hand text-2xl text-[#9b3b2a]">Come in, have a browse —</p>
          <h1 className="font-display-tight mt-1 text-5xl font-semibold leading-[1.02] text-ink sm:text-6xl">The shelves</h1>
          <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-[#5a4a35]">
            Each book is a teaching pack: what someone tells their AI to make it good at one thing. Every score here comes
            from blind taste tests, where readers pick the better answer before learning which one used the pack.
          </p>
        </div>
        <div className="animate-rise" style={{ animationDelay: '120ms' }}>
          <ReadingCard name={user?.name ?? 'Reader'} votes={me.votes} wins={me.wins} />
        </div>
      </header>

      <div className="mt-8">
        <InTheShop />
      </div>

      {/* Search and sort */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <label className="paper flex h-11 min-w-[260px] flex-1 items-center gap-2 rounded-full px-4 sm:max-w-sm">
          <Search size={16} className="text-[#8a7658]" aria-hidden="true" />
          <input
            aria-label="Search packs"
            placeholder="Search the shop…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full bg-transparent text-[15px] outline-none placeholder:text-[#a8957a]"
          />
        </label>
        <div className="paper flex h-11 items-center gap-1 rounded-full p-1" role="group" aria-label="Sort">
          {(
            [
              ['top', 'Best proven'],
              ['tested', 'Most tested'],
              ['new', 'Just in'],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setSort(k)}
              aria-pressed={sort === k}
              className={`h-9 rounded-full px-4 text-sm transition-all duration-300 ${
                sort === k ? 'bg-ink text-cream shadow-sm' : 'text-[#5a4a35] hover:bg-[#efe3cc]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Section chips, each in its own cloth colour */}
      <nav aria-label="Sections" className="mt-5 flex flex-wrap gap-2">
        <Chip label="Everything" n={packs.length} active={subject === 'All'} onClick={() => setSubject('All')} color="#2a2118" />
        {SUBJECTS.map((s) => (
          <Chip
            key={s}
            label={s}
            n={counts.get(s) ?? 0}
            active={subject === s}
            onClick={() => setSubject(subject === s ? 'All' : s)}
            color={genreOf(s).cloth}
          />
        ))}
      </nav>

      {isAdmin && status === 'ready' && houseCount < HOUSE_PACKS.length && (
        <StockShelf missing={HOUSE_PACKS.length - houseCount} />
      )}

      <div className="mt-12 space-y-14">
        {status === 'loading' && <LoadingShelf />}
        {status === 'error' && (
          <p role="alert" className="text-destructive">
            Could not load the shop: {error}
          </p>
        )}

        {status === 'ready' && packs.length === 0 && <EmptyShop />}
        {status === 'ready' && packs.length > 0 && shelves.length === 0 && (
          <p className="font-hand text-2xl text-[#6b5a43]">Nothing on the shelves matches that. Try another section.</p>
        )}

        {shelves.map((s, i) => (
          <Shelf key={s.subject} subject={s.subject} count={s.packs.length} delay={i * 90}>
            {s.packs.map((p) => (
              <ShelfSlot
                key={p.recordId}
                book={
                  <div className="relative">
                    <BookCover id={p.recordId} pack={p.data} author={p.data.byline || nameOf(p.data.ownerId)} />
                    <ReadersOn packId={p.recordId} />
                  </div>
                }
                caption={<BookCaption pack={p.data} />}
              />
            ))}
          </Shelf>
        ))}
      </div>
    </div>
  )
}

function Chip({ label, n, active, onClick, color }: { label: string; n: number; active: boolean; onClick: () => void; color: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`group inline-flex items-center gap-2 rounded-full border py-1.5 pl-2 pr-3 text-sm transition-all duration-300 ${
        active ? 'border-transparent text-cream shadow-md' : 'border-[#dccbaa] bg-[#fffaf0]/70 text-ink hover:-translate-y-0.5 hover:shadow-sm'
      } ${n === 0 && !active ? 'opacity-55' : ''}`}
      style={active ? { backgroundColor: color } : undefined}
    >
      <span className="h-3.5 w-3.5 rounded-full ring-2 ring-white/60" style={{ backgroundColor: color }} aria-hidden="true" />
      {label}
      <span className={active ? 'text-cream/75' : 'text-[#8a7658]'}>{n}</span>
    </button>
  )
}

function LoadingShelf() {
  return (
    <div aria-busy="true">
      <div className="flex gap-10 px-6 pb-0 pt-5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="writing-shimmer h-60 w-40 rounded-[2px_6px_6px_2px]" />
        ))}
      </div>
      <div className="plank" />
      <p className="mt-3 font-hand text-xl text-[#6b5a43]">Dusting the shelves…</p>
    </div>
  )
}

function EmptyShop() {
  return (
    <div className="animate-rise">
      <div className="relative flex h-60 items-end justify-center">
        <div className="paper tape relative max-w-md -rotate-1 px-8 py-6 text-center">
          <p className="font-hand text-3xl leading-tight text-ink">The shelves are bare.</p>
          <p className="mt-2 text-[15px] text-[#5a4a35]">
            Be the first to share how you taught your AI something: a study method, a finance checklist, a style guide.
          </p>
          <Link
            to="/publish"
            className="mt-4 inline-flex rounded-full bg-[#2f5d46] px-5 py-2.5 text-sm font-medium text-cream shadow-md transition-transform hover:-translate-y-0.5"
          >
            Put the first book on the shelf
          </Link>
        </div>
      </div>
      <div className="plank mt-4" />
    </div>
  )
}

/** Owner-only: put the house collection on the shelves in one go. */
function StockShelf({ missing }: { missing: number }) {
  const { error, success } = useToast()
  const [busy, setBusy] = useState(false)
  async function stock() {
    setBusy(true)
    const r = await attempt(() => callAction<{ added: number }>('stockHouseShelf', {}))
    setBusy(false)
    if (r.ok) success('Shelves stocked', `${r.value?.added ?? 0} house packs are on the shelves.`)
    else error('Could not stock the shelves', r.error)
  }
  return (
    <div className="paper mt-8 flex flex-wrap items-center gap-4 rounded-[3px] border-l-4 border-[#c99a3e] px-5 py-4">
      <p className="flex-1 text-[15px] text-[#4a3c2b]">
        <span className="font-hand text-xl text-[#9b3b2a]">Owner’s note: </span>
        {missing} packs from the house collection aren’t on the shelves yet. They’re labelled “House collection” and start
        with no scores, like any new pack.
      </p>
      <button
        type="button"
        onClick={stock}
        disabled={busy}
        className="rounded-full bg-[#2f5d46] px-5 py-2.5 text-sm font-medium text-cream shadow-md transition-transform hover:-translate-y-0.5 disabled:opacity-60"
      >
        {busy ? 'Stocking the shelves…' : 'Stock the house shelf'}
      </button>
    </div>
  )
}
