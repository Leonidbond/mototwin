-- Service Bundle (Wave 1) ----------------------------------------------------
--   Adds the bundle envelope columns to service_events, the new
--   service_event_items child table, and the supporting enums. Legacy single-row
--   columns (`serviceType`, `partSku`, `partName`, `costAmount`) are migrated
--   into a 1-item bundle and then dropped — see plan §1.2.
-- ---------------------------------------------------------------------------

-- 1. New enums --------------------------------------------------------------

CREATE TYPE "ServiceEventMode" AS ENUM ('BASIC', 'ADVANCED');

CREATE TYPE "ServiceActionType" AS ENUM ('REPLACE', 'SERVICE', 'INSPECT', 'CLEAN', 'ADJUST');

-- 2. Bundle envelope columns on service_events -------------------------------

ALTER TABLE "service_events"
  ADD COLUMN "title"     TEXT,
  ADD COLUMN "mode"      "ServiceEventMode" NOT NULL DEFAULT 'BASIC',
  ADD COLUMN "partsCost" DECIMAL(12, 2),
  ADD COLUMN "laborCost" DECIMAL(12, 2),
  ADD COLUMN "totalCost" DECIMAL(12, 2);

-- 3. Backfill: title from legacy serviceType, totalCost from legacy costAmount

UPDATE "service_events"
SET
  "title"     = COALESCE(NULLIF(btrim("serviceType"), ''), 'Сервисное событие'),
  "totalCost" = "costAmount"::DECIMAL(12, 2);

-- 4. service_event_items table ----------------------------------------------

CREATE TABLE "service_event_items" (
  "id"             TEXT NOT NULL,
  "serviceEventId" TEXT NOT NULL,
  "nodeId"         TEXT NOT NULL,
  "actionType"     "ServiceActionType" NOT NULL DEFAULT 'SERVICE',
  "partName"       TEXT,
  "sku"            TEXT,
  "quantity"       INTEGER,
  "partCost"       DECIMAL(12, 2),
  "laborCost"      DECIMAL(12, 2),
  "comment"        TEXT,
  "sortOrder"      INTEGER NOT NULL DEFAULT 0,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,

  CONSTRAINT "service_event_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "service_event_items_serviceEventId_idx"
  ON "service_event_items"("serviceEventId");

CREATE INDEX "service_event_items_nodeId_idx"
  ON "service_event_items"("nodeId");

ALTER TABLE "service_event_items"
  ADD CONSTRAINT "service_event_items_serviceEventId_fkey"
  FOREIGN KEY ("serviceEventId") REFERENCES "service_events"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "service_event_items"
  ADD CONSTRAINT "service_event_items_nodeId_fkey"
  FOREIGN KEY ("nodeId") REFERENCES "nodes"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- 5. Backfill: 1 item per legacy event --------------------------------------
--    Action type heuristic mirrors mapServiceTypeStringToActionType in
--    @mototwin/domain (forms.ts) so journal/UI display stays consistent.

INSERT INTO "service_event_items" (
  "id",
  "serviceEventId",
  "nodeId",
  "actionType",
  "partName",
  "sku",
  "quantity",
  "partCost",
  "laborCost",
  "comment",
  "sortOrder",
  "createdAt",
  "updatedAt"
)
SELECT
  'sei_' || substr(md5(random()::text || clock_timestamp()::text || se."id"), 1, 24),
  se."id",
  se."nodeId",
  CASE
    WHEN se."serviceType" ILIKE '%замен%'      THEN 'REPLACE'::"ServiceActionType"
    WHEN se."serviceType" ILIKE '%проверк%'    THEN 'INSPECT'::"ServiceActionType"
    WHEN se."serviceType" ILIKE '%диагност%'   THEN 'INSPECT'::"ServiceActionType"
    WHEN se."serviceType" ILIKE '%чистк%'      THEN 'CLEAN'::"ServiceActionType"
    WHEN se."serviceType" ILIKE '%очистк%'     THEN 'CLEAN'::"ServiceActionType"
    WHEN se."serviceType" ILIKE '%регулир%'    THEN 'ADJUST'::"ServiceActionType"
    WHEN se."serviceType" ILIKE '%настройк%'   THEN 'ADJUST'::"ServiceActionType"
    ELSE 'SERVICE'::"ServiceActionType"
  END,
  se."partName",
  se."partSku",
  NULL,
  -- В легаси-моделях стоимость всегда хранилась общим костом события; копировать
  -- её на item-уровень в БД нельзя, иначе total посчитается дважды (event.totalCost
  -- + item.partCost). На UI legacy-события (1 item, BASIC) рендерятся по
  -- event.totalCost, а item.partCost остаётся null — это совпадает с текущим
  -- поведением. partCost появляется только когда пользователь создаёт ADVANCED
  -- bundle.
  NULL,
  NULL,
  NULL,
  0,
  se."createdAt",
  CURRENT_TIMESTAMP
FROM "service_events" se
WHERE se."nodeId" IS NOT NULL;

-- 6. Drop legacy columns ----------------------------------------------------

ALTER TABLE "service_events"
  DROP COLUMN "serviceType",
  DROP COLUMN "partSku",
  DROP COLUMN "partName",
  DROP COLUMN "costAmount";
