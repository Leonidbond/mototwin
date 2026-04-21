-- AlterTable
ALTER TABLE "user_settings" ADD COLUMN     "vehicleTrashRetentionDays" INTEGER NOT NULL DEFAULT 30;

-- AlterTable
ALTER TABLE "vehicles" ADD COLUMN     "trashExpiresAt" TIMESTAMP(3),
ADD COLUMN     "trashedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "vehicles_trashedAt_idx" ON "vehicles"("trashedAt");

-- CreateIndex
CREATE INDEX "vehicles_trashExpiresAt_idx" ON "vehicles"("trashExpiresAt");

-- CreateIndex
CREATE INDEX "vehicles_garageId_trashedAt_idx" ON "vehicles"("garageId", "trashedAt");
