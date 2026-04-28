ALTER TABLE "expense_items"
  ADD COLUMN "odometer" INTEGER,
  ADD COLUMN "engineHours" INTEGER;

UPDATE "expense_items" ei
SET
  "odometer" = se."odometer",
  "engineHours" = se."engineHours"
FROM "service_events" se
WHERE ei."serviceEventId" = se."id";
