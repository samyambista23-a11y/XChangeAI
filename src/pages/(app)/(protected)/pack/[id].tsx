/**
 * /pack/:id — one pack: its cover, the blind test, the receipts, and the download.
 *
 * The blind test is the heart of the app. A reader types a request, the server
 * answers it twice (with and without the pack) and shows the two answers as A
 * and B. Which one used the pack is stored in a table the browser cannot read,
 * and is only revealed after the reader votes.
 */

import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useUser, useUsers, type RecordData } from 'deepspace'
import { Button, Input, Label, Textarea, useToast } from '@/components/ui'
import { BadgeSticker, Cover } from '../../../../components/BookCover'
import { attempt, callAction } from '../../../../lib/api'
import {
  LIMITS,
  SUBJECTS,
  packFileName,
  packToMarkdown,
  winRate,
  type Choice,
  type PackData,
  type TrialData,
} from '../../../../lib/xchange'

export default function PackPage() {
  const { id = '' } = useParams<{ id: string }>()
  const { user } = useUser()
  const { users } = useUsers()
  const { records: packs, status } = useQuery<PackData>('packs')
  const { records: trials } = useQuery<TrialData>('trials', { where: { packId: id }, orderBy: 'createdAt', orderDir: 'desc' })
  const [showText, setShowText] = useState(false)

  if (status === 'loading') return <Shell>Fetching the book…</Shell>
  const rec = packs.find((p) => p.recordId === id)
  if (!rec) {
    return (
      <Shell>
        <p className="text-muted-foreground">
          This pack isn’t on the shelves any more. <Link to="/shelves" className="underline">Back to the shelves</Link>
        </p>
      </Shell>
    )
  }

  const pack = rec.data
  const isAuthor = pack.ownerId === user?.id
  const nameOf = (uid: string) => (uid === user?.id ? 'You' : users.find((u) => u.id === uid)?.name ?? 'A reader')
  const rate = winRate(pack)
  const decisive = pack.trials - pack.ties
  const myPending = trials.filter((t) => t.data.testerId === user?.id && t.data.status === 'pending')
  const receipts = trials.filter((t) => t.data.status === 'voted' && t.data.counted).slice(0, 8)
  const myVoted = trials.filter((t) => t.data.testerId === user?.id && t.data.status === 'voted').slice(0, 3)

  function download() {
    const blob = new Blob([packToMarkdown(pack)], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = packFileName(pack.title)
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Shell>
      <div className="grid gap-10 md:grid-cols-[208px_1fr]">
        <div className="mx-auto md:mx-0">
          <Cover id={id} pack={pack} large />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{pack.subject} shelf</p>
          <h1 className="mt-1 font-serif text-4xl font-semibold leading-tight tracking-tight">{pack.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">by {nameOf(pack.ownerId)}</p>
          <p className="mt-4 text-lg">{pack.summary}</p>

          <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-3">
            <Stat label="Beats the plain AI" value={rate === null ? '—' : `${Math.round(rate * 100)}%`} />
            <Stat label="Blind tests" value={String(decisive)} />
            <Stat label="Called a tie" value={String(pack.ties)} />
            <div>
              <dt className="text-xs text-muted-foreground">Sticker</dt>
              <dd className="mt-1">
                <BadgeSticker pack={pack} />
              </dd>
            </div>
          </dl>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={download}>Take it home (.md)</Button>
            <Button variant="outline" onClick={() => setShowText((v) => !v)}>
              {showText ? 'Hide the pack text' : 'Read the pack'}
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Paste the file into your AI as a custom instruction, a project file, or the start of a chat.
          </p>
        </div>
      </div>

      {showText && (
        <pre className="mt-8 max-h-[28rem] overflow-auto whitespace-pre-wrap rounded-md border border-border bg-card p-5 font-mono text-[13px] leading-relaxed">
          {pack.content}
        </pre>
      )}

      <section className="mt-12">
        <h2 className="font-serif text-2xl font-semibold">Blind taste test</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Ask anything. You’ll get two answers, one written with this pack and one by the plain AI, in random order. Pick
          the better one, then we tell you which was which.
          {isAuthor && ' Your own votes on your own pack never count toward its score.'}
        </p>

        {myPending.map((t) => (
          <PendingTrial key={t.recordId} trial={t} />
        ))}
        {myPending.length === 0 && <TrialForm packId={id} sample={pack.sampleRequest} />}

        {myVoted.length > 0 && (
          <div className="mt-6 space-y-2">
            {myVoted.map((t) => (
              <p key={t.recordId} className="text-sm text-muted-foreground">
                You picked <strong className="text-foreground">{t.data.choice === 'tie' ? 'a tie' : t.data.choice}</strong> on “
                {t.data.request}”. The pack was <strong className="text-foreground">{t.data.packSide}</strong>
                {t.data.choice === 'tie' ? '.' : t.data.packWon ? ', so the pack won.' : ', so the plain AI won.'}
              </p>
            ))}
          </div>
        )}
      </section>

      <section className="mt-12">
        <h2 className="font-serif text-2xl font-semibold">Receipts</h2>
        <p className="mt-1 text-sm text-muted-foreground">The latest blind votes from other readers. This is where the score comes from.</p>
        {receipts.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No votes from other readers yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border rounded-md border border-border bg-card">
            {receipts.map((t) => (
              <li key={t.recordId} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3 text-sm">
                <span className="min-w-0 flex-1 truncate">
                  <span className="text-muted-foreground">{nameOf(t.data.testerId)} asked:</span> {t.data.request}
                </span>
                <span
                  className={
                    t.data.choice === 'tie'
                      ? 'text-muted-foreground'
                      : t.data.packWon
                        ? 'font-medium text-primary'
                        : 'font-medium text-destructive'
                  }
                >
                  {t.data.choice === 'tie' ? 'Tie' : t.data.packWon ? 'Pack won' : 'Plain AI won'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {isAuthor && <AuthorDesk id={id} pack={pack} />}
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <Link to="/shelves" className="mb-8 inline-block text-sm text-muted-foreground hover:text-foreground">
        ← Back to the shelves
      </Link>
      {children}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-serif text-2xl font-semibold">{value}</dd>
    </div>
  )
}

function TrialForm({ packId, sample }: { packId: string; sample: string }) {
  const { error } = useToast()
  const [request, setRequest] = useState(sample)
  const [busy, setBusy] = useState(false)

  async function run(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    const r = await attempt(() => callAction('startTrial', { packId, request }))
    setBusy(false)
    if (!r.ok) error('The test did not run', r.error)
  }

  return (
    <form onSubmit={run} className="mt-5 rounded-md border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <Label htmlFor="request">Your request</Label>
      <Textarea id="request" rows={3} maxLength={LIMITS.request} value={request} onChange={(e) => setRequest(e.target.value)} className="mt-1.5 bg-background" />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button type="submit" loading={busy}>
          {busy ? 'Writing two answers…' : 'Run a blind test'}
        </Button>
        <span className="text-xs text-muted-foreground">
          Uses your DeepSpace AI credits. Up to {LIMITS.trialsPerDay} tests a day.
        </span>
      </div>
    </form>
  )
}

function PendingTrial({ trial }: { trial: RecordData<TrialData> }) {
  const { error } = useToast()
  const [busy, setBusy] = useState<Choice | null>(null)

  async function vote(choice: Choice) {
    setBusy(choice)
    const r = await attempt(() => callAction('castVote', { trialId: trial.recordId, choice }))
    setBusy(null)
    if (!r.ok) error('Vote not saved', r.error)
  }

  return (
    <div className="mt-5 rounded-md border-2 border-[#c99a2e]/60 bg-card p-5">
      <p className="text-sm text-muted-foreground">
        You asked: <span className="text-foreground">{trial.data.request}</span>
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {(['A', 'B'] as const).map((side) => (
          <article key={side} className="flex flex-col rounded-md border border-border bg-background p-4">
            <h3 className="mb-2 font-serif text-xl font-semibold">Answer {side}</h3>
            <div className="flex-1 whitespace-pre-wrap text-sm leading-relaxed">
              {side === 'A' ? trial.data.answerA : trial.data.answerB}
            </div>
            <Button className="mt-4" onClick={() => vote(side)} loading={busy === side} disabled={busy !== null}>
              {side} is better
            </Button>
          </article>
        ))}
      </div>
      <div className="mt-3 text-center">
        <Button variant="ghost" size="sm" onClick={() => vote('tie')} loading={busy === 'tie'} disabled={busy !== null}>
          Honestly, it’s a tie
        </Button>
      </div>
    </div>
  )
}

function AuthorDesk({ id, pack }: { id: string; pack: PackData }) {
  const navigate = useNavigate()
  const { error, success } = useToast()
  const [title, setTitle] = useState(pack.title)
  const [summary, setSummary] = useState(pack.summary)
  const [subject, setSubject] = useState<string>(pack.subject)
  const [sampleRequest, setSampleRequest] = useState(pack.sampleRequest)
  const [busy, setBusy] = useState<'save' | 'delete' | null>(null)

  async function save(e: FormEvent) {
    e.preventDefault()
    setBusy('save')
    const r = await attempt(() => callAction('updatePackDetails', { packId: id, patch: { title, summary, subject, sampleRequest } }))
    setBusy(null)
    if (r.ok) success('Cover details saved')
    else error('Could not save', r.error)
  }

  async function remove() {
    if (!window.confirm('Take this pack off the shelves? Its blind tests are deleted too. This cannot be undone.')) return
    setBusy('delete')
    const r = await attempt(() => callAction('deletePack', { packId: id }))
    setBusy(null)
    if (r.ok) navigate('/shelves')
    else error('Could not delete', r.error)
  }

  return (
    <section className="mt-12 rounded-md border border-dashed border-border p-5">
      <h2 className="font-serif text-xl font-semibold">Author’s desk</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        You can change the cover details. The pack text is final, so every vote it has was cast on what people download.
        To improve it, publish a new edition.
      </p>
      <form onSubmit={save} className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="ed-title">Title</Label>
          <Input id="ed-title" value={title} maxLength={LIMITS.title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ed-subject">Shelf</Label>
          <select id="ed-subject" value={subject} onChange={(e) => setSubject(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-card px-3 text-sm">
            {SUBJECTS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="ed-summary">Summary</Label>
          <Input id="ed-summary" value={summary} maxLength={LIMITS.summary} onChange={(e) => setSummary(e.target.value)} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="ed-sample">Sample request</Label>
          <Input id="ed-sample" value={sampleRequest} maxLength={LIMITS.sampleRequest} onChange={(e) => setSampleRequest(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-3 sm:col-span-2">
          <Button type="submit" loading={busy === 'save'}>
            Save details
          </Button>
          <Button type="button" variant="ghost" onClick={remove} loading={busy === 'delete'}>
            Delete pack
          </Button>
        </div>
      </form>
    </section>
  )
}
