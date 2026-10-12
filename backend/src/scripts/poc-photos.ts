import "dotenv/config";

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";

import { getAge, lifePeriods, type LifePeriod } from "@sffl/shared";

import { parseEnv } from "../config/env.js";
import { PhotoRejectedError, prepareSourcePhoto } from "../lib/images.js";
import { loadProductReference } from "../modules/generation/product-reference.js";
import { buildAgedPortraitPrompt, buildPhotoPrompt } from "../modules/generation/prompt.js";
import { createGeminiProvider } from "../modules/generation/providers/gemini.js";
import { createMockProvider } from "../modules/generation/providers/mock.js";
import { ProviderError, type AiProvider, type GeneratePhotoInput, type ImageInput } from "../modules/generation/providers/types.js";
import { nextRetryDelay } from "../modules/generation/retry.js";
import { parsePhotoName, planCases, type PocCase } from "../modules/poc/plan.js";
import { buildReport } from "../modules/poc/report.js";
import type { PocAttempt, PocPerson, PocRun } from "../modules/poc/results.js";

/**
 * Proof-of-concept run against the real image model.
 *   npm run poc:photos -w @sffl/backend -- [--provider gemini|mock] [--photos ../poc/photos] [--out ../poc/results]
 *       [--people 3] [--periods YESTERDAY,TODAY,SOMEDAY] [--variants A,B,C,D] [--pro-model gemini-3-pro-image]
 *       [--model …] [--location …] [--product ../poc/smoki-pack.png] [--no-judge] [--skip-face-check]
 * Variants (likeness experiment):
 *   A  current app prompt
 *   B  A + stable facial traits + medium close-up
 *   C  B + two steps: first a portrait at the target age, then the scene with that portrait as a reference
 *   D  C with the Pro image model
 *   E  C with the portrait as the primary reference, a calm expression, a strict check against the portrait and
 *      a second candidate when that check scores below 7 (the better one is kept)
 * Photos are named `name__1985.jpg` (birth year, optional `-MM` month). Nothing here touches the database or
 * storage; results and the HTML report go to the output folder (ignored by git).
 */
const { values: args } = parseArgs({
  options: {
    provider: { type: "string", default: "gemini" },
    photos: { type: "string", default: "../poc/photos" },
    out: { type: "string", default: "../poc/results" },
    people: { type: "string" },
    periods: { type: "string", default: "YESTERDAY,TODAY,SOMEDAY" },
    variants: { type: "string", default: "A" },
    "pro-model": { type: "string", default: "gemini-3-pro-image" },
    product: { type: "string" },
    model: { type: "string" },
    location: { type: "string" },
    "no-judge": { type: "boolean", default: false },
    "skip-face-check": { type: "boolean", default: false }
  }
});

const env = parseEnv({
  ...process.env,
  AI_PROVIDER: args.provider,
  ...(args.model ? { GEMINI_IMAGE_MODEL: args.model } : {}),
  ...(args.location ? { GOOGLE_CLOUD_LOCATION: args.location } : {})
});

type Variant = {
  id: string;
  traits: boolean;
  close: boolean;
  portrait: boolean;
  portraitPrimary?: boolean;
  calm?: boolean;
  /** Generate a second candidate when the strict portrait score is below this value. */
  retryBelow?: number;
  model?: string;
  note: string;
};

const VARIANTS: Record<string, Variant> = {
  A: { id: "A", traits: false, close: false, portrait: false, note: "sadašnji prompt" },
  B: { id: "B", traits: true, close: true, portrait: false, note: "+ crte lica + krupniji kadar" },
  C: { id: "C", traits: true, close: true, portrait: true, note: "+ portret u ciljanim godinama (2 koraka)" },
  D: { id: "D", traits: true, close: true, portrait: true, model: args["pro-model"], note: "C sa Pro modelom" },
  E: {
    id: "E",
    traits: true,
    close: true,
    portrait: true,
    portraitPrimary: true,
    calm: true,
    retryBelow: 7,
    note: "C + portret kao glavna referenca + smiren izraz + bolja od 2 ako je sličnost sa portretom < 7"
  }
};

function createProvider(): AiProvider {
  if (args.provider === "mock") return createMockProvider({ delayMs: 300, failureRate: 0, faceCheck: "pass" });
  if (env.GEMINI_USE_VERTEX && !env.GOOGLE_CLOUD_PROJECT) throw new Error("Set GOOGLE_CLOUD_PROJECT in backend/.env");
  if (!env.GEMINI_USE_VERTEX && !env.GEMINI_API_KEY) throw new Error("Set GEMINI_USE_VERTEX=true or GEMINI_API_KEY in backend/.env");
  return createGeminiProvider(env);
}

const MAX_ATTEMPTS = 4;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Calls the provider with quota-aware retries; returns the error instead of throwing. */
async function withRetries<T>(label: string, task: () => Promise<T>): Promise<{ value?: T; error?: unknown; attempts: number }> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return { value: await task(), attempts: attempt };
    } catch (error) {
      const providerError = error instanceof ProviderError ? error : null;
      const retryable = providerError ? providerError.retryable : true;
      const allowed = providerError?.code === "RATE_LIMITED" ? MAX_ATTEMPTS : 2;
      if (!retryable || attempt >= allowed) return { error, attempts: attempt };
      const wait = nextRetryDelay(error, attempt);
      console.log(`  ${label}: ${providerError?.code ?? "error"}, retry in ${Math.round(wait / 1000)} s`);
      await sleep(wait);
    }
  }
}

function describeError(error: unknown) {
  const providerError = error instanceof ProviderError ? error : null;
  return {
    status: (providerError?.code === "BLOCKED" ? "blocked" : "error") as "blocked" | "error",
    code: providerError?.code ?? "UNEXPECTED",
    detail: providerError?.message ?? (error instanceof Error ? error.message : String(error))
  };
}

const extensionFor = (mimeType: string) => (mimeType.includes("png") ? "png" : mimeType.includes("webp") ? "webp" : "jpg");

async function main() {
  const provider = createProvider();
  const productImage = args.product ? await loadProductReference(resolve(args.product)) : undefined;
  const variants = args.variants.split(",").map((id) => id.trim().toUpperCase()).filter(Boolean);
  for (const id of variants) if (!VARIANTS[id]) throw new Error(`Unknown variant ${id} (use A,B,C,D,E)`);
  const periods = args.periods.split(",").map((period) => period.trim().toUpperCase()) as LifePeriod[];
  for (const period of periods) if (!lifePeriods.includes(period)) throw new Error(`Unknown period ${period}`);
  const judge = !args["no-judge"];

  const photosDir = resolve(args.photos);
  const names = await readdir(photosDir);
  const files = names.filter((name) => parsePhotoName(name)).sort();
  const skipped = names.filter((name) => !name.startsWith(".") && !parsePhotoName(name));
  if (skipped.length) console.warn(`Skipping (expected name__1985.jpg): ${skipped.join(", ")}`);
  const selected = args.people ? files.slice(0, Number(args.people)) : files;
  if (selected.length === 0) throw new Error(`No photos found in ${photosDir}`);

  const runId = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outDir = resolve(args.out, runId);
  await mkdir(outDir, { recursive: true });

  const run: PocRun = {
    runId,
    provider: provider.name,
    imageModel: args.provider === "mock" ? "mock" : env.GEMINI_IMAGE_MODEL,
    location: env.GEMINI_USE_VERTEX ? env.GOOGLE_CLOUD_LOCATION : "gemini-api",
    productReference: args.product ? args.product.split("/").pop() : undefined,
    variants,
    variantNotes: Object.fromEntries(
      variants.map((id) => [id, VARIANTS[id].note + (VARIANTS[id].model ? ` (${VARIANTS[id].model})` : "")])
    ),
    startedAt: new Date().toISOString(),
    people: []
  };
  const persist = async () => {
    await writeFile(join(outDir, "results.json"), JSON.stringify(run, null, 2));
    await writeFile(join(outDir, "report.html"), buildReport(run));
  };

  console.log(`Run ${runId}: ${selected.length} people, variants ${variants.join(",")}, periods ${periods.join(",")} → ${outDir}`);

  for (const [index, fileName] of selected.entries()) {
    const parsed = parsePhotoName(fileName)!;
    const currentAge = getAge({ year: parsed.birthYear, month: parsed.birthMonth });
    const folder = `${String(index + 1).padStart(2, "0")}-${parsed.name}`;
    await mkdir(join(outDir, folder), { recursive: true });
    const person: PocPerson = { name: parsed.name, currentAge, faceCheck: "ok", attempts: [], portraits: [] };
    run.people.push(person);

    let source: Buffer;
    try {
      const prepared = await prepareSourcePhoto(await readFile(join(photosDir, fileName)), { minDimension: env.PHOTO_MIN_DIMENSION });
      source = prepared.buffer;
      person.sourceFile = `${folder}/source.jpg`;
      await writeFile(join(outDir, person.sourceFile), source);
    } catch (error) {
      person.faceCheck = error instanceof PhotoRejectedError ? error.code : "PHOTO_UNREADABLE";
      console.warn(`${parsed.name}: photo rejected (${person.faceCheck})`);
      await persist();
      continue;
    }
    const sourceImage: ImageInput = { data: source, mimeType: "image/jpeg" };

    if (!args["skip-face-check"]) {
      const check = await withRetries(`${parsed.name} face check`, () => provider.checkFace(source, "image/jpeg"));
      person.faceCheck = check.value ? (check.value.ok ? "ok" : check.value.reason) : `FACE_CHECK_FAILED: ${describeError(check.error).detail}`;
      if (person.faceCheck !== "ok") {
        console.warn(`${parsed.name}: face check ${person.faceCheck}, skipping`);
        await persist();
        continue;
      }
    }

    if (variants.some((id) => VARIANTS[id].traits)) {
      const traits = await withRetries(`${parsed.name} traits`, () => provider.describeFace(source, "image/jpeg"));
      person.traits = traits.value ?? "";
      console.log(`  ${parsed.name} traits: ${person.traits || "(none)"}`);
    }

    // Step 1 portraits, made once per (variant, age) and reused for every scene of that age.
    const portraits = new Map<string, ImageInput | null>();
    const portraitFor = async (variant: Variant, targetAge: number): Promise<ImageInput | null> => {
      // Shared by every variant using the same model (C and E compare only the scene step).
      const key = `${variant.model ? variant.id : "osnovni"}-${targetAge}`;
      if (portraits.has(key)) return portraits.get(key)!;
      const started = Date.now();
      const result = await withRetries(`${parsed.name} portrait ${key}`, () =>
        provider.generatePhoto({
          sourceImage: source,
          sourceMimeType: "image/jpeg",
          prompt: buildAgedPortraitPrompt({ targetAge, currentAge, identityTraits: person.traits }),
          model: variant.model,
          label: { sceneTitle: "Portret", targetAge, period: "YESTERDAY" }
        })
      );
      if (!result.value) {
        person.portraits!.push({ variant: key.split("-")[0], targetAge, status: "error", detail: describeError(result.error).detail, ms: Date.now() - started });
        portraits.set(key, null);
        return null;
      }
      const file = `${folder}/portrait-${key}.${extensionFor(result.value.mimeType)}`;
      await writeFile(join(outDir, file), result.value.image);
      person.portraits!.push({ variant: key.split("-")[0], targetAge, status: "ok", file, ms: Date.now() - started });
      const image = { data: result.value.image, mimeType: result.value.mimeType };
      portraits.set(key, image);
      return image;
    };

    const cases = planCases(currentAge, index).filter((item) => periods.includes(item.period));
    for (const item of cases) {
      for (const id of variants) {
        const variant = VARIANTS[id];
        const caseOptions = { provider, variant, item, currentAge, sourceImage, productImage, person, portraitFor };
        let attempt = await generateCase(caseOptions);
        const portrait = variant.portrait ? await portraitFor(variant, item.targetAge) : null;
        const scoreImage = async (image: ImageInput) => {
          const today = await withRetries(`${parsed.name} judge ${attempt.id}`, () =>
            provider.rateLikeness({ reference: sourceImage, generated: image, targetAge: item.targetAge, currentAge })
          );
          const vsPortrait = portrait
            ? await withRetries(`${parsed.name} judge-portrait ${attempt.id}`, () =>
                provider.rateLikeness({ reference: portrait, generated: image, targetAge: item.targetAge, currentAge: item.targetAge })
              )
            : null;
          return { likeness: today.value, portraitLikeness: vsPortrait?.value };
        };
        if (attempt.status === "ok" && judge && attempt.imageData) {
          let scores = await scoreImage(attempt.imageData);
          attempt.result.candidates = 1;
          if (variant.retryBelow && scores.portraitLikeness !== undefined && scores.portraitLikeness < variant.retryBelow) {
            console.log(`  ${parsed.name} ${attempt.id}: portrait likeness ${scores.portraitLikeness}/10, trying a second candidate`);
            const second = await generateCase(caseOptions);
            if (second.status === "ok" && second.imageData) {
              const secondScores = await scoreImage(second.imageData);
              if ((secondScores.portraitLikeness ?? 0) > (scores.portraitLikeness ?? 0)) {
                second.result.ms += attempt.result.ms;
                attempt = second;
                scores = secondScores;
              }
            }
            attempt.result.candidates = 2;
          }
          attempt.result.likeness = scores.likeness;
          attempt.result.portraitLikeness = scores.portraitLikeness;
        }
        if (attempt.imageData) {
          attempt.result.imageFile = `${folder}/${attempt.id}.${extensionFor(attempt.imageData.mimeType)}`;
          await writeFile(join(outDir, attempt.result.imageFile), attempt.imageData.data);
        }
        person.attempts.push(attempt.result);
        const r = attempt.result;
        console.log(
          `  ${parsed.name} ${r.id}: ${r.status}${r.code ? ` (${r.code} ${r.detail ?? ""})` : ""} ${(r.ms / 1000).toFixed(1)}s` +
            (r.likeness ? ` likeness ${r.likeness}/10` : "") +
            (r.portraitLikeness ? ` vs portrait ${r.portraitLikeness}/10` : "")
        );
        await persist();
      }
    }
  }

  run.finishedAt = new Date().toISOString();
  await persist();
  console.log(`Done. Open ${join(outDir, "report.html")}`);
}

async function generateCase(options: {
  provider: AiProvider;
  variant: Variant;
  item: PocCase;
  currentAge: number;
  sourceImage: ImageInput;
  productImage: GeneratePhotoInput["productImage"];
  person: PocPerson;
  portraitFor: (variant: Variant, targetAge: number) => Promise<ImageInput | null>;
}): Promise<{ id: string; status: PocAttempt["status"]; result: PocAttempt; imageData?: ImageInput }> {
  const { provider, variant, item, currentAge, sourceImage, productImage, person } = options;
  const id = `${variant.id}-${item.period}-${item.targetAge}-${item.scene.id}`;
  const portrait = variant.portrait ? await options.portraitFor(variant, item.targetAge) : null;
  const portraitFirst = Boolean(portrait && variant.portraitPrimary);
  const prompt = buildPhotoPrompt({
    scenePrompt: item.scene.prompt,
    territory: item.scene.territory,
    period: item.period,
    targetAge: item.targetAge,
    currentAge,
    productReference: Boolean(productImage),
    productPlacement: item.scene.productPlacement,
    identityTraits: variant.traits ? person.traits : undefined,
    closeFraming: variant.close,
    agedPortraitReference: Boolean(portrait),
    portraitPrimary: portraitFirst,
    calmExpression: variant.calm
  });
  const base = {
    id,
    variant: variant.id,
    period: item.period,
    targetAge: item.targetAge,
    sceneId: item.scene.id,
    sceneTitle: item.scene.title,
    territory: item.scene.territory,
    prompt
  };
  const started = Date.now();
  const result = await withRetries(`${person.name} ${id}`, () =>
    provider.generatePhoto({
      // E sends the portrait first (exact face) and today's photo second; C sends them the other way round.
      sourceImage: portraitFirst ? portrait!.data : sourceImage.data,
      sourceMimeType: portraitFirst ? portrait!.mimeType : sourceImage.mimeType,
      personReferences: portrait ? [portraitFirst ? sourceImage : portrait] : undefined,
      productImage,
      model: variant.model,
      prompt,
      label: { sceneTitle: `${variant.id} · ${item.scene.title}`, targetAge: item.targetAge, period: item.period }
    })
  );
  const ms = Date.now() - started;
  if (!result.value) {
    const failure = describeError(result.error);
    return { id, status: failure.status, result: { ...base, ...failure, ms, attempts: result.attempts } };
  }
  return {
    id,
    status: "ok",
    result: { ...base, status: "ok", ms, attempts: result.attempts },
    imageData: { data: result.value.image, mimeType: result.value.mimeType }
  };
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
