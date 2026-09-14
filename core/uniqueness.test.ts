import { describe, expect, it } from 'vitest'
import type { Category, Solution } from './model.js'
import { hasUniqueSolution } from './uniqueness.js'

const categories: Category[] = [
  { name: 'People', items: ['Ari', 'Bea'] },
  { name: 'Colors', items: ['Blue', 'Green'] },
]

const solution: Solution = [
  { People: 'Bea', Colors: 'Green' },
  { People: 'Ari', Colors: 'Blue' },
]

const pairing = {
  left: { category: 'People', item: 'Ari' },
  right: { category: 'Colors', item: 'Blue' },
}

describe('hasUniqueSolution', () => {
  it('distinguishes unique, ambiguous, and contradictory clue sets', async () => {
    await expect(hasUniqueSolution(categories, [], solution)).resolves.toBe(
      false,
    )
    await expect(
      hasUniqueSolution(categories, [{ type: 'positive', pairing }], solution),
    ).resolves.toBe(true)
    await expect(
      hasUniqueSolution(
        categories,
        [
          {
            type: 'positive',
            pairing: { ...pairing, right: { ...pairing.right, item: 'Green' } },
          },
        ],
        solution,
      ),
    ).resolves.toBe(false)
  })
})
