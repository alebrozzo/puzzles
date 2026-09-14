import {
  BinaryOperator,
  CategoryType,
  ClueType as ExternalClueType,
  Generator,
} from 'logic-puzzle-generator'
import type { Clue as ExternalClue } from 'logic-puzzle-generator'
import type { Category, Main, Puzzle, Solution } from './model.js'
import { describeClue, type CatalogClue } from './clues/catalog.js'
import { resolveSeed } from './random.js'
import { validatePuzzle } from './loader.js'
import type { Pairing } from './solver.js'
import { solve } from './solver.js'

export interface GeneratedClue {
  clue: CatalogClue
  description: string
}

export interface GenerationResult {
  clues: GeneratedClue[]
  solutionCount: number
  seed: number
}

export function generateClues(
  puzzle: Puzzle,
  sharedCategories: Category[] | Main,
  defaultSeedSource: string = puzzle.name,
): GenerationResult {
  puzzle = validatePuzzle(
    puzzle,
    'sharedCategories' in sharedCategories
      ? sharedCategories.sharedCategories
      : sharedCategories,
    'Puzzle',
  )
  const categories = resolveCategories(puzzle, sharedCategories)
  const allowed = new Set(puzzle.options.allowedClueTypes)
  if (
    !allowed.has('positive') &&
    !allowed.has('negative') &&
    !allowed.has('disjunction')
  ) {
    throw new Error(
      'Puzzle options allow only cross-category clues, which the external generator cannot translate.',
    )
  }
  if (categories[0].items.length === 1) {
    return {
      clues: [],
      solutionCount: 1,
      seed: resolveSeed(puzzle.options.seed, defaultSeedSource),
    }
  }

  const seed = resolveSeed(puzzle.options.seed, defaultSeedSource)
  const externalCategories = categories.map((category) => ({
    id: category.name,
    type: CategoryType.NOMINAL,
    values: category.items,
  }))
  const externalPuzzle = new Generator(seed).generatePuzzle(
    externalCategories,
    {
      category1Id: externalCategories[0].id,
      value1: externalCategories[0].values[0],
      category2Id: externalCategories[1].id,
    },
    {
      timeoutMs: 30_000,
      constraints: {
        allowedClueTypes: [ExternalClueType.BINARY, ExternalClueType.OR],
      },
    },
  )

  const valueMaps = createValueMaps(
    categories,
    puzzle.solution,
    externalPuzzle.solution,
  )
  const clues = externalPuzzle.validClues
    .map((clue) => translateClue(clue, valueMaps))
    .filter((clue): clue is CatalogClue => clue !== undefined)
    .filter((clue) => isAllowedLocalClue(clue, allowed))

  if (solve(categories, clues.filter(isSolverClue)).count !== 1) {
    clues.splice(
      0,
      clues.length,
      ...fallbackClues(categories, puzzle.solution, allowed),
    )
  }

  for (let index = clues.length - 1; index >= 0; index -= 1) {
    const without = clues.filter((_, clueIndex) => clueIndex !== index)
    if (solve(categories, without.filter(isSolverClue)).count === 1)
      clues.splice(index, 1)
  }

  if (clues.length > puzzle.options.maxClues) throw generationError(puzzle)
  const solutionCount = solve(categories, clues.filter(isSolverClue)).count
  if (solutionCount !== 1) throw generationError(puzzle)

  return {
    clues: clues.map((clue) => ({ clue, description: describeClue(clue) })),
    solutionCount,
    seed,
  }
}

function fallbackClues(
  categories: Category[],
  solution: Solution,
  allowed: Set<Puzzle['options']['allowedClueTypes'][number]>,
): CatalogClue[] {
  const candidates: CatalogClue[] = []
  for (let leftIndex = 0; leftIndex < categories.length; leftIndex += 1) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < categories.length;
      rightIndex += 1
    ) {
      for (const leftItem of categories[leftIndex].items) {
        const row = solution.find(
          (candidate) => candidate[categories[leftIndex].name] === leftItem,
        )!
        for (const rightItem of categories[rightIndex].items) {
          const pairing: Pairing = {
            left: { category: categories[leftIndex].name, item: leftItem },
            right: { category: categories[rightIndex].name, item: rightItem },
          }
          const matches = row[categories[rightIndex].name] === rightItem
          if (matches && allowed.has('positive'))
            candidates.push({ type: 'positive', pairing })
          if (!matches && allowed.has('negative'))
            candidates.push({ type: 'negative', pairing })
        }
      }
    }
  }
  const selected: CatalogClue[] = []
  for (const candidate of candidates) {
    selected.push(candidate)
    if (solve(categories, selected.filter(isSolverClue)).count === 1) break
  }
  return selected
}

function generationError(puzzle: Puzzle): Error {
  return new Error(
    `Unable to generate a unique solution for puzzle '${puzzle.name}' within ${puzzle.options.maxClues} clues while meeting clue-quality limits.`,
  )
}

type ValueMap = Map<string, Map<string, string>>
type ExternalSolution = Record<string, Record<string, string | number>>

function createValueMaps(
  categories: Category[],
  targetSolution: Solution,
  externalSolution: ExternalSolution,
): ValueMap {
  const anchor = categories[0]
  const maps: ValueMap = new Map(
    categories.map((category) => [category.name, new Map<string, string>()]),
  )
  for (const anchorValue of anchor.items) {
    const targetRow = targetSolution.find(
      (row) => row[anchor.name] === anchorValue,
    )
    if (!targetRow) continue
    for (const category of categories) {
      const generatedValue =
        category === anchor
          ? anchorValue
          : externalSolution[category.name]?.[anchorValue]
      const targetValue = targetRow[category.name]
      if (generatedValue !== undefined && targetValue !== undefined) {
        maps.get(category.name)!.set(String(generatedValue), targetValue)
      }
    }
  }
  return maps
}

function translateClue(
  clue: ExternalClue,
  maps: ValueMap,
): CatalogClue | undefined {
  if (clue.type === ExternalClueType.BINARY) {
    const pairing = translatePairing(
      clue.cat1,
      clue.val1,
      clue.cat2,
      clue.val2,
      maps,
    )
    if (!pairing) return undefined
    return {
      type: clue.operator === BinaryOperator.IS ? 'positive' : 'negative',
      pairing,
    }
  }
  if (clue.type === ExternalClueType.OR) {
    const pairings = [clue.clue1, clue.clue2]
      .map((part) =>
        part.type === ExternalClueType.BINARY
          ? translatePairing(part.cat1, part.val1, part.cat2, part.val2, maps)
          : undefined,
      )
      .filter((pairing): pairing is Pairing => pairing !== undefined)
    return pairings.length === 2 ? { type: 'disjunction', pairings } : undefined
  }
  return undefined
}

function translatePairing(
  leftCategory: string,
  leftValue: string | number,
  rightCategory: string,
  rightValue: string | number,
  maps: ValueMap,
): Pairing | undefined {
  const left = maps.get(leftCategory)?.get(String(leftValue))
  const right = maps.get(rightCategory)?.get(String(rightValue))
  return left === undefined || right === undefined
    ? undefined
    : {
        left: { category: leftCategory, item: left },
        right: { category: rightCategory, item: right },
      }
}

function isAllowedLocalClue(
  clue: CatalogClue,
  allowed: Set<Puzzle['options']['allowedClueTypes'][number]>,
): boolean {
  return clue.type === 'positive'
    ? allowed.has('positive')
    : clue.type === 'negative'
      ? allowed.has('negative')
      : allowed.has('disjunction')
}

function resolveCategories(
  puzzle: Puzzle,
  sharedCategories: Category[] | Main,
): Category[] {
  const catalog =
    'sharedCategories' in sharedCategories
      ? sharedCategories.sharedCategories
      : sharedCategories
  return [
    ...puzzle.sharedCategories.map((name) =>
      catalog.find((category) => category.name === name)!,
    ),
    ...puzzle.localCategories,
  ]
}

function isSolverClue(
  clue: CatalogClue,
): clue is Exclude<CatalogClue, { type: 'cross-category' }> {
  return clue.type !== 'cross-category'
}
