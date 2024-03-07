-- CreateTable
CREATE TABLE "Invite" (
    "email" TEXT NOT NULL,
    "houseId" TEXT NOT NULL,

    CONSTRAINT "Invite_pkey" PRIMARY KEY ("email")
);

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_houseId_fkey" FOREIGN KEY ("houseId") REFERENCES "House"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
