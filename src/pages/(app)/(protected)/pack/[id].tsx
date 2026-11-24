/**
 * /pack/:id — one pack: the book on its lectern, the blind taste test, the
 * receipts, and the download.
 *
 * The blind test is the heart of the app. A reader types a request, the server
 * answers it twice (with and without the pack) and shows the two answers as A
 * and B. Which one used the pack is stored in a table the browser cannot read,
 * and is only revealed after the reader votes.
 */

import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useUser, useUsers, type RecordData } from 'deepspace'
import { ArrowLeft, BookOpen, Download } from 'lucide-react'
import { useToast } from '@/components/ui'
import { Book } from '../../../../components/BookCover'
import { Manuscript, RevealPair, WritingPair } from '../../../../components/Manuscripts'
import { AlsoHere, useAnnounce } from '../../../../components/ShopPresence'
import { attempt, callAction } from '../../../../lib/api'
import { genreOf } from '../../../../lib/genres'
import {
  LIMITS,
  SUBJECTS,
  badgeFor,
  packFileName,
  packToMarkdown,
  winRate,
  type Choice,
  type PackData,
  type Side,
  type TrialData,
} from '../../../../lib/xchange'

export default function PackPage() {
  const { id = '' } = useParams<{ id: string }>()
  const { user } = useUser()
  const { users } = useUsers()
  const { records: packs, status } = useQuery<PackData>('packs')
  const { records: trials } = useQuery<TrialData>('trials', { where: { packId: id }, orderBy: 'createdAt', orderDir: 'desc' })
  const [showText, setShowText] = useState(false)
  const [running, setRunning] = useState(false)

  // Presence: tell the shop which pack you're on, and whether you're mid-test.
  const current = packs.find((p) => p.recordId === id)
  const deciding = trials.some((t) => t.data.testerId === user?.id && t.data.status === 'pending')
  useAnnounce({
    page: 'pack',
    packId: current ? id : null,
    packTitle: current?.data.title ?? null,
    subject: current?.data.subject ?? null,
    testing: running || deciding,
  })

  if (status === 'loading') {
    return (
      <Shell>
        <p className="font-hand text-2xl text-[#6b5a43]">Fetching it from the back room…</p>
      </Shell>
    )
  }
  const rec = packs.find((p) => p.recordId === id)
  if (!rec) {
    return (
      <Shell>
        <div className="paper tape relative max-w-md -rotate-1 px-8 py-6">
          <p className="font-hand text-3xl text-ink">This one’s been taken off the shelf.</p>
          <Link to="/shelves" className="mt-3 inline-block text-[15px] text-[#2f5d46] underline underline-offset-4">
            Back to the shelves
          </Link>
        </div>
      </Shell>
    )
  }

  const pack = rec.data
  const g = genreOf(pack.subject)
  const isAuthor = pack.ownerId === user?.id
  const nameOf = (uid: string) => (uid === user?.id ? 'You' : users.find((u) => u.id === uid)?.name ?? 'A reader')
  const authorName = pack.byline || nameOf(pack.ownerId)
  const rate = winRate(pack)
  const decisive = pack.trials - pack.ties
  const myPending = trials.filter((t) => t.data.testerId === user?.id && t.data.status === 'pending')
  const myVoted = trials.filter((t) => t.data.testerId === user?.id && t.data.status === 'voted')
  const receipts = trials.filter((t) => t.data.status === 'voted' && t.data.counted).slice(0, 8)
  const latest = myVoted[0]

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
      {/* The book on its lectern */}
      <section className="grid items-center gap-12 md:grid-cols-[auto_1fr]">
        <div className="animate-rise mx-auto flex flex-col items-center md:mx-0">
          <div className="book-link book-stage">
            <Book title={pack.title} subject={pack.subject} author={authorName} stats={pack} size="lg" />
          </div>
          <div className="plank mt-0 h-4 w-72" aria-hidden="true" />
        </div>

        <div className="animate-rise" style={{ animationDelay: '100ms' }}>
          <span className="brass-plate inline-flex rounded-sm px-3 py-1 font-display text-sm font-semibold">
            {pack.subject} · {g.tagline}
          </span>
          <h1 className="font-display-tight mt-4 text-4xl font-semibold leading-[1.05] text-ink sm:text-5xl">{pack.title}</h1>
          <p className="mt-2 font-hand text-2xl text-[#9b3b2a]">by {authorName}</p>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-[#4a3c2b]">{pack.summary}</p>

          <dl className="mt-7 flex flex-wrap gap-3">
            <PriceTag label="Beats the plain AI" value={rate === null ? '—' : `${Math.round(rate * 100)}%`} color={g.cloth} />
            <PriceTag label="Blind tests" value={String(decisive)} color={g.cloth} />
            <PriceTag label="Called a tie" value={String(pack.ties)} color={g.cloth} />
            <PriceTag label="On the cover" value={badgeFor(pack)} color={g.cloth} small />
          </dl>

          <div className="mt-7 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={download}
              className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium text-cream shadow-md transition-transform duration-300 hover:-translate-y-0.5"
              style={{ backgroundColor: g.cloth }}
            >
              <Download size={16} aria-hidden="true" /> Take it home (.md)
            </button>
            <button
              type="button"
              onClick={() => setShowText((v) => !v)}
              className="inline-flex items-center gap-2 rounded-full border border-[#cdb994] bg-[#fffaf0]/80 px-5 py-3 text-sm font-medium text-ink transition-transform duration-300 hover:-translate-y-0.5"
            >
              <BookOpen size={16} aria-hidden="true" /> {showText ? 'Close the book' : 'Read a few pages'}
            </button>
          </div>
          <p className="mt-3 text-sm text-[#7a6a52]">
            Paste the file into your AI as a custom instruction, a project file, or the start of a chat.{' '}
            <Link to="/how-to" className="underline underline-offset-4 hover:text-ink">
              How?
            </Link>
          </p>
          <AlsoHere packId={id} />
        </div>
      </section>

      {showText && (
        <div className="paper animate-rise relative mt-10 rounded-[3px] px-8 py-7">
          <p className="mb-3 font-type text-xs uppercase tracking-[0.2em] text-[#8a7658]">The pack, word for word</p>
          <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap font-type text-[14px] leading-[1.75] text-[#2f271d]">
            {pack.content}
          </pre>
        </div>
      )}

      {/* The blind taste test */}
      <section className="mt-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-hand text-2xl text-[#9b3b2a]">Try before you take it —</p>
            <h2 className="font-display-tight text-4xl font-semibold text-ink">The blind taste test</h2>
          </div>
          <p className="max-w-md text-[15px] leading-relaxed text-[#5a4a35]">
            Ask anything. One manuscript is written with this pack, the other by the plain AI, in random order. Pick the
            better one, then we lift the cover.
            {isAuthor && ' Your votes on your own pack never count toward its score.'}
          </p>
        </div>

        {myPending.map((t) => (
          <PendingTrial key={t.recordId} trial={t} />
        ))}
        {myPending.length === 0 && <TrialForm packId={id} sample={pack.sampleRequest} onBusy={setRunning} />}

        {myPending.length === 0 && latest && latest.data.packSide && latest.data.choice && (
          <div className="mt-12">
            <p className="text-[15px] text-[#5a4a35]">
              Your last test: <span className="italic text-ink">“{latest.data.request}”</span>
            </p>
            <RevealPair
              answerA={latest.data.answerA}
              answerB={latest.data.answerB}
              packSide={latest.data.packSide as Side}
              choice={latest.data.choice as Choice}
            />
          </div>
        )}
      </section>

      {/* Receipts */}
      <section className="mt-20 grid gap-10 md:grid-cols-[1fr_320px]">
        <div>
          <h2 className="font-display-tight text-3xl font-semibold text-ink">Receipts</h2>
          <p className="mt-1 text-[15px] text-[#5a4a35]">The latest blind votes from other readers. This is where the score comes from.</p>
          {receipts.length === 0 ? (
            <p className="mt-5 font-hand text-2xl text-[#6b5a43]">No votes from other readers yet. Share it with a friend.</p>
          ) : (
            <ul className="paper mt-5 rounded-[3px] px-6 py-3 font-type text-[13px]">
              {receipts.map((t) => (
                <li key={t.recordId} className="flex flex-wrap items-baseline gap-x-3 border-b border-dashed border-[#dccbaa] py-2.5 last:border-0">
                  <span className="w-28 shrink-0 truncate text-[#8a7658]">{nameOf(t.data.testerId)}</span>
                  <span className="min-w-0 flex-1 truncate text-[#2f271d]">{t.data.request}</span>
                  <span
                    className={`font-bold uppercase tracking-wider ${
                      t.data.choice === 'tie' ? 'text-[#8a7658]' : t.data.packWon ? 'text-[#2f5d46]' : 'text-[#9b3b2a]'
                    }`}
                  >
                    {t.data.choice === 'tie' ? 'tie' : t.data.packWon ? 'pack won' : 'plain won'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        {myVoted.length > 1 && (
          <div>
            <h3 className="font-display text-xl font-semibold text-ink">Your earlier tests</h3>
            <ul className="mt-3 space-y-2 text-sm text-[#5a4a35]">
              {myVoted.slice(1, 6).map((t) => (
                <li key={t.recordId} className="leading-snug">
                  <span className="italic">“{t.data.request}”</span> —{' '}
                  {t.data.choice === 'tie' ? 'tie' : t.data.packWon ? 'you picked the pack' : 'you picked the plain AI'}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {isAuthor && <AuthorDesk id={id} pack={pack} />}
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl px-5 pb-24 pt-8 sm:px-8">
      <Link to="/shelves" className="mb-10 inline-flex items-center gap-1.5 text-sm text-[#7a6a52] transition-colors hover:text-ink">
        <ArrowLeft size={15} aria-hidden="true" /> Back to the shelves
      </Link>
      {children}
    </div>
  )
}

/** A stat drawn as a little card-stock price tag on a string. */
function PriceTag({ label, value, color, small = false }: { label: string; value: string; color: string; small?: boolean }) {
  return (
    <div className="relative rounded-[3px] border border-[#dccbaa] bg-[#fffaf0] py-2 pl-6 pr-4 shadow-sm">
      <span className="absolute left-2 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full border border-[#cdb994] bg-[#f6efe2]" aria-hidden="true" />
      <dt className="text-[11px] uppercase tracking-[0.14em] text-[#8a7658]">{label}</dt>
      <dd className={`font-display font-semibold ${small ? 'text-lg' : 'text-2xl'}`} style={{ color }}>
        {value}
      </dd>
    </div>
  )
}

function TrialForm({ packId, sample, onBusy }: { packId: string; sample: string; onBusy: (b: boolean) => void }) {
  const { error } = useToast()
  const [request, setRequest] = useState(sample)
  const [busy, setBusyState] = useState(false)
  const setBusy = (b: boolean) => {
    setBusyState(b)
    onBusy(b)
  }

  async function run(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    const r = await attempt(() => callAction('startTrial', { packId, request }))
    setBusy(false)
    if (!r.ok) error('The test did not run', r.error)
  }

  return (
    <>
      <form onSubmit={run} className="paper mt-8 rounded-[3px] px-7 pb-6 pt-5">
        <label htmlFor="request" className="font-type text-xs uppercase tracking-[0.2em] text-[#8a7658]">
          Your request
        </label>
        <textarea
          id="request"
          rows={3}
          maxLength={LIMITS.request}
          value={request}
          onChange={(e) => setRequest(e.target.value)}
          disabled={busy}
          className="ruled mt-1 w-full resize-none bg-transparent text-[17px] text-ink outline-none placeholder:text-[#a8957a]"
          placeholder="Ask it anything this pack should be good at…"
        />
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-full bg-[#2f5d46] px-6 py-3 text-sm font-medium text-cream shadow-md transition-all duration-300 hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-70"
          >
            {busy ? 'Writing two manuscripts…' : 'Run a blind test'}
          </button>
          <span className="text-xs text-[#8a7658]">Uses your DeepSpace AI credits · up to {LIMITS.trialsPerDay} tests a day</span>
        </div>
      </form>
      {busy && <WritingPair />}
    </>
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

  const pickButton = (side: Side) => (
    <button
      type="button"
      onClick={() => vote(side)}
      disabled={busy !== null}
      className="w-full rounded-full bg-ink py-3 text-sm font-medium text-cream shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#2f5d46] disabled:opacity-60"
    >
      {busy === side ? 'Lifting the cover…' : `${side} is the better one`}
    </button>
  )

  return (
    <div className="animate-rise mt-8">
      <p className="text-[15px] text-[#5a4a35]">
        You asked: <span className="italic text-ink">“{trial.data.request}”</span>
      </p>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Manuscript side="A" text={trial.data.answerA} tilt={-0.5} footer={pickButton('A')} />
        <Manuscript side="B" text={trial.data.answerB} tilt={0.5} footer={pickButton('B')} />
      </div>
      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={() => vote('tie')}
          disabled={busy !== null}
          className="font-hand text-2xl text-[#6b5a43] underline decoration-wavy decoration-[#c99a3e] underline-offset-4 transition-colors hover:text-ink disabled:opacity-60"
        >
          {busy === 'tie' ? 'noted…' : 'honestly, it’s a tie'}
        </button>
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

  const field =
    'h-11 w-full rounded-md border border-[#dccbaa] bg-[#fffaf0] px-3 text-[15px] text-ink outline-none transition-shadow focus:shadow-[0_0_0_3px_rgba(47,93,70,.2)]'

  return (
    <section className="mt-20 rounded-[4px] border-2 border-dashed border-[#cdb994] px-6 py-7 sm:px-8">
      <p className="font-hand text-2xl text-[#9b3b2a]">Staff only —</p>
      <h2 className="font-display-tight text-3xl font-semibold text-ink">The author’s desk</h2>
      <p className="mt-2 max-w-2xl text-[15px] text-[#5a4a35]">
        You can change what’s on the cover. The pack text is final, so every vote it has was cast on exactly what people
        download. To improve it, publish a new edition.
      </p>
      <form onSubmit={save} className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="space-y-1.5 text-sm text-[#5a4a35]">
          Title
          <input className={field} value={title} maxLength={LIMITS.title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="space-y-1.5 text-sm text-[#5a4a35]">
          Section
          <select className={field} value={subject} onChange={(e) => setSubject(e.target.value)}>
            {SUBJECTS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5 text-sm text-[#5a4a35] sm:col-span-2">
          Summary
          <input className={field} value={summary} maxLength={LIMITS.summary} onChange={(e) => setSummary(e.target.value)} />
        </label>
        <label className="space-y-1.5 text-sm text-[#5a4a35] sm:col-span-2">
          Sample request
          <input className={field} value={sampleRequest} maxLength={LIMITS.sampleRequest} onChange={(e) => setSampleRequest(e.target.value)} />
        </label>
        <div className="flex flex-wrap gap-3 sm:col-span-2">
          <button
            type="submit"
            disabled={busy !== null}
            className="rounded-full bg-[#2f5d46] px-5 py-2.5 text-sm font-medium text-cream shadow-sm transition-transform hover:-translate-y-0.5 disabled:opacity-60"
          >
            {busy === 'save' ? 'Saving…' : 'Save cover details'}
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={busy !== null}
            className="rounded-full px-5 py-2.5 text-sm text-[#9b3b2a] underline-offset-4 hover:underline disabled:opacity-60"
          >
            {busy === 'delete' ? 'Removing…' : 'Take it off the shelf'}
          </button>
        </div>
      </form>
    </section>
  )
}
