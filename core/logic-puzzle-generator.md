# `logic-puzzle-generator` API

This project uses `logic-puzzle-generator` version `1.4.x` as the clue-generation engine. The package is imported from the `logic-puzzle-generator` module.

## Main API

```ts
import {
  BinaryOperator,
  CategoryType,
  ClueType,
  Generator,
} from 'logic-puzzle-generator'

import type {
  CategoryConfig,
  Clue,
  GeneratorOptions,
  Puzzle,
  TargetFact,
} from 'logic-puzzle-generator'
```

### `CategoryConfig`

A category supplied to the external generator:

```ts
interface CategoryConfig {
  id: string
  type: CategoryType
  values: (string | number)[]
}
```

For this project, categories are currently passed as nominal categories:

```ts
const categories: CategoryConfig[] = [
  {
    id: 'NAME',
    type: CategoryType.NOMINAL,
    values: ['Amelia', 'Bonifacio'],
  },
  {
    id: 'COLOR',
    type: CategoryType.NOMINAL,
    values: ['Blue', 'Green'],
  },
]
```

`CategoryType.ORDINAL` is available from the library for numeric ordered values, but this application does not currently pass local categories as ordinal categories.

### `TargetFact`

The target identifies a value in one category whose matching value belongs to another category:

```ts
interface TargetFact {
  category1Id: string
  value1: string | number
  category2Id: string
}
```

Example:

```ts
const target: TargetFact = {
  category1Id: 'NAME',
  value1: 'Amelia',
  category2Id: 'COLOR',
}
```

### `Generator`

Create a seeded generator and generate a puzzle:

```ts
const generator = new Generator(12345)
const generated = generator.generatePuzzle(categories, target, options)
```

The returned `Puzzle` contains:

```ts
interface Puzzle {
  solution: Record<string, Record<string, string | number>>
  clues: Clue[]
  validClues: Clue[]
  redHerrings: Clue[]
  proofChain: { clue: Clue; deductions: number }[]
  categories: CategoryConfig[]
  targetFact: TargetFact
}
```

`validClues` is the set used to solve the generated external puzzle. The adapter uses this field, translates supported clues, and verifies the translated set with the local solver.

## Generation Options

```ts
interface GeneratorOptions {
  maxCandidates?: number
  targetClueCount?: number
  timeoutMs?: number
  constraints?: ClueGenerationConstraints
  redHerrings?: number | RedHerringOptions
  onTrace?: (message: string) => void
}
```

The current adapter uses:

```ts
{
  timeoutMs: 30_000,
  constraints: {
    allowedClueTypes: [ClueType.BINARY, ClueType.OR],
  },
}
```

The external generator may produce more clues than the application needs. The adapter removes redundant translated clues while preserving a unique local solution, then rejects the result if it exceeds the puzzle's `maxClues` setting.

## Supported Clue Types

The library defines these clue types:

```ts
enum ClueType {
  BINARY,
  ORDINAL,
  SUPERLATIVE,
  UNARY,
  CROSS_ORDINAL,
  BETWEEN,
  ADJACENCY,
  OR,
  ARITHMETIC,
}
```

This application currently translates only:

- `ClueType.BINARY` with `BinaryOperator.IS` into a local `positive` clue.
- `ClueType.BINARY` with `BinaryOperator.IS_NOT` into a local `negative` clue.
- `ClueType.OR` containing two binary clues into a local `disjunction` clue.

The local clue shape is:

```ts
interface Pairing {
  left: { category: string; item: string }
  right: { category: string; item: string }
}

type CatalogClue =
  | { type: 'positive'; pairing: Pairing }
  | { type: 'negative'; pairing: Pairing }
  | { type: 'disjunction'; pairings: Pairing[] }
```

Other external clue types are ignored by the adapter. If the translated clues do not produce a unique solution, the adapter derives compatible positive or negative binary clues from the puzzle's authoritative solution and verifies them with the local solver.

## Integration Boundary

The application-specific adapter is [generator.ts](./generator.ts):

```ts
import { generateClues } from './generator.js'

const result = generateClues(puzzle, main)
```

The application keeps its existing `Puzzle` model, which includes an authoritative solved row set. The external generator creates its own seeded solution, so `generator.ts` builds a value mapping that translates the external solution and its clues onto the application's supplied solution. This keeps the existing CLI, Markdown output, and local solver contracts unchanged.

The CLI entry point remains:

```sh
npm run cli -- generate magazines/_example_/kites.ts
```

## References

- Package: [`logic-puzzle-generator`](https://www.npmjs.com/package/logic-puzzle-generator)
- Source repository: [`joshhills/logic-puzzle-generator`](https://github.com/joshhills/logic-puzzle-generator)
