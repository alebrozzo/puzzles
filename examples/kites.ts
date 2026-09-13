import type { ClueType, Puzzle } from '../core/model.js'
import type { KidAge, KidName, SharedCategoryName } from './main.js'

export type KitesShape = 'Bicycle' | 'Car' | 'Motorcycle' | 'Train'
export type KitesColor = 'Blue' | 'Black' | 'Pink' | 'Green'
export type KitesCategoryName = SharedCategoryName | 'SHAPE' | 'COLOR'

export interface KitesSolutionRow extends Record<string, string> {
  NAME: KidName
  AGE: KidAge
  SHAPE: KitesShape
  COLOR: KitesColor
}

export interface KitesCategory<
  Name extends KitesCategoryName,
  Item extends string,
> {
  name: Name
  items: Item[]
}

export interface KitesPuzzle extends Omit<
  Puzzle,
  'sharedCategories' | 'localCategories' | 'solution'
> {
  sharedCategories: SharedCategoryName[]
  localCategories: [
    KitesCategory<'SHAPE', KitesShape>,
    KitesCategory<'COLOR', KitesColor>,
  ]
  solution: KitesSolutionRow[]
  options: {
    difficulty: 'hard'
    maxClues: number
    allowedClueTypes: ClueType[]
  }
}

export const kitesPuzzle: KitesPuzzle = {
  name: 'Kites',
  narration: 'Today they are flying their kites.',
  sharedCategories: ['NAME', 'AGE'],
  localCategories: [
    {
      name: 'SHAPE',
      items: ['Bicycle', 'Car', 'Motorcycle', 'Train'],
    },
    {
      name: 'COLOR',
      items: ['Blue', 'Black', 'Pink', 'Green'],
    },
  ],
  solution: [
    {
      NAME: 'Amelia',
      AGE: '6 years',
      SHAPE: 'Car',
      COLOR: 'Green',
    },
    {
      NAME: 'Bonifacio',
      AGE: '8 years',
      SHAPE: 'Train',
      COLOR: 'Pink',
    },
    {
      NAME: 'Fausto',
      AGE: '5 years',
      SHAPE: 'Motorcycle',
      COLOR: 'Black',
    },
    {
      NAME: 'Guadalupe',
      AGE: '7 years',
      SHAPE: 'Bicycle',
      COLOR: 'Blue',
    },
  ],
  options: {
    difficulty: 'hard',
    maxClues: 40,
    allowedClueTypes: ['positive', 'negative', 'disjunction', 'cross-category'],
  },
}
