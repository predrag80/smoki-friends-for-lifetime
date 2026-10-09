import type { LifePeriod, Territory } from "@sffl/shared";

export type PromptInput = {
  scenePrompt: string;
  territory: Territory;
  period: LifePeriod;
  targetAge: number;
  currentAge: number;
};

const territoryMood: Record<Territory, string> = {
  RELAXING: "calm, cosy and personal",
  SOCIALIZING: "warm, friendly and full of genuine laughter",
  SPORT_CHEERING: "energetic, passionate and joyful"
};

function ageInstruction(targetAge: number, currentAge: number): string {
  if (targetAge === currentAge) return `Keep the person at their current age of ${targetAge}.`;
  const direction = targetAge < currentAge ? "younger" : "older";
  return (
    `Show the person at age ${targetAge} (${Math.abs(currentAge - targetAge)} years ${direction} than in the reference photo), ` +
    `with believable age-appropriate changes to skin, hair and face shape, clothing and style typical for someone of ${targetAge}.`
  );
}

/** Internal prompt for the image model. Users never see it. */
export function buildPhotoPrompt(input: PromptInput): string {
  return [
    "Create one photorealistic, natural-looking photograph of the same person as in the reference image.",
    "Preserve their identity: facial structure, eye colour, skin tone and distinctive features must stay recognisable.",
    ageInstruction(input.targetAge, input.currentAge),
    `Scene: ${input.scenePrompt}.`,
    `Mood: ${territoryMood[input.territory]}.`,
    "The Smoki peanut snack package (yellow and red bag) appears naturally in the scene, never as an advertisement.",
    "Other people in the scene are fictional and must not resemble real or famous people.",
    "Style: candid documentary photo, soft natural light, 3:4 portrait framing, the person clearly visible.",
    "Family-friendly. No text, captions, watermarks or other brands."
  ].join(" ");
}
