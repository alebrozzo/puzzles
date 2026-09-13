import type { Category, ClueType, Difficulty, Main, Puzzle } from './model.js'

const MAX_ITEMS = 6
const MAX_CLUES = 12
const difficulties = new Set<Difficulty>(['easy', 'medium', 'hard'])
const clueTypes = new Set<ClueType>([
  'positive',
  'negative',
  'disjunction',
  'cross-category',
])

export function loadMainJson(input: string): Main {
  const value = parseJson(input, 'Main JSON')
  const object = asObject(value, 'Main')
  const sharedCategories = asCategories(
    object.sharedCategories,
    'sharedCategories',
  )

  return {
    narrativeArch: asString(object.narrativeArch, 'narrativeArch'),
    sharedCategories,
  }
}

export function loadPuzzleJson(input: string, main: Main): Puzzle {
  const value = parseJson(input, 'Puzzle JSON')
  return validatePuzzle(value, main.sharedCategories, 'Puzzle')
}

export function validatePuzzle(
  value: unknown,
  sharedCategories: Category[],
  path: string,
): Puzzle {
  const object = asObject(value, path)
  const sharedCategoryNames = asStringArray(
    object.sharedCategories,
    `${path}.sharedCategories`,
  )
  const localCategories = asCategories(
    object.localCategories,
    `${path}.localCategories`,
  )
  const categories = [
    ...sharedCategoryNames.map((name) => {
      const category = sharedCategories.find(
        (candidate) => candidate.name === name,
      )
      if (!category) {
        throw new Error(
          `sharedCategories references unknown category '${name}'.`,
        )
      }
      return category
    }),
    ...localCategories,
  ]

  if (categories.length < 2) {
    throw new Error('A puzzle must contain at least two categories.')
  }

  const categoryNames = new Set<string>()
  for (const category of categories) {
    if (categoryNames.has(category.name)) {
      throw new Error(
        `Puzzle category '${category.name}' is declared more than once.`,
      )
    }
    categoryNames.add(category.name)
  }

  const solution = asArray(object.solution, `${path}.solution`).map(
    (row, index) => {
      const solutionRow = asObject(row, `${path}.solution[${index}]`)
      const keys = Object.keys(solutionRow).sort()
      const expectedKeys = [...categoryNames].sort()
      if (keys.join('\0') !== expectedKeys.join('\0')) {
        throw new Error(
          `${path}.solution[${index}] must contain every puzzle category exactly once.`,
        )
      }

      for (const category of categories) {
        const item = asString(
          solutionRow[category.name],
          `${path}.solution[${index}].${category.name}`,
        )
        if (!category.items.includes(item)) {
          throw new Error(
            `${path}.solution[${index}] uses unknown item '${item}' in category '${category.name}'.`,
          )
        }
      }

      return solutionRow as Record<string, string>
    },
  )

  validateSolutionRows(solution, categories)

  const options = asObject(object.options, `${path}.options`)
  const difficulty = asString(
    options.difficulty,
    `${path}.options.difficulty`,
  ) as Difficulty
  if (!difficulties.has(difficulty)) {
    throw new Error(`Unsupported difficulty '${difficulty}'.`)
  }

  const maxClues = asNumber(options.maxClues, `${path}.options.maxClues`)
  if (!Number.isInteger(maxClues) || maxClues < 1 || maxClues > MAX_CLUES) {
    throw new Error(
      `options.maxClues must be a positive integer no greater than ${MAX_CLUES}.`,
    )
  }

  const allowedClueTypes = asStringArray(
    options.allowedClueTypes,
    `${path}.options.allowedClueTypes`,
  ) as ClueType[]
  for (const clueType of allowedClueTypes) {
    if (!clueTypes.has(clueType)) {
      throw new Error(`Unsupported clue type '${clueType}'.`)
    }
  }

  const seed = asOptionalSeed(options.seed, `${path}.options.seed`)

  return {
    name: asString(object.name, `${path}.name`),
    narration: asString(object.narration, `${path}.narration`),
    sharedCategories: sharedCategoryNames,
    localCategories,
    solution,
    options: { difficulty, maxClues, allowedClueTypes, seed },
  }
}

function asOptionalSeed(
  value: unknown,
  path: string,
): string | number | undefined {
  if (value === undefined) {
    return undefined
  }
  if (typeof value === 'string' || typeof value === 'number') {
    return value
  }
  throw new Error(`${path} must be a string or number.`)
}

function validateSolutionRows(
  solution: Record<string, string>[],
  categories: Category[],
): void {
  const expectedRowCount = categories[0].items.length
  if (
    categories.some((category) => category.items.length !== expectedRowCount)
  ) {
    throw new Error(
      'All puzzle categories must contain the same number of items.',
    )
  }
  if (solution.length !== expectedRowCount) {
    throw new Error(`solution must contain exactly ${expectedRowCount} rows.`)
  }

  for (const category of categories) {
    const values = solution.map((row) => row[category.name])
    if (new Set(values).size !== values.length) {
      throw new Error(
        `solution repeats an item in category '${category.name}'.`,
      )
    }
  }
}

function parseJson(input: string, label: string): unknown {
  try {
    return JSON.parse(input)
  } catch {
    throw new Error(`${label} is invalid.`)
  }
}

function asObject(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${path} must be an object.`)
  }
  return value as Record<string, unknown>
}

function asArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`${path} must be an array.`)
  }
  return value
}

function asString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${path} must be a non-empty string.`)
  }
  return value
}

function asStringArray(value: unknown, path: string): string[] {
  return asArray(value, path).map((item, index) =>
    asString(item, `${path}[${index}]`),
  )
}

function asNumber(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${path} must be a number.`)
  }
  return value
}

function asCategories(value: unknown, path: string): Category[] {
  const categories = asArray(value, path).map((entry, index) => {
    const category = asObject(entry, `${path}[${index}]`)
    const items = asStringArray(category.items, `${path}[${index}].items`)
    if (items.length === 0 || items.length > MAX_ITEMS) {
      throw new Error(
        `${path}[${index}].items must contain between 1 and ${MAX_ITEMS} items.`,
      )
    }
    if (new Set(items).size !== items.length) {
      throw new Error(`${path}[${index}].items must not contain duplicates.`)
    }
    return { name: asString(category.name, `${path}[${index}].name`), items }
  })

  if (
    new Set(categories.map((category) => category.name)).size !==
    categories.length
  ) {
    throw new Error(`${path} must not contain duplicate category names.`)
  }
  return categories
}
