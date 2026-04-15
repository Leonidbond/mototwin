# MotoTwin MVP Data Model

## 1. Scope

Документ описывает **текущую реализованную** структуру данных в `prisma/schema.prisma` и ее практическое применение в MVP.

Все имена моделей и полей приведены в точности как в схеме.

## 2. Enums

### `PlanType`
- Values: `FREE`, `PRO`
- Используется в `Subscription.planType`.

### `SubscriptionStatus`
- Values: `ACTIVE`, `INACTIVE`, `CANCELED`, `TRIAL`
- Используется в `Subscription.status`.

### `UsageType`
- Values: `CITY`, `HIGHWAY`, `MIXED`, `OFFROAD`
- Используется в `RideProfile.usageType`.

### `RidingStyle`
- Values: `CALM`, `ACTIVE`, `AGGRESSIVE`
- Используется в `RideProfile.ridingStyle`.

### `LoadType`
- Values: `SOLO`, `PASSENGER`, `LUGGAGE`, `PASSENGER_LUGGAGE`
- Используется в `RideProfile.loadType`.

### `UsageIntensity`
- Values: `LOW`, `MEDIUM`, `HIGH`
- Используется в `RideProfile.usageIntensity`.

### `TopNodeStatus`
- Values: `OK`, `SOON`, `OVERDUE`, `RECENTLY_REPLACED`
- Используется в `TopNodeState.status` (legacy/compatibility слой).

### `NodeStatus`
- Values: `OK`, `SOON`, `OVERDUE`, `RECENTLY_REPLACED`
- Используется в `NodeState.status`.

### `MaintenanceTriggerMode`
- Values: `WHICHEVER_COMES_FIRST`, `ANY`, `ALL`
- Используется в `NodeMaintenanceRule.triggerMode`.

### `ServiceEventKind`
- Values: `SERVICE`, `STATE_UPDATE`
- Используется в `ServiceEvent.eventKind`.

## 3. Models

## `User`

**Purpose**
- Аккаунт владельца данных.

**Key fields**
- `id`, `email`, `passwordHash`, `createdAt`, `updatedAt`

**Relations**
- `subscription` (1:1 optional)
- `vehicles` (1:N)

**Usage**
- В текущем MVP API используется demo user (по email) как владелец гаража и мотоциклов.

---

## `Subscription`

**Purpose**
- План и статус подписки пользователя.

**Key fields**
- `id`, `userId` (unique), `planType`, `status`, `startedAt`, `endsAt`

**Relations**
- `user` (N:1, `onDelete: Cascade`)

**Usage**
- Данные присутствуют в модели; в текущем UI сценарии управления подпиской не реализован.

---

## `Brand`

**Purpose**
- Справочник брендов.

**Key fields**
- `id`, `name` (unique), `slug` (unique), `createdAt`

**Relations**
- `models` (1:N)
- `vehicles` (1:N)

**Usage**
- Onboarding: выбор бренда через `/api/brands`.

---

## `Model`

**Purpose**
- Модель мотоцикла внутри бренда.

**Key fields**
- `id`, `brandId`, `name`, `slug`, `createdAt`
- `@@unique([brandId, slug])`

**Relations**
- `brand` (N:1)
- `variants` (1:N)
- `vehicles` (1:N)

**Usage**
- Onboarding: выбор модели через `/api/models?brandId=...`.

---

## `ModelVariant`

**Purpose**
- Конкретная модификация модели (год/версия + техданные).

**Key fields**
- `id`, `modelId`, `year`, `generation`, `versionName`, `market`
- техполя: `engineType`, `coolingType`, `wheelSizes`, `brakeSystem`, `chainPitch`, `stockSprockets`
- `@@index([modelId, year])`

**Relations**
- `model` (N:1)
- `vehicles` (1:N)

**Usage**
- Onboarding: выбор модификации через `/api/model-variants?modelId=...`.
- Garage/Vehicle detail: показ техсводки.

---

## `Vehicle`

**Purpose**
- Центральная сущность мотоцикла в гараже.

**Key fields**
- `id`, `userId`, `brandId`, `modelId`, `modelVariantId`
- `nickname`, `vin`
- `odometer`, `engineHours`
- `createdAt`, `updatedAt`

**Relations**
- `user`, `brand`, `model`, `modelVariant` (N:1)
- `rideProfile` (1:1 optional)
- `serviceEvents` (1:N)
- `topNodeStates` (1:N)
- `nodeStates` (1:N)

**Usage**
- Основа для Garage/Vehicle detail.
- `odometer` и `engineHours` участвуют в автоматическом статусе узлов.

---

## `RideProfile`

**Purpose**
- Профиль эксплуатации мотоцикла.

**Key fields**
- `id`, `vehicleId` (unique)
- `usageType`, `ridingStyle`, `loadType`, `usageIntensity`
- `createdAt`, `updatedAt`

**Relations**
- `vehicle` (N:1, фактически 1:1 по unique `vehicleId`)

**Usage**
- Создается в onboarding, отображается в Garage и Vehicle detail.

---

## `Node`

**Purpose**
- Иерархия узлов обслуживания (taxonomy).

**Key fields**
- `id`, `code` (unique), `name`
- `parentId`, `level`, `displayOrder`
- `isActive`, `createdAt`

**Relations**
- self-relation `NodeHierarchy`: `parent` / `children`
- `serviceEvents` (1:N)
- `topNodeStates` (1:N)
- `nodeStates` (1:N)
- `maintenanceRule` (1:1 optional)

**Usage**
- Построение дерева узлов на странице мотоцикла.
- Привязка сервисных событий и правил обслуживания.

---

## `ServiceEvent`

**Purpose**
- Операционный журнал событий по мотоциклу (сервис + системные state updates).

**Key fields**
- `id`, `vehicleId`, `nodeId`
- `eventKind` (`ServiceEventKind`, default `SERVICE`)
- `eventDate`, `odometer`, `engineHours`
- `serviceType`
- `installedPartsJson`, `costAmount`, `currency`, `comment`
- `createdAt`

**Relations**
- `vehicle` (N:1)
- `node` (N:1)

**Usage**
- Источник истории в service log (`GET /service-events`).
- `POST /service-events` создает `SERVICE`.
- `PATCH /state` создает `STATE_UPDATE`.
- Последнее событие по leaf узлу используется при status calculation.

---

## `TopNodeState`

**Purpose**
- Статус верхнего узла для `vehicle + top node`.

**Key fields**
- `vehicleId`, `nodeId`, `status`, `lastServiceEventId`, `note`
- `updatedAt`, `createdAt`
- `@@unique([vehicleId, nodeId])`

**Relations**
- `vehicle` (N:1)
- `node` (N:1)

**Usage**
- Legacy compatibility слой: endpoint `/api/vehicles/[id]/top-nodes` и обновление в `POST /service-events`.

---

## `NodeState`

**Purpose**
- Прямой статус конкретного узла для конкретного мотоцикла.

**Key fields**
- `vehicleId`, `nodeId`, `status`, `lastServiceEventId`, `note`
- `createdAt`, `updatedAt`
- `@@unique([vehicleId, nodeId])`

**Relations**
- `vehicle` (N:1)
- `node` (N:1)

**Usage**
- Обновляется при создании сервисного события для leaf узла (`RECENTLY_REPLACED`).
- Используется в `node-tree` как `directStatus`.

---

## `NodeMaintenanceRule`

**Purpose**
- Правило расчета ресурса/предупреждений для leaf узла.

**Key fields**
- `nodeId` (unique)
- интервалы: `intervalKm`, `intervalHours`, `intervalDays`
- режим: `triggerMode`
- warning: `warningKm`, `warningHours`, `warningDays`
- `isActive`, `createdAt`, `updatedAt`

**Relations**
- `node` (N:1, по сути 1:1 из-за unique)

**Usage**
- Основа `computedStatus` в `/api/vehicles/[id]/node-tree`.

## 4. Source of truth and status logic

Текущий расчет статусов строится из четырех источников:

1. **`Vehicle` current state**
   - `Vehicle.odometer`
   - `Vehicle.engineHours`

2. **`ServiceEvent` (latest leaf event)**
   - Для leaf узла берется последнее событие и считается usage (elapsed/remaining).

3. **`NodeMaintenanceRule`**
   - Задает интервалы и warning-пороги.
   - На практике основной режим MVP: `WHICHEVER_COMES_FIRST`.

4. **`NodeState`**
   - Дает `directStatus` (например `RECENTLY_REPLACED` после сервиса).
   - В leaf логике `SOON/OVERDUE` из расчета имеют приоритет над `RECENTLY_REPLACED`.

Итог:

- leaf получает `computedStatus` + `directStatus` -> формируется `effectiveStatus`;
- parent получает агрегированный `effectiveStatus` из детей по приоритету  
  `OVERDUE > SOON > RECENTLY_REPLACED > OK`.

`TopNodeState` пока сохраняется и обновляется для совместимости существующего слоя.

## 5. Current limitations

- Нет выделенной multi-user auth логики в runtime (в API используется demo user подход).
- Нет отдельного persisted слоя для precomputed статусов: расчет делается на read-time.
- `TopNodeState` и `NodeState` сосуществуют; полностью унифицированный источник статуса еще не выделен.
- Для `STATE_UPDATE` в `ServiceEvent` используется обязательная связка с `nodeId` (из-за текущей схемы `nodeId` not null).
- Нет отдельной сущности/аудита для user/system actor событий журнала (фиксируется через `eventKind` + `serviceType/comment`).

## 6. Notes

- Документ привязан к текущему состоянию `prisma/schema.prisma`.
- При изменении schema (новые поля, unique/index, enum values) документ следует обновлять синхронно.
