import { Link } from 'react-router-dom'
import { genreOf, patternCss } from '../lib/genres'
import { badgeFor, winRate, type PackData } from '../lib/xchange'

type Stats = Pick<PackData, 'trials' | 'wins' | 'ties'>

/**
 * Shop stickers. Each badge looks like something a bookseller would actually
 * stick on a cover: a gold seal, a handwritten staff note, a paper tag.
 */
export function BadgeSticker({ pack, className = '' }: { pack: Stats; className?: string }) {
  const badge = badgeFor(pack)
  if (badge === 'Bestseller') {
    return (
      <span
        className={`grid h-14 w-14 place-items-center rounded-full text-center font-display text-[9px] font-bold uppercase leading-tight tracking-wider text-[#3a2a12] shadow-md ${className}`}
        style={{ background: 'radial-gradient(circle at 35% 30%, #f6e3a6, #c99a3e 60%, #9c7020)' }}
      >
        Best
        <br />
        seller
      </span>
    )
  }
  if (badge === 'Staff pick') {
    return (
      <span className={`inline-block -rotate-3 bg-[#fff3a8] px-2 py-0.5 font-hand text-lg leading-none text-[#2a2118] shadow-md ${className}`}>
        Staff pick!
      </span>
    )
  }
  const tag: Record<string, string> = {
    Rising: 'bg-[#dfe6d3] text-[#24432f]',
    'Needs work': 'bg-[#f3d9cf] text-[#6b2a1f]',
    'New arrival': 'bg-[#fbf4e6] text-[#5a4a35]',
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] shadow-sm ${tag[badge]} ${className}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" aria-hidden="true" />
      {badge}
    </span>
  )
}

/** The physical book. Purely visual, so it can be reused anywhere a cover appears. */
export function Book({
  title,
  subject,
  author,
  stats,
  size = 'md',
}: {
  title: string
  subject: string
  author: string
  stats?: Stats
  size?: 'sm' | 'md' | 'lg'
}) {
  const g = genreOf(subject)
  const Icon = g.icon
  const dims = { sm: 'h-44 w-[7.5rem]', md: 'h-60 w-40', lg: 'h-80 w-56' }[size]
  const titleSize = { sm: 'text-[13px]', md: 'text-[17px]', lg: 'text-2xl' }[size]

  return (
    <div className={`book ${dims}`} style={{ backgroundColor: g.cloth }}>
      {/* cloth weave */}
      <div className="absolute inset-0 rounded-[inherit]" style={{ background: patternCss(g.pattern) }} aria-hidden="true" />
      {/* spine */}
      <div
        className="absolute inset-y-0 left-0 w-4 rounded-l-[2px]"
        style={{ background: `linear-gradient(90deg, ${g.spine}, ${g.cloth})` }}
        aria-hidden="true"
      >
        <div className="absolute inset-x-0 top-5 h-px" style={{ background: g.foil, opacity: 0.55 }} />
        <div className="absolute inset-x-0 top-7 h-px" style={{ background: g.foil, opacity: 0.55 }} />
        <div className="absolute inset-x-0 bottom-7 h-px" style={{ background: g.foil, opacity: 0.55 }} />
      </div>
      {/* hinge crease */}
      <div className="absolute inset-y-0 left-4 w-[3px] bg-black/15" aria-hidden="true" />

      <div className="relative flex h-full flex-col items-center px-4 pb-4 pl-7 pt-5 text-center" style={{ color: g.foil }}>
        <span
          className="grid place-items-center rounded-full border"
          style={{ borderColor: g.foil, width: size === 'lg' ? 44 : 30, height: size === 'lg' ? 44 : 30 }}
          aria-hidden="true"
        >
          <Icon size={size === 'lg' ? 20 : 14} strokeWidth={1.6} />
        </span>

        <div className="my-auto w-full">
          <div className="mx-auto mb-2 h-px w-10" style={{ background: g.foil, opacity: 0.7 }} />
          <p className={`book-foil font-display font-semibold leading-[1.12] ${titleSize} line-clamp-4`}>{title}</p>
          <div className="mx-auto mt-2 h-px w-10" style={{ background: g.foil, opacity: 0.7 }} />
        </div>

        <p className="book-foil w-full truncate text-[10px] uppercase tracking-[0.22em]" style={{ opacity: 0.9 }}>
          {author}
        </p>
      </div>

      {stats && (
        <div className="absolute -right-3 -top-3 z-10">
          <BadgeSticker pack={stats} />
        </div>
      )}
    </div>
  )
}

/** A book on a shelf, linking to its page. */
export default function BookCover({ id, pack, author }: { id: string; pack: PackData; author: string }) {
  return (
    <Link
      to={`/pack/${id}`}
      className="book-link book-stage group flex w-40 shrink-0 flex-col items-center focus:outline-none"
      aria-label={`${pack.title} by ${author}, ${pack.subject}`}
    >
      <Book title={pack.title} subject={pack.subject} author={author} stats={pack} />
    </Link>
  )
}

/** Caption under a book on the shelf: its score in one line. */
export function BookCaption({ pack }: { pack: PackData }) {
  const rate = winRate(pack)
  const decisive = pack.trials - pack.ties
  return (
    <p className="mt-3 w-40 text-center text-xs leading-snug text-muted-foreground">
      {rate === null ? (
        <span className="font-hand text-base text-[#6b5a43]">not tested yet</span>
      ) : (
        <>
          <span className="font-semibold text-foreground">{Math.round(rate * 100)}%</span> beat the plain AI ·{' '}
          {decisive} {decisive === 1 ? 'test' : 'tests'}
        </>
      )}
    </p>
  )
}
