import { describe, expect, it } from 'vitest'
import type { Category, Solution, SolutionRow } from './model.js'
import { solve, type SolverClue } from './solver.js'

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
})

function bruteForceCount(categories: Category[], clues: SolverClue[]): number {
  const [anchor, ...remaining] = categories
  const solutions: Solution[] = []

  for (const rows of permutations(remaining[0].items)) {
    const partial = rows.map((item, index) => ({
      [anchor.name]: anchor.items[index],
      [remaining[0].name]: item,
    }))
    expand(partial, remaining.slice(1), solutions, clues)
  }

  return Math.min(solutions.length, 2)
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
