export const LIFESTYLE_TRAITS = [
  { id: 'early_bird', label: 'Early Bird' },
  { id: 'night_owl', label: 'Night Owl' },
  { id: 'non_smoker', label: 'Non-Smoker' },
  { id: 'smoker', label: 'Smoker' },
  { id: 'pet_friendly', label: 'Pet Friendly' },
  { id: 'clean_freak', label: 'Clean Freak' },
  { id: 'messy', label: 'Messy' },
  { id: 'introvert', label: 'Introvert' },
  { id: 'extrovert', label: 'Extrovert' },
  { id: 'gym_rat', label: 'Gym Rat' },
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'non_vegetarian', label: 'Non-Vegetarian' },
  { id: 'teetotaler', label: 'Teetotaler' },
  { id: 'social_drinker', label: 'Social Drinker' },
  { id: 'wfh', label: 'WFH' },
  { id: 'student', label: 'Student' },
  { id: 'working_professional', label: 'Working Professional' },
];

export const BUDGET_RANGES: Record<string, { min: number; max: number }> = {
  '5000': { min: 5000, max: 10000 },
  '10000': { min: 10000, max: 15000 },
  '15000': { min: 15000, max: 20000 },
  '20000': { min: 20000, max: 999999 },
};
