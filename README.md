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
- Flat clue catalog with structured positive, negative, disjunction, and cross-category clues
- Static clue descriptions and allowed-clue-type checks
- Deterministic greedy clue generator with uniqueness checking
- Markdown and JSON output assembly with uniqueness confirmation
- CLI generation from typed main and puzzle modules
- Solution counting capped at two, so uniqueness can be distinguished from non-uniqueness
- Independent brute-force oracle test for solver behavior
- Prettier and ESLint checks in the test pipeline

Next:

1. Add a broader example campaign and end-to-end coverage.

`cross-category` is cataloged and rendered, but the solver does not evaluate it yet.

## Repository Layout

```text
core/
  model.ts       Public data types
  loader.ts      Main and puzzle JSON parsing and validation
  solver.ts      Flat-puzzle backtracking solver
  generator.ts   Deterministic clue selection and uniqueness proof
  output.ts      Markdown and JSON result assembly
  clues/         Structured clue types and static descriptions
  *.test.ts      Colocated unit and oracle tests
  README.md      Detailed core model and JSON examples
cli/
  index.ts       CLI entry point and result-file writer
magazines/
  _example_/
    main.ts      Typed shared NAME and AGE category catalog
    kites.ts     Typed Kites puzzle data and category types
plan.md          Original product plan and implementation sequence
```

## Data Model

The repository uses one typed TypeScript main file and one typed TypeScript data file per puzzle. The main file contains the narrative arc and reusable category definitions. A puzzle references only the shared categories it uses and can define additional local categories. A puzzle can use no shared categories, but it must contain at least two total categories.

Load the main catalog first when resolving a standalone puzzle file:

```ts
import { kitesPuzzle } from './magazines/_example_/kites.js'
import { main } from './magazines/_example_/main.js'

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

## CLI

Generate results from the typed main and puzzle modules:

```sh
npm run cli -- generate magazines/_example_/main.ts magazines/_example_/kites.ts --out output
```

This writes `output/Kites.result.md` and `output/Kites.result.json`. The main module must export `main`, and a puzzle module named `kites.ts` must export `kitesPuzzle`.
