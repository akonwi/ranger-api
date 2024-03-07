/*
  Warnings:

  - A unique constraint covering the columns `[houseId,choreId,week]` on the table `Assignment` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Assignment_houseId_choreId_week_key" ON "Assignment"("houseId", "choreId", "week");
