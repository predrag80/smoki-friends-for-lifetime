import "dotenv/config";

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";

import { getAge } from "@sffl/shared";

import { parseEnv } from "../config/env.js";
import { PhotoRejectedError, prepareSourcePhoto } from "../lib/images.js";
import { buildPhotoPrompt } from "../modules/generation/prompt.js";
import { createGeminiProvider } from "../modules/generation/providers/gemini.js";
import { createMockProvider } from "../modules/generation/providers/mock.js";
import { loadProductReference } from "../modules/generation/product-reference.js";
import { ProviderError, type AiProvider, type GeneratePhotoInput } from "../modules/generation/providers/types.js";
import { nextRetryDelay } from "../modules/generation/retry.js";
import { parsePhotoName, planCases, type PocCase } from "../modules/poc/plan.js";
import { buildReport } from "../modules/poc/report.js";
import type { PocAttempt, PocPerson, PocRun } from "../modules/poc/results.js";

/**
 * Proof-of-concept run against the real image model.
 *   npm run poc:photos -w @sffl/backend -- [--provider gemini|mock] [--photos ../poc/photos]
 *       [--out ../poc/results] [--people 3] [--concurrency 1] [--model …] [--location …]
 *       [--product ../poc/smoki-pack.png]
 * Photos are named `name__1985.jpg` (birth year, optional `-MM` month). Nothing here touches the
 * database or storage; results and the HTML report go to the output folder (ignored by git).
 */
const { values: args } = parseArgs({
  options: {
    provider: { type: "string", default: "gemini" },
    photos: { type: "string", default: "../poc/photos" },
    out: { type: "string", default: "../poc/results" },
    people: { type: "string" },
    concurrency: { type: "string", default: "1" },
    product: { type: "string" },
    model: { type: "string" },
    location: { type: "string" },
    "skip-face-check": { type: "boolean", default: false }
  }
});

const env = parseEnv({
  ...process.env,
  AI_PROVIDER: args.provider,
  ...(args.model ? { GEMINI_IMAGE_MODEL: args.model } : {}),
  ...(args.location ? { GOOGLE_CLOUD_LOCATION: args.location } : {})
});

function createProvider(): AiProvider {
  if (args.provider === "mock") return createMockProvider({ delayMs: 300, failureRate: 0, faceCheck: "pass" });
  if (env.GEMINI_USE_VERTEX && !env.GOOGLE_CLOUD_PROJECT) throw new Error("Set GOOGLE_CLOUD_PROJECT in backend/.env");
  if (!env.GEMINI_USE_VERTEX && !env.GEMINI_API_KEY) throw new Error("Set GEMINI_USE_VERTEX=true or GEMINI_API_KEY in backend/.env");
  return createGeminiProvider(env);
}

const MAX_ATTEMPTS = 4;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function generate(
  provider: AiProvider,
  item: PocCase,
  currentAge: number,
  source: Buffer,
  productImage: GeneratePhotoInput["productImage"],
  dir: string,
  file: string
) {
  const prompt = buildPhotoPrompt({
    scenePrompt: item.scene.prompt,
    territory: item.scene.territory,
    period: item.period,
    targetAge: item.targetAge,
    currentAge,
    productReference: Boolean(productImage)
  });
  const base: Omit<PocAttempt, "status" | "ms" | "attempts"> = {
    id: `${item.period}-${item.targetAge}-${item.scene.id}`,
    period: item.period,
    targetAge: item.targetAge,
    sceneId: item.scene.id,
    sceneTitle: item.scene.title,
    territory: item.scene.territory,
    prompt
  };

  for (let attempt = 1; ; attempt += 1) {
    const started = Date.now();
    try {
      const result = await provider.generatePhoto({
        sourceImage: source,
        sourceMimeType: "image/jpeg",
        prompt,
        productImage,
        label: { sceneTitle: item.scene.title, targetAge: item.targetAge, period: item.period }
      });
      const ext = result.mimeType.includes("png") ? "png" : "jpg";
      const imageFile = `${file}/${base.id}.${ext}`;
      await writeFile(join(dir, imageFile), result.image);
      return { ...base, status: "ok", ms: Date.now() - started, attempts: attempt, imageFile } satisfies PocAttempt;
    } catch (error) {
      const providerError = error instanceof ProviderError ? error : null;
      const retryable = providerError ? providerError.retryable : true;
      // Quota errors are common on new projects: wait and retry instead of giving up.
      const attemptsAllowed = providerError?.code === "RATE_LIMITED" ? MAX_ATTEMPTS : 2;
      if (retryable && attempt < attemptsAllowed) {
        const wait = nextRetryDelay(error, attempt);
        console.log(`  ${base.id}: ${providerError?.code ?? "error"}, retry in ${Math.round(wait / 1000)} s`);
        await sleep(wait);
        continue;
      }
      return {
        ...base,
        status: providerError?.code === "BLOCKED" ? "blocked" : "error",
        code: providerError?.code ?? "UNEXPECTED",
        detail: providerError?.message ?? (error instanceof Error ? error.message : String(error)),
        ms: Date.now() - started,
        attempts: attempt
      } satisfies PocAttempt;
    }
  }
}

async function runPool<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
  const queue = [...items];
  await Promise.all(
    Array.from({ length: Math.max(1, limit) }, async () => {
      for (let item = queue.shift(); item !== undefined; item = queue.shift()) await worker(item);
    })
  );
}

async function main() {
  const provider = createProvider();
  const productImage = args.product ? await loadProductReference(resolve(args.product)) : undefined;
  const photosDir = resolve(args.photos);
  const files = (await readdir(photosDir)).filter((name) => parsePhotoName(name)).sort();
  const skipped = (await readdir(photosDir)).filter((name) => !name.startsWith(".") && !parsePhotoName(name));
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
    startedAt: new Date().toISOString(),
    people: []
  };
  const persist = async () => {
    await writeFile(join(outDir, "results.json"), JSON.stringify(run, null, 2));
    await writeFile(join(outDir, "report.html"), buildReport(run));
  };

  console.log(`Run ${runId}: ${selected.length} people, provider ${run.provider}, model ${run.imageModel} → ${outDir}`);

  for (const [index, fileName] of selected.entries()) {
    const parsed = parsePhotoName(fileName)!;
    const currentAge = getAge({ year: parsed.birthYear, month: parsed.birthMonth });
    const folder = `${String(index + 1).padStart(2, "0")}-${parsed.name}`;
    await mkdir(join(outDir, folder), { recursive: true });
    const person: PocPerson = { name: parsed.name, currentAge, faceCheck: "ok", attempts: [] };
    run.people.push(person);

    let source: Buffer;
    try {
      const prepared = await prepareSourcePhoto(await readFile(join(photosDir, fileName)), {
        minDimension: env.PHOTO_MIN_DIMENSION
      });
      source = prepared.buffer;
      person.sourceFile = `${folder}/source.jpg`;
      await writeFile(join(outDir, person.sourceFile), source);
    } catch (error) {
      person.faceCheck = error instanceof PhotoRejectedError ? error.code : "PHOTO_UNREADABLE";
      console.warn(`${parsed.name}: photo rejected (${person.faceCheck})`);
      await persist();
      continue;
    }

    if (!args["skip-face-check"]) {
      try {
        const check = await provider.checkFace(source, "image/jpeg");
        if (!check.ok) person.faceCheck = check.reason;
      } catch (error) {
        person.faceCheck = `FACE_CHECK_FAILED: ${error instanceof Error ? error.message : String(error)}`;
      }
      if (person.faceCheck !== "ok") {
        console.warn(`${parsed.name}: face check ${person.faceCheck}, skipping`);
        await persist();
        continue;
      }
    }

    const cases = planCases(currentAge, index);
    await runPool(cases, Number(args.concurrency), async (item) => {
      const result = await generate(provider, item, currentAge, source, productImage, outDir, folder);
      person.attempts.push(result);
      console.log(`  ${parsed.name} ${result.id}: ${result.status}${result.code ? ` (${result.code} ${result.detail ?? ""})` : ""} ${(result.ms / 1000).toFixed(1)}s`);
      await persist();
    });
    const order = cases.map((item) => `${item.period}-${item.targetAge}-${item.scene.id}`);
    person.attempts.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
    await persist();
  }

  run.finishedAt = new Date().toISOString();
  await persist();
  console.log(`Done. Open ${join(outDir, "report.html")}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
