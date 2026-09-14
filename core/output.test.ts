import { describe, expect, it } from 'vitest'
import { generateClues } from './generator.js'
import type { Main, Puzzle } from './model.js'
import { assemblePuzzleOutput } from './output.js'

const main: Main = {
  narrativeArch: 'A small group is matching names to colors.',
  sharedCategories: [{ name: 'NAME', items: ['Amelia', 'Bonifacio'] }],
}

const puzzle: Puzzle = {
  name: 'Colors',
  narration: 'Match each child to a color.',
  sharedCategories: ['NAME'],
  localCategories: [{ name: 'COLOR', items: ['Blue', 'Green'] }],
  solution: [
    { NAME: 'Amelia', COLOR: 'Green' },
    { NAME: 'Bonifacio', COLOR: 'Blue' },
  ],
  options: {
    difficulty: 'easy',
    maxClues: 2,
    allowedClueTypes: ['positive', 'negative'],
  },
}

describe('assemblePuzzleOutput', () => {
  it('assembles markdown and structured output data', async () => {
    const output = assemblePuzzleOutput(
      main,
      puzzle,
      await generateClues(puzzle, main),
    )

    expect(output.data).toMatchObject({
      name: 'Colors',
      narrativeArch: main.narrativeArch,
      narration: puzzle.narration,
      solutionCount: 1,
      unique: true,
    })
    expect(output.data.clues).toHaveLength(1)
    expect(output.data.descriptions).toHaveLength(1)
    expect(output.markdown).toContain('# Colors')
    expect(output.markdown).toContain('## Clues')
    expect(output.markdown).toContain('| NAME | COLOR |')
    expect(output.markdown).toContain('| Amelia | Green |')
    expect(output.markdown).toContain('Unique solution: yes')
  })

  it('keeps output deterministic', async () => {
    const generation = await generateClues(puzzle, main)
    const first = assemblePuzzleOutput(main, puzzle, generation)
    const second = assemblePuzzleOutput(main, puzzle, generation)

    expect(second).toEqual(first)
  })
})
