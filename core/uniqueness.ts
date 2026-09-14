import { init } from 'z3-solver'
import type { CatalogClue } from './clues/catalog.js'
import type { Category, Solution } from './model.js'
import type { Pairing } from './solver.js'

const z3 = init()
const context = z3.then(({ Context }) => new Context('logic-grid'))

/** Proves whether clues have the supplied answer table as their sole model. */
export async function hasUniqueSolution(
  categories: Category[],
  clues: CatalogClue[],
  solution: Solution,
): Promise<boolean> {
  const check = await createUniquenessChecker(categories, solution)
  return check(clues)
}

export async function createUniquenessChecker(
  categories: Category[],
  solution: Solution,
): Promise<(clues: CatalogClue[]) => Promise<boolean>> {
  const { Distinct, Int, Or, Solver } = await context
  const solver = new Solver()
  const itemCount = categories[0].items.length
  const positions = categories.flatMap((category, categoryIndex) =>
    category.items.map((item, itemIndex) => ({
      category: category.name,
      item,
      value: Int.const(`position_${categoryIndex}_${itemIndex}`),
    })),
  )

  for (const category of categories) {
    const values = positions.filter(
      ({ category: name }) => name === category.name,
    )
    solver.add(Distinct(...values.map(({ value }) => value)))
    for (const { value } of values) solver.add(value.ge(0), value.lt(itemCount))
  }
  for (const [index, item] of categories[0].items.entries()) {
    solver.add(
      positions
        .find(
          ({ category, item: candidate }) =>
            category === categories[0].name && candidate === item,
        )!
        .value.eq(index),
    )
  }

  const positionByItem = new Map(
    positions.map((position) => [
      positionKey(position.category, position.item),
      position.value,
    ]),
  )
  const targetPositions = targetPositionMap(categories, solution)

  return async (clues) => {
    if (!clues.every((clue) => clueIsTrueInSolution(clue, solution))) {
      return false
    }

    solver.push()
    for (const clue of clues) {
      if (clue.type === 'cross-category') {
        solver.pop()
        throw new Error('Cross-category clues are not supported by the solver.')
      }
      const pairings =
        clue.type === 'disjunction' ? clue.pairings : [clue.pairing]
      const constraints = pairings.map(({ left, right }) => {
        const leftPosition = positionByItem.get(
          positionKey(left.category, left.item),
        )!
        const rightPosition = positionByItem.get(
          positionKey(right.category, right.item),
        )!
        return clue.type === 'negative'
          ? leftPosition.neq(rightPosition)
          : leftPosition.eq(rightPosition)
      })
      solver.add(
        clue.type === 'disjunction' ? Or(...constraints) : constraints[0],
      )
    }

    solver.add(
      Or(
        ...positions.map(({ category, item, value }) =>
          value.neq(targetPositions.get(positionKey(category, item))!),
        ),
      ),
    )
    const isUnique = (await solver.check()) === 'unsat'
    solver.pop()
    return isUnique
  }
}

function clueIsTrueInSolution(clue: CatalogClue, solution: Solution): boolean {
  if (clue.type === 'cross-category') {
    return false
  }
  const pairingExists = (pairing: Pairing): boolean =>
    solution.some(
      (row) =>
        row[pairing.left.category] === pairing.left.item &&
        row[pairing.right.category] === pairing.right.item,
    )
  if (clue.type === 'disjunction') {
    return clue.pairings.some(pairingExists)
  }
  const exists = pairingExists(clue.pairing)
  return clue.type === 'positive' ? exists : !exists
}

function targetPositionMap(
  categories: Category[],
  solution: Solution,
): Map<string, number> {
  const positions = new Map<string, number>()
  for (const row of solution) {
    const anchorPosition = categories[0].items.indexOf(row[categories[0].name])
    for (const category of categories) {
      positions.set(
        positionKey(category.name, row[category.name]),
        anchorPosition,
      )
    }
  }
  return positions
}

function positionKey(category: string, item: string): string {
  return `${category}\u0000${item}`
}
