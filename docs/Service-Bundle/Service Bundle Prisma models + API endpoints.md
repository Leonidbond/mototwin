Ниже схема под Cursor: **Prisma models + API endpoints** для `Service Bundle`.

# 1. Prisma models

```prisma
enum ServiceEventMode {
  BASIC
  ADVANCED
}

enum ServiceActionType {
  REPLACE
  SERVICE
  INSPECT
  CLEAN
  ADJUST
}

model ServiceEvent {
  id          String           @id @default(cuid())
  vehicleId   String
  title       String
  mode        ServiceEventMode @default(BASIC)

  date        DateTime
  mileageKm   Int?
  engineHours Int?

  partsCost   Decimal? @db.Decimal(10, 2)
  laborCost   Decimal? @db.Decimal(10, 2)
  totalCost   Decimal? @db.Decimal(10, 2)

  comment     String?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  vehicle      Vehicle            @relation(fields: [vehicleId], references: [id], onDelete: Cascade)
  items        ServiceEventItem[]

  @@index([vehicleId])
  @@index([date])
}

model ServiceEventItem {
  id             String            @id @default(cuid())
  serviceEventId String
  nodeId         String

  actionType     ServiceActionType @default(SERVICE)

  partName       String?
  sku            String?
  quantity       Int?
  partCost       Decimal? @db.Decimal(10, 2)
  laborCost      Decimal? @db.Decimal(10, 2)

  comment        String?

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  serviceEvent   ServiceEvent @relation(fields: [serviceEventId], references: [id], onDelete: Cascade)
  node           Node         @relation(fields: [nodeId], references: [id])

  @@index([serviceEventId])
  @@index([nodeId])
}
```

---

# 2. Шаблоны комплексного сервиса

```prisma
model ServiceBundleTemplate {
  id                String   @id @default(cuid())
  title             String
  description       String?
  category          String?
  isRegulationBased Boolean  @default(false)

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  items             ServiceBundleTemplateItem[]
}

model ServiceBundleTemplateItem {
  id                String            @id @default(cuid())
  templateId        String
  nodeId            String

  defaultActionType ServiceActionType @default(SERVICE)
  isRequired        Boolean           @default(true)
  sortOrder         Int               @default(0)

  template          ServiceBundleTemplate @relation(fields: [templateId], references: [id], onDelete: Cascade)
  node              Node                  @relation(fields: [nodeId], references: [id])

  @@index([templateId])
  @@index([nodeId])
}
```

---

# 3. Минимальные связи в существующих моделях

В `Vehicle`:

```prisma
model Vehicle {
  id String @id @default(cuid())

  // existing fields...

  serviceEvents ServiceEvent[]
}
```

В `Node`:

```prisma
model Node {
  id String @id @default(cuid())

  // existing fields...

  serviceEventItems          ServiceEventItem[]
  serviceBundleTemplateItems ServiceBundleTemplateItem[]
}
```

---

# 4. API endpoints

## Service events

```text
GET    /api/vehicles/:vehicleId/service-events
POST   /api/vehicles/:vehicleId/service-events
GET    /api/service-events/:serviceEventId
PATCH  /api/service-events/:serviceEventId
DELETE /api/service-events/:serviceEventId
```

---

## Bundle templates

```text
GET /api/service-bundle-templates
GET /api/service-bundle-templates/:templateId
```

Для MVP шаблоны лучше сидировать, а не давать пользователю создавать свои.

---

## Installable picker для окна сервисного события

```text
GET /api/vehicles/:vehicleId/installable?nodeId=…
```

Сводный пикер «Готово к установке» в окне создания / редактирования сервисного события. Собирает в один список:

- активный `PartWishlistItem` (`status in NEEDED | ORDERED | BOUGHT`);
- uninstalled `ExpenseItem` (`purchaseStatus=PURCHASED`, `installationStatus=NOT_INSTALLED`, `serviceEventId=null`).

Пары дедуплицируются по `expense.shoppingListItemId == wishlist.id` и склеиваются в один entry с `source: "wishlist+expense"`. Чистая wishlist-позиция получает `source: "wishlist"`, чистый расход — `source: "expense"`. Внутри списка купленное (`expense | wishlist BOUGHT | wishlist+expense`) сортируется выше `ORDERED`, затем `NEEDED`; внутри группы — `purchasedAt desc`, fallback `expenseDate desc`. Тип ответа — `InstallableForServiceEventResponse` из `@mototwin/types`. UI при сохранении события линкует выбранные расходы к `serviceEventId` идемпотентно (в т.ч. если `syncExpenseItemForServiceEvent` уже проставил связь в той же транзакции — см. `linkInstalledExpenseItemsToServiceEvent` в репозитории).

Старый `GET /api/expenses/uninstalled` оставлен как deprecated-helper в API client — UI окна сервисного события его больше не зовёт.

---

# 5. POST /api/vehicles/:vehicleId/service-events

## Basic mode payload

```json
{
  "title": "ТО 10 000 км",
  "mode": "BASIC",
  "date": "2026-05-03T00:00:00.000Z",
  "mileageKm": 18420,
  "engineHours": null,
  "partsCost": 12000,
  "laborCost": 5000,
  "comment": "Плановое ТО",
  "items": [
    {
      "nodeId": "engine-lube-oil",
      "actionType": "REPLACE"
    },
    {
      "nodeId": "engine-lube-filter",
      "actionType": "REPLACE"
    }
  ]
}
```

---

## Advanced mode payload

```json
{
  "title": "Обслуживание тормозов",
  "mode": "ADVANCED",
  "date": "2026-05-03T00:00:00.000Z",
  "mileageKm": 18420,
  "partsCost": 9800,
  "laborCost": 2500,
  "items": [
    {
      "nodeId": "brakes-front-pads",
      "actionType": "REPLACE",
      "partName": "Brembo front pads",
      "sku": "07BB38SA",
      "quantity": 1,
      "partCost": 6200,
      "laborCost": 1500
    },
    {
      "nodeId": "brakes-fluid",
      "actionType": "REPLACE",
      "partName": "Motul DOT 4",
      "sku": "DOT4-500",
      "quantity": 1,
      "partCost": 3600,
      "laborCost": 1000
    }
  ]
}
```

---

# 6. Валидация Zod

```ts
import { z } from "zod";

export const createServiceEventItemSchema = z.object({
  nodeId: z.string().min(1),
  actionType: z.enum(["REPLACE", "SERVICE", "INSPECT", "CLEAN", "ADJUST"]),
  partName: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  quantity: z.number().int().positive().optional().nullable(),
  partCost: z.number().nonnegative().optional().nullable(),
  laborCost: z.number().nonnegative().optional().nullable(),
  comment: z.string().optional().nullable(),
});

export const createServiceEventSchema = z.object({
  title: z.string().min(1),
  mode: z.enum(["BASIC", "ADVANCED"]),
  date: z.string().datetime(),
  mileageKm: z.number().int().nonnegative().optional().nullable(),
  engineHours: z.number().int().nonnegative().optional().nullable(),
  partsCost: z.number().nonnegative().optional().nullable(),
  laborCost: z.number().nonnegative().optional().nullable(),
  comment: z.string().optional().nullable(),
  items: z.array(createServiceEventItemSchema).min(1),
});
```

---

# 7. Бизнес-правила

При создании `ServiceEvent`:

1. Создаем одно событие.
2. Создаем несколько `ServiceEventItem`.
3. Обновляем статусы **только выбранных nodeId**.
4. В `BASIC` режиме запрещаем `sku`, `partName`, `quantity`.
5. В `ADVANCED` режиме разрешаем детализацию.
6. `totalCost = partsCost + laborCost` (на уровне события после нормализации).
7. В **`ADVANCED`** итоговые **`partsCost` / `laborCost`** на событии = **сумма по строкам** (`partCost` / `laborCost` у items) **+** значения из полей «Запчасти»/«Работа» в блоке данных события (верх формы). Верхние поля **дополняют** строки, а не заменяют их. При **редактировании** клиент показывает в верхних полях **остаток** (сохранённое минус сумма строк), чтобы повторный PATCH не задвоил суммы; при создании пользователь вводит строки и при необходимости доп. сумму сверху.

---

# 8. Рекомендуемый порядок реализации

1. Добавить Prisma models.
2. Сделать миграцию.
3. Засидировать `ServiceBundleTemplate`.
4. Сделать `GET /api/service-bundle-templates`.
5. Сделать `POST /api/vehicles/:vehicleId/service-events`.
6. Сделать список событий.
7. Потом уже UI формы: Basic / Advanced.

---

# 9. Статус (волна 3, 2026-05)

- **Шаблоны:** реализованы по п. 2 (модели, сид, `GET /api/service-bundle-templates`, UI выбора шаблона).
- **Wishlist multi-install:** `installedPartsJson` поддерживает массив wishlist-записей; доменные парсеры `getWishlistItemIdsFromInstalledPartsJson` / `getWishlistItemIdFromInstalledPartsJson`; формы web/Expo — блок выбора нескольких активных позиций; синк расходов и wishlist-статусов по всем id.
- **Downstream дерева узлов:** при расчёте «последнего сервиса» на leaf (`loadVehicleNodeTreeJson`, `computeGarageAttentionByVehicleId`) используются все узлы из `service_events` → `service_event_items`, а не только anchor на `service_events.node_id` (см. `expandBundleServiceEventsToLeafNodeRows` в `src/lib/vehicle-node-tree-internal.ts`).
- **ADVANCED-деньги и журнал:** нормализация create/edit в `@mototwin/domain` (`normalizeAddServiceEventPayload` и правки) и превью «Итого» в форме совпадают с п. 7 выше; в журнале (web/Expo) у строк bundle отображаются подписи стоимости из `ServiceLogBundleItemSummary.lineCostRu` / `formatBundleItemLineCostsRu`.
