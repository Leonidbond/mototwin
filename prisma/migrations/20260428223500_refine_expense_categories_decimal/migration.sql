ALTER TYPE "ExpenseCategory" RENAME VALUE 'PARTS' TO 'PART';
ALTER TYPE "ExpenseCategory" RENAME VALUE 'LABOR' TO 'SERVICE_WORK';
ALTER TYPE "ExpenseCategory" RENAME VALUE 'OTHER_TECHNICAL' TO 'OTHER';

UPDATE "expense_items"
SET "category" = 'SERVICE_WORK'
WHERE "category" = 'SERVICE';

CREATE TYPE "ExpenseCategory_new" AS ENUM (
  'PART',
  'CONSUMABLE',
  'SERVICE_WORK',
  'REPAIR',
  'DIAGNOSTICS',
  'OTHER'
);

ALTER TABLE "expense_items"
  ALTER COLUMN "category" TYPE "ExpenseCategory_new"
  USING "category"::text::"ExpenseCategory_new";

DROP TYPE "ExpenseCategory";

ALTER TYPE "ExpenseCategory_new" RENAME TO "ExpenseCategory";

ALTER TABLE "expense_items"
  ALTER COLUMN "amount" TYPE DECIMAL(12, 2)
  USING "amount"::numeric(12, 2);
