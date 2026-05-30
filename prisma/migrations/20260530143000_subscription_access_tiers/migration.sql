-- Subscription access tiers: FREE / RIDER / PRO
-- Adds trial window, service-event entry mode, and FREE rotation markers.

-- 1) Extend plan enum with RIDER.
ALTER TYPE "PlanType" ADD VALUE IF NOT EXISTS 'RIDER';

-- 2) Subscription trial window.
ALTER TABLE "subscriptions"
  ADD COLUMN IF NOT EXISTS "trialEndsAt" TIMESTAMP(3);

-- 3) Service-event gating/rotation metadata.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ServiceEventEntryMode') THEN
    CREATE TYPE "ServiceEventEntryMode" AS ENUM ('QUICK', 'DETAILED');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ServiceEventRotationReason') THEN
    CREATE TYPE "ServiceEventRotationReason" AS ENUM ('FREE_LIMIT');
  END IF;
END
$$;

ALTER TABLE "service_events"
  ADD COLUMN IF NOT EXISTS "entryMode" "ServiceEventEntryMode" NOT NULL DEFAULT 'QUICK',
  ADD COLUMN IF NOT EXISTS "createdUnderPlan" "PlanType" NOT NULL DEFAULT 'FREE',
  ADD COLUMN IF NOT EXISTS "rotatedOutAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "rotatedOutReason" "ServiceEventRotationReason";

-- 4) Backfill entry mode based on bundle mode.
UPDATE "service_events"
SET "entryMode" = CASE
  WHEN "mode" = 'ADVANCED' THEN 'DETAILED'::"ServiceEventEntryMode"
  ELSE 'QUICK'::"ServiceEventEntryMode"
END
WHERE "entryMode" IS NOT NULL;

-- 5) Backfill createdUnderPlan from subscription where possible.
UPDATE "service_events" se
SET "createdUnderPlan" = COALESCE(sub."planType", 'FREE'::"PlanType")
FROM "vehicles" v
LEFT JOIN "subscriptions" sub ON sub."userId" = v."userId"
WHERE se."vehicleId" = v."id";

-- 6) Index for FREE rotation/window queries.
CREATE INDEX IF NOT EXISTS "service_events_vehicleId_rotatedOutAt_eventDate_idx"
  ON "service_events"("vehicleId", "rotatedOutAt", "eventDate");
