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
  /** Facial traits that stay recognisable at any age (from describeFace). */
  identityTraits?: string;
  /** True when a portrait of the person at the target age is sent right after the source photo. */
  agedPortraitReference?: boolean;
  /** Medium close-up so the face is large in the frame (helps likeness for other ages). */
  closeFraming?: boolean;
  /** The aged portrait is the FIRST reference (exact face); the photo of today is the second (identity details). */
  portraitPrimary?: boolean;
  /** Gentle expression and a face turned to the camera: big laughs and profiles distort the features most. */
  calmExpression?: boolean;
};

const ORDINALS = ["first", "second", "third", "fourth", "fifth"];

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

function productInstruction(placement: string | undefined, position: number): string {
  return (
    `The ${ORDINALS[position - 1]} reference image shows a snack package: reproduce it faithfully (shape, colours, logo and printing), never invent other packaging, ` +
    `and place it ${placement ?? "naturally in the scene"}. It is a natural part of the moment, never held up or presented to the camera ` +
    "like an advertisement; the person looks at the others or the scene, not posing with the product."
  );
}

/** Internal prompt for the image model. Users never see it. */
export function buildPhotoPrompt(input: PromptInput): string {
  const productReference = input.productReference ?? false;
  const year = momentYear(input.targetAge, input.currentAge, input.now);
  // Reference images: 1 = the person today, then an optional aged portrait, then an optional packshot.
  let next = 2;
  const portraitPosition = input.agedPortraitReference && !input.portraitPrimary ? next++ : null;
  const todayPosition = input.portraitPrimary ? next++ : null;
  const productPosition = productReference ? next++ : null;
  const opening = input.portraitPrimary
    ? [
        `Create one photorealistic, natural-looking photograph of the person in the first reference image, who is ${input.targetAge} years old there.`,
        "Their face must be identical to that portrait: same face shape, eyes, eyebrows, nose, mouth, ears and hairline; only the expression, " +
          "lighting and angle may change.",
        `The ${ORDINALS[(todayPosition ?? 2) - 1]} reference image shows the same person today, aged ${input.currentAge}; use it only to confirm identity details, ` +
          "never to make the person look older."
      ]
    : [
        "Create one photorealistic, natural-looking photograph of the same person as in the first reference image.",
        "Preserve their identity: facial structure, eye colour, skin tone and distinctive features must stay recognisable."
      ];
  return [
    ...opening,
    ...(portraitPosition
      ? [
          `The ${ORDINALS[portraitPosition - 1]} reference image shows this same person at age ${input.targetAge}: ` +
            "use it as the exact face for this photo, and the first image to keep identity details."
        ]
      : []),
    ...(input.identityTraits ? [`Stable facial traits of this person, to keep at any age: ${input.identityTraits}.`] : []),
    ageInstruction(input.targetAge, input.currentAge),
    ...(input.calmExpression
      ? [
          input.territory === "SPORT_CHEERING"
            ? "The person may cheer and show joy, but the face stays turned towards the camera, eyes open and clearly visible, " +
              "never hidden by hands or in profile."
            : "The person has a gentle, natural smile (no wide open-mouth laugh), eyes open and clearly visible, " +
              "face towards the camera or at most a slight three-quarter angle, not in profile."
        ]
      : []),
    input.closeFraming
      ? "Medium close-up: the person is the main subject in the centre and foreground, the face large in the frame, in sharp focus and well lit; others are partly visible and secondary."
      : "The person is the main subject: in the centre of the frame and in the foreground (never at the edge), in sharp focus, face clearly visible and well lit; everyone else is secondary.",
    "Dress the person in everyday clothes that fit the scene, the season, their age and the year; do not copy the clothing or any printed text from the reference photo.",
    `Scene: ${input.scenePrompt}.`,
    eraInstruction(input.period, year),
    companionsInstruction(input.targetAge),
    `Mood: ${territoryMood[input.territory]}.`,
    ...(productPosition ? [productInstruction(input.productPlacement, productPosition)] : []),
    "Other people in the scene are fictional and must not resemble real or famous people.",
    "No logos, labels or brand names on bottles, cans, drinks, food, clothing, devices or anywhere else" +
      (productReference ? " (except the snack package from the reference image)" : "") +
      "; drinks are in plain glasses or plain unlabelled bottles.",
    "No date stamp or timestamp printed on the photo.",
    "Neutral decorative text in the local language that belongs to the scene (for example a birthday banner) is allowed; no captions, watermarks or other text.",
    "3:4 portrait framing. Family-friendly."
  ].join(" ");
}

/**
 * Step 1 of two-step generation: a neutral portrait of the person at the target age, so the model spends all its
 * effort on the face. The portrait is then sent as a reference for the scene.
 */
export function buildAgedPortraitPrompt(input: {
  targetAge: number;
  currentAge: number;
  identityTraits?: string;
  now?: Date;
}): string {
  const year = momentYear(input.targetAge, input.currentAge, input.now);
  return [
    "Create one photorealistic head-and-shoulders portrait of the same person as in the reference image.",
    "Preserve their identity: facial structure, eye shape and colour, nose, ears, skin tone and distinctive marks must stay recognisable.",
    ...(input.identityTraits ? [`Stable facial traits of this person, to keep at any age: ${input.identityTraits}.`] : []),
    ageInstruction(input.targetAge, input.currentAge),
    `Hairstyle and simple plain clothing typical for ${year} in ${REGION}.`,
    "Facing the camera, relaxed natural expression, plain light grey background, soft even daylight, sharp focus.",
    "No text, logos or other people. Family-friendly."
  ].join(" ");
}

/** "Zajednički trenutak": everyone at their current age, one reference photo per person (in this order). */
export function buildSharedPhotoPrompt(input: {
  scenePrompt: string;
  territory: Territory;
  /** Current age of each person, in the order of the reference images. */
  ages: number[];
  productReference?: boolean;
  productPlacement?: string;
}): string {
  const count = input.ages.length;
  const productReference = input.productReference ?? false;
  const people = input.ages
    .map((age, index) => `the ${ORDINALS[index]} reference image shows person ${index + 1}, aged ${age} (${lifeStage(age)})`)
    .join("; ");
  return [
    `Create one photorealistic, natural-looking photograph of ${count} people together: ${people}.`,
    `All ${count} people appear exactly once, side by side as one group, each with the face from their own reference image: ` +
      "same face shape, eyes, eyebrows, nose, mouth, ears, hairline and skin tone. Never merge, swap or average faces, and never add a second copy of anyone.",
    "Everyone keeps their current age as in their reference image.",
    "All of them are in the foreground and in sharp focus, faces turned towards the camera or at most a slight three-quarter angle, " +
      "eyes open and clearly visible, gentle natural smiles; nobody is cut off by the frame or hidden behind someone else.",
    "Dress everyone in everyday clothes that fit the scene, the season and their age; do not copy the clothing or any printed text from the reference photos.",
    `Scene: ${input.scenePrompt}.`,
    eraInstruction("TODAY", new Date().getUTCFullYear()),
    `Mood: ${territoryMood[input.territory]}, a real moment shared by friends.`,
    ...(productReference ? [productInstruction(input.productPlacement, count + 1)] : []),
    "If anyone else is in the scene, they are few, in the background, out of focus, fictional and must not resemble real or famous people.",
    "No logos, labels or brand names on bottles, cans, drinks, food, clothing, devices or anywhere else" +
      (productReference ? " (except the snack package from the reference image)" : "") +
      "; drinks are in plain glasses or plain unlabelled bottles.",
    "No date stamp or timestamp printed on the photo.",
    "Neutral decorative text in the local language that belongs to the scene (for example a birthday banner) is allowed; no captions, watermarks or other text.",
    "3:4 portrait framing. Family-friendly."
  ].join(" ");
}
