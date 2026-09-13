import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { kitesPuzzle } from '../examples/kites.js'
import { main } from '../examples/main.js'
import { generateFiles } from './index.js'

describe('generateFiles', () => {
  it('writes Markdown and JSON results for a typed puzzle module', async () => {
    const outputDirectory = await mkdtemp(join(tmpdir(), 'logic-grid-'))
    const paths = await generateFiles(main, kitesPuzzle, outputDirectory)
    const markdown = await readFile(paths.markdownPath, 'utf8')
    const json = JSON.parse(await readFile(paths.jsonPath, 'utf8')) as {
      name: string
      unique: boolean
    }

    expect(markdown).toContain('# Kites')
    expect(json).toMatchObject({ name: 'Kites', unique: true })
  })
})
