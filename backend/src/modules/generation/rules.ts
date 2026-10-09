import { getPeriodAgeRange, type LifePeriod } from "@sffl/shared";

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
