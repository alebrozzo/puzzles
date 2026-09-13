#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises'
import { basename, extname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { generateClues } from '../core/generator.js'
import type { Main, Puzzle } from '../core/model.js'
import { assemblePuzzleOutput } from '../core/output.js'

export async function generateFiles(
  main: Main,
  puzzle: Puzzle,
  outputDirectory: string,
): Promise<{ markdownPath: string; jsonPath: string }> {
  const generation = generateClues(puzzle, main)
  const output = assemblePuzzleOutput(main, puzzle, generation)
  const outputBase = resolve(outputDirectory, `${puzzle.name}.result`)
  const markdownPath = `${outputBase}.md`
  const jsonPath = `${outputBase}.json`

  await mkdir(outputDirectory, { recursive: true })
  await Promise.all([
    writeFile(markdownPath, output.markdown, 'utf8'),
    writeFile(jsonPath, `${JSON.stringify(output.json, null, 2)}\n`, 'utf8'),
  ])

  return { markdownPath, jsonPath }
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
  if (args[0] !== 'generate' || !args[1] || !args[2]) {
    throw new Error(
      'Usage: puzzle generate <main.ts> <puzzle.ts> [--out <directory>]',
    )
  }

  const outputFlagIndex = args.indexOf('--out')
  if (outputFlagIndex !== -1 && !args[outputFlagIndex + 1]) {
    throw new Error('The --out option requires a directory.')
  }

  const outputDirectory =
    outputFlagIndex === -1 ? '.' : args[outputFlagIndex + 1]
  const main = await loadExport<Main>(args[1], 'main')
  const puzzle = await loadExport<Puzzle>(args[2], getPuzzleExportName(args[2]))
  const paths = await generateFiles(main, puzzle, outputDirectory)

  console.log(`Wrote ${paths.markdownPath}`)
  console.log(`Wrote ${paths.jsonPath}`)
}

function getPuzzleExportName(modulePath: string): string {
  const fileName = basename(modulePath, extname(modulePath))
  return `${fileName}Puzzle`
}

if (process.argv[1] && resolve(process.argv[1]).endsWith('/cli/index.ts')) {
  runCli(process.argv.slice(2)).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    console.error(message)
    process.exitCode = 1
  })
}
