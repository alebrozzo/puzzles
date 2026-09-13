# Logic Grid Puzzle Clue Generator

A headless, deterministic TypeScript app that takes a solved flat logic-grid puzzle and generates a clue set that has exactly one solution. The solver is part of the product: clue generation repeatedly solves candidate clue sets to prove uniqueness.

The project is being built test-first. File input and output come before any web UI or positional puzzle support.

## Current Status

Implemented:

- Strict TypeScript project setup with ESM modules
- Vitest tests colocated beside the files they test
- Main and puzzle JSON models
- Validation for categories, shared-category references, solution completeness, and generation options
- Backtracking solver with positive, negative, and disjunction constraints
- Solution counting capped at two, so uniqueness can be distinguished from non-uniqueness
- Independent brute-force oracle test for solver behavior
- Prettier and ESLint checks in the test pipeline

Next:

1. Add the flat clue catalog with structured operands and static descriptions.
2. Add the deterministic clue generator that selects a minimal unique clue set.
3. Assemble Markdown and JSON output.
4. Wire the CLI and add an example campaign.

`cross-category` is part of the public `ClueType` vocabulary, but its exact operand structure and solver support have not been implemented yet.

## Repository Layout

```text
core/
  model.ts       Public data types
  loader.ts      Main and puzzle JSON parsing and validation
  solver.ts      Flat-puzzle backtracking solver
  *.test.ts      Colocated unit and oracle tests
  README.md      Detailed core model and JSON examples
cli/
  index.ts       CLI entry point; generation wiring is still pending
examples/
  main.ts        Typed shared NAME and AGE category catalog
  kites.ts       Typed Kites puzzle data and category types
plan.md          Original product plan and implementation sequence
```

## Data Model

The repository uses one typed TypeScript main file and one typed TypeScript data file per puzzle. The main file contains the narrative arc and reusable category definitions. A puzzle references only the shared categories it uses and can define additional local categories. A puzzle can use no shared categories, but it must contain at least two total categories.

Load the main catalog first when resolving a standalone puzzle file:

```ts
import { kitesPuzzle } from './examples/kites.js'
import { main } from './examples/main.js'

const sharedCategories = main.sharedCategories
const puzzle = kitesPuzzle
```

Each solution row contains one item from every category used by that puzzle. Every item in each category must appear exactly once across the rows. Categories are limited to six items. The authoritative TypeScript type documentation lives in [core/model.ts](core/model.ts); see [core/README.md](core/README.md) for complete examples and validation details.

## Engineering Constraints

- Keep Phase 1 flat; positional relationships belong to a later pluggable clue module.
- Keep generation deterministic: identical input and options should produce identical output.
- Prove uniqueness with the solver; do not infer it from the generated clue count.
- Keep the brute-force oracle independent from production solver code.
- Prefer focused colocated tests for each core module.
- Use `.js` extensions in TypeScript ESM imports, for example `import { solve } from './solver.js'`.
- Do not add UI before the headless core and CLI workflow are complete.

## Important Verification Goals

The generator will eventually need tests for:

- Exact reproduction of hand-known solutions
- Solver agreement with the independent brute-force oracle
- Exactly one solution for every generated clue set
- Non-uniqueness after removing any one generated clue
- Deterministic output
- End-to-end Markdown and JSON generation
