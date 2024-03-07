-- AlterEnum
ALTER TYPE "Frequency" ADD VALUE 'CUSTOM';

-- AlterTable
ALTER TABLE "Chore" ADD COLUMN     "customFrequency" INTEGER;
