-- AlterEnum
ALTER TYPE "MediaKind" ADD VALUE 'AGED_PORTRAIT';

-- AlterTable
ALTER TABLE "MediaAsset" ADD COLUMN "faceTraits" TEXT;

-- CreateTable
CREATE TABLE "AgedPortrait" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceAssetId" TEXT NOT NULL,
    "targetAge" INTEGER NOT NULL,
    "assetId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgedPortrait_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AgedPortrait_assetId_key" ON "AgedPortrait"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "AgedPortrait_sourceAssetId_targetAge_key" ON "AgedPortrait"("sourceAssetId", "targetAge");

-- AddForeignKey
ALTER TABLE "AgedPortrait" ADD CONSTRAINT "AgedPortrait_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgedPortrait" ADD CONSTRAINT "AgedPortrait_sourceAssetId_fkey" FOREIGN KEY ("sourceAssetId") REFERENCES "MediaAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgedPortrait" ADD CONSTRAINT "AgedPortrait_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "MediaAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
