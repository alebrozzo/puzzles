export type Difficulty = 'easy' | 'medium' | 'hard'

export type ClueType =
  'positive' | 'negative' | 'disjunction' | 'cross-category'

export interface Category {
  name: string
  items: string[]
}

export type SolutionRow = Record<string, string>
export type Solution = SolutionRow[]

export interface GenerationOptions {
  difficulty: Difficulty
  maxClues: number
  allowedClueTypes: ClueType[]
}

export interface Puzzle {
  name: string
  sharedCategories: string[]
  localCategories: Category[]
  solution: Solution
  options: GenerationOptions
}

export interface CampaignPuzzle {
  narration: string
  puzzle: Puzzle
}

export interface Campaign {
  title: string
  backstory: string
  sharedCategories: Category[]
  puzzles: CampaignPuzzle[]
}
