CREATE TYPE "ExpenseCategory" AS ENUM (
  'SERVICE',
  'PARTS',
  'REPAIR',
  'DIAGNOSTICS',
  'LABOR',
  'OTHER_TECHNICAL'
);

CREATE TYPE "ExpenseInstallStatus" AS ENUM (
  'BOUGHT_NOT_INSTALLED',
  'INSTALLED',
  'NOT_APPLICABLE'
);

CREATE TABLE "expense_items" (
  "id" TEXT NOT NULL,
  "vehicleId" TEXT NOT NULL,
  "nodeId" TEXT,
  "serviceEventId" TEXT,
  "shoppingListItemId" TEXT,
  "category" "ExpenseCategory" NOT NULL,
  "installStatus" "ExpenseInstallStatus" NOT NULL,
  "expenseDate" TIMESTAMP(3) NOT NULL,
  "title" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "comment" TEXT,
  "partSku" TEXT,
  "partName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "expense_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "expense_items_vehicleId_expenseDate_idx" ON "expense_items"("vehicleId", "expenseDate");
CREATE INDEX "expense_items_vehicleId_category_idx" ON "expense_items"("vehicleId", "category");
CREATE INDEX "expense_items_vehicleId_installStatus_idx" ON "expense_items"("vehicleId", "installStatus");
CREATE INDEX "expense_items_nodeId_idx" ON "expense_items"("nodeId");
CREATE INDEX "expense_items_serviceEventId_idx" ON "expense_items"("serviceEventId");
CREATE INDEX "expense_items_shoppingListItemId_idx" ON "expense_items"("shoppingListItemId");

ALTER TABLE "expense_items"
  ADD CONSTRAINT "expense_items_vehicleId_fkey"
  FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "expense_items"
  ADD CONSTRAINT "expense_items_nodeId_fkey"
  FOREIGN KEY ("nodeId") REFERENCES "nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "expense_items"
  ADD CONSTRAINT "expense_items_serviceEventId_fkey"
  FOREIGN KEY ("serviceEventId") REFERENCES "service_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "expense_items"
  ADD CONSTRAINT "expense_items_shoppingListItemId_fkey"
  FOREIGN KEY ("shoppingListItemId") REFERENCES "part_wishlist_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "expense_items" (
  "id",
  "vehicleId",
  "nodeId",
  "serviceEventId",
  "shoppingListItemId",
  "category",
  "installStatus",
  "expenseDate",
  "title",
  "amount",
  "currency",
  "quantity",
  "comment",
  "partSku",
  "partName",
  "createdAt",
  "updatedAt"
)
SELECT
  'exp_' || substr(md5(random()::text || clock_timestamp()::text), 1, 24),
  se."vehicleId",
  se."nodeId",
  se."id",
  CASE
    WHEN jsonb_typeof(se."installedPartsJson"::jsonb) = 'object'
      AND se."installedPartsJson"::jsonb ->> 'source' = 'wishlist'
      AND NULLIF(se."installedPartsJson"::jsonb ->> 'wishlistItemId', '') IS NOT NULL
    THEN se."installedPartsJson"::jsonb ->> 'wishlistItemId'
    ELSE NULL
  END,
  CASE
    WHEN se."partSku" IS NOT NULL OR se."partName" IS NOT NULL THEN 'PARTS'::"ExpenseCategory"
    WHEN se."serviceType" ILIKE '%ремонт%' THEN 'REPAIR'::"ExpenseCategory"
    WHEN se."serviceType" ILIKE '%диагност%' THEN 'DIAGNOSTICS'::"ExpenseCategory"
    WHEN se."serviceType" ILIKE '%работ%' THEN 'LABOR'::"ExpenseCategory"
    ELSE 'SERVICE'::"ExpenseCategory"
  END,
  CASE
    WHEN se."partSku" IS NOT NULL OR se."partName" IS NOT NULL THEN 'INSTALLED'::"ExpenseInstallStatus"
    WHEN se."serviceType" ILIKE '%диагност%' OR se."serviceType" ILIKE '%работ%' THEN 'NOT_APPLICABLE'::"ExpenseInstallStatus"
    ELSE 'INSTALLED'::"ExpenseInstallStatus"
  END,
  se."eventDate",
  se."serviceType",
  se."costAmount",
  btrim(se."currency"),
  1,
  se."comment",
  se."partSku",
  se."partName",
  se."createdAt",
  CURRENT_TIMESTAMP
FROM "service_events" se
WHERE se."eventKind" <> 'STATE_UPDATE'
  AND se."costAmount" IS NOT NULL
  AND se."costAmount" > 0
  AND se."currency" IS NOT NULL
  AND btrim(se."currency") <> '';

INSERT INTO "expense_items" (
  "id",
  "vehicleId",
  "nodeId",
  "shoppingListItemId",
  "category",
  "installStatus",
  "expenseDate",
  "title",
  "amount",
  "currency",
  "quantity",
  "comment",
  "createdAt",
  "updatedAt"
)
SELECT
  'exp_' || substr(md5(random()::text || clock_timestamp()::text), 1, 24),
  wi."vehicleId",
  wi."nodeId",
  wi."id",
  'PARTS'::"ExpenseCategory",
  'BOUGHT_NOT_INSTALLED'::"ExpenseInstallStatus",
  wi."updatedAt",
  wi."title",
  wi."costAmount",
  btrim(wi."currency"),
  wi."quantity",
  wi."comment",
  wi."createdAt",
  CURRENT_TIMESTAMP
FROM "part_wishlist_items" wi
WHERE wi."status" = 'BOUGHT'
  AND wi."costAmount" IS NOT NULL
  AND wi."costAmount" > 0
  AND wi."currency" IS NOT NULL
  AND btrim(wi."currency") <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM "expense_items" ei
    WHERE ei."shoppingListItemId" = wi."id"
  );
