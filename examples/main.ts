import type { Category, Main } from '../core/model.js'

export type KidName = 'Amelia' | 'Bonifacio' | 'Fausto' | 'Guadalupe'
export type KidAge = '5 years' | '6 years' | '7 years' | '8 years'
export type SharedCategoryName = 'NAME' | 'AGE'

export interface MainCategory<
  Name extends SharedCategoryName,
  Item extends string,
> extends Category {
  name: Name
  items: Item[]
}

export interface TypedMain extends Omit<Main, 'sharedCategories'> {
  sharedCategories: [MainCategory<'NAME', KidName>, MainCategory<'AGE', KidAge>]
}

export const main: TypedMain = {
  narrativeArch:
    'These children often meet at the park in their neighborhood to play together.',
  sharedCategories: [
    {
      name: 'NAME',
      items: ['Amelia', 'Bonifacio', 'Fausto', 'Guadalupe'],
    },
    {
      name: 'AGE',
      items: ['5 years', '6 years', '7 years', '8 years'],
    },
  ],
}
