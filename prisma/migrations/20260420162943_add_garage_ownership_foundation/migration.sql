-- AlterTable
ALTER TABLE "users" ADD COLUMN     "displayName" TEXT,
ALTER COLUMN "email" DROP NOT NULL;

-- AlterTable
ALTER TABLE "vehicles" ADD COLUMN     "garageId" TEXT;

-- CreateTable
CREATE TABLE "garages" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "garages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "garages_ownerUserId_idx" ON "garages"("ownerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "garages_ownerUserId_title_key" ON "garages"("ownerUserId", "title");

-- CreateIndex
CREATE INDEX "vehicles_garageId_idx" ON "vehicles"("garageId");

-- AddForeignKey
ALTER TABLE "garages" ADD CONSTRAINT "garages_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_garageId_fkey" FOREIGN KEY ("garageId") REFERENCES "garages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
