import type {
  Category,
  Difficulty,
  Main,
  Puzzle,
  SolutionRow,
} from './model.js'
import {
  clueTypeIsAllowed,
  describeClue,
  type CatalogClue,
} from './clues/catalog.js'
import { resolveSeed, createRng } from './random.js'
import { validatePuzzle } from './loader.js'
import type { Pairing } from './solver.js'
import { createUniquenessChecker } from './uniqueness.js'

export interface GeneratedClue {
  clue: CatalogClue
  description: string
}

export interface GenerationResult {
  clues: GeneratedClue[]
  solutionCount: number
  seed: number
}

type SolverClueType = 'positive' | 'negative' | 'disjunction'

const CLUE_TYPE_PREFERENCE: Record<Difficulty, SolverClueType[]> = {
  easy: ['positive', 'negative', 'disjunction'],
  medium: ['negative', 'positive', 'disjunction'],
  hard: ['disjunction', 'negative', 'positive'],
}

const MAX_ATTEMPTS = 32
const MAX_DISJUNCTIONS = 2

export async function generateClues(
  puzzle: Puzzle,
  sharedCategories: Category[] | Main,
  defaultSeedSource: string = puzzle.name,
): Promise<GenerationResult> {
  puzzle = validatePuzzle(
    puzzle,
    'sharedCategories' in sharedCategories
      ? sharedCategories.sharedCategories
      : sharedCategories,
    'Puzzle',
  )
  const categories = resolveCategories(puzzle, sharedCategories)
  const candidates = enumerateCandidates(puzzle, categories)
  const hasUniqueSolution = await createUniquenessChecker(
    categories,
    puzzle.solution,
  )
  const seed = resolveSeed(puzzle.options.seed, defaultSeedSource)
  const rng = createRng(seed)
  let best: CatalogClue[] | undefined

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const selected: CatalogClue[] = []
    const grid = createGrid(categories)
    let isUnique = false

    while (!isUnique) {
      const candidate = chooseBestCandidate(
        candidates,
        selected,
        grid,
        puzzle,
        rng,
      )
      if (!candidate) {
        break
      }
      selected.push(candidate)
      applyClueToGrid(grid, candidate)
      isUnique = await hasUniqueSolution(selected)
    }

    if (!isUnique) {
      continue
    }
    for (let index = selected.length - 1; index >= 0; index -= 1) {
      const without = selected.filter((_, clueIndex) => clueIndex !== index)
      if (await hasUniqueSolution(without)) {
        selected.splice(index, 1)
      }
    }
    if (!canSolveByDeduction(categories, selected)) {
      continue
    }
    if (
      !best ||
      selected.length < best.length ||
      (selected.length === best.length &&
        selected.filter((clue) => clue.type === 'positive').length <
          best.filter((clue) => clue.type === 'positive').length)
    ) {
      best = selected
    }
    if (best.length <= 1) {
      break
    }
  }

  if (!best) {
    throw new Error(
      `Unable to generate a unique solution for puzzle '${puzzle.name}' within ${puzzle.options.maxClues} clues while meeting clue-quality limits after ${MAX_ATTEMPTS} attempts.`,
    )
  }

  for (let index = best.length - 1; index > 0; index -= 1) {
    const otherIndex = Math.floor(rng() * (index + 1))
    ;[best[index], best[otherIndex]] = [best[otherIndex], best[index]]
  }

  return {
    clues: best.map((clue) => ({ clue, description: describeClue(clue) })),
    solutionCount: 1,
    seed,
  }
}

function canSolveByDeduction(
  categories: Category[],
  clues: CatalogClue[],
): boolean {
  if (categories[0].items.length === 1) {
    return true
  }
  const grid = createGrid(categories)
  let changes: number
  do {
    changes = 0
    for (const clue of clues) {
      changes += applyClueToGrid(grid, clue)
    }
  } while (changes > 0)
  return [...grid.state.values()].every((state) => state !== 'possible')
}

function chooseBestCandidate(
  candidates: CatalogClue[],
  selected: CatalogClue[],
  grid: Grid,
  puzzle: Puzzle,
  rng: () => number,
): CatalogClue | undefined {
  if (selected.length >= puzzle.options.maxClues) {
    return undefined
  }

  let winner: CatalogClue | undefined
  let winnerScore = 0

  for (const clueType of CLUE_TYPE_PREFERENCE[puzzle.options.difficulty]) {
    const found = bestCandidateOfType(
      candidates,
      selected,
      grid,
      clueType,
      puzzle,
      rng,
    )
    if (!found) {
      continue
    }

    if (found.score > winnerScore) {
      winner = found.candidate
      winnerScore = found.score
    }
  }

  return winner
}

function bestCandidateOfType(
  candidates: CatalogClue[],
  selected: CatalogClue[],
  grid: Grid,
  clueType: SolverClueType,
  puzzle: Puzzle,
  rng: () => number,
): { candidate: CatalogClue; score: number } | undefined {
  let best: CatalogClue | undefined
  let bestScore = 0
  let tieCount = 0

  for (const candidate of candidates) {
    if (candidate.type !== clueType || selected.includes(candidate)) {
      continue
    }

    if (
      candidate.type === 'disjunction' &&
      selected.filter((clue) => clue.type === 'disjunction').length >=
        MAX_DISJUNCTIONS
    ) {
      continue
    }
    if (
      candidate.type === 'positive' &&
      puzzle.options.difficulty !== 'easy' &&
      grid.categories.length > 2
    ) {
      const row = puzzle.solution.find(
        (row) =>
          row[candidate.pairing.left.category] === candidate.pairing.left.item,
      )!
      const directFacts = selected.filter(
        (clue) =>
          clue.type === 'positive' &&
          row[clue.pairing.left.category] === clue.pairing.left.item,
      ).length
      const limit =
        puzzle.options.difficulty === 'hard'
          ? 1
          : Math.min(2, grid.categories.length - 2)
      if (directFacts >= limit) {
        continue
      }
    }

    const resolved = applyClueToGrid(cloneGrid(grid), candidate)
    const score = resolved * (0.7 + rng() * 0.6)
    if (score > bestScore) {
      best = candidate
      bestScore = score
      tieCount = 1
    } else if (score === bestScore && score > 0) {
      tieCount += 1
      if (rng() < 1 / tieCount) {
        best = candidate
      }
    }
  }

  return best ? { candidate: best, score: bestScore } : undefined
}

// --- Possibility-grid ranking heuristic -------------------------------
//
// Counting exact solve() solutions to rank candidates does not scale: with
// up to 6 items per category, unconstrained solution counts reach into the
// hundreds of millions for just a handful of categories, and any fixed cap
// makes most candidates look equally "good" (see plan.md's scale decision).
// Instead, candidates are ranked with the same pairwise possibility-grid
// elimination a human solver uses: mark a pairing true/false, eliminate the
// rest of its row and column, cascade that across other categories, and
// count how many cells got resolved. This is cheap (bounded by category
// count and size, not by the combinatorial solution space) and is a ranking
// heuristic ONLY — solve() remains the sole source of truth for proving
// uniqueness.

type CellState = 'possible' | 'true' | 'false'

interface Grid {
  categories: Category[]
  state: Map<string, CellState>
}

interface Cell {
  categoryA: string
  itemA: string
  categoryB: string
  itemB: string
}

function cellKey(
  categoryA: string,
  itemA: string,
  categoryB: string,
  itemB: string,
): string {
  return categoryA < categoryB
    ? `${categoryA}\u0000${itemA}\u0000${categoryB}\u0000${itemB}`
    : `${categoryB}\u0000${itemB}\u0000${categoryA}\u0000${itemA}`
}

function createGrid(categories: Category[]): Grid {
  const state = new Map<string, CellState>()
  for (const [categoryA, categoryB] of categoryPairings(categories)) {
    for (const itemA of categoryA.items) {
      for (const itemB of categoryB.items) {
        state.set(
          cellKey(categoryA.name, itemA, categoryB.name, itemB),
          'possible',
        )
      }
    }
  }
  return { categories, state }
}

function cloneGrid(grid: Grid): Grid {
  return { categories: grid.categories, state: new Map(grid.state) }
}

function getCell(
  grid: Grid,
  categoryA: string,
  itemA: string,
  categoryB: string,
  itemB: string,
): CellState {
  return (
    grid.state.get(cellKey(categoryA, itemA, categoryB, itemB)) ?? 'possible'
  )
}

// Returns whether this write actually resolved a previously-open cell.
function setCell(
  grid: Grid,
  categoryA: string,
  itemA: string,
  categoryB: string,
  itemB: string,
  value: 'true' | 'false',
): boolean {
  const key = cellKey(categoryA, itemA, categoryB, itemB)
  if (grid.state.get(key) !== 'possible') {
    return false
  }
  grid.state.set(key, value)
  return true
}

// Applies a clue's direct effect to the grid, then propagates row/column and
// cross-category deductions to a fixed point. Returns the number of cells
// resolved, for use as a ranking score.
function applyClueToGrid(grid: Grid, clue: CatalogClue): number {
  let changes = 0
  const queue: Cell[] = []

  const markTrue = (
    categoryA: string,
    itemA: string,
    categoryB: string,
    itemB: string,
  ): void => {
    if (setCell(grid, categoryA, itemA, categoryB, itemB, 'true')) {
      changes += 1
      queue.push({ categoryA, itemA, categoryB, itemB })
    }
  }
  const markFalse = (
    categoryA: string,
    itemA: string,
    categoryB: string,
    itemB: string,
  ): void => {
    if (setCell(grid, categoryA, itemA, categoryB, itemB, 'false')) {
      changes += 1
    }
  }

  seedFromClue(grid, clue, markTrue, markFalse)

  // Run row/column elimination and cross-category propagation to a fixed
  // point, re-checking for forced singletons after each pass. This must
  // happen even when the queue starts empty (negative and disjunction clues
  // only ever call markFalse directly), otherwise a negative/disjunction
  // clue that completes a row/column via elimination alone never gets
  // credited for the singleton it forces.
  let forcedNewTrue = true
  while (queue.length > 0 || forcedNewTrue) {
    while (queue.length > 0) {
      const cell = queue.shift()!
      eliminateRowAndColumn(grid, cell, markFalse)
      propagateAcrossCategories(grid, cell, markTrue)
    }
    const beforeForce = changes
    forceSingletons(grid, markTrue)
    forcedNewTrue = changes > beforeForce
  }

  return changes
}

type MarkTrue = (
  categoryA: string,
  itemA: string,
  categoryB: string,
  itemB: string,
) => void
type MarkFalse = MarkTrue

// Disjunction candidates are always generated by enumerateCandidates with a
// shared left item, so restricting that item's row to the disjunction's
// right-hand items is a sound, immediate deduction (not just an OR guess).
function seedFromClue(
  grid: Grid,
  clue: CatalogClue,
  markTrue: MarkTrue,
  markFalse: MarkFalse,
): void {
  if (clue.type === 'positive') {
    markTrue(
      clue.pairing.left.category,
      clue.pairing.left.item,
      clue.pairing.right.category,
      clue.pairing.right.item,
    )
    return
  }

  if (clue.type === 'negative') {
    markFalse(
      clue.pairing.left.category,
      clue.pairing.left.item,
      clue.pairing.right.category,
      clue.pairing.right.item,
    )
    return
  }

  if (clue.type === 'disjunction') {
    const { left, right } = clue.pairings[0]
    const allowed = new Set(clue.pairings.map((pairing) => pairing.right.item))
    const rightCategory = grid.categories.find(
      (category) => category.name === right.category,
    )
    for (const item of rightCategory?.items ?? []) {
      if (!allowed.has(item)) {
        markFalse(left.category, left.item, right.category, item)
      }
    }
  }
}

function eliminateRowAndColumn(
  grid: Grid,
  cell: Cell,
  markFalse: MarkFalse,
): void {
  const categoryA = grid.categories.find((c) => c.name === cell.categoryA)!
  const categoryB = grid.categories.find((c) => c.name === cell.categoryB)!

  for (const otherItemB of categoryB.items) {
    if (otherItemB !== cell.itemB) {
      markFalse(cell.categoryA, cell.itemA, cell.categoryB, otherItemB)
    }
  }
  for (const otherItemA of categoryA.items) {
    if (otherItemA !== cell.itemA) {
      markFalse(cell.categoryA, otherItemA, cell.categoryB, cell.itemB)
    }
  }
}

// If itemA-in-categoryA is already linked to some item in a third category,
// then itemB-in-categoryB (now linked to itemA) must share that same link.
function propagateAcrossCategories(
  grid: Grid,
  cell: Cell,
  markTrue: MarkTrue,
): void {
  for (const other of grid.categories) {
    if (other.name === cell.categoryA || other.name === cell.categoryB) {
      continue
    }

    const linkedToA = findTrueLink(grid, cell.categoryA, cell.itemA, other)
    if (linkedToA) {
      markTrue(cell.categoryB, cell.itemB, other.name, linkedToA)
    }

    const linkedToB = findTrueLink(grid, cell.categoryB, cell.itemB, other)
    if (linkedToB) {
      markTrue(cell.categoryA, cell.itemA, other.name, linkedToB)
    }
  }
}

function findTrueLink(
  grid: Grid,
  category: string,
  item: string,
  otherCategory: Category,
): string | undefined {
  return otherCategory.items.find(
    (otherItem) =>
      getCell(grid, category, item, otherCategory.name, otherItem) === 'true',
  )
}

// Once elimination narrows a row or column down to a single remaining
// possibility (and no cell in it is already true), that possibility is forced.
function forceSingletons(grid: Grid, markTrue: MarkTrue): void {
  for (const [categoryX, categoryY] of categoryPairings(grid.categories)) {
    for (const itemX of categoryX.items) {
      forceIfSingleton(grid, categoryX.name, itemX, categoryY, markTrue)
    }
    for (const itemY of categoryY.items) {
      forceIfSingleton(grid, categoryY.name, itemY, categoryX, markTrue)
    }
  }
}

function forceIfSingleton(
  grid: Grid,
  fixedCategory: string,
  fixedItem: string,
  otherCategory: Category,
  markTrue: MarkTrue,
): void {
  let onlyPossible: string | undefined
  let possibleCount = 0

  for (const otherItem of otherCategory.items) {
    const state = getCell(
      grid,
      fixedCategory,
      fixedItem,
      otherCategory.name,
      otherItem,
    )
    if (state === 'true') {
      return
    }
    if (state === 'possible') {
      possibleCount += 1
      onlyPossible = otherItem
    }
  }

  if (possibleCount === 1 && onlyPossible) {
    markTrue(fixedCategory, fixedItem, otherCategory.name, onlyPossible)
  }
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
        const rightItems = rightCategory.items
        for (let index = 0; index < rightItems.length; index += 1) {
          for (
            let nextIndex = index + 1;
            nextIndex < rightItems.length;
            nextIndex += 1
          ) {
            const pairings = [
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
            ]
            if (
              !pairings.some((pairing) =>
                isPairingInSolution(puzzle.solution, pairing),
              )
            ) {
              continue
            }
            candidates.push({
              type: 'disjunction',
              pairings,
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
