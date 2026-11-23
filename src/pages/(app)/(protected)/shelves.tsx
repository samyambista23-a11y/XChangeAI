/** /shelves — browse every pack like a bookshop, by subject, with your library card on the side. */

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useUser, useUsers } from 'deepspace'
import { EmptyState, Input } from '@/components/ui'
import BookCover from '../../../components/BookCover'
import ReadingCard, { tallyPoints } from '../../../components/ReadingCard'
import { SUBJECTS, confidenceScore, type PackData, type TrialData } from '../../../lib/xchange'

type Sort = 'top' | 'new' | 'tested'

export default function ShelvesPage() {
  const navigate = useNavigate()
  const { user } = useUser()
  const { users } = useUsers()
  const { records: packs, status, error } = useQuery<PackData>('packs', { orderBy: 'createdAt', orderDir: 'desc' })
  const { records: trials } = useQuery<TrialData>('trials')
  const [subject, setSubject] = useState<string>('All')
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<Sort>('top')

  const nameOf = (id: string) => (id === user?.id ? 'you' : users.find((u) => u.id === id)?.name ?? 'a reader')

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const list = packs.filter(
      (p) =>
        (subject === 'All' || p.data.subject === subject) &&
        (!needle || `${p.data.title} ${p.data.summary}`.toLowerCase().includes(needle)),
    )
    if (sort === 'top') list.sort((a, b) => confidenceScore(b.data) - confidenceScore(a.data))
    if (sort === 'tested') list.sort((a, b) => b.data.trials - a.data.trials)
    return list
  }, [packs, subject, q, sort])

  const counts = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of packs) m.set(p.data.subject, (m.get(p.data.subject) ?? 0) + 1)
    return m
  }, [packs])

  const me = user ? tallyPoints(user.id, trials, packs) : { votes: 0, wins: 0 }

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-6 py-10 lg:grid-cols-[1fr_260px]">
      <div>
        <h1 className="font-serif text-4xl font-semibold tracking-tight">The shelves</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Teaching packs other people use to make their AI good at something. Every score comes from blind tests: the
          pack against the plain AI, with readers voting before they know which is which.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Input
            aria-label="Search packs"
            placeholder="Search titles and summaries"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="max-w-xs bg-card"
          />
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            Sort
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="h-9 rounded-md border border-input bg-card px-2 text-sm text-foreground"
            >
              <option value="top">Best proven</option>
              <option value="tested">Most tested</option>
              <option value="new">Newest</option>
            </select>
          </label>
        </div>

        <nav aria-label="Subjects" className="mt-5 flex flex-wrap gap-2 border-b border-border pb-4">
          {['All', ...SUBJECTS].map((s) => {
            const n = s === 'All' ? packs.length : counts.get(s) ?? 0
            const active = subject === s
            return (
              <button
                key={s}
                type="button"
                onClick={() => setSubject(s)}
                aria-pressed={active}
                className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                  active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card text-foreground hover:bg-secondary'
                }`}
              >
                {s} <span className={active ? 'opacity-80' : 'text-muted-foreground'}>{n}</span>
              </button>
            )
          })}
        </nav>

        {status === 'loading' && <p className="mt-8 text-sm text-muted-foreground">Dusting the shelves…</p>}
        {status === 'error' && (
          <p role="alert" className="mt-8 text-sm text-destructive">
            Could not load packs: {error}
          </p>
        )}

        {status === 'ready' && packs.length === 0 && (
          <EmptyState
            className="mt-6"
            title="The shelves are empty"
            description="Be the first to share how you taught your AI something. A study method, a finance checklist, a style guide: anything that made your AI better."
            action={{ label: 'Publish the first pack', onClick: () => navigate('/publish') }}
          />
        )}
        {status === 'ready' && packs.length > 0 && shown.length === 0 && (
          <p className="mt-8 text-sm text-muted-foreground">Nothing on this shelf matches. Try another subject.</p>
        )}

        <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 xl:grid-cols-4">
          {shown.map((p) => (
            <BookCover key={p.recordId} id={p.recordId} pack={p.data} author={nameOf(p.data.ownerId)} />
          ))}
        </div>
      </div>

      <div className="space-y-4 lg:pt-2">
        <ReadingCard name={user?.name ?? 'Reader'} votes={me.votes} wins={me.wins} />
      </div>
    </div>
  )
}
