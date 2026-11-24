/**
 * Landing page — a STATIC page (top level of src/pages/): no auth call, no
 * realtime connection. Drawn as a shop window; the shop itself is /shelves.
 */

import { Link } from 'react-router-dom'
import { Book } from '../components/BookCover'
import { Seo } from '../components/Seo'
import { seo } from '../seo'

/** Illustrative covers for the window display. Not real packs, and no scores. */
const WINDOW = [
  { title: 'Essays with a spine', subject: 'Writing', author: 'the shop', lean: 0 },
  { title: 'DCF models that hold up', subject: 'Finance', author: 'the shop', lean: 0 },
  { title: 'Proof-writing coach', subject: 'Math', author: 'the shop', lean: -6 },
]

export default function Landing() {
  return (
    <>
      <Seo {...seo} path="/" />
      <div data-testid="static-landing" className="min-h-screen overflow-x-hidden text-foreground">
        <main className="mx-auto max-w-6xl px-5 pb-24 sm:px-8">
          {/* Shop sign */}
          <div className="flex items-center justify-between py-6">
            <span className="flex items-center gap-2.5">
              <span className="grid h-10 w-10 place-items-center rounded-[3px] bg-[#2f5d46] font-display text-xl font-bold text-[#e6c674] shadow-md">X</span>
              <span className="font-display text-2xl font-semibold text-ink">XChangeAI</span>
            </span>
            <Link to="/shelves" className="text-[15px] text-[#5a4a35] underline-offset-4 hover:text-ink hover:underline">
              Sign in
            </Link>
          </div>

          {/* Window */}
          <section className="grid items-center gap-14 pt-8 md:grid-cols-2 md:pt-14">
            <div className="animate-rise">
              <p className="font-hand text-3xl text-[#9b3b2a]">Est. 2026 · open late</p>
              <h1 className="font-display-tight mt-2 text-5xl font-semibold leading-[1.0] text-ink lg:text-[4.25rem]">
                A bookshop for the files that teach AI.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-[#4a3c2b]">
                Somewhere, someone already taught their AI to write a tight essay, build a clean DCF, or explain a proof
                properly. Borrow their pack, but only after you’ve blind-tested it against the plain AI yourself.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-4">
                <Link
                  to="/shelves"
                  className="rounded-full bg-[#2f5d46] px-7 py-3.5 text-[15px] font-medium text-cream shadow-lg transition-transform duration-300 hover:-translate-y-0.5"
                >
                  Step inside
                </Link>
                <Link
                  to="/publish"
                  className="rounded-full border border-[#cdb994] bg-[#fffaf0]/80 px-7 py-3.5 text-[15px] font-medium text-ink transition-transform duration-300 hover:-translate-y-0.5"
                >
                  Share a pack
                </Link>
              </div>
            </div>

            <div className="animate-rise relative mx-auto w-full max-w-[34rem]" style={{ animationDelay: '150ms' }} aria-hidden="true">
              <div className="animate-sway absolute -top-6 right-4 rounded-sm border-2 border-[#9b3b2a] bg-[#fffaf0] px-4 py-1.5 font-type text-sm font-bold uppercase tracking-[0.3em] text-[#9b3b2a] shadow-md">
                Open
              </div>
              <div className="paper relative z-10 mb-8 inline-block -rotate-3 px-4 py-2 font-hand text-2xl leading-tight text-ink">
                every subject,
                <br />
                every major ✶
              </div>
              <div className="flex items-end justify-center gap-5">
                {WINDOW.map((b, i) => (
                  <div
                    key={b.title}
                    className={i === 2 ? 'hidden xl:block' : ''}
                    style={{ transform: b.lean ? `rotate(${b.lean}deg)` : undefined, transformOrigin: 'bottom right' }}
                  >
                    <Book title={b.title} subject={b.subject} author={b.author} size="md" />
                  </div>
                ))}
              </div>
              <div className="plank" />
            </div>
          </section>

          {/* How it works: index cards */}
          <section className="mt-28">
            <p className="text-center font-hand text-3xl text-[#9b3b2a]">how the shop works</p>
            <ol className="mt-8 grid gap-8 md:grid-cols-3">
              {[
                {
                  n: 'I',
                  t: 'Browse the shelves',
                  b: 'Packs for finance, engineering, math, writing, coding and more: the instructions and examples people give their AI to make it good at one thing.',
                  r: '-1.2deg',
                },
                {
                  n: 'II',
                  t: 'Blind taste test',
                  b: 'Ask anything. Get two manuscripts, one with the pack and one without. Pick the better one before we tell you which is which.',
                  r: '0.8deg',
                },
                {
                  n: 'III',
                  t: 'Take it home',
                  b: 'Download the pack for your own AI. Share yours, earn points when strangers pick it, and climb from Browser to Head Librarian.',
                  r: '-0.6deg',
                },
              ].map((s, i) => (
                <li
                  key={s.n}
                  className="paper tape animate-rise relative rounded-[3px] px-7 pb-7 pt-8"
                  style={{ transform: `rotate(${s.r})`, animationDelay: `${200 + i * 120}ms` }}
                >
                  <p className="font-display text-4xl font-bold text-[#c99a3e]">{s.n}</p>
                  <h2 className="mt-2 font-display text-2xl font-semibold text-ink">{s.t}</h2>
                  <p className="mt-2 text-[15px] leading-relaxed text-[#5a4a35]">{s.b}</p>
                </li>
              ))}
            </ol>
          </section>

          {/* The blind test, illustrated */}
          <section className="mt-28 grid items-center gap-12 md:grid-cols-2">
            <div className="relative h-72" aria-hidden="true">
              <div className="paper absolute left-0 top-6 w-[58%] -rotate-3 rounded-[3px] p-5">
                <p className="font-display text-xl font-semibold">Manuscript A</p>
                {[90, 100, 76, 94, 60].map((w, j) => (
                  <div key={j} className="mt-2.5 h-2 rounded-full bg-[#e7dbc3]" style={{ width: `${w}%` }} />
                ))}
                <div className="animate-stamp absolute right-3 top-14 rounded-md border-4 border-[#2f5d46] px-2 py-0.5 font-type text-xs font-bold uppercase tracking-[0.18em] text-[#2f5d46]">
                  With the pack
                </div>
              </div>
              <div className="paper absolute right-0 top-16 w-[58%] rotate-2 rounded-[3px] p-5">
                <p className="font-display text-xl font-semibold">Manuscript B</p>
                {[84, 96, 70, 88, 52].map((w, j) => (
                  <div key={j} className="mt-2.5 h-2 rounded-full bg-[#e7dbc3]" style={{ width: `${w}%` }} />
                ))}
                <div className="absolute right-3 top-14 -rotate-6 rounded-md border-4 border-[#9b3b2a] px-2 py-0.5 font-type text-xs font-bold uppercase tracking-[0.18em] text-[#9b3b2a] opacity-80">
                  Plain AI
                </div>
              </div>
            </div>
            <div>
              <h2 className="font-display-tight text-4xl font-semibold leading-tight text-ink">No stars. No hype. Just blind votes.</h2>
              <p className="mt-4 text-[17px] leading-relaxed text-[#4a3c2b]">
                Reviews are easy to fake. So every pack is judged the hard way: real readers pick between two unlabelled
                answers, and only afterwards find out which one used the pack. Bestseller stickers have to be earned, and
                one lucky vote can’t top the list.
              </p>
              <p className="mt-6 text-sm text-[#7a6a52]">
                A note on words: nobody can retrain ChatGPT or Claude with a file. A pack is the instructions you hand your
                AI, and that part can be shared.
              </p>
            </div>
          </section>
        </main>
      </div>
    </>
  )
}
