ALTER TABLE "service_events"
  ADD COLUMN "installLocationAddress" TEXT,
  ADD COLUMN "installLocationLat" DOUBLE PRECISION,
  ADD COLUMN "installLocationLng" DOUBLE PRECISION;
