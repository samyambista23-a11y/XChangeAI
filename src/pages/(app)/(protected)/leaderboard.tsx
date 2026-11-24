/** /leaderboard — a newspaper-style bestseller list, plus the readers' honour roll. */

import { useQuery, useUser, useUsers } from 'deepspace'
import { Link } from 'react-router-dom'
import { Book } from '../../../components/BookCover'
import { useAnnounce } from '../../../components/ShopPresence'
import { genreOf } from '../../../lib/genres'
import { confidenceScore, points, rankFor, winRate, type PackData, type TrialData } from '../../../lib/xchange'

export default function LeaderboardPage() {
  useAnnounce({ page: 'leaderboard', packId: null, packTitle: null, subject: null, testing: false })
  const { user } = useUser()
  const { users } = useUsers()
  const { records: packs } = useQuery<PackData>('packs')
  const { records: trials } = useQuery<TrialData>('trials')

  const nameOf = (id: string) => (id === user?.id ? 'You' : users.find((u) => u.id === id)?.name ?? 'A reader')

  const topPacks = packs
    .filter((p) => p.data.trials - p.data.ties >= 3)
    .sort((a, b) => confidenceScore(b.data) - confidenceScore(a.data))
    .slice(0, 10)

  // House-collection packs earn no author points: nobody on the team wrote them.
  const ownerOf = new Map(packs.filter((p) => !p.data.byline).map((p) => [p.recordId, p.data.ownerId]))
  const people = new Map<string, { votes: number; wins: number }>()
  const bump = (id: string, k: 'votes' | 'wins') => {
    const row = people.get(id) ?? { votes: 0, wins: 0 }
    row[k] += 1
    people.set(id, row)
  }
  for (const t of trials) {
    if (t.data.status !== 'voted') continue
    bump(t.data.testerId, 'votes')
    const owner = ownerOf.get(t.data.packId)
    if (owner && t.data.counted && t.data.packWon) bump(owner, 'wins')
  }
  const ranked = [...people.entries()]
    .map(([id, r]) => ({ id, ...r, pts: points(r.votes, r.wins) }))
    .sort((a, b) => b.pts - a.pts)
    .slice(0, 12)

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <div className="mx-auto max-w-6xl px-5 pb-24 pt-10 sm:px-8">
      {/* Masthead */}
      <header className="border-y-4 border-double border-ink py-4 text-center">
        <p className="font-type text-xs uppercase tracking-[0.3em] text-[#7a6a52]">{today}</p>
        <h1 className="font-display-tight mt-1 text-5xl font-bold text-ink sm:text-6xl">The XChange Bestseller List</h1>
        <p className="mt-2 font-type text-xs uppercase tracking-[0.25em] text-[#7a6a52]">
          Ranked by blind taste tests · no paid placement · one lucky vote won’t do it
        </p>
      </header>

      <div className="mt-10 grid gap-12 lg:grid-cols-[1.5fr_1fr]">
        <section>
          <h2 className="border-b border-ink pb-2 font-display text-2xl font-semibold text-ink">This week’s best-proven packs</h2>
          {topPacks.length === 0 ? (
            <p className="mt-6 font-hand text-2xl text-[#6b5a43]">
              No pack has three blind tests yet. The list is waiting for its first entry.
            </p>
          ) : (
            <ol>
              {topPacks.map((p, i) => {
                const g = genreOf(p.data.subject)
                return (
                  <li key={p.recordId} className="animate-rise border-b border-[#cdb994]" style={{ animationDelay: `${i * 60}ms` }}>
                    <Link to={`/pack/${p.recordId}`} className="group flex items-center gap-5 py-4">
                      <span className="w-10 text-center font-display text-4xl font-bold text-[#c99a3e]">{i + 1}</span>
                      <div className="hidden shrink-0 transition-transform duration-300 group-hover:-rotate-3 sm:block">
                        <Book title={p.data.title} subject={p.data.subject} author={p.data.byline || nameOf(p.data.ownerId)} size="sm" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-type text-[11px] uppercase tracking-[0.2em]" style={{ color: g.cloth }}>
                          {p.data.subject}
                        </p>
                        <p className="font-display text-xl font-semibold leading-snug text-ink group-hover:underline group-hover:underline-offset-4">
                          {p.data.title}
                        </p>
                        <p className="text-sm italic text-[#5a4a35]">by {p.data.byline || nameOf(p.data.ownerId)}</p>
                        <p className="mt-1 line-clamp-2 text-sm text-[#5a4a35]">{p.data.summary}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-display text-3xl font-bold text-ink">{Math.round((winRate(p.data) ?? 0) * 100)}%</p>
                        <p className="font-type text-[11px] text-[#7a6a52]">{p.data.trials - p.data.ties} tests</p>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ol>
          )}
        </section>

        <section>
          <h2 className="border-b border-ink pb-2 font-display text-2xl font-semibold text-ink">Readers’ honour roll</h2>
          <p className="mt-2 font-type text-[11px] uppercase tracking-[0.15em] text-[#7a6a52]">1 pt per blind vote · 3 pts per win for a pack you wrote</p>
          {ranked.length === 0 ? (
            <p className="mt-6 font-hand text-2xl text-[#6b5a43]">Nobody has voted yet. Be the first name here.</p>
          ) : (
            <ol className="paper mt-5 rounded-[3px] px-5 py-2">
              {ranked.map((r, i) => (
                <li key={r.id} className="flex items-center gap-3 border-b border-dashed border-[#dccbaa] py-3 last:border-0">
                  <span className="w-6 font-display text-lg font-bold text-[#c99a3e]">{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-ink">{nameOf(r.id)}</span>
                    <span className="font-hand text-lg leading-none text-[#9b3b2a]">{rankFor(r.pts).title}</span>
                  </span>
                  <span className="font-type text-sm font-bold text-ink">{r.pts} pts</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  )
}
