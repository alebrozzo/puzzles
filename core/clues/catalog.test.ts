import { describe, expect, it } from 'vitest'
import type { Pairing } from '../solver.js'
import { clueTypeIsAllowed, describeClue, type CatalogClue } from './catalog.js'

const pairing = (
  leftCategory: string,
  leftItem: string,
  rightCategory: string,
  rightItem: string,
): Pairing => ({
  left: { category: leftCategory, item: leftItem },
  right: { category: rightCategory, item: rightItem },
})

describe('clue catalog', () => {
  it('renders a positive clue', () => {
    const clue: CatalogClue = {
      type: 'positive',
      pairing: pairing('NAME', 'Amelia', 'COLOR', 'Green'),
    }

    expect(describeClue(clue)).toBe(
      'Amelia (NAME) is paired with Green (COLOR).',
    )
  })

  it('renders a negative clue', () => {
    const clue: CatalogClue = {
      type: 'negative',
      pairing: pairing('NAME', 'Bonifacio', 'COLOR', 'Green'),
    }

    expect(describeClue(clue)).toBe(
      'Bonifacio (NAME) is not paired with Green (COLOR).',
    )
  })

  it('renders disjunction and cross-category clues', () => {
    const disjunction: CatalogClue = {
      type: 'disjunction',
      pairings: [
        pairing('NAME', 'Amelia', 'COLOR', 'Blue'),
        pairing('NAME', 'Amelia', 'COLOR', 'Green'),
      ],
    }
    const crossCategory: CatalogClue = {
      type: 'cross-category',
      pairings: [
        pairing('NAME', 'Amelia', 'SHAPE', 'Car'),
        pairing('NAME', 'Amelia', 'COLOR', 'Green'),
      ],
    }

    expect(describeClue(disjunction)).toContain(' or ')
    expect(describeClue(crossCategory)).toContain(', and ')
  })

  it('checks generation type restrictions', () => {
    const clue: CatalogClue = {
      type: 'negative',
      pairing: pairing('NAME', 'Bonifacio', 'COLOR', 'Green'),
    }

    expect(clueTypeIsAllowed(clue, ['positive', 'negative'])).toBe(true)
    expect(clueTypeIsAllowed(clue, ['positive'])).toBe(false)
  })
})
