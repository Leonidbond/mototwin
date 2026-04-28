CREATE TYPE "ExpensePurchaseStatus" AS ENUM ('PLANNED', 'PURCHASED');
CREATE TYPE "ExpenseInstallationStatus" AS ENUM ('NOT_INSTALLED', 'INSTALLED');

ALTER TABLE "expense_items"
  ADD COLUMN "purchaseStatus" "ExpensePurchaseStatus" NOT NULL DEFAULT 'PURCHASED',
  ADD COLUMN "installationStatus" "ExpenseInstallationStatus" NOT NULL DEFAULT 'INSTALLED',
  ADD COLUMN "vendor" TEXT,
  ADD COLUMN "purchasedAt" TIMESTAMP(3),
  ADD COLUMN "installedAt" TIMESTAMP(3);

UPDATE "expense_items"
SET
  "installationStatus" = CASE
    WHEN "installStatus" = 'BOUGHT_NOT_INSTALLED' THEN 'NOT_INSTALLED'::"ExpenseInstallationStatus"
    ELSE 'INSTALLED'::"ExpenseInstallationStatus"
  END,
  "purchasedAt" = COALESCE("purchasedAt", "expenseDate"),
  "installedAt" = CASE
    WHEN "installStatus" = 'BOUGHT_NOT_INSTALLED' THEN NULL
    ELSE COALESCE("installedAt", "expenseDate")
  END;

CREATE INDEX "expense_items_vehicleId_purchaseStatus_idx" ON "expense_items"("vehicleId", "purchaseStatus");
CREATE INDEX "expense_items_vehicleId_installationStatus_idx" ON "expense_items"("vehicleId", "installationStatus");
