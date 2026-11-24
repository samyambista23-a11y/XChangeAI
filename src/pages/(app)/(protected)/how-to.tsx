/** /how-to — a friendly guide: borrow a pack, or share one. Plus where to paste a pack in each AI. */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Download, FlaskConical, PenLine, Search, Sparkles, Upload, Vote } from 'lucide-react'
import { useAnnounce } from '../../../components/ShopPresence'
import { LIMITS } from '../../../lib/xchange'

type Track = 'borrow' | 'share'

const BORROW = [
  {
    icon: Search,
    title: 'Find a pack',
    body: 'Browse the shelves by section (Finance, Math, Coding…) or search. Each book is a set of instructions someone uses to make their AI good at one thing.',
    link: { to: '/shelves', label: 'Go to the shelves' },
  },
  {
    icon: BookOpen,
    title: 'Read a few pages',
    body: 'Open the pack and press “Read a few pages” to see exactly what it tells the AI. No mystery, no paywall.',
  },
  {
    icon: FlaskConical,
    title: 'Run a blind taste test',
    body: 'Ask something you actually need. You get two answers, Manuscript A and B: one written with the pack, one by the plain AI, in random order.',
  },
  {
    icon: Vote,
    title: 'Pick the better one',
    body: 'Vote A, B, or tie. Only then do we lift the cover and show which one used the pack. Your vote becomes part of the pack’s score.',
  },
  {
    icon: Download,
    title: 'Take it home',
    body: 'Press “Take it home (.md)” to download the pack, then paste it into your own AI. See “Where to paste it” below.',
  },
]

const SHARE = [
  {
    icon: PenLine,
    title: 'Write down what works',
    body: 'Think of the instructions you keep giving your AI: rules, a checklist, a couple of short examples. That is your pack. A plain .md or .txt file is perfect.',
  },
  {
    icon: Upload,
    title: 'Publish it',
    body: `Go to “Publish a pack”, pick a section, write a one-line blurb, and paste or upload your text (up to ${LIMITS.content.toLocaleString('en-US')} characters). Watch your cover take shape as you type.`,
    link: { to: '/publish', label: 'Open the submissions desk' },
  },
  {
    icon: Sparkles,
    title: 'Suggest a test request',
    body: 'Add one request people can try your pack on. Pick something where your pack makes a clear difference.',
  },
  {
    icon: FlaskConical,
    title: 'Let strangers test it',
    body: 'Your own votes never count toward your pack’s score, so share the link. Every time a stranger picks your pack in a blind test, you earn 3 points.',
  },
  {
    icon: Vote,
    title: 'Earn your sticker',
    body: 'Packs start as New arrivals. With enough blind wins they become Rising, Staff picks, and Bestsellers. To improve a pack, publish a new edition: the text of a published pack is final, so every vote was cast on what people download.',
  },
]

const WHERE = [
  {
    name: 'ChatGPT',
    tip: 'For a short pack, paste it into your custom instructions in settings. For a longer one, make a Project and paste it into the project’s instructions, or build a custom GPT.',
  },
  {
    name: 'Claude',
    tip: 'Create a Project and paste the pack into its project instructions, or add the .md file to the project. Every chat in that project follows it.',
  },
  {
    name: 'Gemini',
    tip: 'Create a new Gem and paste the pack into its instructions. Then chat with that Gem whenever you need it.',
  },
  {
    name: 'Anything else',
    tip: 'Paste the whole pack at the start of a new chat, then ask your question in the next message. It works with almost any assistant.',
  },
]

const FAQ = [
  {
    q: 'Is this actually training my AI?',
    a: 'Not in the technical sense. Nobody can retrain ChatGPT or Claude with a file. A pack is the set of instructions you hand your AI, and that part can be shared and reused by anyone.',
  },
  {
    q: 'Why blind tests instead of star ratings?',
    a: 'Stars are easy to fake and easy to bias. When you don’t know which answer used the pack, your vote is about the answer, not the hype. It’s the same idea public AI leaderboards use.',
  },
  {
    q: 'Do my votes on my own pack count?',
    a: 'No. You can test your own pack as much as you like, but only other readers’ votes move its score.',
  },
  {
    q: 'How do points and ranks work?',
    a: 'You earn 1 point for every blind vote you cast and 3 points each time someone picks a pack you wrote. Ranks go from Browser to Regular, Bookworm, Critic, and Head Librarian.',
  },
  {
    q: 'What shouldn’t I put in a pack?',
    a: 'Anything confidential, personal information, or copyrighted text like chapters of books. Use your own words and short examples you wrote yourself.',
  },
  {
    q: 'Is there a limit on tests?',
    a: `Yes: ${LIMITS.trialsPerDay} blind tests a day each, because every test asks the AI twice and uses your DeepSpace credits.`,
  },
]

export default function HowToPage() {
  useAnnounce({ page: 'how-to', packId: null, packTitle: null, subject: null, testing: false })
  const [track, setTrack] = useState<Track>('borrow')
  const steps = track === 'borrow' ? BORROW : SHARE

  return (
    <div className="mx-auto max-w-5xl px-5 pb-24 pt-10 sm:px-8">
      <p className="font-hand text-2xl text-[#9b3b2a]">New here? Start with this —</p>
      <h1 className="font-display-tight text-5xl font-semibold leading-[1.02] text-ink">How the shop works</h1>
      <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-[#5a4a35]">
        There are two ways to use XChangeAI. Borrow a pack someone else wrote to make your AI better at something, or share
        what you’ve taught your own AI so others can use it.
      </p>

      {/* Track switch */}
      <div className="paper mt-8 inline-flex rounded-full p-1" role="tablist" aria-label="Choose a guide">
        {(
          [
            ['borrow', 'I want to borrow a pack'],
            ['share', 'I want to share a pack'],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            role="tab"
            type="button"
            aria-selected={track === k}
            onClick={() => setTrack(k)}
            className={`rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-300 ${
              track === k ? 'bg-[#2f5d46] text-cream shadow-md' : 'text-[#5a4a35] hover:bg-[#efe3cc]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Steps as index cards */}
      <ol key={track} className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {steps.map((s, i) => {
          const Icon = s.icon
          return (
            <li
              key={s.title}
              className="paper animate-rise relative rounded-[3px] px-6 pb-6 pt-5"
              style={{ animationDelay: `${i * 80}ms`, transform: `rotate(${[-0.6, 0.5, -0.3, 0.6, -0.4][i] ?? 0}deg)` }}
            >
              <div className="flex items-center gap-3">
                <span className="font-display text-3xl font-bold text-[#c99a3e]">{i + 1}</span>
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[#efe3cc] text-[#2f5d46]" aria-hidden="true">
                  <Icon size={18} strokeWidth={1.8} />
                </span>
              </div>
              <h2 className="mt-3 font-display text-xl font-semibold text-ink">{s.title}</h2>
              <p className="mt-1.5 text-[15px] leading-relaxed text-[#5a4a35]">{s.body}</p>
              {'link' in s && s.link && (
                <Link to={s.link.to} className="mt-3 inline-block text-sm font-medium text-[#2f5d46] underline underline-offset-4">
                  {s.link.label} →
                </Link>
              )}
            </li>
          )
        })}
      </ol>

      {/* Where to paste it */}
      <section className="mt-20">
        <p className="font-hand text-2xl text-[#9b3b2a]">Got a pack? Here’s where it goes —</p>
        <h2 className="font-display-tight text-4xl font-semibold text-ink">Where to paste it</h2>
        <p className="mt-2 max-w-2xl text-[15px] text-[#5a4a35]">
          Most assistants have a place for standing instructions. Menu names change now and then, so look for these.
        </p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {WHERE.map((w) => (
            <div key={w.name} className="rounded-[4px] border border-[#dccbaa] bg-[#fffaf0]/80 px-5 py-4">
              <p className="font-display text-lg font-semibold text-ink">{w.name}</p>
              <p className="mt-1 text-[15px] leading-relaxed text-[#5a4a35]">{w.tip}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mt-20">
        <h2 className="font-display-tight text-4xl font-semibold text-ink">Questions people ask at the counter</h2>
        <div className="mt-6 divide-y divide-dashed divide-[#cdb994] border-y border-dashed border-[#cdb994]">
          {FAQ.map((f) => (
            <details key={f.q} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-lg font-semibold text-ink">
                {f.q}
                <span className="text-2xl text-[#c99a3e] transition-transform duration-300 group-open:rotate-45" aria-hidden="true">
                  +
                </span>
              </summary>
              <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-[#5a4a35]">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <div className="mt-16 flex flex-wrap gap-3">
        <Link to="/shelves" className="rounded-full bg-[#2f5d46] px-6 py-3 text-sm font-medium text-cream shadow-md transition-transform hover:-translate-y-0.5">
          Browse the shelves
        </Link>
        <Link to="/publish" className="rounded-full border border-[#cdb994] bg-[#fffaf0]/80 px-6 py-3 text-sm font-medium text-ink transition-transform hover:-translate-y-0.5">
          Publish a pack
        </Link>
      </div>
    </div>
  )
}
