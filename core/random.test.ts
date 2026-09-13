import { describe, expect, it } from 'vitest'
import { createRng, hashStringToSeed, resolveSeed } from './random.js'

describe('hashStringToSeed', () => {
  it('is deterministic for the same input', () => {
    expect(hashStringToSeed('kites.ts')).toBe(hashStringToSeed('kites.ts'))
  })

  it('differs for different input', () => {
    expect(hashStringToSeed('kites.ts')).not.toBe(hashStringToSeed('dinner.ts'))
  })
})

describe('createRng', () => {
  it('produces the same sequence for the same seed', () => {
    const first = createRng(42)
    const second = createRng(42)

    expect([first(), first(), first()]).toEqual([second(), second(), second()])
  })

  it('produces a different sequence for a different seed', () => {
    const first = createRng(42)
    const second = createRng(43)

    expect(first()).not.toBe(second())
  })

  it('stays within [0, 1)', () => {
    const rng = createRng(1)

    for (let index = 0; index < 100; index += 1) {
      const value = rng()
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })
})

describe('resolveSeed', () => {
  it('hashes a string seed', () => {
    expect(resolveSeed('abc', 'fallback')).toBe(hashStringToSeed('abc'))
  })

  it('passes a numeric seed through', () => {
    expect(resolveSeed(7, 'fallback')).toBe(7)
  })

  it('falls back to hashing the fallback when no seed is given', () => {
    expect(resolveSeed(undefined, 'kites.ts')).toBe(
      hashStringToSeed('kites.ts'),
    )
  })
})
