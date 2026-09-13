import type { Category, Solution, SolutionRow } from './model.js'

export interface ItemRef {
  category: string
  item: string
}

export interface Pairing {
  left: ItemRef
  right: ItemRef
}

export type SolverClue =
  | { type: 'positive'; pairing: Pairing }
  | { type: 'negative'; pairing: Pairing }
  | { type: 'disjunction'; pairings: Pairing[] }

export interface SolverResult {
  count: number
  solutions: Solution[]
  trace: string[]
}

const MAX_SOLUTIONS = 2

export function solve(
  categories: Category[],
  clues: SolverClue[] = [],
): SolverResult {
  validateCategories(categories)
  validateClues(categories, clues)

  const [anchor, ...remainingCategories] = categories
  const result: SolverResult = { count: 0, solutions: [], trace: [] }
  const assignments: SolutionRow[] = []

  search(
    0,
    assignments,
    anchor.name,
    anchor.items,
    remainingCategories,
    clues,
    result,
  )
  return result
}

function search(
  rowIndex: number,
  assignments: SolutionRow[],
  anchorName: string,
  anchorItems: string[],
  remainingCategories: Category[],
  clues: SolverClue[],
  result: SolverResult,
): void {
  if (result.count >= MAX_SOLUTIONS) {
    return
  }

  if (rowIndex === anchorItems.length) {
    result.count += 1
    result.solutions.push(assignments.map((row) => ({ ...row })))
    result.trace.push(`Found solution ${result.count}.`)
    return
  }

  const row: SolutionRow = { [anchorName]: anchorItems[rowIndex] }
  assignCategory(
    0,
    row,
    assignments,
    rowIndex,
    anchorItems,
    anchorName,
    remainingCategories,
    clues,
    result,
  )
}

function assignCategory(
  categoryIndex: number,
  row: SolutionRow,
  assignments: SolutionRow[],
  rowIndex: number,
  anchorItems: string[],
  anchorName: string,
  remainingCategories: Category[],
  clues: SolverClue[],
  result: SolverResult,
): void {
  if (result.count >= MAX_SOLUTIONS) {
    return
  }

  if (categoryIndex === remainingCategories.length) {
    if (isPartiallyConsistent(row, assignments, clues)) {
      assignments.push(row)
      if (rowIndex === anchorItems.length - 1) {
        if (isSolutionConsistent(assignments, clues)) {
          result.count += 1
          result.solutions.push(
            assignments.map((assignment) => ({ ...assignment })),
          )
          result.trace.push(`Found solution ${result.count}.`)
        }
      } else {
        search(
          rowIndex + 1,
          assignments,
          anchorName,
          anchorItems,
          remainingCategories,
          clues,
          result,
        )
      }
      assignments.pop()
    }
    return
  }

  const category = remainingCategories[categoryIndex]
  for (const item of category.items) {
    if (assignments.some((assignment) => assignment[category.name] === item)) {
      continue
    }

    row[category.name] = item
    assignCategory(
      categoryIndex + 1,
      row,
      assignments,
      rowIndex,
      anchorItems,
      anchorName,
      remainingCategories,
      clues,
      result,
    )
    delete row[category.name]
  }
}

function isPartiallyConsistent(
  row: SolutionRow,
  assignments: SolutionRow[],
  clues: SolverClue[],
): boolean {
  return clues.every((clue) =>
    clue.type === 'negative'
      ? !pairingExists(clue.pairing, row, assignments)
      : true,
  )
}

function isSolutionConsistent(
  solution: Solution,
  clues: SolverClue[],
): boolean {
  return clues.every((clue) => {
    if (clue.type === 'positive') {
      return pairingExists(clue.pairing, {}, solution)
    }
    if (clue.type === 'negative') {
      return !pairingExists(clue.pairing, {}, solution)
    }
    return clue.pairings.some((pairing) => pairingExists(pairing, {}, solution))
  })
}

function pairingExists(
  pairing: Pairing,
  row: SolutionRow,
  assignments: SolutionRow[],
): boolean {
  return [row, ...assignments].some(
    (assignment) =>
      assignment[pairing.left.category] === pairing.left.item &&
      assignment[pairing.right.category] === pairing.right.item,
  )
}

function validateCategories(categories: Category[]): void {
  if (categories.length < 2) {
    throw new Error('The solver requires at least two categories.')
  }

  const itemCount = categories[0].items.length
  const names = new Set<string>()
  for (const category of categories) {
    if (names.has(category.name)) {
      throw new Error(`Duplicate category '${category.name}'.`)
    }
    names.add(category.name)
    if (category.items.length !== itemCount) {
      throw new Error('All categories must contain the same number of items.')
    }
    if (new Set(category.items).size !== itemCount) {
      throw new Error(`Category '${category.name}' contains duplicate items.`)
    }
  }
}

function validateClues(categories: Category[], clues: SolverClue[]): void {
  const items = new Map(
    categories.map((category) => [category.name, new Set(category.items)]),
  )
  for (const clue of clues) {
    const pairings =
      clue.type === 'disjunction' ? clue.pairings : [clue.pairing]
    if (pairings.length === 0) {
      throw new Error('A disjunction clue requires at least one pairing.')
    }
    for (const pairing of pairings) {
      for (const reference of [pairing.left, pairing.right]) {
        const categoryItems = items.get(reference.category)
        if (!categoryItems) {
          throw new Error(
            `Clue references unknown category '${reference.category}'.`,
          )
        }
        if (!categoryItems.has(reference.item)) {
          throw new Error(
            `Clue references unknown item '${reference.item}' in category '${reference.category}'.`,
          )
        }
      }
    }
  }
}
