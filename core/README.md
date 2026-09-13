# Core Model

The `core` package contains the puzzle data model and validation needed before solving or generating clues.

## JSON Files

The app uses one typed TypeScript main file and one typed TypeScript data file per puzzle. Raw main and puzzle JSON can still be loaded with `loadMainJson` and `loadPuzzleJson`.

The main file is a catalog of categories that may be shared by puzzles:

```json
{
  "narrativeArch": "A weekend of small adventures.",
  "sharedCategories": [
    { "name": "People", "items": ["Ari", "Bea"] },
    { "name": "Days", "items": ["Monday", "Tuesday"] }
  ]
}
```

Each puzzle file references only the shared categories it needs. It can also define categories used only by that puzzle:

```json
{
  "name": "Places",
  "narration": "Match each person to a place.",
  "sharedCategories": ["People"],
  "localCategories": [{ "name": "Places", "items": ["Park", "Cafe"] }],
  "solution": [
    { "People": "Ari", "Places": "Park" },
    { "People": "Bea", "Places": "Cafe" }
  ],
  "options": {
    "difficulty": "easy",
    "maxClues": 3,
    "allowedClueTypes": ["positive", "negative"]
  }
}
```

A puzzle may use no shared categories if all of its categories are local. It still needs at least two total categories. Shared categories do not need to appear in every puzzle.

Puzzle data files can be imported directly when they are typed TypeScript modules, such as `examples/kites.ts`. Raw JSON puzzle files can be loaded with `loadPuzzleJson`.

Load the files separately:

```ts
import { loadMainJson, loadPuzzleJson } from './loader.js'

const main = loadMainJson(mainJsonText)
const puzzle = loadPuzzleJson(puzzleJsonText, main)
```

`loadPuzzleJson` verifies that every referenced shared category exists in the main file, then validates the puzzle using the referenced shared categories plus its local categories.

## Solver

The solver takes the categories used by a puzzle and structured clues. It searches the bijective assignments, stops after finding two solutions, and returns the solutions found plus a trace.

```ts
import { solve } from './solver.js'

const result = solve(categories, [
  {
    type: 'positive',
    pairing: {
      left: { category: 'People', item: 'Ari' },
      right: { category: 'Places', item: 'Park' },
    },
  },
])

const isUnique = result.count === 1
```

The current solver supports `positive`, `negative`, and `disjunction` constraints. The `cross-category` clue shape belongs to the upcoming clue catalog and positional extensions.

The clue catalog supports all four public clue types as structured data and provides static descriptions. Cross-category clues are cataloged and rendered, but are not yet accepted by the solver.

## Generator

`generateClues` enumerates deterministic positive, negative, and disjunction candidates from a solved puzzle. It greedily selects the candidate that reduces the solver's remaining solution count the most, stopping when exactly one solution remains or `maxClues` is reached.

```ts
import { generateClues } from './generator.js'

const result = generateClues(puzzle, main)
const isUnique = result.solutionCount === 1
```

Cross-category clues are currently cataloged but cannot be selected as the only allowed type because the solver does not evaluate them yet.

## Validation

The authoritative descriptions of `Main`, `Category`, `Puzzle`, `Solution`, `GenerationOptions`, `Difficulty`, and `ClueType` are the comments in [model.ts](./model.ts). Validation checks category references, item counts and duplicates, solution completeness, bijection across solution rows, and generation options. Invalid input throws an error with the failing field or relationship.
