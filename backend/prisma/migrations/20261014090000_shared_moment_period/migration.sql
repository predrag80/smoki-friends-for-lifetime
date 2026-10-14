-- AlterTable
ALTER TABLE "SharedMoment" ADD COLUMN "period" "LifePeriod" NOT NULL DEFAULT 'TODAY',
ADD COLUMN "yearsOffset" INTEGER NOT NULL DEFAULT 0;
