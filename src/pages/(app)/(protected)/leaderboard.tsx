/** /leaderboard — best-proven packs, authors whose packs win, and the busiest blind testers. */

import { useQuery, useUser, useUsers } from 'deepspace'
import { Link } from 'react-router-dom'
import { BadgeSticker } from '../../../components/BookCover'
import {
  confidenceScore,
  points,
  rankFor,
  winRate,
  type PackData,
  type TrialData,
} from '../../../lib/xchange'

export default function LeaderboardPage() {
  const { user } = useUser()
  const { users } = useUsers()
  const { records: packs } = useQuery<PackData>('packs')
  const { records: trials } = useQuery<TrialData>('trials')

  const nameOf = (id: string) => (id === user?.id ? 'You' : users.find((u) => u.id === id)?.name ?? 'A reader')

  const topPacks = packs
    .filter((p) => p.data.trials - p.data.ties >= 3)
    .sort((a, b) => confidenceScore(b.data) - confidenceScore(a.data))
    .slice(0, 10)

  const ownerOf = new Map(packs.map((p) => [p.recordId, p.data.ownerId]))
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
    .slice(0, 15)

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="font-serif text-4xl font-semibold tracking-tight">Leaderboard</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Packs are ranked by how sure we can be that they beat the plain AI, so one lucky vote can’t top the list. A pack
        needs three decisive blind tests to appear.
      </p>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <section>
          <h2 className="font-serif text-2xl font-semibold">Best-proven packs</h2>
          {topPacks.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No pack has three blind tests yet. Go run some.</p>
          ) : (
            <ol className="mt-4 space-y-3">
              {topPacks.map((p, i) => (
                <li key={p.recordId}>
                  <Link
                    to={`/pack/${p.recordId}`}
                    className="flex items-center gap-4 rounded-md border border-border bg-card px-4 py-3 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)]"
                  >
                    <span className="w-6 font-serif text-2xl font-semibold text-[#c99a2e]">{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{p.data.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {p.data.subject} · by {nameOf(p.data.ownerId)} · {p.data.trials - p.data.ties} tests
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="block font-serif text-lg font-semibold">{Math.round((winRate(p.data) ?? 0) * 100)}%</span>
                      <BadgeSticker pack={p.data} />
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section>
          <h2 className="font-serif text-2xl font-semibold">Readers</h2>
          <p className="mt-1 text-xs text-muted-foreground">1 point per blind vote, 3 per win for a pack you wrote.</p>
          {ranked.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Nobody has voted yet.</p>
          ) : (
            <table className="mt-4 w-full overflow-hidden rounded-md border border-border bg-card text-sm">
              <thead className="bg-secondary text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Reader</th>
                  <th className="px-3 py-2 font-medium">Rank</th>
                  <th className="px-3 py-2 text-right font-medium">Points</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-3 py-2">{nameOf(r.id)}</td>
                    <td className="px-3 py-2 text-muted-foreground">{rankFor(r.pts).title}</td>
                    <td className="px-3 py-2 text-right font-semibold">{r.pts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  )
}
