import { describe, expect, it } from 'vitest'
import type { Category, Solution, SolutionRow } from './model.js'
import { solve, type SolverClue } from './solver.js'
import { generateClues } from './generator.js'
import { createRng } from './random.js'

const categories: Category[] = [
  { name: 'People', items: ['Ari', 'Bea', 'Cam'] },
  { name: 'Places', items: ['Park', 'Cafe', 'Museum'] },
  { name: 'Days', items: ['Monday', 'Tuesday', 'Wednesday'] },
]

const pairing = (
  leftCategory: string,
  leftItem: string,
  rightCategory: string,
  rightItem: string,
) => ({
  left: { category: leftCategory, item: leftItem },
  right: { category: rightCategory, item: rightItem },
})

describe('solve', () => {
  it('stops after finding two solutions', () => {
    const result = solve(categories)

    expect(result.count).toBe(2)
    expect(result.solutions).toHaveLength(2)
  })

  it('finds a unique solution from positive and negative clues', () => {
    const clues: SolverClue[] = [
      { type: 'positive', pairing: pairing('People', 'Ari', 'Places', 'Park') },
      { type: 'positive', pairing: pairing('People', 'Ari', 'Days', 'Monday') },
      { type: 'negative', pairing: pairing('People', 'Bea', 'Places', 'Park') },
      {
        type: 'positive',
        pairing: pairing('People', 'Bea', 'Days', 'Tuesday'),
      },
      {
        type: 'positive',
        pairing: pairing('People', 'Cam', 'Places', 'Museum'),
      },
    ]

    const result = solve(categories, clues)

    expect(result.count).toBe(1)
    expect(result.solutions[0]).toEqual([
      { People: 'Ari', Places: 'Park', Days: 'Monday' },
      { People: 'Bea', Places: 'Cafe', Days: 'Tuesday' },
      { People: 'Cam', Places: 'Museum', Days: 'Wednesday' },
    ])
    expect(result.trace).toEqual(['Found solution 1.'])
  })

  it('agrees with an independent brute-force oracle', () => {
    const clues: SolverClue[] = [
      {
        type: 'disjunction',
        pairings: [
          pairing('People', 'Ari', 'Places', 'Park'),
          pairing('People', 'Ari', 'Places', 'Cafe'),
        ],
      },
      { type: 'negative', pairing: pairing('People', 'Bea', 'Days', 'Monday') },
    ]

    expect(solve(categories, clues).count).toBe(
      bruteForceCount(categories, clues),
    )
  })

  it('matches exhaustive counts for mixed, reversed, and contradictory constraints', () => {
    const rng = createRng(2026)
    const candidates = categories.flatMap((left) =>
      categories
        .filter((right) => left !== right)
        .flatMap((right) =>
          left.items.flatMap((leftItem) =>
            right.items.map((rightItem) =>
              pairing(left.name, leftItem, right.name, rightItem),
            ),
          ),
        ),
    )
    const pick = () => candidates[Math.floor(rng() * candidates.length)]

    for (let attempt = 0; attempt < 100; attempt += 1) {
      const clues: SolverClue[] = Array.from({ length: attempt % 8 }, () => {
        const type = Math.floor(rng() * 3)
        if (type === 2) {
          return { type: 'disjunction', pairings: [pick(), pick()] }
        }
        return { type: type === 0 ? 'positive' : 'negative', pairing: pick() }
      })
      expect(solve(categories, clues, Infinity).count).toBe(
        bruteForceCount(categories, clues, Infinity),
      )
    }
  })

  it.each([17, 29, 41])(
    'independently verifies generated clues for seed %i',
    (seed) => {
      const solution = categories[0].items.map((_, index) =>
        Object.fromEntries(
          categories.map((category) => [category.name, category.items[index]]),
        ),
      )
      const result = generateClues(
        {
          name: 'Oracle fixture',
          narration: 'Match people, places, and days.',
          sharedCategories: [],
          localCategories: categories,
          solution,
          options: {
            difficulty: 'hard',
            maxClues: 8,
            allowedClueTypes: ['positive', 'negative', 'disjunction'],
            seed,
          },
        },
        [],
      )
      const clues = result.clues
        .map(({ clue }) => clue)
        .filter((clue) => clue.type !== 'cross-category')
      expect(satisfies(solution, clues)).toBe(true)
      expect(bruteForceCount(categories, clues)).toBe(1)
      for (const omitted of clues) {
        expect(
          bruteForceCount(
            categories,
            clues.filter((clue) => clue !== omitted),
          ),
        ).toBe(2)
      }
    },
  )
})

function bruteForceCount(
  categories: Category[],
  clues: SolverClue[],
  maxSolutions = 2,
): number {
  const [anchor, ...remaining] = categories
  const solutions: Solution[] = []

  for (const rows of permutations(remaining[0].items)) {
    const partial = rows.map((item, index) => ({
      [anchor.name]: anchor.items[index],
      [remaining[0].name]: item,
    }))
    expand(partial, remaining.slice(1), solutions, clues)
  }

  return Math.min(solutions.length, maxSolutions)
}

function expand(
  rows: SolutionRow[],
  remaining: Category[],
  solutions: Solution[],
  clues: SolverClue[],
): void {
  if (remaining.length === 0) {
    if (satisfies(rows, clues)) {
      solutions.push(rows)
    }
    return
  }

  const [category, ...rest] = remaining
  for (const items of permutations(category.items)) {
    expand(
      rows.map((row, index) => ({ ...row, [category.name]: items[index] })),
      rest,
      solutions,
      clues,
    )
  }
}

function permutations(items: string[]): string[][] {
  if (items.length === 0) {
    return [[]]
  }

  return items.flatMap((item, index) =>
    permutations([...items.slice(0, index), ...items.slice(index + 1)]).map(
      (rest) => [item, ...rest],
    ),
  )
}

function satisfies(solution: Solution, clues: SolverClue[]): boolean {
  return clues.every((clue) => {
    if (clue.type === 'disjunction') {
      return clue.pairings.some((candidate) => exists(solution, candidate))
    }
    const present = exists(solution, clue.pairing)
    return clue.type === 'positive' ? present : !present
  })
}

function exists(
  solution: Solution,
  pairing: {
    left: { category: string; item: string }
    right: { category: string; item: string }
  },
): boolean {
  return solution.some(
    (row) =>
      row[pairing.left.category] === pairing.left.item &&
      row[pairing.right.category] === pairing.right.item,
  )
}
