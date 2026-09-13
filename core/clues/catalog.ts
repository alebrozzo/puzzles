import type { ClueType } from '../model.js'
import type { Pairing } from '../solver.js'

export interface PositiveClue {
  type: 'positive'
  pairing: Pairing
}

export interface NegativeClue {
  type: 'negative'
  pairing: Pairing
}

export interface DisjunctionClue {
  type: 'disjunction'
  pairings: Pairing[]
}

export interface CrossCategoryClue {
  type: 'cross-category'
  pairings: [Pairing, Pairing]
}

export type CatalogClue =
  PositiveClue | NegativeClue | DisjunctionClue | CrossCategoryClue

export function describeClue(clue: CatalogClue): string {
  if (clue.type === 'positive') {
    return `${describePairing(clue.pairing)}.`
  }

  if (clue.type === 'negative') {
    return `${describePairing(clue.pairing, true)}.`
  }

  if (clue.type === 'disjunction') {
    return `${clue.pairings.map((pairing) => describePairing(pairing)).join(' or ')}.`
  }

  return `${describePairing(clue.pairings[0])}, and ${describePairing(clue.pairings[1])}.`
}

export function clueTypeIsAllowed(
  clue: CatalogClue,
  allowedClueTypes: ClueType[],
): boolean {
  return allowedClueTypes.includes(clue.type)
}

function describePairing(pairing: Pairing, negative = false): string {
  const relationship = negative ? 'is not paired with' : 'is paired with'
  return `${pairing.left.item} (${pairing.left.category}) ${relationship} ${pairing.right.item} (${pairing.right.category})`
}
