import type {
  Campaign,
  Category,
  ClueType,
  Difficulty,
  Puzzle,
} from './model.js';

const MAX_ITEMS = 6;
const difficulties = new Set<Difficulty>(['easy', 'medium', 'hard']);
const clueTypes = new Set<ClueType>([
  'positive',
  'negative',
  'disjunction',
  'cross-category',
]);

export function loadCampaignJson(input: string): Campaign {
  let value: unknown;

  try {
    value = JSON.parse(input);
  } catch {
    throw new Error('Campaign JSON is invalid.');
  }

  return validateCampaign(value);
}

function validateCampaign(value: unknown): Campaign {
  const object = asObject(value, 'Campaign');
  const sharedCategories = asCategories(
    object.sharedCategories,
    'sharedCategories',
  );
  const sharedNames = new Set(
    sharedCategories.map((category) => category.name),
  );
  const puzzles = asArray(object.puzzles, 'puzzles').map((entry, index) => {
    const puzzleEntry = asObject(entry, `puzzles[${index}]`);
    const puzzle = validatePuzzle(
      puzzleEntry.puzzle,
      sharedNames,
      sharedCategories,
    );

    return {
      narration: asString(puzzleEntry.narration, `puzzles[${index}].narration`),
      puzzle,
    };
  });

  return {
    title: asString(object.title, 'title'),
    backstory: asString(object.backstory, 'backstory'),
    sharedCategories,
    puzzles,
  };
}

function validatePuzzle(
  value: unknown,
  sharedNames: Set<string>,
  sharedCategories: Category[],
): Puzzle {
  const object = asObject(value, 'puzzle');
  const sharedCategoryNames = asStringArray(
    object.sharedCategories,
    'puzzle.sharedCategories',
  );
  const localCategories = asCategories(
    object.localCategories,
    'puzzle.localCategories',
  );
  const categories = [
    ...sharedCategoryNames.map((name) => {
      const category = sharedCategories.find(
        (candidate) => candidate.name === name,
      );
      if (!category) {
        throw new Error(
          `puzzle.sharedCategories references unknown category '${name}'.`,
        );
      }
      return category;
    }),
    ...localCategories,
  ];

  if (categories.length < 2) {
    throw new Error('A puzzle must contain at least two categories.');
  }

  const categoryNames = new Set<string>();
  for (const category of categories) {
    if (categoryNames.has(category.name)) {
      throw new Error(
        `Puzzle category '${category.name}' is declared more than once.`,
      );
    }
    categoryNames.add(category.name);
  }

  const solution = asArray(object.solution, 'puzzle.solution').map(
    (row, index) => {
      const solutionRow = asObject(row, `puzzle.solution[${index}]`);
      const keys = Object.keys(solutionRow).sort();
      const expectedKeys = [...categoryNames].sort();
      if (keys.join('\0') !== expectedKeys.join('\0')) {
        throw new Error(
          `puzzle.solution[${index}] must contain every puzzle category exactly once.`,
        );
      }

      for (const category of categories) {
        const item = asString(
          solutionRow[category.name],
          `puzzle.solution[${index}].${category.name}`,
        );
        if (!category.items.includes(item)) {
          throw new Error(
            `puzzle.solution[${index}] uses unknown item '${item}' in category '${category.name}'.`,
          );
        }
      }

      return solutionRow as Record<string, string>;
    },
  );

  validateSolutionRows(solution, categories);

  const options = asObject(object.options, 'puzzle.options');
  const difficulty = asString(
    options.difficulty,
    'puzzle.options.difficulty',
  ) as Difficulty;
  if (!difficulties.has(difficulty)) {
    throw new Error(`Unsupported difficulty '${difficulty}'.`);
  }

  const maxClues = asNumber(options.maxClues, 'puzzle.options.maxClues');
  if (!Number.isInteger(maxClues) || maxClues < 1) {
    throw new Error('puzzle.options.maxClues must be a positive integer.');
  }

  const allowedClueTypes = asStringArray(
    options.allowedClueTypes,
    'puzzle.options.allowedClueTypes',
  ) as ClueType[];
  for (const clueType of allowedClueTypes) {
    if (!clueTypes.has(clueType)) {
      throw new Error(`Unsupported clue type '${clueType}'.`);
    }
  }

  return {
    name: asString(object.name, 'puzzle.name'),
    sharedCategories: sharedCategoryNames,
    localCategories,
    solution,
    options: { difficulty, maxClues, allowedClueTypes },
  };
}

function validateSolutionRows(
  solution: Record<string, string>[],
  categories: Category[],
): void {
  const expectedRowCount = categories[0].items.length;
  if (
    categories.some((category) => category.items.length !== expectedRowCount)
  ) {
    throw new Error(
      'All puzzle categories must contain the same number of items.',
    );
  }
  if (solution.length !== expectedRowCount) {
    throw new Error(
      `puzzle.solution must contain exactly ${expectedRowCount} rows.`,
    );
  }

  for (const category of categories) {
    const values = solution.map((row) => row[category.name]);
    if (new Set(values).size !== values.length) {
      throw new Error(
        `puzzle.solution repeats an item in category '${category.name}'.`,
      );
    }
  }
}

function asObject(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${path} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function asArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`${path} must be an array.`);
  }
  return value;
}

function asString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${path} must be a non-empty string.`);
  }
  return value;
}

function asStringArray(value: unknown, path: string): string[] {
  return asArray(value, path).map((item, index) =>
    asString(item, `${path}[${index}]`),
  );
}

function asNumber(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${path} must be a number.`);
  }
  return value;
}

function asCategories(value: unknown, path: string): Category[] {
  const categories = asArray(value, path).map((entry, index) => {
    const category = asObject(entry, `${path}[${index}]`);
    const items = asStringArray(category.items, `${path}[${index}].items`);
    if (items.length === 0 || items.length > MAX_ITEMS) {
      throw new Error(
        `${path}[${index}].items must contain between 1 and ${MAX_ITEMS} items.`,
      );
    }
    if (new Set(items).size !== items.length) {
      throw new Error(`${path}[${index}].items must not contain duplicates.`);
    }
    return { name: asString(category.name, `${path}[${index}].name`), items };
  });

  if (
    new Set(categories.map((category) => category.name)).size !==
    categories.length
  ) {
    throw new Error(`${path} must not contain duplicate category names.`);
  }
  return categories;
}
