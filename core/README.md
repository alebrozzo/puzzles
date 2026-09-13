# Core Model

The `core` package contains the puzzle data model and validation needed before solving or generating clues.

## JSON Files

The app uses one main JSON file and one JSON file per puzzle.

The main file is a catalog of categories that may be shared by puzzles:

```json
{
  "narrativeArch": "A weekend of small adventures.",
  "sharedCategories": [
    { "name": "People", "items": ["Ari", "Bea"] },
    { "name": "Days", "items": ["Monday", "Tuesday"] }
  ],
  "puzzles": [
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

The main file can contain the puzzle definitions in its `puzzles` array. A separate puzzle JSON file can also be loaded with `loadPuzzleJson` when puzzles are stored independently.

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

## Main Types

### `Main`

The main narrative and shared category catalog, plus the puzzles that belong to it:

```ts
interface Main {
  narrativeArch: string
  sharedCategories: Category[]
  puzzles: Puzzle[]
}
```

### `Category`

A category has a unique name and up to six unique items:

```ts
interface Category {
  name: string
  items: string[]
}
```

### `Puzzle`

A standalone puzzle references shared category names and owns its local categories:

```ts
interface Puzzle {
  name: string
  narration: string
  sharedCategories: string[]
  localCategories: Category[]
  solution: Solution
  options: GenerationOptions
}
```

### `Solution`

A solution is an array of rows. Each row contains exactly one item from every category used by the puzzle. Across all rows, every item in each category must appear exactly once.

```ts
type SolutionRow = Record<string, string>
type Solution = SolutionRow[]
```

### `GenerationOptions`

These options control clue generation globally for a puzzle:

```ts
interface GenerationOptions {
  difficulty: Difficulty
  maxClues: number
  allowedClueTypes: ClueType[]
}
```

`difficulty` is one of `easy`, `medium`, or `hard`. `maxClues` is a positive integer limit.

## Clue Types

`ClueType` identifies the logical relationship expressed by a generated clue:

```ts
type ClueType = 'positive' | 'negative' | 'disjunction' | 'cross-category'
```

- **`positive`**: states that two items are paired. Example: “Ari visited the Park.”
- **`negative`**: states that two items are not paired. Example: “Bea did not visit the Park.”
- **`disjunction`**: gives alternatives, asserting that at least one of two pairings is true. Example: “Ari visited either the Park or the Cafe.”
- **`cross-category`**: relates items through a third category or a relationship between category assignments. Example: “The person at the Park chose tea, not coffee.”

Clues are currently represented by the type name and operands in the planned clue catalog. Their natural-language descriptions will be rendered separately so solving logic does not depend on display text.

## Validation

Validation checks category references, item counts and duplicates, solution completeness, bijection across solution rows, and generation options. Invalid input throws an error with the failing field or relationship.
