/** /publish — upload or paste a teaching pack and put it on the shelves. */

import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, Label, Textarea, useToast } from '@/components/ui'
import { attempt, callAction } from '../../../lib/api'
import { LIMITS, SUBJECTS, validatePack } from '../../../lib/xchange'

const field = 'flex h-10 w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm'

export default function PublishPage() {
  const navigate = useNavigate()
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
    const text = await file.text()
    setContent(text)
    if (!title) setTitle(file.name.replace(/\.(md|markdown|txt)$/i, '').replace(/[-_]+/g, ' ').slice(0, LIMITS.title))
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    const values = { title, subject, summary, content, sampleRequest }
    const invalid = validatePack(values)
    if (invalid) {
      setProblem(invalid)
      return
    }
    if (!window.confirm('Publish this pack? The pack text becomes final, so every vote it gets is on the same text people download.')) return
    setProblem(null)
    setBusy(true)
    const r = await attempt(() => callAction<{ recordId: string }>('publishPack', values))
    setBusy(false)
    if (!r.ok) {
      error('Could not publish', r.error)
      return
    }
    success('On the shelf', 'Now run a blind test or share it so strangers can.')
    navigate(r.value?.recordId ? `/pack/${r.value.recordId}` : '/shelves')
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="font-serif text-4xl font-semibold tracking-tight">Publish a pack</h1>
      <p className="mt-2 text-muted-foreground">
        Share what you tell your AI to make it good at something: rules, a checklist, a few short examples. Nobody can
        retrain ChatGPT or Claude with a file, but anyone can give it your instructions. That is what a pack is.
      </p>

      <form onSubmit={submit} noValidate className="mt-8 space-y-6 rounded-md border border-border bg-card p-6 shadow-[var(--shadow-card)]">
        <div className="grid gap-5 sm:grid-cols-[1fr_200px]">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} maxLength={LIMITS.title} placeholder="e.g. DCF models that hold up" onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="subject">Shelf</Label>
            <select id="subject" className={field} value={subject} onChange={(e) => setSubject(e.target.value)}>
              {SUBJECTS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="summary">One-line summary</Label>
          <Input id="summary" value={summary} maxLength={LIMITS.summary} placeholder="What does your AI do better with this pack?" onChange={(e) => setSummary(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <Label htmlFor="content">The pack</Label>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">
                {content.length.toLocaleString('en-US')} / {LIMITS.content.toLocaleString('en-US')}
              </span>
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                Upload .md or .txt
              </Button>
              <input ref={fileRef} type="file" accept=".md,.markdown,.txt,text/plain,text/markdown" className="hidden" onChange={loadFile} />
            </div>
          </div>
          <Textarea
            id="content"
            rows={14}
            value={content}
            maxLength={LIMITS.content}
            className="bg-background font-mono text-[13px]"
            placeholder={'Write it the way you would brief your AI. For example:\n\nWhen I ask for a proof:\n1. Restate what we are proving.\n2. Name the technique (induction, contradiction...) before using it.\n3. Number every step.\n...'}
            onChange={(e) => setContent(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Your own words and short examples only. Don't paste copyrighted books or anything confidential.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sample">A request to try it on</Label>
          <Input id="sample" value={sampleRequest} maxLength={LIMITS.sampleRequest} placeholder="e.g. Prove that the square root of 2 is irrational." onChange={(e) => setSampleRequest(e.target.value)} />
          <p className="text-xs text-muted-foreground">Readers see this pre-filled when they run a blind test. They can change it.</p>
        </div>

        {problem && (
          <p role="alert" className="text-sm text-destructive">
            {problem}
          </p>
        )}
        <Button type="submit" loading={busy}>
          Put it on the shelf
        </Button>
      </form>
    </div>
  )
}
