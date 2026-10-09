import type { LifePeriod, Territory } from "@sffl/shared";

export type PromptInput = {
  scenePrompt: string;
  territory: Territory;
  period: LifePeriod;
  targetAge: number;
  currentAge: number;
  /** Where the package goes; used only together with `productReference`. */
  productPlacement?: string;
  /** True when a packshot of the real Smoki package is sent as the second reference image. */
  productReference?: boolean;
  /** Reference date for the calendar year of the moment (defaults to now). */
  now?: Date;
};

const territoryMood: Record<Territory, string> = {
  RELAXING: "calm, cosy and personal",
  SOCIALIZING: "warm, friendly and full of genuine laughter",
  SPORT_CHEERING: "energetic, passionate and joyful"
};

const REGION = "Central and Southeast Europe (Serbia, Bosnia and Herzegovina, Croatia, North Macedonia, Austria)";

function lifeStage(age: number): string {
  if (age < 13) return "a child";
  if (age < 18) return "a teenager";
  if (age < 30) return "a young adult";
  if (age < 60) return "an adult";
  return "an older adult";
}

/** Calendar year in which the person is `targetAge`. */
export function momentYear(targetAge: number, currentAge: number, now: Date = new Date()): number {
  return now.getUTCFullYear() - (currentAge - targetAge);
}

function ageInstruction(targetAge: number, currentAge: number): string {
  const stage = lifeStage(targetAge);
  const unmistakable =
    `The person must unmistakably look ${targetAge} years old (${stage} of ${targetAge}` +
    (targetAge < 18 ? ", not an adult" : "") +
    ").";
  if (targetAge === currentAge) return `Keep the person at their current age of ${targetAge}. ${unmistakable}`;
  const direction = targetAge < currentAge ? "younger" : "older";
  return (
    `Show the person at age ${targetAge} (${Math.abs(currentAge - targetAge)} years ${direction} than in the reference photo), ` +
    `with believable age-appropriate changes to skin, hair, face shape and body. ${unmistakable}`
  );
}

function eraInstruction(period: LifePeriod, year: number): string {
  if (period === "YESTERDAY") {
    const look =
      year < 2005
        ? "the look of a colour film photograph from a family album of that time (film colours, slight grain, on-camera flash indoors)"
        : "the look of an early digital camera photo of that time";
    return (
      `The moment takes place around ${year} in ${REGION}: clothing, hairstyles, furniture, interiors, cars and technology ` +
      `(TVs, phones, game consoles) are typical for ${year} there, with nothing from later years. Photo style: ${look}.`
    );
  }
  if (period === "SOMEDAY") {
    return `The moment takes place around ${year} in ${REGION}: a believable, familiar everyday setting, not science fiction. Photo style: candid, natural modern photo.`;
  }
  return `The moment takes place today in ${REGION}. Photo style: candid documentary photo, soft natural light.`;
}

function companionsInstruction(targetAge: number): string {
  return (
    `Friends, partners, classmates and teammates in the scene are about the same age as the person (around ${targetAge}, ` +
    "within a few years). Only family members explicitly mentioned in the scene may belong to another generation."
  );
}

function productInstruction(placement: string | undefined): string {
  return (
    "The second reference image shows a snack package: reproduce it faithfully (shape, colours, logo and printing), never invent other packaging, " +
    `and place it ${placement ?? "naturally in the scene"}. It is a natural part of the moment, never held up or presented to the camera ` +
    "like an advertisement; the person looks at the others or the scene, not posing with the product."
  );
}

/** Internal prompt for the image model. Users never see it. */
export function buildPhotoPrompt(input: PromptInput): string {
  const productReference = input.productReference ?? false;
  const year = momentYear(input.targetAge, input.currentAge, input.now);
  return [
    "Create one photorealistic, natural-looking photograph of the same person as in the first reference image.",
    "Preserve their identity: facial structure, eye colour, skin tone and distinctive features must stay recognisable.",
    ageInstruction(input.targetAge, input.currentAge),
    "The person is the main subject: in the centre of the frame and in the foreground (never at the edge), in sharp focus, face clearly visible and well lit; everyone else is secondary.",
    "Dress the person in everyday clothes that fit the scene, the season, their age and the year; do not copy the clothing or any printed text from the reference photo.",
    `Scene: ${input.scenePrompt}.`,
    eraInstruction(input.period, year),
    companionsInstruction(input.targetAge),
    `Mood: ${territoryMood[input.territory]}.`,
    ...(productReference ? [productInstruction(input.productPlacement)] : []),
    "Other people in the scene are fictional and must not resemble real or famous people.",
    "No logos or brand names on drinks, food, clothing, devices or anywhere else" +
      (productReference ? " (except the snack package from the reference image)" : "") +
      "; drinks are in plain glasses or unlabelled bottles.",
    "Neutral decorative text in the local language that belongs to the scene (for example a birthday banner) is allowed; no captions, watermarks or other text.",
    "3:4 portrait framing. Family-friendly."
  ].join(" ");
}
