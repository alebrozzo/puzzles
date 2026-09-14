import { describe, expect, it } from 'vitest'
import type { Category, Puzzle } from './model.js'
import { generateClues } from './generator.js'
import { main } from '../magazines/_example_/main.js'
import { kitesPuzzle } from '../magazines/_example_/kites.js'
import { solve } from './solver.js'

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
  it.each([0, -1, 1.5, 13, NaN, Infinity])(
    'rejects invalid clue budget %s through the direct API',
    async (maxClues) => {
      await expect(
        generateClues(
          { ...puzzle, options: { ...puzzle.options, maxClues } },
          sharedCategories,
        ),
      ).rejects.toThrow('maxClues')
    },
  )

  it('rejects an invalid supplied solution through the direct API', async () => {
    await expect(
      generateClues(
        { ...puzzle, solution: [puzzle.solution[0], puzzle.solution[0]] },
        sharedCategories,
      ),
    ).rejects.toThrow('repeats an item')
  })

  it('fails explicitly instead of relaxing quality or clue budgets', async () => {
    const fixture: Puzzle = {
      ...kitesPuzzle,
      options: {
        ...kitesPuzzle.options,
        maxClues: 1,
        allowedClueTypes: ['positive'],
      },
    }
    await expect(generateClues(fixture, main)).rejects.toThrow(
      'within 1 clues while meeting clue-quality limits',
    )
  })

  it.each(['positive', 'negative'] as const)(
    'respects a %s-only allowed list',
    async (clueType) => {
      const result = await generateClues(
        {
          ...puzzle,
          options: { ...puzzle.options, allowedClueTypes: [clueType] },
        },
        sharedCategories,
      )
      expect(result.clues).toHaveLength(1)
      expect(result.clues[0].clue.type).toBe(clueType)
    },
  )

  it('keeps single-item puzzles clue-free', async () => {
    const result = await generateClues(
      {
        ...puzzle,
        sharedCategories: [],
        localCategories: [
          { name: 'NAME', items: ['Amelia'] },
          { name: 'COLOR', items: ['Green'] },
        ],
        solution: [puzzle.solution[0]],
      },
      [],
    )
    expect(result.clues).toEqual([])
    expect(result.solutionCount).toBe(1)
  })

  it.each([3, 4, 5, 6])(
    'generates hard puzzles with %i items across three categories',
    async (size) => {
      const categories = ['People', 'Places', 'Colors'].map((name) => ({
        name,
        items: Array.from({ length: size }, (_, index) => `${name}-${index}`),
      }))
      const fixture: Puzzle = {
        name: `Size ${size}`,
        narration: 'Match the items.',
        sharedCategories: [],
        localCategories: categories,
        solution: Array.from({ length: size }, (_, index) =>
          Object.fromEntries(
            categories.map((category) => [
              category.name,
              category.items[index],
            ]),
          ),
        ),
        options: {
          difficulty: 'hard',
          maxClues: 12,
          allowedClueTypes: ['positive', 'negative', 'disjunction'],
          seed: size,
        },
      }
      const result = await generateClues(fixture, [])
      const clues = result.clues
        .map(({ clue }) => clue)
        .filter((clue) => clue.type !== 'cross-category')
      expect(clues.length).toBeLessThanOrEqual(12)
      expect(solve(categories, clues).solutions).toEqual([fixture.solution])
      for (const omitted of clues) {
        expect(
          solve(
            categories,
            clues.filter((clue) => clue !== omitted),
          ).count,
        ).toBe(2)
      }
    },
    30000,
  )

  it.each(['kites-1', 'kites-2', 'kites-3'])(
    'keeps Kites quality across seed %s',
    async (seed) => {
      const fixture = {
        ...kitesPuzzle,
        options: { ...kitesPuzzle.options, seed },
      }
      const result = await generateClues(fixture, main)
      await expect(generateClues(fixture, main)).resolves.toEqual(result)
      expect(result.clues.length).toBeLessThanOrEqual(10)
      expect(
        result.clues.filter(({ clue }) => clue.type === 'disjunction').length,
      ).toBeLessThanOrEqual(2)
      for (const row of fixture.solution) {
        expect(
          result.clues.filter(
            ({ clue }) =>
              clue.type === 'positive' &&
              row[clue.pairing.left.category] === clue.pairing.left.item,
          ).length,
        ).toBeLessThanOrEqual(1)
      }
    },
    30000,
  )

  it('generates compact hard clues without spelling out individual rows', async () => {
    const result = await generateClues(kitesPuzzle, main)
    const clues = result.clues.map(({ clue }) => clue)
    const categories = [
      ...main.sharedCategories,
      ...kitesPuzzle.localCategories,
    ]

    expect(clues.length).toBeLessThanOrEqual(kitesPuzzle.options.maxClues)
    expect(
      clues.filter((clue) => clue.type === 'disjunction').length,
    ).toBeLessThanOrEqual(2)
    for (const row of kitesPuzzle.solution) {
      const directFacts = clues.filter(
        (clue) =>
          clue.type === 'positive' &&
          row[clue.pairing.left.category] === clue.pairing.left.item,
      )
      expect(directFacts.length).toBeLessThanOrEqual(1)
    }
    const constraints = clues.filter((clue) => clue.type !== 'cross-category')
    expect(solve(categories, constraints).solutions).toEqual([
      kitesPuzzle.solution,
    ])
    for (const omitted of constraints) {
      expect(
        solve(
          categories,
          constraints.filter((clue) => clue !== omitted),
        ).count,
      ).toBe(2)
    }
  }, 30000)

  it('selects clues until the known solution is unique', async () => {
    const result = await generateClues(puzzle, sharedCategories)

    expect(result.solutionCount).toBe(1)
    expect(result.clues).toHaveLength(1)
    expect(['positive', 'negative']).toContain(result.clues[0].clue.type)
    expect(result.clues[0].description).toContain('paired with')
  })

  it('is deterministic', async () => {
    await expect(generateClues(puzzle, sharedCategories)).resolves.toEqual(
      await generateClues(puzzle, sharedCategories),
    )
  })

  it('rejects puzzles that allow only unsupported clue types', async () => {
    const crossCategoryOnly = {
      ...puzzle,
      options: {
        ...puzzle.options,
        allowedClueTypes: ['cross-category' as const],
      },
    }

    await expect(
      generateClues(crossCategoryOnly, sharedCategories),
    ).rejects.toThrow('only cross-category clues')
  })
})
