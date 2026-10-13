-- CreateEnum
CREATE TYPE "SharedMomentStatus" AS ENUM ('WAITING', 'PHOTO_PENDING', 'PHOTO_READY', 'FAILED');

-- CreateEnum
CREATE TYPE "InviteChannel" AS ENUM ('EMAIL', 'USERNAME');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELED', 'EXPIRED');

-- AlterEnum
ALTER TYPE "GenerationJobType" ADD VALUE 'SHARED_PHOTO';

-- AlterTable
ALTER TABLE "User" ADD COLUMN "username" TEXT;

-- AlterTable
ALTER TABLE "GenerationJob" ADD COLUMN "manual" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "sharedMomentId" TEXT;

-- CreateTable
CREATE TABLE "SharedMoment" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "status" "SharedMomentStatus" NOT NULL DEFAULT 'WAITING',
    "photoAssetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SharedMoment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SharedParticipant" (
    "id" TEXT NOT NULL,
    "sharedMomentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SharedParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SharedInvite" (
    "id" TEXT NOT NULL,
    "sharedMomentId" TEXT NOT NULL,
    "channel" "InviteChannel" NOT NULL,
    "email" TEXT,
    "inviteeUserId" TEXT,
    "tokenHash" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "SharedInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "GenerationJob_sharedMomentId_idx" ON "GenerationJob"("sharedMomentId");

-- CreateIndex
CREATE UNIQUE INDEX "SharedMoment_ownerId_key" ON "SharedMoment"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "SharedMoment_photoAssetId_key" ON "SharedMoment"("photoAssetId");

-- CreateIndex
CREATE INDEX "SharedParticipant_userId_idx" ON "SharedParticipant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SharedParticipant_sharedMomentId_userId_key" ON "SharedParticipant"("sharedMomentId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "SharedInvite_tokenHash_key" ON "SharedInvite"("tokenHash");

-- CreateIndex
CREATE INDEX "SharedInvite_sharedMomentId_status_idx" ON "SharedInvite"("sharedMomentId", "status");

-- CreateIndex
CREATE INDEX "SharedInvite_inviteeUserId_status_idx" ON "SharedInvite"("inviteeUserId", "status");

-- CreateIndex
CREATE INDEX "SharedInvite_email_status_idx" ON "SharedInvite"("email", "status");

-- AddForeignKey
ALTER TABLE "GenerationJob" ADD CONSTRAINT "GenerationJob_sharedMomentId_fkey" FOREIGN KEY ("sharedMomentId") REFERENCES "SharedMoment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedMoment" ADD CONSTRAINT "SharedMoment_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedMoment" ADD CONSTRAINT "SharedMoment_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedMoment" ADD CONSTRAINT "SharedMoment_photoAssetId_fkey" FOREIGN KEY ("photoAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedParticipant" ADD CONSTRAINT "SharedParticipant_sharedMomentId_fkey" FOREIGN KEY ("sharedMomentId") REFERENCES "SharedMoment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedParticipant" ADD CONSTRAINT "SharedParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedInvite" ADD CONSTRAINT "SharedInvite_sharedMomentId_fkey" FOREIGN KEY ("sharedMomentId") REFERENCES "SharedMoment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedInvite" ADD CONSTRAINT "SharedInvite_inviteeUserId_fkey" FOREIGN KEY ("inviteeUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
