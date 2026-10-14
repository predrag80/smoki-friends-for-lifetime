import { getPeriodAgeRange, getSceneAgeRange, pickRandomAge, type LifePeriod } from "@sffl/shared";

export type MomentChoice = {
  period: LifePeriod;
  targetAge: number;
  currentAge: number;
  scene: { minAge: number; maxAge: number; isActive: boolean } | null;
};

export type MomentChoiceError = "PERIOD_NOT_AVAILABLE" | "AGE_OUT_OF_PERIOD_RANGE" | "SCENE_NOT_AVAILABLE";

/** Server-side check of the period, age slider value and scene the user picked. */
export function checkMomentChoice(choice: MomentChoice): MomentChoiceError | null {
  const range = getPeriodAgeRange(choice.period, choice.currentAge);
  if (!range) return "PERIOD_NOT_AVAILABLE";
  if (choice.targetAge < range.min || choice.targetAge > range.max) return "AGE_OUT_OF_PERIOD_RANGE";
  if (
    !choice.scene ||
    !choice.scene.isActive ||
    choice.targetAge < choice.scene.minAge ||
    choice.targetAge > choice.scene.maxAge
  ) {
    return "SCENE_NOT_AVAILABLE";
  }
  return null;
}

/**
 * Age shown on a moment's photo: kept when it still fits the period and scene (regenerate), otherwise a random
 * age inside both ranges. The user no longer picks the age (agreed 2026-10-14).
 */
export function chooseMomentAge(input: {
  period: LifePeriod;
  currentAge: number;
  scene: { minAge: number; maxAge: number; isActive: boolean } | null;
  keepAge?: number;
  random?: () => number;
}): { age: number } | { error: MomentChoiceError } {
  if (!getPeriodAgeRange(input.period, input.currentAge)) return { error: "PERIOD_NOT_AVAILABLE" };
  if (!input.scene || !input.scene.isActive) return { error: "SCENE_NOT_AVAILABLE" };
  const range = getSceneAgeRange(input.period, input.currentAge, input.scene);
  if (!range) return { error: "SCENE_NOT_AVAILABLE" };
  if (input.keepAge !== undefined && input.keepAge >= range.min && input.keepAge <= range.max) return { age: input.keepAge };
  return { age: pickRandomAge(range, input.random) };
}
