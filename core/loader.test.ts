import { describe, expect, it } from 'vitest'
import { loadMainJson, loadPuzzleJson } from './loader.js'

const validMain = JSON.stringify({
  narrativeArch: 'A weekend of small adventures.',
  sharedCategories: [{ name: 'People', items: ['Ari', 'Bea'] }],
  puzzles: [
    {
      name: 'Places',
      narration: 'Match each person to a place.',
      sharedCategories: ['People'],
      localCategories: [{ name: 'Places', items: ['Park', 'Cafe'] }],
      solution: [
        { People: 'Ari', Places: 'Park' },
        { People: 'Bea', Places: 'Cafe' },
      ],
      options: {
        difficulty: 'easy',
        maxClues: 3,
        allowedClueTypes: ['positive', 'negative'],
      },
    },
  ],
})

const validPuzzle = JSON.stringify({
  name: 'Places',
  narration: 'Match each person to a place.',
  sharedCategories: ['People'],
  localCategories: [{ name: 'Places', items: ['Park', 'Cafe'] }],
  solution: [
    { People: 'Ari', Places: 'Park' },
    { People: 'Bea', Places: 'Cafe' },
  ],
  options: {
    difficulty: 'easy',
    maxClues: 3,
    allowedClueTypes: ['positive', 'negative'],
  },
})

describe('loadPuzzleJson', () => {
  it('loads a puzzle and resolves only the shared categories it uses', () => {
    const main = loadMainJson(validMain)
    const puzzle = loadPuzzleJson(validPuzzle, main)

    expect(main.narrativeArch).toBe('A weekend of small adventures.')
    expect(main.puzzles).toHaveLength(1)
    expect(puzzle.localCategories[0].name).toBe('Places')
    expect(puzzle.solution).toHaveLength(2)
  })

  it('rejects unknown shared category references', () => {
    const main = loadMainJson(validMain)
    const puzzle = JSON.parse(validPuzzle)
    puzzle.sharedCategories = ['Unknown']

    expect(() => loadPuzzleJson(JSON.stringify(puzzle), main)).toThrow(
      "references unknown category 'Unknown'",
    )
  })

  it('rejects duplicate solution items', () => {
    const main = loadMainJson(validMain)
    const puzzle = JSON.parse(validPuzzle)
    puzzle.solution[1].Places = 'Park'

    expect(() => loadPuzzleJson(JSON.stringify(puzzle), main)).toThrow(
      "repeats an item in category 'Places'",
    )
  })

  it('allows a puzzle to use only local categories', () => {
    const main = loadMainJson(validMain)
    const puzzle = JSON.parse(validPuzzle)
    puzzle.sharedCategories = []
    puzzle.localCategories = [
      { name: 'Foods', items: ['Tea', 'Coffee'] },
      { name: 'Times', items: ['Morning', 'Evening'] },
    ]
    puzzle.solution = [
      { Foods: 'Tea', Times: 'Morning' },
      { Foods: 'Coffee', Times: 'Evening' },
    ]

    expect(
      loadPuzzleJson(JSON.stringify(puzzle), main).sharedCategories,
    ).toEqual([])
  })
})
