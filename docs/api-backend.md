# MotoTwin API Backend

## 1. Scope

Документ описывает фактически реализованные route handlers в `src/app/api/**/route.ts`.

## 2. Backend shape

- Next.js Route Handlers
- Prisma Client + PostgreSQL
- JSON responses
- Error shape: `{ error: string }`
- Validation errors: `{ error: "Validation failed", issues }`

## 3. Implemented routes

## 3.1 Catalog

### `GET /api/brands`
- Response `200`: `{ brands: Array<{ id, name, slug }> }`
- Response `500`: `{ error: "Failed to fetch brands" }`

### `GET /api/models?brandId=...`
- Required query: `brandId`
- Response `200`: `{ models: Array<{ id, name, slug, brandId }> }`
- Response `400`: `{ error: "brandId is required" }`
- Response `500`: `{ error: "Failed to fetch models" }`

### `GET /api/model-variants?modelId=...`
- Required query: `modelId`
- Response `200`: `{ variants: Array<...model variant fields...> }`
- Response `400`: `{ error: "modelId is required" }`
- Response `500`: `{ error: "Failed to fetch model variants" }`
- Sort: `year desc`, then `versionName asc`

## 3.2 Garage and vehicle

### `GET /api/garage`
- Returns garage vehicles for demo user
- Response `200`: `{ vehicles }` with `brand`, `model`, `modelVariant`, `rideProfile`
- Response `500`: demo user/garage load failure errors

### `POST /api/vehicles`
- Creates vehicle + ride profile
- Required body:
  - `brandId`, `modelId`, `modelVariantId`
  - `odometer` (int >= 0)
  - `engineHours` (`int >= 0 | null`)
  - `rideProfile` with enum fields
- Optional body: `nickname`, `vin`
- Response `201`: `{ vehicle }`
- Response `400`: validation failed
- Response `500`: create failure

### `GET /api/vehicles/[id]`
- Response `200`: `{ vehicle }` with related entities
- Response `404`: `{ error: "Vehicle not found" }`
- Response `500`: fetch failure

## 3.3 Vehicle update routes

### `PATCH /api/vehicles/[id]/state`
- Updates `vehicle.odometer`, `vehicle.engineHours`
- In same transaction creates `ServiceEvent` with `eventKind = STATE_UPDATE`
- Uses first available node as log node (`nodeId` required by schema)
- Response `200`: `{ vehicle: { id, odometer, engineHours, updatedAt } }`
- Response `400`: validation or no-node-available
- Response `404`: vehicle not found
- Response `500`: update failure

### `PATCH /api/vehicles/[id]/profile`
- Updates vehicle profile fields:
  - `nickname`, `vin`
  - `rideProfile` (upsert)
- Response `200`: `{ vehicle }`
- Response `400`: validation failed
- Response `404`: vehicle not found
- Response `500`: update failure

## 3.4 Service events

### `GET /api/vehicles/[id]/service-events`
- Returns vehicle service history with node metadata
- Sort: `eventDate desc`, then `createdAt desc`
- Response `200`: `{ serviceEvents }`
- Response `404`: vehicle not found
- Response `500`: fetch failure

### `POST /api/vehicles/[id]/service-events`
- Creates a **bundle** service event (`ServiceEvent` + `ServiceEventItem[]`); anchor node = `nodeId` in body or first `items[].nodeId`
- Validation/business rules:
  - nodes must exist
  - each bundle `items[].nodeId` must be a leaf (no children)
  - event date cannot be in future
  - event odometer cannot exceed current vehicle odometer
  - top node state must exist for vehicle (compatibility requirement)
- Request notes:
  - **`nextReminderDate`**: допускается **`null`** при выключенном напоминании или при включённом напоминании без даты (только пробег/моточасы); см. Zod-схему в `service-events/route.ts`
- Side effects after create (транзакция):
  - `NodeState` для **каждого** узла из `items` и anchor (`RECENTLY_REPLACED`, `lastServiceEventId`)
  - пересчёт **`TopNodeState`** по мотоциклу
  - **`syncExpenseItemForServiceEvent`** — синтез/обновление **`ExpenseItem`** по сумме события и по **`installedPartsJson`** (wishlist id из JSON обрабатываются **даже при нулевых/пустых** верхних суммах частей/работы — сценарий «Готово к установке»)
  - **`linkInstalledExpenseItemsToServiceEvent`** — привязка выбранных **`installedExpenseItemIds`**, перевод связанных wishlist-строк в **`INSTALLED`** там, где у расхода задан `shoppingListItemId`
- Response `201`: `{ serviceEvent }`
- Response `400` / `404` / `500` depending on failure class

### `DELETE /api/vehicles/[id]/wishlist/[itemId]`
- Удаляет позицию корзины замен и связанные **`ExpenseItem`** с тем же `shoppingListItemId`
- Если удаляемая позиция в статусе **`INSTALLED`**, в **комментарий** всех связанных **`SERVICE`** событий (по расходам с `serviceEventId` и по **`installedPartsJson`**, где встречается этот `wishlistItemId`) дописывается строка вида: позиция удалена из корзины замен и расходников (см. `src/lib/wishlist-delete-service-log-note.ts`, лимит длины как у формы события)

## 3.5 Node status routes

### `GET /api/vehicles/[id]/node-tree`
- Returns hierarchical nodes with:
  - `directStatus`
  - `computedStatus`
  - `effectiveStatus`
  - `statusExplanation`
  - `children`
- Uses vehicle state + rules + latest leaf service events + node states
- Aggregates status upward using fixed priority:
  `OVERDUE > SOON > RECENTLY_REPLACED > OK`
- Response `200`: `{ nodeTree }`
- Response `404`: vehicle not found
- Response `500`: fetch failure

### `GET /api/vehicles/[id]/top-nodes`
- Legacy compatibility endpoint for top-level status list
- Filters by configured top-level node codes
- Response `200`: `{ topNodes }`
- Response `404`: vehicle not found
- Response `500`: fetch failure

## 4. Core backend business rules

1. Service events can be created only for leaf nodes.
2. Vehicle state update creates `STATE_UPDATE` log event.
3. Node-tree status is computed at read-time (no background worker).
4. `RECENTLY_REPLACED` direct status can be overridden by computed `SOON/OVERDUE`.
5. `TopNodeState` remains in use for compatibility.

## 5. Notes for client implementations

- Backend contracts are shared truth for web and Expo clients.
- Client-side validation is supportive only; backend remains source of validation.
- Parity-sensitive flows should keep request/response usage aligned across platforms.
