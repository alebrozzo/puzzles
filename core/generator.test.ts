import { describe, expect, it } from 'vitest'
import type { Category, Puzzle } from './model.js'
import { generateClues } from './generator.js'

const sharedCategories: Category[] = [
  { name: 'NAME', items: ['Amelia', 'Bonifacio'] },
]

const puzzle: Puzzle = {
  name: 'Test puzzle',
  narration: 'Match each child to a color.',
  sharedCategories: ['NAME'],
  localCategories: [{ name: 'COLOR', items: ['Blue', 'Green'] }],
  solution: [
    { NAME: 'Amelia', COLOR: 'Green' },
    { NAME: 'Bonifacio', COLOR: 'Blue' },
  ],
  options: {
    difficulty: 'easy',
    maxClues: 2,
    allowedClueTypes: ['positive', 'negative', 'disjunction'],
  },
}

describe('generateClues', () => {
  it('selects clues until the known solution is unique', () => {
    const result = generateClues(puzzle, sharedCategories)

    expect(result.solutionCount).toBe(1)
    expect(result.clues).toHaveLength(1)
    expect(['positive', 'negative']).toContain(result.clues[0].clue.type)
    expect(result.clues[0].description).toContain('paired with')
  })

  it('is deterministic', () => {
    expect(generateClues(puzzle, sharedCategories)).toEqual(
      generateClues(puzzle, sharedCategories),
    )
  })

  it('rejects puzzles that allow only unsupported clue types', () => {
    const crossCategoryOnly = {
      ...puzzle,
      options: {
        ...puzzle.options,
        allowedClueTypes: ['cross-category' as const],
      },
    }

    expect(() => generateClues(crossCategoryOnly, sharedCategories)).toThrow(
      'only cross-category clues',
    )
  })
})
