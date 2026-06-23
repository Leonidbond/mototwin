# MotoTwin Data Model

## 1. Scope

Документ описывает текущее реализованное состояние модели в `prisma/schema.prisma`.

## 2. Enums

- `PlanType`: `FREE`, `RIDER`, `PRO`
- `ServiceEventEntryMode`: `QUICK`, `DETAILED` — доступ по тарифу (`allowedEntryModes`); см. [subscription-access-mvp.md](./subscription-access-mvp.md)
- `ServicePlaceType`: `ORGANIZATION`, `ADDRESS`, `CUSTOM`
- `SubscriptionStatus`: `ACTIVE`, `INACTIVE`, `CANCELED`, `TRIAL`
- `UsageType`: `CITY`, `HIGHWAY`, `MIXED`, `OFFROAD`
- `RidingStyle`: `CALM`, `ACTIVE`, `AGGRESSIVE`
- `LoadType`: `SOLO`, `PASSENGER`, `LUGGAGE`, `PASSENGER_LUGGAGE`
- `UsageIntensity`: `LOW`, `MEDIUM`, `HIGH`
- `TopNodeStatus`: `OK`, `SOON`, `OVERDUE`, `RECENTLY_REPLACED`
- `NodeStatus`: `OK`, `SOON`, `OVERDUE`, `RECENTLY_REPLACED`
- `MaintenanceTriggerMode`: `WHICHEVER_COMES_FIRST`, `ANY`, `ALL`
- `ServiceEventKind`: `SERVICE`, `STATE_UPDATE`
- `ExpenseCategory`: `PART`, `CONSUMABLE`, `SERVICE_WORK`, `REPAIR`, `DIAGNOSTICS`, `OTHER`, `FUEL`
- `ExpenseInstallStatus`: `BOUGHT_NOT_INSTALLED`, `INSTALLED`, `NOT_APPLICABLE`
- `ExpensePurchaseStatus`: `PLANNED`, `PURCHASED`
- `ExpenseInstallationStatus`: `NOT_INSTALLED`, `INSTALLED`
- `MotoSupportLevel`: `MVP_CORE`, `MVP_CORE_LEGACY`, `COMMUNITY_SUPPORT`, `EARLY_BETA`, `NO_FITMENT_DATA_YET` — уровень поддержки для `MotorcycleBrand` / `MotorcycleModelFamily` / `MotorcycleVariant` / `MotorcycleGeneration` (агрегируется снизу вверх).
- `MotoDriveType`: `CHAIN`, `BELT`, `SHAFT`, `OTHER` — тип привода у `MotorcycleTechnicalSpecs`.
- `MotoPowerUnit`: `HP`, `KW`, `PS` — единица номинальной мощности; loader нормализует в `powerHpNormalized`.
- `MotoMarketRegion`: `EU`, `US`, `JP`, `RU`, `IN`, `LATAM`, `WORLDWIDE` (и т.п. — см. `prisma/schema.prisma`) — регион рынка `MotorcycleGeneration`.
- `MotoWeightType`: `DRY`, `WET`, `KERB` — какой именно показатель веса записан в `weightKg`.

## 3. Core entities and relationships

### User / Subscription

- `User` has many `Vehicle`.
- `User` has many `Garage`.
- `User` has optional 1:1 `UserSettings` (`userId` unique).
- `User.email` is nullable unique (transitional pre-auth ownership mode).
- `User.displayName` is optional.
- `Subscription` is optional 1:1 to `User` (`userId` unique): `planType` (`PlanType`), `status` (`SubscriptionStatus`), `startedAt`, `endsAt`, `trialEndsAt`.
- При регистрации создаётся строка подписки (bootstrap); смена плана в MVP — `PATCH /api/subscription/plan` без биллинга.
- См. [subscription-access-mvp.md](./subscription-access-mvp.md).

### Garage

- `Garage` belongs to `User` via `ownerUserId`.
- `Garage` has many `Vehicle`.
- Current pre-auth runtime uses stable demo garage title `Мой гараж`.

### UserSettings

- `UserSettings` belongs to `User` via unique `userId` (1:1).
- Stores `defaultCurrency`, `distanceUnit`, `engineHoursUnit`, `dateFormat`, `defaultSnoozeDays`.
- Stores `vehicleTrashRetentionDays` for trash retention policy.
- Stores `favoriteNodeCodes` (`String[]`, default `[]`) — пользовательский ТОП; пустой массив = стандартные 15 кодов на API.
- Stores `defaultNodeView` (`String`, default `"top"`) — стартовый режим дерева узлов: `top` | `all`.
- Runtime reads/writes are done via `/api/user-settings` and scoped through current user context.
- Local client storage is fallback/cache only; DB is primary source when API is available.
- See [custom-top-nodes-mvp.md](./custom-top-nodes-mvp.md) for TOP customization UX and API.

### MotorcycleBrand / MotorcycleModelFamily / MotorcycleVariant / MotorcycleGeneration

Канонический иерархический стандарт мотоциклов (см. `docs/models/mototwin_model_technical_master_standard_cursor.md`):

- `MotorcycleBrand` → `MotorcycleModelFamily` (1:N), unique `@@unique([brandId, slug])`. Семейство — это «маркетинговая модель» в терминах вендора (`690 Enduro R`, `R 1300 GS`).
- `MotorcycleModelFamily` → `MotorcycleVariant` (1:N), unique `@@unique([familyId, slug])`. Вариант — конфигурация семейства (`R 1300 GS Trophy`, `690 Enduro R`).
- `MotorcycleVariant` → `MotorcycleGeneration` (1:N), unique `@@unique([variantId, name, yearFrom, yearTo])`. **Поколение** — каноничный якорь fitment-данных и техспек: `yearFrom`, `yearTo` (nullable), `yearsLabel` ("2019-current"), `marketRegion` (`MotoMarketRegion`), `segment`, `supportLevel` (`MVP_CORE` / `MVP_CORE_LEGACY` / `COMMUNITY_SUPPORT` / `EARLY_BETA` / `NO_FITMENT_DATA_YET`), `dataStatus`, `comment`, `sourceUrl`.
- `MotorcycleTechnicalSpecs` — 1:1 sidecar к `MotorcycleGeneration` (`@unique generationId`); содержит `engine`, `displacementCc`, `powerValue`/`powerUnit`/`powerHpNormalized`, `torqueNm`, `gearbox`, `drive` (`MotoDriveType`), `frontWheelIn`/`rearWheelIn`, `frontTire`/`rearTire`, `fuelLiters`, `weightKg`/`weightType` (`MotoWeightType`), `seatMm`. Loader (`prisma/motorcycle-technical-master-loader.ts`) подставляет `powerHpNormalized` из `powerValue + powerUnit`, если не задано вручную.

Сидинг — `prisma/seed-data/*-model-technical-master.csv` через `loadMotorcycleTechnicalMasterCsv` (zod-валидация по строкам). Бренды и поколения единообразны для всех вендоров (BMW, KTM и т. д.) — см. `docs/models/mototwin_*_model_technical_master_*.md`.

### Vehicle / RideProfile

- `Vehicle` links to `User`, optional `Garage`, и FKs `motorcycleBrandId`/`motorcycleModelFamilyId`/`motorcycleVariantId`/`motorcycleGenerationId`. **Поколение — обязательный якорь** для подбора деталей и техспек.
- `Vehicle` has soft-delete fields: `trashedAt`, `trashExpiresAt`.
- `RideProfile` is effectively 1:1 with `Vehicle` via unique `vehicleId`.
- `Vehicle` also links to `ServiceEvent`, `ExpenseItem`, `NodeState`, `TopNodeState`.
- Ownership canonical source: `Vehicle.garageId -> Garage.ownerUserId`.
- `Vehicle.userId` is transitional/denormalized compatibility field and should match `Garage.ownerUserId`.
- Seed includes safe repair step for mismatched `Vehicle.userId` vs `Garage.ownerUserId`.
- Runtime API ownership reads use ownership predicate directly in final vehicle read query.
- Active Garage routes exclude trashed vehicles; Trash routes read vehicles with `trashedAt != null`.
- Profile edit route (`PATCH /api/vehicles/[id]`) updates only `nickname`, `vin`, and `RideProfile` fields.
- `odometer`/`engineHours` are updated only by state-update flow (`PATCH /api/vehicles/[id]/state` with `STATE_UPDATE` event side effect).

### Node hierarchy

- `Node` is a self-relation tree via `parentId` (`NodeHierarchy`).
- Each node has `code`, `name`, `level`, `displayOrder`, `isActive`.
- Node is used by service events and status layers.

### ServiceEvent

- `ServiceEvent` belongs to `Vehicle` and `Node`.
- Опционально связан с `ServicePlace` через `servicePlaceId`.
- `eventKind` distinguishes:
  - `SERVICE`
  - `STATE_UPDATE`
- `mode`: `BASIC` | `ADVANCED` (форма быстрый / подробный бандл).
- `entryMode`: `QUICK` | `DETAILED` (ограничение тарифа; подробный UI ⇒ `DETAILED`).
- Stores operation facts: `eventDate`, `odometer`, `engineHours`, `serviceType`, optional cost/comment/parts json.
- Optional **place of service / installation**:
  - legacy: `installLocationAddress`, `installLocationLat`, `installLocationLng`
  - new: `servicePlaceId` + immutable `servicePlaceSnapshot` (`Json`) для исторического снимка.
- Form extras (also on `ServiceEvent`): `performedBy`, `serviceProviderNote`, attachment intent flags, next-service reminder fields — see [web-service-event-form.md](./web-service-event-form.md).
- A service event with valid `costAmount/currency` is mirrored into linked `ExpenseItem` for analytics.

### ServicePlace

- `ServicePlace` belongs to `User`.
- Поля: `provider`, `providerPlaceId?`, `type` (`ServicePlaceType`), `title`, `address`, `latitude?`, `longitude?`, `category?`, `contactPhone?`, `contactUrl?`, `metadata?`.
- Уникальность: `@@unique([userId, provider, providerPlaceId])` для dedupe провайдерных мест.
- `ServiceEvent` хранит ссылку на запись и JSON snapshot, чтобы старые события не менялись при редактировании карточки места.

### ExpenseItem

- `ExpenseItem` is the canonical source for expense analytics.
- It belongs to `Vehicle`.
- Optional links:
  - `nodeId` -> `Node`
  - `serviceEventId` -> `ServiceEvent`
  - `shoppingListItemId` -> `PartWishlistItem` (the current implementation of product ShoppingListItem)
- Required money fields: `amount` (`Decimal(12,2)`), `currency`.
- Required classification fields: `category`, `installStatus`.
- Lifecycle fields:
  - `purchaseStatus` (`PLANNED` / `PURCHASED`)
  - `installationStatus` (`NOT_INSTALLED` / `INSTALLED`)
  - `purchasedAt`
  - `installedAt`
- `expenseDate` drives calendar-year season and monthly grouping.
- Snapshot fields `partSku` / `partName` / `vendor` / `odometer` / `engineHours` preserve human-readable purchase/install context even if catalog/wishlist/service data changes.
- Supported statuses:
  - `BOUGHT_NOT_INSTALLED`
  - `INSTALLED`
  - `NOT_APPLICABLE`

The product metric **«куплено, но не установлено»** is intentionally stricter than legacy `installStatus`: it counts only `purchaseStatus = PURCHASED`, `installationStatus = NOT_INSTALLED`, and `serviceEventId = null`.

Only expense categories defined in `ExpenseCategory` are representable in analytics. **`FUEL`** covers fuel top-ups at vehicle level (`nodeId` null, manual entry only). Insurance, fines, parking, wash, and gear remain out of scope.

Expense node summaries for the full node tree are exposed by `GET /api/expenses/node-summary?vehicleId=...&year=...`. The API aggregates `ExpenseItem` totals separately by currency and rolls child-node expenses up to every parent node. **`FUEL` rows are excluded** from node-summary (no `nodeId`).

### NodeState / TopNodeState

- `NodeState`: direct per-vehicle per-node status snapshot.
  - unique pair `@@unique([vehicleId, nodeId])`
- `TopNodeState`: top-level compatibility status layer.
  - unique pair `@@unique([vehicleId, nodeId])`

`NodeState` drives direct status behavior in node tree logic.
`TopNodeState` is still present for compatibility endpoints/flows.

### NodeMaintenanceRule

- One rule per node (`@@unique([nodeId])`).
- Stores intervals/warnings for km/hours/days and `triggerMode`.
- Used to compute leaf `computedStatus` in `/api/vehicles/[id]/node-tree`.

## 4. Relationship summary

- `User 1:N Vehicle`
- `User 1:N Garage`
- `User 1:1 UserSettings` (optional in schema, seed-initialized for demo/dev users)
- `Garage 1:N Vehicle`
- `Vehicle 1:1 RideProfile` (optional, enforced by unique)
- `Vehicle` soft-delete timeline: active (`trashedAt = null`) or trashed (`trashedAt != null`).
- `Vehicle 1:N ServiceEvent`
- `Vehicle 1:N ExpenseItem`
- `Vehicle 1:N NodeState`
- `Vehicle 1:N TopNodeState`
- `Node self-tree (parent/children)`
- `Node 1:1 NodeMaintenanceRule` (optional)
- `Node 1:N ServiceEvent`
- `Node 1:N ExpenseItem`
- `Node 1:N NodeState`
- `Node 1:N TopNodeState`

## 5. Status and maintenance interaction

Current source inputs for node status behavior:
1. `Vehicle` current state (`odometer`, `engineHours`)
2. latest leaf `ServiceEvent`
3. `NodeMaintenanceRule`
4. `NodeState` direct status snapshot

Computed and aggregated statuses are returned by backend node-tree endpoint.

## 6. Current limitations

- `TopNodeState` and `NodeState` coexist (migration compatibility).
- `STATE_UPDATE` log entry still requires `nodeId` due to schema requirement.
- No separate audit actor model in `ServiceEvent` yet.
- `UserSettings` stores values as strings at DB layer; allowed value set is currently enforced in API/domain validation (enum/check DB hardening is deferred).
- `UserSettings` bootstrap is seed-driven; request-path context resolver does not auto-create missing rows.
- Expired trashed vehicles are not auto-deleted in current MVP step (no scheduler/background cleanup yet).

## 7. Ownership transition status

Implemented in Phase 1:

- `Garage` model and relation to `User`;
- `Vehicle.garageId` relation (nullable transitional field);
- demo user + demo garage seeding and backfill path for missing `garageId`.
- `Vehicle.userId` remains transitional; runtime guards rely on garage ownership and validate invariant consistency.

Planned next:

- Phase 2A implemented for base Garage/Vehicle routes (list/create/detail/profile update);
- Phase 2B implemented for nested vehicle routes (`node-tree`, `state`, `top-nodes`, `service-events`, `wishlist`, `wishlist/kits`) with `404` on out-of-context vehicle ids;
- later login/session replacement for demo resolver;
- later auth-session integration for already implemented server-side `UserSettings`.

Reference:

- [auth-data-ownership-architecture.md](./auth-data-ownership-architecture.md)

## 8. Related docs

- `api-backend.md`
- `functional-logic.md`
- `parity/cross-platform-parity.md`
