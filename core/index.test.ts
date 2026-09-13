import { describe, expect, it } from 'vitest'
import { projectName } from '../core/index.js'

describe('project scaffold', () => {
  it('loads the core package', () => {
    expect(projectName).toBe('logic-grid-puzzle-clue-generator')
  })
})
