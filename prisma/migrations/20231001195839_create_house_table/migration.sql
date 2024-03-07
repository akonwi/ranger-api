-- CreateTable
CREATE TABLE "House" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "memberIds" TEXT[],

    CONSTRAINT "House_pkey" PRIMARY KEY ("id")
);
