/*
  Warnings:

  - Made the column `isArchived` on table `Chore` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Chore" ALTER COLUMN "isArchived" SET NOT NULL;
