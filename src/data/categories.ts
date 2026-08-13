export const CATEGORIES = [
  'All',
  'Wedding',
  'Bar Mitzvah',
  'Bat Mitzvah',
  'Bris',
  'Sheva Brachot',
  'Thank You',
] as const

export type CategoryFilter = (typeof CATEGORIES)[number]
