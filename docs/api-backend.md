# MotoTwin MVP API / Backend

## 1. Scope

Документ описывает **только текущие реализованные** backend routes и бизнес-логику в `src/app/api/**/route.ts`.

## 2. Stack and backend shape

- Next.js Route Handlers (App Router)
- Prisma Client (`src/lib/prisma.ts`)
- PostgreSQL
- JSON-only API responses
- Ошибки возвращаются как `{ error: string }` (для Zod-валидации дополнительно `issues`)

## 3. Implemented routes

## 3.1 Catalog routes (onboarding data)

### `GET /api/brands`

**Purpose**
- Получение списка брендов для onboarding.

**Request**
- Без параметров.

**Response**
- `200`: `{ brands: Array<{ id, name, slug }> }`
- `500`: `{ error: "Failed to fetch brands" }`

**Validation / rules**
- Явной валидации входа нет.

---

### `GET /api/models?brandId=...`

**Purpose**
- Получение моделей выбранного бренда.

**Request**
- Query param: `brandId` (required).

**Response**
- `200`: `{ models: Array<{ id, name, slug, brandId }> }`
- `400`: `{ error: "brandId is required" }`
- `500`: `{ error: "Failed to fetch models" }`

**Validation / rules**
- Если `brandId` отсутствует -> `400`.

---

### `GET /api/model-variants?modelId=...`

**Purpose**
- Получение модификаций выбранной модели.

**Request**
- Query param: `modelId` (required).

**Response**
- `200`: `{ variants: Array<{ id, modelId, year, generation, versionName, market, engineType, coolingType, wheelSizes, brakeSystem, chainPitch, stockSprockets }> }`
- `400`: `{ error: "modelId is required" }`
- `500`: `{ error: "Failed to fetch model variants" }`

**Validation / rules**
- Если `modelId` отсутствует -> `400`.
- Сортировка: `year desc`, затем `versionName asc`.

## 3.2 Vehicles and garage

### `POST /api/vehicles`

**Purpose**
- Создание нового `Vehicle` и связанного `RideProfile`.

**Request shape**
- JSON body (Zod):
  - `brandId: string`
  - `modelId: string`
  - `modelVariantId: string`
  - `nickname?: string | null`
  - `vin?: string | null`
  - `odometer: number (int, min 0)`
  - `engineHours: number | null (int, min 0)`
  - `rideProfile: { usageType, ridingStyle, loadType, usageIntensity }` (enum values)

**Response**
- `201`: `{ vehicle }` (include `brand`, `model`, `modelVariant`, `rideProfile`)
- `400`: `{ error: "Validation failed", issues }`
- `500`: `{ error: "Demo user not found" }` или `{ error: "Failed to create vehicle" }`

**Validation / rules**
- Используется fixed demo user (`demo@mototwin.local`).

---

### `GET /api/garage`

**Purpose**
- Возвращает гараж demo user.

**Request**
- Без параметров.

**Response**
- `200`: `{ vehicles }` (include `brand`, `model`, `modelVariant`, `rideProfile`)
- `500`: `{ error: "Demo user not found" }` или `{ error: "Failed to fetch garage" }`

**Validation / rules**
- Привязка к demo user по email.

---

### `GET /api/vehicles/[id]`

**Purpose**
- Детали одного мотоцикла.

**Request**
- Path param: `id`.

**Response**
- `200`: `{ vehicle }` (include `brand`, `model`, `modelVariant`, `rideProfile`)
- `404`: `{ error: "Vehicle not found" }`
- `500`: `{ error: "Failed to fetch vehicle" }`

## 3.3 Vehicle state update

### `PATCH /api/vehicles/[id]/state`

**Purpose**
- Обновление текущего состояния мотоцикла (`odometer`, `engineHours`) и запись системного события в service log.

**Request shape**
- Path param: `id`
- JSON body (Zod):
  - `odometer: number (int, min 0, required)`
  - `engineHours: number | null (int, min 0)`

**Response**
- `200`: `{ vehicle: { id, odometer, engineHours, updatedAt } }`
- `400`: 
  - `{ error: "Validation failed", issues }` или
  - `{ error: "No node available for state update log entry" }`
- `404`: `{ error: "Vehicle not found" }`
- `500`: `{ error: "Failed to update vehicle state" }`

**Validation / rules**
- После апдейта `Vehicle` в той же транзакции создается `ServiceEvent`:
  - `eventKind = STATE_UPDATE`
  - `eventDate = now`
  - `odometer/engineHours` из обновленного vehicle
  - `serviceType = "Vehicle state updated"`
  - `comment = "Системная запись: обновлено текущее состояние мотоцикла"`
  - `nodeId` берется как первый доступный `Node` (т.к. `ServiceEvent.nodeId` required в текущей схеме).

## 3.4 Service events

### `GET /api/vehicles/[id]/service-events`

**Purpose**
- Получение журнала событий по мотоциклу (service + state updates).

**Request**
- Path param: `id`.

**Response**
- `200`: `{ serviceEvents }` (include `node`)
- `404`: `{ error: "Vehicle not found" }`
- `500`: `{ error: "Failed to fetch service events" }`

**Validation / rules**
- Сортировка: `eventDate desc`, затем `createdAt desc`.

---

### `POST /api/vehicles/[id]/service-events`

**Purpose**
- Создание сервисного события для leaf узла.

**Request shape**
- Path param: `id`
- JSON body (Zod):
  - `nodeId: string (required)`
  - `eventDate: string` (валидная дата)
  - `odometer: number (int, min 0)`
  - `engineHours?: number | null (int, min 0)`
  - `serviceType: string (required)`
  - `installedPartsJson?: any | null`
  - `costAmount?: number | null`
  - `currency?: string | null`
  - `comment?: string | null`

**Response**
- `201`: `{ serviceEvent }` (include `node`)
- `400`: 
  - `{ error: "Validation failed", issues }`
  - `{ error: "Service events can only be created for the last available node level" }`
  - `{ error: "Top node state not found for this vehicle" }`
  - `{ error: "Event date cannot be in the future" }`
  - `{ error: "Event odometer cannot be greater than current vehicle odometer (...)" }`
- `404`: `{ error: "Vehicle not found" }` / `{ error: "Node not found" }`
- `500`: `{ error: "Failed to create service event" }`

**Validation / business rules**
- События разрешены **только для leaf node**.
- `eventDate` не может быть в будущем.
- `event.odometer` не может быть больше текущего `vehicle.odometer`.
- После создания:
  - `NodeState.upsert` для leaf узла: `status = RECENTLY_REPLACED`, `lastServiceEventId = created event id`
  - `TopNodeState.update` для top-level узла: `status = RECENTLY_REPLACED`

## 3.5 Node status routes

### `GET /api/vehicles/[id]/node-tree`

**Purpose**
- Возвращает дерево узлов со статусами и подробным пояснением для leaf узлов.

**Request**
- Path param: `id`.

**Response**
- `200`: `{ nodeTree }`
- `404`: `{ error: "Vehicle not found" }`
- `500`: `{ error: "Failed to fetch node tree" }`

**Node payload (per node)**
- `id`, `code`, `name`, `level`, `displayOrder`
- `directStatus`
- `computedStatus`
- `effectiveStatus`
- `statusExplanation` (leaf details or `null`)
- `note`, `updatedAt`
- `children`

**Implemented business rules**
- Leaf status calculation использует:
  - `NodeMaintenanceRule`
  - latest leaf `ServiceEvent`
  - current `Vehicle.odometer` / `Vehicle.engineHours`
  - текущую дату
- Поддерживается `MaintenanceTriggerMode`:
  - `WHICHEVER_COMES_FIRST` (основной MVP сценарий)
  - `ANY` (поведение как whichever в коде)
  - `ALL`
- Приоритет статуса: `OVERDUE > SOON > RECENTLY_REPLACED > OK`.
- `RECENTLY_REPLACED` из `NodeState` сохраняется как leaf effective status только пока computed не стал `SOON/OVERDUE`.

**statusExplanation includes**
- `reasonShort`, `reasonDetailed`, `triggerMode`
- `current` (`odometer`, `engineHours`, `date`)
- `lastService`
- `rule`
- `usage` (`elapsed*`, `remaining*`)
- `triggeredBy` (`km` / `hours` / `days` / `null`)

---

### `GET /api/vehicles/[id]/top-nodes`

**Purpose**
- Legacy endpoint верхних узлов для совместимости.

**Request**
- Path param: `id`.

**Response**
- `200`: `{ topNodes }` (filtered to configured top-level node codes)
- `404`: `{ error: "Vehicle not found" }`
- `500`: `{ error: "Failed to fetch top nodes" }`

## 4. Backend business logic summary

## 4.1 Service events are allowed only for leaf nodes

`POST /api/vehicles/[id]/service-events` проверяет, что у выбранного `nodeId` нет детей.  
Если есть дети, route возвращает `400`.

## 4.2 Status propagation after leaf service event

После успешного `POST /service-events`:

1. Leaf `NodeState` создается/обновляется (`RECENTLY_REPLACED`)
2. Соответствующий `TopNodeState` верхнего узла обновляется (`RECENTLY_REPLACED`)

Это обеспечивает совместимость legacy top-level статусов и новой leaf/node-state модели.

## 4.3 Automatic node status calculation

`GET /node-tree` вычисляет status read-time:

- input: `NodeMaintenanceRule` + latest leaf `ServiceEvent` + current `Vehicle` state + now
- output: `computedStatus`, `effectiveStatus`, `statusExplanation`
- если данных недостаточно (нет rule, нет history или измерений) -> `computedStatus = null`, explanation содержит причину

## 5. effectiveStatus tree aggregation

Агрегация идет снизу вверх по дереву:

- Сначала вычисляется leaf self status (`direct` + `computed` merge rules)
- Затем parent `effectiveStatus` берется как highest-priority среди:
  - собственного self status
  - `effectiveStatus` всех children

Fixed priority order:

`OVERDUE > SOON > RECENTLY_REPLACED > OK`.

Если статусов нет ни у узла, ни у потомков -> `effectiveStatus = null`.

## 6. Current backend limitations

- Demo-user привязка в `POST /api/vehicles` и `GET /api/garage` (без полноценных auth sessions).
- Нет background recalculation jobs: статусы считаются на read-time в `/node-tree`.
- `TopNodeState` и `NodeState` используются параллельно (legacy compatibility сохранена).
- Для `STATE_UPDATE` лог-события в `PATCH /state` используется обязательный `nodeId` (текущее ограничение схемы `ServiceEvent`).
- Нет отдельного audit actor (кто именно создал событие) в текущей модели.

