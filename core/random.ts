/** Deterministic string hash (FNV-1a) producing a 32-bit unsigned seed. */
export function hashStringToSeed(value: string): number {
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/** Mulberry32: a small, fast, deterministic PRNG seeded by a 32-bit integer. */
export function createRng(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Resolves a caller-supplied seed to a numeric PRNG seed, hashing strings. */
export function resolveSeed(
  seed: string | number | undefined,
  fallback: string,
): number {
  if (seed === undefined) {
    return hashStringToSeed(fallback)
  }
  return typeof seed === 'number' ? seed >>> 0 : hashStringToSeed(seed)
}
