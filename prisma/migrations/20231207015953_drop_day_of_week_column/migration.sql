/*
  Warnings:

  - You are about to drop the column `dayOfWeek` on the `Chore` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Chore" DROP COLUMN "dayOfWeek";

-- DropEnum
DROP TYPE "Day";
