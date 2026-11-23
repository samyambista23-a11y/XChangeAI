import type { CollectionSchema } from 'deepspace/schema'
import { SUBJECTS } from '../lib/xchange'

/**
 * Packs: the shared teaching files.
 *
 * Anyone signed in can read every pack. Nobody writes to this collection
 * directly: publishing, editing the cover details, and deleting go through
 * server actions (src/actions/index.ts), which validate the text and own the
 * score counters. The pack text itself is immutable once published, so every
 * vote a pack has ever received was cast on the exact text people download.
 */
export const packsSchema: CollectionSchema = {
  name: 'packs',
  ownerField: 'ownerId',
  columns: [
    { name: 'ownerId', storage: 'text', interpretation: 'plain', userBound: true, immutable: true },
    { name: 'title', storage: 'text', interpretation: 'plain', required: true },
    { name: 'subject', storage: 'text', interpretation: { kind: 'select', options: [...SUBJECTS] }, required: true },
    { name: 'summary', storage: 'text', interpretation: 'plain', required: true },
    { name: 'content', storage: 'text', interpretation: 'plain', required: true, immutable: true },
    { name: 'sampleRequest', storage: 'text', interpretation: 'plain', required: true },
    { name: 'trials', storage: 'number', interpretation: 'plain', default: 0 },
    { name: 'wins', storage: 'number', interpretation: 'plain', default: 0 },
    { name: 'ties', storage: 'number', interpretation: 'plain', default: 0 },
  ],
  permissions: {
    member: { read: true, create: false, update: false, delete: false },
    admin: { read: true, create: true, update: true, delete: true },
  },
}
