import type { RecordData } from 'deepspace'
import { points, rankFor, type PackData, type TrialData } from '../lib/xchange'

/** Tally points from voted trials: 1 per vote cast, 3 per counted win on packs you wrote. */
export function tallyPoints(
  userId: string,
  trials: RecordData<TrialData>[],
  packs: RecordData<PackData>[],
): { votes: number; wins: number; pts: number } {
  const mine = new Set(packs.filter((p) => p.data.ownerId === userId).map((p) => p.recordId))
  let votes = 0
  let wins = 0
  for (const t of trials) {
    if (t.data.status !== 'voted') continue
    if (t.data.testerId === userId) votes += 1
    if (mine.has(t.data.packId) && t.data.counted && t.data.packWon) wins += 1
  }
  return { votes, wins, pts: points(votes, wins) }
}

/** The library card in the corner: rank, points, progress to the next rank. */
export default function ReadingCard({ name, votes, wins }: { name: string; votes: number; wins: number }) {
  const pts = points(votes, wins)
  const rank = rankFor(pts)
  const progress = rank.next === null ? 1 : (pts - rank.min) / (rank.next - rank.min)
  return (
    <aside className="rounded-md border border-dashed border-[#b89c6a] bg-card p-5 shadow-[var(--shadow-card)]">
      <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Library card</p>
      <p className="mt-1 font-serif text-xl font-semibold">{name}</p>
      <p className="text-sm text-primary">{rank.title}</p>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary" aria-hidden="true">
        <div className="h-full rounded-full bg-[#c99a2e]" style={{ width: `${Math.round(progress * 100)}%` }} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {pts} points{rank.next !== null ? ` · ${rank.next - pts} to the next rank` : ' · top rank'}
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Blind votes cast</dt>
          <dd className="font-semibold">{votes}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Wins for your packs</dt>
          <dd className="font-semibold">{wins}</dd>
        </div>
      </dl>
      <p className="mt-4 text-xs text-muted-foreground">1 point per blind vote. 3 points each time a stranger picks your pack.</p>
    </aside>
  )
}
