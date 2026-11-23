/**
 * Landing page — a STATIC page (top level of src/pages/): no auth call, no
 * realtime connection. The shop itself sits behind the link to /shelves.
 */

import { Link } from 'react-router-dom'
import { Seo } from '../components/Seo'
import { seo } from '../seo'

const SPINES = [
  { c: '#2f5d46', h: 'h-40', t: 'Essays' },
  { c: '#7a2e2e', h: 'h-48', t: 'DCF models' },
  { c: '#24466b', h: 'h-36', t: 'Proofs' },
  { c: '#6b4b2a', h: 'h-44', t: 'Lab reports' },
  { c: '#4a3b6b', h: 'h-40', t: 'Cover letters' },
  { c: '#3f5f5f', h: 'h-48', t: 'Code review' },
  { c: '#2f5d46', h: 'h-36', t: 'Spanish' },
]

const STEPS = [
  {
    n: 'I',
    title: 'Browse the shelves',
    body: 'Packs for every subject: the instructions and examples people give their AI to make it good at one thing.',
  },
  {
    n: 'II',
    title: 'Blind taste test',
    body: 'Ask anything. Get two answers, one with the pack and one without, and pick the better one before we tell you which is which.',
  },
  {
    n: 'III',
    title: 'Take it home',
    body: 'Download the pack and give it to your own AI. Share yours, earn points when strangers pick it, and climb the ranks.',
  },
]

export default function Landing() {
  return (
    <>
      <Seo {...seo} path="/" />
      <div data-testid="static-landing" className="min-h-screen bg-background text-foreground">
        <main className="mx-auto max-w-5xl px-6 py-16 sm:py-24">
          <div className="grid items-end gap-12 md:grid-cols-[1.2fr_1fr]">
            <div>
              <p className="mb-4 text-sm font-semibold uppercase tracking-[0.25em] text-primary">XChangeAI</p>
              <h1 className="font-serif text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
                A bookshop of the files that teach AI.
              </h1>
              <p className="mt-5 max-w-xl text-lg text-muted-foreground">
                Someone already taught their AI to write a tight essay, build a clean DCF, or explain a proof. Borrow their
                pack, but only after you’ve blind-tested it against the plain AI yourself.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/shelves"
                  className="inline-flex items-center rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90"
                >
                  Step inside
                </Link>
                <Link
                  to="/publish"
                  className="inline-flex items-center rounded-md border border-border bg-card px-5 py-3 text-sm font-medium hover:bg-secondary"
                >
                  Share a pack
                </Link>
              </div>
            </div>

            <div aria-hidden="true" className="flex items-end gap-1.5 border-b-8 border-[#6b4b2a] px-2">
              {SPINES.map((s, i) => (
                <div
                  key={i}
                  className={`${s.h} relative flex w-10 items-center justify-center rounded-t-sm shadow-[2px_0_4px_rgba(0,0,0,0.2)]`}
                  style={{ backgroundColor: s.c }}
                >
                  <span className="rotate-180 whitespace-nowrap text-[11px] font-medium tracking-wide text-[#f6efe2] [writing-mode:vertical-rl]">
                    {s.t}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <ol className="mt-20 grid gap-6 sm:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n} className="rounded-md border border-border bg-card p-6 shadow-[var(--shadow-card)]">
                <p className="font-serif text-2xl font-semibold text-[#c99a2e]">{s.n}</p>
                <h2 className="mt-2 font-serif text-lg font-semibold">{s.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
              </li>
            ))}
          </ol>

          <p className="mt-16 text-center text-sm text-muted-foreground">
            A note on words: nobody can retrain ChatGPT or Claude with a file. A pack is the set of instructions you hand
            your AI, and that is something you can share.
          </p>
        </main>
      </div>
    </>
  )
}
