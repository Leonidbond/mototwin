UPDATE "expense_items"
SET "category" = 'CONSUMABLE'
WHERE "serviceEventId" IS NOT NULL
  AND "shoppingListItemId" IS NOT NULL
  AND "category" = 'SERVICE_WORK'
  AND (
    lower(coalesce("title", '') || ' ' || coalesce("partName", '') || ' ' || coalesce("partSku", '') || ' ' || coalesce("comment", '')) LIKE '%масл%'
    OR lower(coalesce("title", '') || ' ' || coalesce("partName", '') || ' ' || coalesce("partSku", '') || ' ' || coalesce("comment", '')) LIKE '%oil%'
    OR lower(coalesce("title", '') || ' ' || coalesce("partName", '') || ' ' || coalesce("partSku", '') || ' ' || coalesce("comment", '')) LIKE '%жидк%'
    OR lower(coalesce("title", '') || ' ' || coalesce("partName", '') || ' ' || coalesce("partSku", '') || ' ' || coalesce("comment", '')) LIKE '%fluid%'
    OR lower(coalesce("title", '') || ' ' || coalesce("partName", '') || ' ' || coalesce("partSku", '') || ' ' || coalesce("comment", '')) LIKE '%смаз%'
    OR lower(coalesce("title", '') || ' ' || coalesce("partName", '') || ' ' || coalesce("partSku", '') || ' ' || coalesce("comment", '')) LIKE '%grease%'
    OR lower(coalesce("title", '') || ' ' || coalesce("partName", '') || ' ' || coalesce("partSku", '') || ' ' || coalesce("comment", '')) LIKE '%coolant%'
    OR lower(coalesce("title", '') || ' ' || coalesce("partName", '') || ' ' || coalesce("partSku", '') || ' ' || coalesce("comment", '')) LIKE '%антифриз%'
    OR lower(coalesce("title", '') || ' ' || coalesce("partName", '') || ' ' || coalesce("partSku", '') || ' ' || coalesce("comment", '')) LIKE '%тормозн%'
  );

UPDATE "expense_items"
SET "category" = 'PART'
WHERE "serviceEventId" IS NOT NULL
  AND "shoppingListItemId" IS NOT NULL
  AND "category" = 'SERVICE_WORK';

DELETE FROM "expense_items" standalone
WHERE standalone."serviceEventId" IS NULL
  AND standalone."shoppingListItemId" IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM "expense_items" installed
    WHERE installed."shoppingListItemId" = standalone."shoppingListItemId"
      AND installed."serviceEventId" IS NOT NULL
  );
