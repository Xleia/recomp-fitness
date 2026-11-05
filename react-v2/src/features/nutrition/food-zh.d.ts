export interface FoodTranslation { zh: string; complete: boolean }
export function translateFoodName(name: string, code: string, category: string): FoodTranslation;
