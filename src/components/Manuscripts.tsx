/**
 * The blind taste test, drawn as two manuscripts taped to the counter.
 * Presentational only, so the pack page and any preview can share it.
 */
import type { Choice, Side } from '../lib/xchange'

export function Manuscript({
  side,
  text,
  stamp,
  picked,
  footer,
  tilt = 0,
}: {
  side: Side
  text: string
  stamp?: { label: string; tone: 'pack' | 'plain' }
  picked?: boolean
  footer?: React.ReactNode
  tilt?: number
}) {
  return (
    <article
      className={`paper tape relative flex flex-col rounded-[3px] px-6 pb-5 pt-7 transition-transform duration-500 ${
        picked ? 'ring-2 ring-[#c99a3e] ring-offset-4 ring-offset-[#f6efe2]' : ''
      }`}
      style={{ transform: `rotate(${tilt}deg)` }}
    >
      <header className="mb-3 flex items-baseline justify-between border-b border-dashed border-[#dccbaa] pb-2">
        <h3 className="font-display text-2xl font-semibold text-ink">Manuscript {side}</h3>
        {picked && <span className="font-hand text-xl text-[#9b3b2a]">your pick ✓</span>}
      </header>
      <div className="max-h-[30rem] flex-1 overflow-auto whitespace-pre-wrap pr-1 text-[15px] leading-[1.7] text-[#2f271d]">
        {text}
      </div>
      {footer && <div className="mt-5">{footer}</div>}
      {stamp && (
        <div
          className={`animate-stamp pointer-events-none absolute bottom-5 right-5 rounded-md border-4 px-3 py-1 font-type text-base font-bold uppercase tracking-[0.18em] ${
            stamp.tone === 'pack' ? 'border-[#2f5d46] text-[#2f5d46]' : 'border-[#9b3b2a] text-[#9b3b2a]'
          }`}
          style={{ opacity: 0.85 }}
        >
          {stamp.label}
        </div>
      )}
    </article>
  )
}

/** Placeholder pair while the AI writes. */
export function WritingPair() {
  return (
    <div className="mt-6 grid gap-6 md:grid-cols-2" aria-live="polite">
      {(['A', 'B'] as const).map((s, i) => (
        <div key={s} className="paper tape relative rounded-[3px] px-6 pb-6 pt-7" style={{ transform: `rotate(${i ? 0.6 : -0.6}deg)` }}>
          <p className="font-display text-2xl font-semibold text-ink">Manuscript {s}</p>
          <div className="mt-4 space-y-3">
            {[92, 100, 84, 96, 70, 88].map((w, j) => (
              <div key={j} className="writing-shimmer h-3 rounded-full" style={{ width: `${w}%`, animationDelay: `${j * 90}ms` }} />
            ))}
          </div>
          <p className="mt-5 font-hand text-xl text-[#6b5a43]">{i ? 'and the other without…' : 'one with the pack…'}</p>
        </div>
      ))}
    </div>
  )
}

/** Both answers after the vote, with the truth stamped across them. */
export function RevealPair({
  answerA,
  answerB,
  packSide,
  choice,
}: {
  answerA: string
  answerB: string
  packSide: Side
  choice: Choice
}) {
  const verdict =
    choice === 'tie'
      ? 'You called it a tie.'
      : choice === packSide
        ? 'You picked the pack. Point to the author.'
        : 'You picked the plain AI. The pack lost this round.'
  return (
    <div>
      <p className="mt-6 font-hand text-3xl text-[#9b3b2a]">{verdict}</p>
      <div className="mt-4 grid gap-6 md:grid-cols-2">
        {(['A', 'B'] as const).map((s, i) => (
          <Manuscript
            key={s}
            side={s}
            text={s === 'A' ? answerA : answerB}
            picked={choice === s}
            tilt={i ? 0.5 : -0.5}
            stamp={s === packSide ? { label: 'With the pack', tone: 'pack' } : { label: 'Plain AI', tone: 'plain' }}
          />
        ))}
      </div>
    </div>
  )
}
