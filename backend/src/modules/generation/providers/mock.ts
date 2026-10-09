import type { LifePeriod } from "@sffl/shared";
import sharp from "sharp";

import { ProviderError, type AiProvider, type GeneratePhotoInput } from "./types.js";

export type MockOptions = {
  delayMs: number;
  failureRate: number;
  faceCheck: "pass" | "reject";
  random?: () => number;
};

const WIDTH = 768;
const HEIGHT = 1024;

function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

const BADGE_MARGIN = 24;
const BADGE_PADDING = 18;
const LINE_HEIGHT = 34;
const MAX_LINE_CHARS = 26;

function fitLine(value: string): string {
  return value.length > MAX_LINE_CHARS ? `${value.slice(0, MAX_LINE_CHARS - 1)}…` : value;
}

// Label sits in the top-right corner so the caption bar on the story screen never covers it.
function overlay(lines: string[]): Buffer {
  const fitted = lines.map(fitLine);
  const longest = Math.max(...fitted.map((line) => line.length));
  const width = Math.min(WIDTH - BADGE_MARGIN * 2, Math.max(160, Math.round(longest * 17) + BADGE_PADDING * 2));
  const height = fitted.length * LINE_HEIGHT + BADGE_PADDING * 2 - 8;
  const right = WIDTH - BADGE_MARGIN - BADGE_PADDING;
  const text = fitted
    .map(
      (line, index) =>
        `<text x="${right}" y="${BADGE_MARGIN + BADGE_PADDING + 22 + index * LINE_HEIGHT}" text-anchor="end" font-family="DejaVu Sans, Arial, sans-serif" font-size="${index === 0 ? 24 : 26}" font-weight="700" fill="${index === 0 ? "#ffd533" : "#ffffff"}">${escapeXml(line)}</text>`
    )
    .join("");
  return Buffer.from(
    `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">` +
      `<rect x="${WIDTH - BADGE_MARGIN - width}" y="${BADGE_MARGIN}" width="${width}" height="${height}" rx="12" fill="#7a1115" fill-opacity="0.85"/>` +
      text +
      `</svg>`
  );
}

type Image = ReturnType<typeof sharp>;

function periodLook(image: Image, period: LifePeriod): Image {
  if (period === "YESTERDAY") return image.modulate({ saturation: 0.7, brightness: 1.05 }).tint({ r: 255, g: 230, b: 200 });
  if (period === "SOMEDAY") return image.modulate({ saturation: 0.45, brightness: 0.95 });
  return image;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Local/dev provider: no external calls and no cost. "Generates" a placeholder from the user's
 * own photo with the scene and age printed on it, after a configurable delay.
 */
export function createMockProvider(options: MockOptions): AiProvider {
  const random = options.random ?? Math.random;

  return {
    name: "mock",

    async checkFace() {
      return options.faceCheck === "pass" ? { ok: true } : { ok: false, reason: "NO_FACE" };
    },

    async generatePhoto(input: GeneratePhotoInput) {
      await sleep(options.delayMs);
      if (random() < options.failureRate) {
        throw new ProviderError("MOCK_FAILURE", true, "Simulated provider failure");
      }

      // Tint first, then add the label, so the label keeps its own colours.
      const tinted = await periodLook(sharp(input.sourceImage).resize(WIDTH, HEIGHT, { fit: "cover" }), input.label.period)
        .png()
        .toBuffer();
      const image = await sharp(tinted)
        .composite([
          {
            input: overlay(["MOCK", input.label.sceneTitle, `${input.label.targetAge} godina`])
          }
        ])
        .jpeg({ quality: 85 })
        .toBuffer();

      return { image, mimeType: "image/jpeg", costMicroUsd: 0 };
    }
  };
}
