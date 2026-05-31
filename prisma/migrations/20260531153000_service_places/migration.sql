-- CreateEnum
CREATE TYPE "ServicePlaceType" AS ENUM ('ORGANIZATION', 'ADDRESS', 'CUSTOM');

-- CreateTable
CREATE TABLE "service_places" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerPlaceId" TEXT,
    "type" "ServicePlaceType" NOT NULL DEFAULT 'ADDRESS',
    "title" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "contactPhone" TEXT,
    "contactUrl" TEXT,
    "category" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_places_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "service_events"
ADD COLUMN "servicePlaceId" TEXT,
ADD COLUMN "servicePlaceSnapshot" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "service_places_userId_provider_providerPlaceId_key" ON "service_places"("userId", "provider", "providerPlaceId");

-- CreateIndex
CREATE INDEX "service_places_userId_title_idx" ON "service_places"("userId", "title");

-- CreateIndex
CREATE INDEX "service_places_userId_address_idx" ON "service_places"("userId", "address");

-- CreateIndex
CREATE INDEX "service_events_servicePlaceId_idx" ON "service_events"("servicePlaceId");

-- AddForeignKey
ALTER TABLE "service_places"
ADD CONSTRAINT "service_places_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_events"
ADD CONSTRAINT "service_events_servicePlaceId_fkey"
FOREIGN KEY ("servicePlaceId") REFERENCES "service_places"("id") ON DELETE SET NULL ON UPDATE CASCADE;
