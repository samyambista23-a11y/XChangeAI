import type { CollectionSchema } from 'deepspace/schema'
import { CHOICES, SIDES } from '../lib/xchange'

/**
 * Trials: blind side-by-side tests.
 *
 * A member reads their own trials (pending or voted) plus every voted trial,
 * which become the public "receipts" on a pack page. `packSide` stays empty
 * until the vote, because the real answer key lives in `trial_keys`.
 */
export const trialsSchema: CollectionSchema = {
  name: 'trials',
  ownerField: 'testerId',
  visibilityField: { field: 'status', value: 'voted' },
  columns: [
    { name: 'packId', storage: 'text', interpretation: 'plain', required: true, immutable: true },
    { name: 'testerId', storage: 'text', interpretation: 'plain', userBound: true, immutable: true },
    { name: 'request', storage: 'text', interpretation: 'plain', required: true, immutable: true },
    { name: 'answerA', storage: 'text', interpretation: 'plain', required: true, immutable: true },
    { name: 'answerB', storage: 'text', interpretation: 'plain', required: true, immutable: true },
    {
      name: 'status',
      storage: 'text',
      interpretation: { kind: 'select', options: ['pending', 'voted'] },
      default: 'pending',
    },
    { name: 'choice', storage: 'text', interpretation: { kind: 'select', options: [...CHOICES] } },
    { name: 'packSide', storage: 'text', interpretation: { kind: 'select', options: [...SIDES] } },
    { name: 'packWon', storage: 'number', interpretation: { kind: 'boolean' } },
    { name: 'counted', storage: 'number', interpretation: { kind: 'boolean' } },
  ],
  permissions: {
    member: { read: 'published', create: false, update: false, delete: false },
    admin: { read: true, create: true, update: true, delete: true },
  },
}

/**
 * The answer key for each trial: which side holds the pack's answer.
 * No member role can read, create, update or delete it. Only server actions
 * (which run with RBAC bypassed) touch it, so the browser never learns the
 * side before the vote.
 */
export const trialKeysSchema: CollectionSchema = {
  name: 'trial_keys',
  uniqueOn: ['trialId'],
  columns: [
    { name: 'trialId', storage: 'text', interpretation: 'plain', required: true, immutable: true },
    { name: 'packSide', storage: 'text', interpretation: { kind: 'select', options: [...SIDES] }, required: true, immutable: true },
  ],
  permissions: {
    member: { read: false, create: false, update: false, delete: false },
    admin: { read: true, create: false, update: false, delete: false },
  },
}
