-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "creditsRemaining" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "creditsTotal" INTEGER NOT NULL DEFAULT 0;
