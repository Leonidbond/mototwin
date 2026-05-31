# MotoTwin API Backend

## 1. Scope

Документ описывает фактически реализованные route handlers в `src/app/api/**/route.ts`.

## 2. Backend shape

- Next.js Route Handlers
- Prisma Client + PostgreSQL
- JSON responses
- Error shape: `{ error: string }`
- Validation errors: `{ error: "Validation failed", issues }`

## 2.1 Security / Input validation conventions

Все write-ручки должны соблюдать защитный паттерн ниже (введён в итерации 2 security audit, см. [docs/security/findings.md](./security/findings.md#input-validation-audit-итерация-2--полный-обход-97-ручек--122-handler-ов) и [docs/security/api-findings.md](./security/api-findings.md)).

### Helpers

| Helper | Расположение | Назначение |
|--------|--------------|------------|
| `parseJsonBody<T>(request, { maxBytes })` | [src/lib/http/parse-json-body.ts](../src/lib/http/parse-json-body.ts) | Чтение тела с верхней границей; кидает `BodyParseError` → 413 |
| `strictObject({ ... })` | [src/lib/http/input-validation.ts](../src/lib/http/input-validation.ts) | Alias `z.object({ ... }).strict()`; отвергает лишние поля |
| `boundedText({ min, max })` / `boundedTextOptional({ max })` | то же | trimmed string с явными границами |
| `boundedNumber({ min, max })` / `boundedInt({ min, max })` | то же | finite + range-checked |
| `boundedArray(item, { max })` | то же | массивы с cap-ом длины |
| `boundedJsonValue({ maxSerializedBytes, maxDepth })` | то же | open-structure JSON с serialized-size + depth cap |
| `safeUrl({ max, requireHttps, allowedHosts })` | то же | scheme-allowlist `http(s):` only |
| `safePagination({ maxLimit, defaultLimit })` | то же | `{ limit, offset }` с потолком |
| `parseSearchParamText({ max })` / `parseSearchParamInt({ min, max, fallback })` | то же | length/range-capped разбор `URLSearchParams` без throw |
| `safeRenderUrl(input)` | [src/lib/http/safe-render-url.ts](../src/lib/http/safe-render-url.ts) | Defense-in-depth-фильтр для URL из БД перед возвратом клиенту |
| `rateLimit({ bucket, request, limit, windowMs, extraKey })` + `rateLimit429(decision)` | [src/lib/http/rate-limit.ts](../src/lib/http/rate-limit.ts) | In-memory sliding-window rate limiter, уже применён к auth + cost-sensitive ручкам |
| `fetchWithTimeout(url, init, { timeoutMs })` | [src/lib/http/fetch-with-timeout.ts](../src/lib/http/fetch-with-timeout.ts) | `AbortController`-обёртка для outbound fetch (Yandex/OAuth) |

### Шаблон write-handler-а

```ts
import { z } from "zod";
import { NextResponse } from "next/server";
import { BodyParseError, parseJsonBody } from "@/lib/http/parse-json-body";
import { strictObject, boundedText, boundedInt } from "@/lib/http/input-validation";
import { getCurrentUserContext } from "@/app/api/_shared/current-user-context";

const bodySchema = strictObject({
  title: boundedText({ max: 300 }),
  quantity: boundedInt({ min: 1, max: 10_000 }),
});

export async function POST(request: Request) {
  try {
    const userCtx = await getCurrentUserContext();
    const raw = await parseJsonBody<unknown>(request, { maxBytes: 8 * 1024 });
    const body = bodySchema.parse(raw);
    // ... domain call ...
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof BodyParseError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", issues: error.issues },
        { status: 400 }
      );
    }
    // ... остальные ветви (AuthError, AdminAuthError, ...)
    throw error;
  }
}
```

### ESLint guard

Регрессии блокируются автоматически. В [eslint.config.mjs](../eslint.config.mjs) для `src/app/api/**/route.ts` включён `no-restricted-syntax`, который при попытке добавить:

- `await request.json()` — потребует `parseJsonBody(...)` (MT-SEC-069).
- `z.object({ ... })` — потребует `strictObject({ ... })` (MT-SEC-068 mass-assignment defence).

Если есть **легитимная причина** обойти guard (например, `multipart/form-data` через `request.formData()` или `.passthrough()` для специфической схемы) — добавьте `// eslint-disable-next-line no-restricted-syntax -- <причина / MT-SEC-link>`, чтобы ревью могло аудировать исключение.

### Чек-лист на ревью

- [ ] Тело читается через `parseJsonBody<T>(request, { maxBytes: ... })`, а не `await request.json()`.
- [ ] Zod-схема — `strictObject({ ... })` (для вложенных object-полей — тоже `strictObject`).
- [ ] Все user-controlled `string` поля имеют `.max(...)` через `boundedText`/`boundedTextOptional`.
- [ ] Все `number`/`int` поля имеют `min`/`max` через `boundedNumber`/`boundedInt`.
- [ ] Все массивы имеют `.max(...)` через `boundedArray`.
- [ ] Поля произвольной формы (`z.unknown()` / `z.any()`) заменены на `boundedJsonValue({ maxSerializedBytes, maxDepth })`.
- [ ] URL-поля валидируются `safeUrl({ max })` (а не `z.string().url()` — `safeUrl` отвергает `javascript:`/`data:`/`file:`).
- [ ] Search-параметры читаются через `parseSearchParamText`/`parseSearchParamInt`, а не `searchParams.get(...)?.trim()` напрямую.
- [ ] Любой URL из БД, возвращаемый клиенту и потенциально попадающий в `<a href>` / `<Image src>`, проходит через `safeRenderUrl(...)` на стороне сервера.
- [ ] Любая ручка, дёргающая платный external API или дорогой DB-запрос без auth, защищена `rateLimit({ ... })` + `rateLimit429(decision)`.
- [ ] Outbound `fetch` обёрнут `fetchWithTimeout` либо использует библиотеку с собственным таймаутом (`google-auth-library`, `jose.createRemoteJWKSet`).
- [ ] Каждый user-scoped ресурс резолвится через `getCurrentUserContext()` / `getVehicleInCurrentContext(vehicleId)` — двойная привязка `garageId + ownerUserId`.

## 3. Implemented routes

## 3.1 Catalog

Каталог моделей унифицирован по 4-уровневой иерархии (см. [data-model.md §MotorcycleBrand / MotorcycleModelFamily / MotorcycleVariant / MotorcycleGeneration](./data-model.md)). Старые роуты `/api/brands`, `/api/models`, `/api/model-variants` удалены.

### `GET /api/motorcycle-brands`
- Response `200`: `{ brands: Array<{ id, name, slug, supportLevel: MotoSupportLevel }> }`
- `supportLevel` агрегирован как лучший среди дочерних поколений (`MVP_CORE > MVP_CORE_LEGACY > COMMUNITY_SUPPORT > EARLY_BETA > NO_FITMENT_DATA_YET`); `EARLY_BETA` если поколений ещё нет.
- Sort: `name asc`.
- Response `500`: `{ error: "Failed to fetch motorcycle brands" }`

### `GET /api/motorcycle-model-families?motorcycleBrandId=...`
- Required query: `motorcycleBrandId`
- Response `200`: `{ families: Array<{ id, motorcycleBrandId, name, slug, supportLevel: MotoSupportLevel }> }`
- Response `400`: `{ error: "motorcycleBrandId is required" }`
- Response `500`: `{ error: "Failed to fetch motorcycle model families" }`
- Sort: `name asc`.

### `GET /api/motorcycle-variants?motorcycleModelFamilyId=...`
- Required query: `motorcycleModelFamilyId`
- Response `200`: `{ variants: Array<{ id, motorcycleModelFamilyId, name, slug, supportLevel: MotoSupportLevel }> }`
- Response `400`: `{ error: "motorcycleModelFamilyId is required" }`
- Response `500`: `{ error: "Failed to fetch motorcycle variants" }`
- Sort: `name asc`.

### `GET /api/motorcycle-generations?motorcycleVariantId=...`
- Required query: `motorcycleVariantId`
- Response `200`: `{ generations: Array<{ id, motorcycleVariantId, name, yearFrom, yearTo, yearsLabel, marketRegion, segment, supportLevel, technicalSpecs }> }`. `technicalSpecs` — это `VehicleTechnicalSpecsView` (`engine`, `displacementCc`, `powerValue`, `powerUnit`, `powerHpNormalized`, `torqueNm`, `gearbox`, `drive`, `frontWheelIn`/`rearWheelIn`, `frontTire`/`rearTire`, `fuelLiters`, `weightKg`, `weightType`, `seatMm`, `marketRegion`).
- Response `400`: `{ error: "motorcycleVariantId is required" }`
- Response `500`: `{ error: "Failed to fetch motorcycle generations" }`
- Sort: `yearFrom asc`, потом `name asc`.

## 3.2 Garage and vehicle

### `GET /api/garage`
- Returns garage vehicles for current user
- Response `200`: `{ vehicles: GarageVehicleItem[] }`. Каждый ТС включает `motorcycleBrand`, `motorcycleModelFamily`, `motorcycleVariant`, `motorcycleGeneration` (с `yearFrom/yearTo/yearsLabel`), `technicalSpecs: VehicleTechnicalSpecsView | null`, `rideProfile`, `attentionSummary?`.
- Response `500`: загрузка гаража/пользователя.

### `POST /api/vehicles`
- Creates vehicle + ride profile.
- Required body:
  - `motorcycleBrandId`, `motorcycleModelFamilyId`, `motorcycleVariantId`, `motorcycleGenerationId` — все 4 уровня обязательны и должны быть согласованы (бэкенд валидирует цепочку через `prisma.motorcycleGeneration.findFirst`)
  - `odometer` (int >= 0)
  - `engineHours` (`int >= 0 | null`)
  - `rideProfile` with enum fields
- Optional body: `nickname`, `vin`
- Response `201`: `{ vehicle: GarageVehicleItem }`
- Response `400`: validation failed (включая разорванную цепочку 4-уровневой иерархии)
- Response `403`: лимит `maxVehicles` по тарифу (`subscription` error shape)
- Response `500`: create failure

### `GET /api/vehicles/[id]`
- Response `200`: `{ vehicle: VehicleDetailApiRecord }` — иерархия с вложенным `motorcycleGeneration: { yearFrom, yearTo, yearsLabel, marketRegion, technicalSpecs }`. Клиент уплощает в `VehicleDetail` через `vehicleDetailFromApiRecord` из `@mototwin/domain`.
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
- На **FREE** в ответе `meta`: `plan`, `visibleLimit` (10), `hiddenCount` — в БД событий больше, клиент показывает paywall в журнале
- Response `200`: `{ serviceEvents, meta? }`
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
  - **`entryMode` / `mode`**: `DETAILED` или `ADVANCED` требуют `allowedEntryModes` на плане; иначе `403`
  - выбор узлов: на FREE/RIDER — только узлы из топ-набора (см. subscription guards)
- Request notes:
  - **`nextReminderDate`**: допускается **`null`** при выключенном напоминании или при включённом напоминании без даты (только пробег/моточасы); см. Zod-схему в `service-events/route.ts`
  - **`installLocationAddress`**, **`installLocationLat`**, **`installLocationLng`**: опционально; адрес до 500 символов; широта −90…90, долгота −180…180 (Zod в `service-events/route.ts` и `…/[eventId]/route.ts`). UI и ключ Яндекс.Карт — [web-service-event-form.md](./web-service-event-form.md), §5.1.
  - **`servicePlaceId`** (`string | null`) и **`servicePlaceSnapshot`** (`Json | null`) — опционально. Если `servicePlaceId` передан, он должен принадлежать текущему пользователю; иначе `404`.
- Side effects after create (транзакция):
  - `NodeState` для **каждого** узла из `items` и anchor (`RECENTLY_REPLACED`, `lastServiceEventId`)
  - пересчёт **`TopNodeState`** по мотоциклу
  - **`syncExpenseItemForServiceEvent`** — синтез/обновление **`ExpenseItem`** по сумме события и по **`installedPartsJson`** (wishlist id из JSON обрабатываются **даже при нулевых/пустых** верхних суммах частей/работы — сценарий «Готово к установке»)
  - **`linkInstalledExpenseItemsToServiceEvent`** — привязка выбранных **`installedExpenseItemIds`**, перевод связанных wishlist-строк в **`INSTALLED`** там, где у расхода задан `shoppingListItemId`
- Response `201`: `{ serviceEvent }`
- Response `400` / `404` / `500` depending on failure class

### `PATCH /api/vehicles/[id]/service-events/[eventId]`

- Обновляет существующее bundle-событие.
- Поддерживает те же place-поля, что и create: `servicePlaceId`, `servicePlaceSnapshot`, legacy `installLocation*`.
- Проверка `servicePlaceId` аналогична create (только place текущего пользователя).
- Response `200`: `{ serviceEvent }`

## 3.4.1 Service places

### `GET /api/service-places/search?query=...&mode=AUTO|ADDRESS|ORGANIZATION&latitude=&longitude=`

- Auth required.
- Нормализованный поиск мест сервиса для web/expo pickers.
- Источники:
  - `ORGANIZATION`/`AUTO`: Geosuggest (`types=biz`) при наличии `YANDEX_GEOSUGGEST_API_KEY`.
  - fallback и `ADDRESS`: HTTP geocoder (`YANDEX_GEOCODER_API_KEY`).
- **Лимит выдачи:** не более **10** мест за запрос (`SERVICE_PLACE_SEARCH_MAX_RESULTS` в `src/lib/service-place-search.ts`). Это совпадает с лимитом API «Геосаджест» (`results` ≤ 10) и намеренно меньше, чем просмотр категории в приложении Яндекс.Карт (сотни POI) — там другой продукт (справочник/Places API с пагинацией). Для полного каталога по категории потребуется отдельная интеграция Places API.
- Подсказка по запросу: указывайте город («мотосервис, Москва»), иначе Geosuggest вернёт мало релевантных подсказок.
- Response `200`:
  - `places: ServicePlaceSearchResultItem[]` (0–10)
  - `meta: { query, mode, source }` — `source`: `geosuggest` | `geocoder` | `manual`
  - optional `warning` (например, ключ suggest недоступен, 403).

### `POST /api/service-places`

- Auth required.
- Создаёт (или переиспользует по dedupe `(userId, provider, providerPlaceId)`) сохранённое место сервиса.
- Request body: `provider`, `providerPlaceId?`, `type`, `title`, `address`, `latitude?`, `longitude?`, `category?`, `contact?`, `metadata?`.
- Response `200`: `{ place, snapshot }`, где `snapshot` готов к записи в `ServiceEvent.servicePlaceSnapshot`.

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
  - на FREE/RIDER: `locked`, `selectable` (листья вне топ-набора — `locked: true`; PRO — все selectable)
- Uses vehicle state + rules + latest leaf service events + node states
- Aggregates status upward using fixed priority:
  `OVERDUE > SOON > RECENTLY_REPLACED > OK`
- Response `200`: `{ nodeTree }` — полное дерево, не плоский список топ-узлов
- Response `404`: vehicle not found
- Response `500`: fetch failure

### `GET /api/vehicles/[id]/top-nodes`
- Legacy compatibility endpoint for top-level status list
- Filters by configured top-level node codes
- Response `200`: `{ topNodes }`
- Response `404`: vehicle not found
- Response `500`: fetch failure

## 3.6 Global node catalog (user TOP)

### `GET /api/nodes/top`
- Returns curated TOP service nodes for current user
- Uses `UserSettings.favoriteNodeCodes` when non-empty; otherwise `DEFAULT_TOP_SERVICE_NODE_CODES` from [`src/lib/top-service-nodes.ts`](../src/lib/top-service-nodes.ts)
- Requires `getCurrentUserContext()`
- Response `200`: `{ nodes: TopServiceNodeItem[] }`
- Response `500`: fetch failure

### `GET /api/nodes/service`
- Flat list of all `isActive && isServiceRelevant` nodes (profile picker)
- Response `200`: `{ nodes: ServiceNodeItem[] }`
- Response `500`: fetch failure

## 3.7 User settings

### `GET /api/user-settings`
- Returns normalized settings for current user (`UserSettings` row must exist — seed/bootstrap)
- Includes `favoriteNodeCodes`, `defaultNodeView` among other profile fields
- Response `200`: `{ settings }`
- Response `503`: settings row missing

### `PATCH /api/user-settings`
- Partial update; zod-validated fields including:
  - `favoriteNodeCodes`: `string[]`, max 15 items — только **листья** каталога; на **FREE** → `403`
  - `defaultNodeView`: `"top"` | `"all"`
- Response `200`: `{ settings }` (merged + normalized)
- Response `400`: validation error
- Response `403`: ограничение тарифа (ТОП-узлы на FREE)

See [custom-top-nodes-mvp.md](./custom-top-nodes-mvp.md).

## 3.8 Subscription (mock billing)

### `GET /api/subscription/current`
- Текущий план, `trialEndsAt`, `capabilities` (матрица из `src/lib/subscription/capabilities.ts`)
- Response `200`: `SubscriptionCurrentResponse`
- Требует сессию / dev-user

### `PATCH /api/subscription/plan`
- Body: `{ plan: "FREE" | "RIDER" | "PRO" }`
- Response `200`: обновлённая подписка
- Response `400` / `403`: validation / blocked

См. [subscription-access-mvp.md](./subscription-access-mvp.md).

## 3.9 Admin users

### `GET /api/admin/users`
- Requires admin access (`requireAnyAdmin`).
- Filters:
  - `q` (email/displayName search),
  - `plan` (`FREE|RIDER|PRO|all`),
  - `hasVehicles` (`yes|no`),
  - `role` (`SUPER_ADMIN|CATALOG_MANAGER|MODERATOR|ANALYST|all`),
  - `status` (`active|blocked|all`).
- Response `200`: paginated list with role/plan/activity metrics and blocking fields (`isBlocked`, `blockedAt`, `blockReason`).

### `GET /api/admin/users/[id]`
- Requires admin access (`requireAnyAdmin`).
- Response `200`: detailed profile (garages, recent vehicles, fitment, service events) + blocking fields.
- Response `404`: `{ error: "Пользователь не найден" }`

### `PATCH /api/admin/users/[id]`
- Requires admin access (`requireAnyAdmin`).
- Request body:
  - `isBlocked: boolean`
  - `reason: string` (min 3, max 500)
- Business rules:
  - current admin cannot block self;
  - when `isBlocked=true`, backend revokes all active sessions (app + Auth.js).
- Response `200`: `{ id, isBlocked, blockedAt, blockReason }`
- Response `400`: validation/self-block errors
- Response `404`: target user not found

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
