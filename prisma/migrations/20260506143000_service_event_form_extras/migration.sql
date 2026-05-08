-- Form extras: performer, attachment intent flags, next-service reminder fields.

CREATE TYPE "ServicePerformedBy" AS ENUM ('SELF', 'SERVICE', 'OTHER');

ALTER TABLE "service_events"
  ADD COLUMN "performedBy" "ServicePerformedBy",
  ADD COLUMN "serviceProviderNote" TEXT,
  ADD COLUMN "attachReceiptRequested" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "attachFileRequested" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "nextReminderEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "nextReminderDate" TIMESTAMP(3),
  ADD COLUMN "nextReminderOdometer" INTEGER,
  ADD COLUMN "nextReminderEngineHours" INTEGER;
