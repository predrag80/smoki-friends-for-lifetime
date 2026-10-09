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

function overlay(lines: string[]): Buffer {
  const text = lines
    .map(
      (line, index) =>
        `<text x="40" y="${HEIGHT - 150 + index * 44}" font-family="DejaVu Sans, Arial, sans-serif" font-size="${index === 0 ? 30 : 36}" font-weight="700" fill="${index === 0 ? "#ffd533" : "#ffffff"}">${escapeXml(line)}</text>`
    )
    .join("");
  return Buffer.from(
    `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">` +
      `<rect x="0" y="${HEIGHT - 210}" width="${WIDTH}" height="210" fill="#7a1115" fill-opacity="0.85"/>` +
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

      const base = periodLook(sharp(input.sourceImage).resize(WIDTH, HEIGHT, { fit: "cover" }), input.label.period);
      const image = await base
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
