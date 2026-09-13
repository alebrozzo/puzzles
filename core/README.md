# Core Model

The `core` package contains the puzzle data model and the validation needed before solving or generating clues.

## Main Types

A campaign contains shared categories and one or more narrated puzzles:

```ts
const campaign: Campaign = {
  title: 'Weekend Plans',
  backstory: 'A small group is choosing where to spend the afternoon.',
  sharedCategories: [{ name: 'People', items: ['Ari', 'Bea'] }],
  puzzles: [
    {
      narration: 'Match each person to a place.',
      puzzle: {
        name: 'Places',
        sharedCategories: ['People'],
        localCategories: [{ name: 'Places', items: ['Park', 'Cafe'] }],
        solution: [
          { People: 'Ari', Places: 'Park' },
          { People: 'Bea', Places: 'Cafe' },
        ],
        options: {
          difficulty: 'easy',
          maxClues: 3,
          allowedClueTypes: ['positive', 'negative'],
        },
      },
    },
  ],
};
```

### `Category`

A category has a unique name and up to six unique items. Shared categories are declared once on the campaign and referenced by name from puzzles. Puzzle-specific categories are placed in `localCategories`.

```ts
interface Category {
  name: string;
  items: string[];
}
```

### `Solution`

A solution is an array of rows. Each row contains exactly one item from every puzzle category. Across all rows, every item in each category must appear exactly once.

```ts
type SolutionRow = Record<string, string>;
type Solution = SolutionRow[];
```

### `GenerationOptions`

These options control clue generation globally for a puzzle:

```ts
interface GenerationOptions {
  difficulty: Difficulty;
  maxClues: number;
  allowedClueTypes: ClueType[];
}
```

`difficulty` is one of `easy`, `medium`, or `hard`. `maxClues` is a positive integer limit.

## Clue Types

`ClueType` identifies the logical relationship expressed by a generated clue:

```ts
type ClueType = 'positive' | 'negative' | 'disjunction' | 'cross-category';
```

- **`positive`**: states that two items are paired. Example: “Ari visited the Park.”
- **`negative`**: states that two items are not paired. Example: “Bea did not visit the Park.”
- **`disjunction`**: gives alternatives, asserting that at least one of two pairings is true. Example: “Ari visited either the Park or the Cafe.”
- **`cross-category`**: relates items through a third category or a relationship between category assignments. Example: “The person at the Park chose tea, not coffee.”

Clues are currently represented by the type name and operands in the planned clue catalog. Their natural-language descriptions will be rendered separately so solving logic does not depend on display text.

## Loading JSON

Use `loadCampaignJson` to parse and validate campaign JSON before passing it to the solver:

```ts
import { loadCampaignJson } from './loader.js';

const campaign = loadCampaignJson(jsonText);
```

Validation checks category references, item counts and duplicates, solution completeness, bijection across solution rows, and generation options. Invalid input throws an error with the failing field or relationship.
