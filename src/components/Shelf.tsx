import type { ReactNode } from 'react'
import { genreOf } from '../lib/genres'

/**
 * One shelf of the shop: a brass plaque with the section name, then a row of
 * books standing on a wooden plank with a caption under each.
 *
 * Each slot carries its own length of plank and the slots sit flush, so the
 * plank stays continuous even while the row scrolls sideways.
 */
export default function Shelf({
  subject,
  count,
  children,
  delay = 0,
}: {
  subject: string
  count: number
  children: ReactNode
  delay?: number
}) {
  const g = genreOf(subject)
  const Icon = g.icon
  return (
    <section className="animate-rise" style={{ animationDelay: `${delay}ms` }} aria-label={`${subject} shelf`}>
      <div className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="brass-plate inline-flex items-center gap-2 rounded-sm px-3 py-1 font-display text-sm font-semibold tracking-wide">
          <Icon size={14} strokeWidth={2} aria-hidden="true" />
          {subject}
        </span>
        <span className="font-hand text-xl text-[#6b5a43]">{g.tagline}</span>
        <span className="ml-auto text-xs text-muted-foreground">
          {count} {count === 1 ? 'pack' : 'packs'}
        </span>
      </div>
      <div className="no-scrollbar flex overflow-x-auto">
        {children}
        <div className="flex min-w-8 flex-1 flex-col" aria-hidden="true">
          <div className="h-[17rem]" />
          <div className="plank rounded-none" />
        </div>
      </div>
    </section>
  )
}

/** A single book slot: the book standing on its length of plank, caption below. */
export function ShelfSlot({ book, caption }: { book: ReactNode; caption: ReactNode }) {
  return (
    <div className="flex w-52 shrink-0 flex-col items-center">
      <div className="flex h-[17rem] w-full items-end justify-center px-6 pt-5">{book}</div>
      <div className="plank w-full rounded-none" aria-hidden="true" />
      {caption}
    </div>
  )
}
