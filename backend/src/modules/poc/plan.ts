import {
  getPeriodAgeRange,
  isSceneAvailableAtAge,
  sceneCatalog,
  territories,
  type LifePeriod,
  type SceneDefinition
} from "@sffl/shared";

/**
 * Proof-of-concept test plan: which (period, age, scene) combinations to generate for one person.
 * About 8 images per person: a child and a teenager for "Juče", today in two territories,
 * and two ages for "Sutra".
 */
export type PocCase = {
  period: LifePeriod;
  targetAge: number;
  scene: SceneDefinition;
};

const YESTERDAY_AGES = [8, 15, 25];
const SOMEDAY_EXTRA_YEARS = 15;
const SIGNATURE_CHILD_SCENE = "house-birthday";

function pickScenes(age: number, count: number, offset: number, preferred?: string): SceneDefinition[] {
  const picked: SceneDefinition[] = [];
  const preferredScene = sceneCatalog.find((scene) => scene.id === preferred);
  if (preferredScene && isSceneAvailableAtAge(preferredScene, age)) picked.push(preferredScene);

  for (let step = 0; picked.length < count && step < territories.length * 6; step += 1) {
    const territory = territories[(offset + step) % territories.length];
    const options = sceneCatalog
      .filter((scene) => scene.territory === territory && isSceneAvailableAtAge(scene, age))
      .filter((scene) => !picked.some((chosen) => chosen.id === scene.id))
      .filter((scene) => !picked.some((chosen) => chosen.territory === scene.territory) || step >= territories.length);
    const scene = options[(offset + age) % Math.max(options.length, 1)];
    if (scene) picked.push(scene);
  }
  return picked.slice(0, count);
}

export function planCases(currentAge: number, personIndex = 0): PocCase[] {
  const cases: PocCase[] = [];

  const yesterday = getPeriodAgeRange("YESTERDAY", currentAge);
  if (yesterday) {
    const ages = YESTERDAY_AGES.filter((age) => age >= yesterday.min && age <= yesterday.max).slice(0, 2);
    ages.forEach((age, index) => {
      const preferred = index === 0 ? SIGNATURE_CHILD_SCENE : undefined;
      for (const scene of pickScenes(age, 2, personIndex + index, preferred)) {
        cases.push({ period: "YESTERDAY", targetAge: age, scene });
      }
    });
  }

  for (const scene of pickScenes(currentAge, 2, personIndex + 1)) {
    cases.push({ period: "TODAY", targetAge: currentAge, scene });
  }

  const someday = getPeriodAgeRange("SOMEDAY", currentAge);
  if (someday) {
    const ages = [...new Set([someday.min, Math.min(someday.min + SOMEDAY_EXTRA_YEARS, someday.max)])];
    ages.forEach((age, index) => {
      for (const scene of pickScenes(age, 1, personIndex + index + 2)) {
        cases.push({ period: "SOMEDAY", targetAge: age, scene });
      }
    });
  }

  return cases;
}

/** Test photos are named `name__1985.jpg` or `name__1985-06.jpg` (birth year and optional month). */
export function parsePhotoName(fileName: string): { name: string; birthYear: number; birthMonth: number } | null {
  const match = /^(.+?)__(\d{4})(?:-(\d{1,2}))?\.(jpe?g|png|webp)$/i.exec(fileName);
  if (!match) return null;
  const month = match[3] ? Number(match[3]) : 6;
  if (month < 1 || month > 12) return null;
  return { name: match[1], birthYear: Number(match[2]), birthMonth: month };
}
