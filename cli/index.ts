#!/usr/bin/env node

import { writeFile } from 'node:fs/promises'
import { basename, dirname, extname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { generateClues } from '../core/generator.js'
import type { Main, Puzzle } from '../core/model.js'
import { assemblePuzzleOutput } from '../core/output.js'

export async function writeGeneratedFiles(
  main: Main,
  puzzle: Puzzle,
  puzzlePath: string,
): Promise<{ markdownPath: string }> {
  const generation = generateClues(puzzle, main, basename(puzzlePath))
  const output = assemblePuzzleOutput(main, puzzle, generation)
  const outputBase = resolve(
    dirname(puzzlePath),
    `${basename(puzzlePath, extname(puzzlePath))}.result`,
  )
  const markdownPath = `${outputBase}.md`

  await writeFile(markdownPath, output.markdown, 'utf8')

  return { markdownPath }
}

export async function generateFiles(
  puzzlePath: string,
): Promise<{ markdownPath: string }> {
  const absolutePuzzlePath = resolve(puzzlePath)
  const mainPath = resolve(dirname(absolutePuzzlePath), 'main.ts')
  const main = await loadExport<Main>(mainPath, 'main')
  const puzzle = await loadExport<Puzzle>(
    absolutePuzzlePath,
    getPuzzleExportName(absolutePuzzlePath),
  )

  return writeGeneratedFiles(main, puzzle, absolutePuzzlePath)
}

async function loadExport<T>(
  modulePath: string,
  exportName: string,
): Promise<T> {
  const absolutePath = resolve(modulePath)
  const module = (await import(pathToFileURL(absolutePath).href)) as Record<
    string,
    unknown
  >
  const value = module[exportName]
  if (!value) {
    throw new Error(`Module '${modulePath}' does not export '${exportName}'.`)
  }
  return value as T
}

export async function runCli(args: string[]): Promise<void> {
  if (args[0] !== 'generate' || !args[1] || args.length !== 2) {
    throw new Error('Usage: puzzle generate <puzzle.ts>')
  }

  const paths = await generateFiles(args[1])

  console.log(`Wrote ${paths.markdownPath}`)
}

function getPuzzleExportName(modulePath: string): string {
  const fileName = basename(modulePath, extname(modulePath))
  return `${fileName}Puzzle`
}

const entryPoint = process.argv[1] && resolve(process.argv[1])
if (
  entryPoint &&
  (entryPoint.endsWith('/cli/index.ts') || entryPoint.endsWith('/cli/index.js'))
) {
  runCli(process.argv.slice(2)).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    console.error(message)
    process.exitCode = 1
  })
}
