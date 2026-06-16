export const LIFESTYLE_TRAITS = [
  { id: 'early_bird', label: 'Early Bird', icon: '🌅' },
  { id: 'night_owl', label: 'Night Owl', icon: '🦉' },
  { id: 'non_smoker', label: 'Non-Smoker', icon: '🚭' },
  { id: 'smoker', label: 'Smoker', icon: '🚬' },
  { id: 'pet_friendly', label: 'Pet Friendly', icon: '🐾' },
  { id: 'clean_freak', label: 'Clean Freak', icon: '✨' },
  { id: 'messy', label: 'Messy', icon: '🌪️' },
  { id: 'introvert', label: 'Introvert', icon: '🎧' },
  { id: 'extrovert', label: 'Extrovert', icon: '🎉' },
  { id: 'gym_rat', label: 'Gym Rat', icon: '🏋️' },
  { id: 'vegetarian', label: 'Vegetarian', icon: '🥗' },
  { id: 'non_vegetarian', label: 'Non-Vegetarian', icon: '🍗' },
  { id: 'teetotaler', label: 'Teetotaler', icon: '💧' },
  { id: 'social_drinker', label: 'Social Drinker', icon: '🍻' },
  { id: 'wfh', label: 'WFH', icon: '💻' },
  { id: 'student', label: 'Student', icon: '📚' },
  { id: 'working_professional', label: 'Working Professional', icon: '💼' },
];

export const BUDGET_RANGES: Record<string, { min: number; max: number }> = {
  '5000': { min: 5000, max: 10000 },
  '10000': { min: 10000, max: 15000 },
  '15000': { min: 15000, max: 20000 },
  '20000': { min: 20000, max: 999999 },
};
