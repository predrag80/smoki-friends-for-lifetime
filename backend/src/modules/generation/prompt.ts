import type { LifePeriod, Territory } from "@sffl/shared";

export type PromptInput = {
  scenePrompt: string;
  territory: Territory;
  period: LifePeriod;
  targetAge: number;
  currentAge: number;
  /** True when a packshot of the real Smoki package is sent as the second reference image. */
  productReference?: boolean;
};

const territoryMood: Record<Territory, string> = {
  RELAXING: "calm, cosy and personal",
  SOCIALIZING: "warm, friendly and full of genuine laughter",
  SPORT_CHEERING: "energetic, passionate and joyful"
};

function lifeStage(age: number): string {
  if (age < 13) return "a child";
  if (age < 18) return "a teenager";
  if (age < 30) return "a young adult";
  if (age < 60) return "an adult";
  return "an older adult";
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

function companionsInstruction(targetAge: number): string {
  return (
    `Friends, partners, classmates and teammates in the scene are about the same age as the person (around ${targetAge}, ` +
    "within a few years). Only family members explicitly mentioned in the scene may belong to another generation."
  );
}

function productInstruction(productReference: boolean): string {
  const look = productReference
    ? "The second reference image shows the real Smoki package: reproduce it faithfully (shape, colours, logo and printing) and never invent other packaging."
    : "The Smoki peanut snack package is a yellow and red bag.";
  return (
    `${look} The package is a natural part of the moment (on the table, in a bowl, being shared or eaten from), ` +
    "never held up or presented to the camera like an advertisement; the person looks at the others or the scene, not posing with the product."
  );
}

/** Internal prompt for the image model. Users never see it. */
export function buildPhotoPrompt(input: PromptInput): string {
  const productReference = input.productReference ?? false;
  return [
    "Create one photorealistic, natural-looking photograph of the same person as in the first reference image.",
    "Preserve their identity: facial structure, eye colour, skin tone and distinctive features must stay recognisable.",
    ageInstruction(input.targetAge, input.currentAge),
    "The person is the main subject: in the foreground, in sharp focus, face clearly visible and well lit; everyone else is secondary.",
    "Dress the person in everyday clothes that fit the scene, the season and their age; do not copy the clothing or any printed text from the reference photo.",
    `Scene: ${input.scenePrompt}.`,
    companionsInstruction(input.targetAge),
    `Mood: ${territoryMood[input.territory]}.`,
    productInstruction(productReference),
    "Other people in the scene are fictional and must not resemble real or famous people.",
    "Style: candid documentary photo, soft natural light, 3:4 portrait framing.",
    "Family-friendly. No text, captions, watermarks or other brands; the only printing allowed is on the Smoki package."
  ].join(" ");
}
