import type { RecordData } from 'deepspace'
import { points, rankFor, type PackData, type TrialData } from '../lib/xchange'

/** Tally points from voted trials: 1 per vote cast, 3 per counted win on packs you wrote. */
export function tallyPoints(
  userId: string,
  trials: RecordData<TrialData>[],
  packs: RecordData<PackData>[],
): { votes: number; wins: number; pts: number } {
  // House-collection packs earn no author points.
  const mine = new Set(packs.filter((p) => p.data.ownerId === userId && !p.data.byline).map((p) => p.recordId))
  let votes = 0
  let wins = 0
  for (const t of trials) {
    if (t.data.status !== 'voted') continue
    if (t.data.testerId === userId) votes += 1
    if (mine.has(t.data.packId) && t.data.counted && t.data.packWon) wins += 1
  }
  return { votes, wins, pts: points(votes, wins) }
}

/**
 * The library card: an old manila borrower's card with ruled lines, the
 * reader's rank stamped on it, and progress to the next rank.
 */
export default function ReadingCard({ name, votes, wins }: { name: string; votes: number; wins: number }) {
  const pts = points(votes, wins)
  const rank = rankFor(pts)
  const progress = rank.next === null ? 1 : (pts - rank.min) / (rank.next - rank.min)

  return (
    <aside
      className="relative rotate-[0.6deg] overflow-hidden rounded-[3px] p-5 text-[#3a2a12] shadow-[0_14px_28px_-16px_rgba(42,33,24,.55)]"
      style={{ background: 'linear-gradient(180deg, #ecd9ad 0%, #e4cd98 100%)' }}
    >
      <div className="flex items-baseline justify-between border-b-2 border-[#9b3b2a]/70 pb-1">
        <p className="font-type text-[11px] uppercase tracking-[0.2em]">Borrower’s card</p>
        <p className="font-type text-[11px]">No. {String(pts).padStart(4, '0')}</p>
      </div>

      <div className="ruled mt-2 font-type text-sm">
        <p>
          <span className="text-[#7a6440]">Name:</span> <span className="font-hand text-2xl leading-none">{name}</span>
        </p>
        <p>
          <span className="text-[#7a6440]">Blind votes cast:</span> {votes}
        </p>
        <p>
          <span className="text-[#7a6440]">Wins for your packs:</span> {wins}
        </p>
        <p>
          <span className="text-[#7a6440]">Points:</span> {pts}
        </p>
      </div>

      <div
        key={rank.title}
        className="animate-stamp pointer-events-none absolute right-3 top-14 rounded-sm border-[3px] border-[#9b3b2a] px-2 py-0.5 font-type text-sm font-bold uppercase tracking-widest text-[#9b3b2a] opacity-80"
      >
        {rank.title}
      </div>

      <div className="mt-3">
        <div className="h-2 overflow-hidden rounded-full bg-[#3a2a12]/15" aria-hidden="true">
          <div
            className="h-full rounded-full transition-[width] duration-700"
            style={{ width: `${Math.round(progress * 100)}%`, background: 'linear-gradient(90deg, #9b3b2a, #c99a3e)' }}
          />
        </div>
        <p className="mt-1.5 font-hand text-lg leading-tight">
          {rank.next !== null ? `${rank.next - pts} more points to the next rank` : 'Top of the house. Well read.'}
        </p>
      </div>
      <p className="mt-2 font-type text-[10px] leading-snug text-[#7a6440]">
        1 pt per blind vote · 3 pts each time a stranger picks your pack
      </p>
    </aside>
  )
}
