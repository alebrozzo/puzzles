/** Difficulty controls the kinds of clues preferred during generation. */
export type Difficulty =
  | 'easy' // Prefer direct positive clues.
  | 'medium'
  | 'hard' // Prefer indirect and negative clues.

/** Logical relationships supported by the clue catalog. */
export type ClueType =
  | 'positive' // Two items are paired.
  | 'negative' // Two items are not paired.
  | 'disjunction' // At least one of several pairings is true.
  | 'cross-category' // A relationship spans more than two category assignments.

/** A named set of unique items that can be matched with other categories. */
export interface Category {
  name: string
  items: string[] // The loader limits categories to six unique items.
}

/** One complete row of matches, keyed by category name. */
export type SolutionRow = Record<string, string>

/** The complete bijection between all categories in a puzzle. */
export type Solution = SolutionRow[]

/** Global controls applied while generating clues for a puzzle. */
export interface GenerationOptions {
  difficulty: Difficulty
  maxClues: number
  allowedClueTypes: ClueType[]
}

/** A standalone puzzle, including its solved answer and generation controls. */
export interface Puzzle {
  name: string
  narration: string
  sharedCategories: string[] // Names of shared categories used by this puzzle.
  localCategories: Category[]
  solution: Solution
  options: GenerationOptions
}

/** The shared category catalog and the puzzles in the narrative. */
export interface Main {
  narrativeArch: string
  sharedCategories: Category[]
  puzzles: Puzzle[] // Puzzles may instead be loaded from separate JSON files.
}
