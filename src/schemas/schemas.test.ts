import { describe, expect, it } from 'vitest'
import { lintSchemas } from 'deepspace/worker'
import { schemas } from '../schemas'

const get = (name: string) => schemas.find((s) => s.name === name)

describe('collection schemas', () => {
  it('produce no SDK schema-lint warnings', () => {
    expect(lintSchemas(schemas)).toEqual([])
  })
  it('allow no direct member writes to packs, trials or answer keys', () => {
    for (const name of ['packs', 'trials', 'trial_keys']) {
      const m = get(name)?.permissions.member
      expect(m, name).toBeDefined()
      expect(m?.create).toBe(false)
      expect(m?.update).toBe(false)
      expect(m?.delete).toBe(false)
      expect(get(name)?.permissions['*']).toBeUndefined()
    }
  })
  it('keep the answer key unreadable to members', () => {
    expect(get('trial_keys')?.permissions.member?.read).toBe(false)
  })
  it('only show others’ trials once voted', () => {
    expect(get('trials')?.permissions.member?.read).toBe('published')
    expect(get('trials')?.visibilityField).toEqual({ field: 'status', value: 'voted' })
  })
  it('freeze the pack text once published', () => {
    expect(get('packs')?.columns.find((c) => c.name === 'content')?.immutable).toBe(true)
  })
})
