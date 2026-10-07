import "dotenv/config";

import { sceneCatalog } from "@sffl/shared";

import { prisma } from "../lib/prisma.js";

/**
 * Idempotent seed: upserts the v1 scene catalog and its Serbian copy.
 * Other locales fall back to Serbian until client translations are delivered.
 */
async function seedScenes() {
  for (const scene of sceneCatalog) {
    await prisma.scene.upsert({
      where: { id: scene.id },
      create: {
        id: scene.id,
        territory: scene.territory,
        sortOrder: scene.sortOrder,
        minAge: scene.minAge,
        maxAge: scene.maxAge
      },
      update: {
        territory: scene.territory,
        sortOrder: scene.sortOrder,
        minAge: scene.minAge,
        maxAge: scene.maxAge
      }
    });

    await prisma.sceneTranslation.upsert({
      where: { sceneId_locale: { sceneId: scene.id, locale: "sr" } },
      create: { sceneId: scene.id, locale: "sr", title: scene.title, description: scene.description },
      update: { title: scene.title, description: scene.description }
    });
  }

  console.log(`Seeded ${sceneCatalog.length} scenes.`);
}

seedScenes()
  .catch((error) => {
    console.error("Seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
