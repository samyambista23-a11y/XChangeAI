/**
 * The house collection: 31 starter packs across every section, so the shop
 * isn't bare on day one. Each is written as a full brief for the AI: an expert
 * role, the quality bar, a method, an exact output format, mistakes to avoid,
 * and a final self-check. They are labelled "House collection" on the cover
 * (not credited to invented people) and start with zero tests, like any pack.
 */
import type { Subject } from './xchange'
import { PART_A } from './house/part-a'
import { PART_B } from './house/part-b'

export const HOUSE_BYLINE = 'House collection'

export interface HousePack {
  title: string
  subject: Subject
  summary: string
  sampleRequest: string
  content: string
}

export const HOUSE_PACKS: HousePack[] = [...PART_A, ...PART_B]
