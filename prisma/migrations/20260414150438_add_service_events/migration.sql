-- CreateTable
CREATE TABLE "service_events" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "node" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "odometer" INTEGER NOT NULL,
    "engineHours" INTEGER,
    "serviceType" TEXT NOT NULL,
    "installedPartsJson" JSONB,
    "costAmount" DOUBLE PRECISION,
    "currency" TEXT,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_events_vehicleId_idx" ON "service_events"("vehicleId");

-- AddForeignKey
ALTER TABLE "service_events" ADD CONSTRAINT "service_events_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
