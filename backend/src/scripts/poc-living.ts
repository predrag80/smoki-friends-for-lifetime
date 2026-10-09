import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

import { buildReport } from "../modules/poc/report.js";
import type { PocRun } from "../modules/poc/results.js";

const run = promisify(execFile);

/**
 * Fallback "living photo" for moments without an AI video: slow push-in with fade in/out (ffmpeg).
 *   npm run poc:living -w @sffl/backend -- ../poc/results/<runId>
 * Adds an MP4 next to every generated image and refreshes report.html.
 */
const SECONDS = 6;
const FPS = 30;

function livingPhotoFilter(seconds = SECONDS, fps = FPS): string {
  const frames = seconds * fps;
  return [
    "scale=1536:2048:force_original_aspect_ratio=increase,crop=1536:2048",
    `zoompan=z='min(1+0.12*on/${frames},1.12)':x='iw/2-(iw/zoom/2)':y='ih/2.4-(ih/zoom/2.4)':d=${frames}:s=768x1024:fps=${fps}`,
    "eq=saturation=1.04",
    `fade=t=in:st=0:d=0.6,fade=t=out:st=${seconds - 0.6}:d=0.6`,
    "format=yuv420p"
  ].join(",");
}

async function main() {
  const dir = resolve(process.argv[2] ?? "");
  const data = JSON.parse(await readFile(join(dir, "results.json"), "utf8")) as PocRun;

  for (const person of data.people) {
    for (const item of person.attempts) {
      if (item.status !== "ok" || !item.imageFile) continue;
      const videoFile = item.imageFile.replace(/\.(png|jpg)$/, ".mp4");
      await run("ffmpeg", [
        "-y", "-loglevel", "error", "-loop", "1", "-i", join(dir, item.imageFile),
        "-vf", livingPhotoFilter(), "-t", String(SECONDS), "-r", String(FPS),
        "-c:v", "libx264", "-crf", "20", "-preset", "medium", "-movflags", "+faststart", join(dir, videoFile)
      ]);
      item.videoFile = videoFile;
      console.log(`  ${videoFile}`);
    }
  }

  await writeFile(join(dir, "results.json"), JSON.stringify(data, null, 2));
  await writeFile(join(dir, "report.html"), buildReport(data));
  console.log(`Done. Open ${join(dir, "report.html")}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
