import type { Main, Puzzle } from './model.js'
import type { CatalogClue } from './clues/catalog.js'
import type { GeneratedClue, GenerationResult } from './generator.js'

export interface PuzzleOutputData {
  name: string
  narrativeArch: string
  narration: string
  clues: CatalogClue[]
  descriptions: string[]
  solution: Record<string, string>[]
  solutionCount: number
  unique: boolean
  seed: number
}

export interface PuzzleOutput {
  markdown: string
  data: PuzzleOutputData
}

export function assemblePuzzleOutput(
  main: Main,
  puzzle: Puzzle,
  generation: GenerationResult,
): PuzzleOutput {
  const data: PuzzleOutputData = {
    name: puzzle.name,
    narrativeArch: main.narrativeArch,
    narration: puzzle.narration,
    clues: generation.clues.map(({ clue }) => clue),
    descriptions: generation.clues.map(({ description }) => description),
    solution: puzzle.solution,
    solutionCount: generation.solutionCount,
    unique: generation.solutionCount === 1,
    seed: generation.seed,
  }

  return {
    markdown: renderMarkdown(data),
    data,
  }
}

function renderMarkdown(output: PuzzleOutputData): string {
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
    '## Results',
    '',
    renderSolutionTable(output.solution),
    '',
    '## Verification',
    '',
    `- Unique solution: ${output.unique ? 'yes' : 'no'}`,
    `- Solutions found: ${output.solutionCount}`,
    `- Seed: ${output.seed}`,
    '',
  ].join('\n')
}

function renderSolutionTable(solution: Record<string, string>[]): string {
  if (solution.length === 0) {
    return '_No solution rows._'
  }

  const headers = Object.keys(solution[0])
  const headerRow = `| ${headers.join(' | ')} |`
  const separatorRow = `| ${headers.map(() => '---').join(' | ')} |`
  const dataRows = solution.map(
    (row) =>
      `| ${headers.map((header) => escapeCell(row[header])).join(' | ')} |`,
  )

  return [headerRow, separatorRow, ...dataRows].join('\n')
}

function escapeCell(value: string): string {
  return value.replaceAll('|', '\\|')
}

export function generatedCluesToJson(
  clues: GeneratedClue[],
): Pick<PuzzleOutputData, 'clues' | 'descriptions'> {
  return {
    clues: clues.map(({ clue }) => clue),
    descriptions: clues.map(({ description }) => description),
  }
}
