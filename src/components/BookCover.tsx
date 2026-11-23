import { Link } from 'react-router-dom'
import { badgeFor, coverIndex, winRate, type PackData } from '../lib/xchange'

/** Cloth-bound book colours. Picked per pack from its id, so a cover never changes. */
const CLOTH = ['#2f5d46', '#7a2e2e', '#24466b', '#6b4b2a', '#4a3b6b', '#3f5f5f']

const BADGE_STYLE: Record<string, string> = {
  Bestseller: 'bg-[#c99a2e] text-[#2a2118]',
  'Staff pick': 'bg-[#fffaf0] text-[#2f5d46]',
  Rising: 'bg-[#e8d9b5] text-[#2a2118]',
  'Needs work': 'bg-[#d9c7c7] text-[#5a2424]',
  'New arrival': 'bg-[#fffaf0]/80 text-[#2a2118]',
}

export function BadgeSticker({ pack }: { pack: Pick<PackData, 'trials' | 'wins' | 'ties'> }) {
  const badge = badgeFor(pack)
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide shadow-sm ${BADGE_STYLE[badge]}`}>
      {badge}
    </span>
  )
}

/** The cover itself: a cloth-coloured book with a spine edge and a gold title block. */
export function Cover({ id, pack, large = false }: { id: string; pack: PackData; large?: boolean }) {
  const cloth = CLOTH[coverIndex(id, CLOTH.length)]
  return (
    <div
      className={`relative flex flex-col overflow-hidden rounded-r-md rounded-l-sm text-[#f6efe2] shadow-[4px_6px_14px_rgba(42,33,24,0.25)] ${
        large ? 'h-72 w-52' : 'h-52 w-full'
      }`}
      style={{ backgroundColor: cloth }}
    >
      <div className="absolute inset-y-0 left-0 w-3 bg-black/20" aria-hidden="true" />
      <div className="absolute inset-y-0 left-3 w-px bg-white/15" aria-hidden="true" />
      <div className="flex flex-1 flex-col px-5 py-4 pl-6">
        <div className="mb-auto">
          <BadgeSticker pack={pack} />
        </div>
        <div className="border-y border-[#c99a2e]/70 py-2">
          <p className={`font-serif font-semibold leading-tight ${large ? 'text-2xl' : 'text-lg'}`}>{pack.title}</p>
        </div>
        <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-[#f6efe2]/75">{pack.subject}</p>
      </div>
    </div>
  )
}

export default function BookCover({ id, pack, author }: { id: string; pack: PackData; author: string }) {
  const rate = winRate(pack)
  const decisive = pack.trials - pack.ties
  return (
    <Link to={`/pack/${id}`} className="group block focus:outline-none" aria-label={`${pack.title}, ${pack.subject}`}>
      <div className="transition-transform duration-200 group-hover:-translate-y-1 group-focus-visible:-translate-y-1">
        <Cover id={id} pack={pack} />
      </div>
      <div className="mt-3 px-1">
        <p className="line-clamp-2 text-sm text-foreground">{pack.summary}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          by {author} ·{' '}
          {rate === null ? 'not tested yet' : `beats plain AI ${Math.round(rate * 100)}% · ${decisive} blind ${decisive === 1 ? 'test' : 'tests'}`}
        </p>
      </div>
    </Link>
  )
}
