import type { Category, Main, Puzzle, SolutionRow } from './model.js'
import {
  clueTypeIsAllowed,
  describeClue,
  type CatalogClue,
} from './clues/catalog.js'
import type { Pairing } from './solver.js'
import { solve } from './solver.js'

export interface GeneratedClue {
  clue: CatalogClue
  description: string
}

export interface GenerationResult {
  clues: GeneratedClue[]
  solutionCount: number
}

export function generateClues(
  puzzle: Puzzle,
  sharedCategories: Category[] | Main,
): GenerationResult {
  const categories = resolveCategories(puzzle, sharedCategories)
  const candidates = enumerateCandidates(puzzle, categories)
  const selected: CatalogClue[] = []
  let solutionCount = solve(categories).count

  while (solutionCount !== 1) {
    const bestCandidate = chooseBestCandidate(
      candidates,
      selected,
      categories,
      solutionCount,
      puzzle.options.maxClues,
    )

    if (!bestCandidate) {
      throw new Error(
        `Unable to generate a unique solution for puzzle '${puzzle.name}' within ${puzzle.options.maxClues} clues.`,
      )
    }

    selected.push(bestCandidate.clue)
    solutionCount = bestCandidate.solutionCount
  }

  return {
    clues: selected.map((clue) => ({ clue, description: describeClue(clue) })),
    solutionCount,
  }
}

function chooseBestCandidate(
  candidates: CatalogClue[],
  selected: CatalogClue[],
  categories: Category[],
  currentCount: number,
  maxClues: number,
): { clue: CatalogClue; solutionCount: number } | undefined {
  if (selected.length >= maxClues) {
    return undefined
  }

  let best: { clue: CatalogClue; solutionCount: number } | undefined
  let bestReduction = 0

  for (const candidate of candidates) {
    if (selected.includes(candidate)) {
      continue
    }

    const solverClues = [...selected, candidate].filter(isSolverClue)
    const count = solve(categories, solverClues).count
    const reduction = currentCount - count
    if (reduction > bestReduction) {
      best = { clue: candidate, solutionCount: count }
      bestReduction = reduction
    }
  }

  return best
}

function enumerateCandidates(
  puzzle: Puzzle,
  categories: Category[],
): CatalogClue[] {
  const candidates: CatalogClue[] = []
  const categoryPairs = categoryPairings(categories)
  const allowed = puzzle.options.allowedClueTypes

  if (
    allowed.includes('cross-category') &&
    !allowed.some((type) => type !== 'cross-category')
  ) {
    throw new Error(
      `Puzzle '${puzzle.name}' allows only cross-category clues, which the solver does not support yet.`,
    )
  }

  for (const [leftCategory, rightCategory] of categoryPairs) {
    for (const leftItem of leftCategory.items) {
      for (const rightItem of rightCategory.items) {
        const pairing = makePairing(
          leftCategory,
          leftItem,
          rightCategory,
          rightItem,
        )
        if (
          allowed.includes('positive') &&
          isPairingInSolution(puzzle.solution, pairing)
        ) {
          candidates.push({ type: 'positive', pairing })
        }
        if (
          allowed.includes('negative') &&
          !isPairingInSolution(puzzle.solution, pairing)
        ) {
          candidates.push({ type: 'negative', pairing })
        }
      }
    }
  }

  if (allowed.includes('disjunction')) {
    for (const [leftCategory, rightCategory] of categoryPairs) {
      for (const leftItem of leftCategory.items) {
        const rightItems = rightCategory.items.filter((rightItem) =>
          isPairingInSolution(
            puzzle.solution,
            makePairing(leftCategory, leftItem, rightCategory, rightItem),
          ),
        )
        for (let index = 0; index < rightItems.length; index += 1) {
          for (
            let nextIndex = index + 1;
            nextIndex < rightItems.length;
            nextIndex += 1
          ) {
            candidates.push({
              type: 'disjunction',
              pairings: [
                makePairing(
                  leftCategory,
                  leftItem,
                  rightCategory,
                  rightItems[index],
                ),
                makePairing(
                  leftCategory,
                  leftItem,
                  rightCategory,
                  rightItems[nextIndex],
                ),
              ],
            })
          }
        }
      }
    }
  }

  return candidates.filter((candidate) => clueTypeIsAllowed(candidate, allowed))
}

function resolveCategories(
  puzzle: Puzzle,
  sharedCategories: Category[] | Main,
): Category[] {
  const categories =
    'sharedCategories' in sharedCategories
      ? sharedCategories.sharedCategories
      : sharedCategories
  const shared = puzzle.sharedCategories.map((name) => {
    const category = categories.find((candidate) => candidate.name === name)
    if (!category) {
      throw new Error(`Puzzle references unknown shared category '${name}'.`)
    }
    return category
  })
  return [...shared, ...puzzle.localCategories]
}

function categoryPairings(categories: Category[]): [Category, Category][] {
  const pairs: [Category, Category][] = []
  for (let leftIndex = 0; leftIndex < categories.length; leftIndex += 1) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < categories.length;
      rightIndex += 1
    ) {
      pairs.push([categories[leftIndex], categories[rightIndex]])
    }
  }
  return pairs
}

function makePairing(
  leftCategory: Category,
  leftItem: string,
  rightCategory: Category,
  rightItem: string,
): Pairing {
  return {
    left: { category: leftCategory.name, item: leftItem },
    right: { category: rightCategory.name, item: rightItem },
  }
}

function isPairingInSolution(
  solution: SolutionRow[],
  pairing: Pairing,
): boolean {
  return solution.some(
    (row) =>
      row[pairing.left.category] === pairing.left.item &&
      row[pairing.right.category] === pairing.right.item,
  )
}

function isSolverClue(
  clue: CatalogClue,
): clue is Exclude<CatalogClue, { type: 'cross-category' }> {
  return clue.type !== 'cross-category'
}
