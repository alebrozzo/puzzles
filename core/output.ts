import type { Main, Puzzle } from './model.js'
import type { CatalogClue } from './clues/catalog.js'
import type { GeneratedClue, GenerationResult } from './generator.js'

export interface PuzzleOutputJson {
  name: string
  narrativeArch: string
  narration: string
  clues: CatalogClue[]
  descriptions: string[]
  solutionCount: number
  unique: boolean
}

export interface PuzzleOutput {
  markdown: string
  json: PuzzleOutputJson
}

export function assemblePuzzleOutput(
  main: Main,
  puzzle: Puzzle,
  generation: GenerationResult,
): PuzzleOutput {
  const json: PuzzleOutputJson = {
    name: puzzle.name,
    narrativeArch: main.narrativeArch,
    narration: puzzle.narration,
    clues: generation.clues.map(({ clue }) => clue),
    descriptions: generation.clues.map(({ description }) => description),
    solutionCount: generation.solutionCount,
    unique: generation.solutionCount === 1,
  }

  return {
    markdown: renderMarkdown(json),
    json,
  }
}

function renderMarkdown(output: PuzzleOutputJson): string {
  const clues = output.descriptions
    .map((description, index) => `${index + 1}. ${description}`)
    .join('\n')

  return [
    `# ${output.name}`,
    '',
    output.narrativeArch,
    '',
    output.narration,
    '',
    '## Clues',
    '',
    clues || '_No clues generated._',
    '',
    '## Verification',
    '',
    `- Unique solution: ${output.unique ? 'yes' : 'no'}`,
    `- Solutions found: ${output.solutionCount}`,
    '',
  ].join('\n')
}

export function generatedCluesToJson(
  clues: GeneratedClue[],
): Pick<PuzzleOutputJson, 'clues' | 'descriptions'> {
  return {
    clues: clues.map(({ clue }) => clue),
    descriptions: clues.map(({ description }) => description),
  }
}
