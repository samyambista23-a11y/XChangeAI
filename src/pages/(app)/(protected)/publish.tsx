/** /publish — the submissions desk: write or upload a pack and watch its cover take shape. */

import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from 'deepspace'
import { Upload } from 'lucide-react'
import { useToast } from '@/components/ui'
import { Book } from '../../../components/BookCover'
import { useAnnounce } from '../../../components/ShopPresence'
import { attempt, callAction } from '../../../lib/api'
import { genreOf } from '../../../lib/genres'
import { LIMITS, SUBJECTS, validatePack } from '../../../lib/xchange'

const field =
  'h-12 w-full rounded-md border border-[#dccbaa] bg-[#fffaf0] px-4 text-[15px] text-ink outline-none transition-shadow placeholder:text-[#a8957a] focus:shadow-[0_0_0_3px_rgba(47,93,70,.2)]'

export default function PublishPage() {
  useAnnounce({ page: 'publish', packId: null, packTitle: null, subject: null, testing: false })
  const navigate = useNavigate()
  const { user } = useUser()
  const { error, success } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState<string>(SUBJECTS[0])
  const [summary, setSummary] = useState('')
  const [content, setContent] = useState('')
  const [sampleRequest, setSampleRequest] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function loadFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!/\.(md|markdown|txt)$/i.test(file.name)) {
      error('Use a text file', 'Packs are plain text: a .md or .txt file.')
      return
    }
    if (file.size > LIMITS.uploadBytes) {
      error('File too large', `Packs must be under ${Math.round(LIMITS.uploadBytes / 1000)} KB of text.`)
      return
    }
    setContent(await file.text())
    if (!title) {
      const name = file.name.replace(/\.(md|markdown|txt)$/i, '').replace(/[-_]+/g, ' ')
      setTitle((name.charAt(0).toUpperCase() + name.slice(1)).slice(0, LIMITS.title))
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    const values = { title, subject, summary, content, sampleRequest }
    const invalid = validatePack(values)
    if (invalid) {
      setProblem(invalid)
      return
    }
    if (!window.confirm('Put this on the shelf? The pack text becomes final, so every vote it gets is on the same text people download.')) return
    setProblem(null)
    setBusy(true)
    const r = await attempt(() => callAction<{ recordId: string }>('publishPack', values))
    setBusy(false)
    if (!r.ok) {
      error('Could not publish', r.error)
      return
    }
    success('On the shelf', 'Run a blind test, or send it to a friend so a stranger can.')
    navigate(r.value?.recordId ? `/pack/${r.value.recordId}` : '/shelves')
  }

  const g = genreOf(subject)

  return (
    <div className="mx-auto max-w-6xl px-5 pb-24 pt-10 sm:px-8">
      <p className="font-hand text-2xl text-[#9b3b2a]">The submissions desk —</p>
      <h1 className="font-display-tight text-5xl font-semibold leading-[1.02] text-ink">Publish a pack</h1>
      <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-[#5a4a35]">
        Share what you tell your AI to make it good at something: the rules, a checklist, a couple of short examples. Nobody
        can retrain ChatGPT or Claude with a file, but anyone can hand it your instructions. That’s what a pack is.
      </p>

      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_300px]">
        <form onSubmit={submit} noValidate className="paper space-y-6 rounded-[3px] px-6 py-7 sm:px-8">
          <div className="grid gap-5 sm:grid-cols-[1fr_210px]">
            <label className="space-y-1.5 text-sm font-medium text-[#5a4a35]">
              Title
              <input className={field} value={title} maxLength={LIMITS.title} placeholder="e.g. DCF models that hold up" onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label className="space-y-1.5 text-sm font-medium text-[#5a4a35]">
              Section
              <select className={field} value={subject} onChange={(e) => setSubject(e.target.value)}>
                {SUBJECTS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="block space-y-1.5 text-sm font-medium text-[#5a4a35]">
            The blurb on the back
            <input className={field} value={summary} maxLength={LIMITS.summary} placeholder="What does your AI do better with this?" onChange={(e) => setSummary(e.target.value)} />
          </label>

          <div className="space-y-1.5">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <label htmlFor="content" className="text-sm font-medium text-[#5a4a35]">
                The pack itself
              </label>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#cdb994] bg-[#f6efe2] px-3.5 py-1.5 text-sm text-ink transition-transform hover:-translate-y-0.5"
              >
                <Upload size={14} aria-hidden="true" /> Upload a .md or .txt
              </button>
              <input ref={fileRef} type="file" accept=".md,.markdown,.txt,text/plain,text/markdown" className="hidden" onChange={loadFile} />
            </div>
            <div className="rounded-md border border-[#dccbaa] bg-[#fffdf7] px-5 py-3">
              <textarea
                id="content"
                rows={14}
                value={content}
                maxLength={LIMITS.content}
                className="ruled w-full resize-y bg-transparent font-type text-[14px] text-[#2f271d] outline-none placeholder:text-[#b3a283]"
                placeholder={'Write it the way you would brief your AI. For example:\n\nWhen I ask for a proof:\n1. Restate what we are proving.\n2. Name the technique before using it.\n3. Number every step…'}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap justify-between gap-2 text-xs text-[#8a7658]">
              <span>Your own words and short examples only. No copyrighted books, nothing confidential.</span>
              <span className="font-type">
                {content.length.toLocaleString('en-US')} / {LIMITS.content.toLocaleString('en-US')}
              </span>
            </div>
          </div>

          <label className="block space-y-1.5 text-sm font-medium text-[#5a4a35]">
            A request to try it on
            <input className={field} value={sampleRequest} maxLength={LIMITS.sampleRequest} placeholder="e.g. Prove that the square root of 2 is irrational." onChange={(e) => setSampleRequest(e.target.value)} />
            <span className="block text-xs font-normal text-[#8a7658]">Readers see this pre-filled when they run a blind test.</span>
          </label>

          {problem && (
            <p role="alert" className="font-hand text-xl text-[#9b3b2a]">
              {problem}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="rounded-full px-7 py-3.5 text-[15px] font-medium text-cream shadow-md transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-60"
            style={{ backgroundColor: g.cloth }}
          >
            {busy ? 'Binding the book…' : 'Put it on the shelf'}
          </button>
        </form>

        {/* Live cover preview */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <p className="mb-3 text-center font-hand text-2xl text-[#6b5a43]">Your cover, so far</p>
          <div className="flex flex-col items-center">
            <div className="book-link book-stage">
              <Book
                title={title.trim() || 'Your title here'}
                subject={subject}
                author={user?.name ?? 'You'}
                stats={{ trials: 0, wins: 0, ties: 0 }}
                size="lg"
              />
            </div>
            <div className="plank w-72" aria-hidden="true" />
            <p className="mt-4 max-w-[16rem] text-center text-sm text-[#7a6a52]">
              Bound in <span style={{ color: g.cloth }} className="font-semibold">{subject.toLowerCase()} cloth</span>.{' '}
              Every new pack starts as a New arrival and earns its sticker from blind tests.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
