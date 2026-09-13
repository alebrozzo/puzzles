import { access, mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { kitesPuzzle } from '../magazines/_example_/kites.js'
import { main } from '../magazines/_example_/main.js'
import { writeGeneratedFiles } from './index.js'

describe('writeGeneratedFiles', () => {
  it('writes a Markdown result for a typed puzzle module', async () => {
    const outputDirectory = await mkdtemp(join(tmpdir(), 'logic-grid-'))
    const puzzlePath = join(outputDirectory, 'kites.ts')
    const paths = await writeGeneratedFiles(main, kitesPuzzle, puzzlePath)
    const markdown = await readFile(paths.markdownPath, 'utf8')

    expect(markdown).toContain('# Kites')
    await expect(
      access(join(outputDirectory, 'kites.result.json')),
    ).rejects.toThrow()
  })
})
