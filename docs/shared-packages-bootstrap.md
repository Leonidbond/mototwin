# MotoTwin Shared Packages Bootstrap

## Что создано

Добавлен минимальный foundation для shared-слоя в монорепо:

- `packages/types`
- `packages/domain`
- `packages/api-client`

Текущие web/expo приложения не переподключались и не меняли поведение.

## Назначение пакетов

## `@mototwin/types`

Минимальные общие типы для текущего MotoTwin домена:
- `NodeStatus`
- `ServiceEventKind`
- `NodeTreeItem` (базовая форма)
- `ServiceEventItem` (базовая форма)
- `VehicleSummary`, `VehicleDetail`, `VehicleRideProfile`

Принцип: только практичные легкие типы, без попытки зеркалить всю Prisma модель.

## `@mototwin/domain`

Легкие pure helpers, которые уже очевидно реиспользуемы:
- `getNodeStatusPriority`
- `getNodeStatusLabel`

Принцип: без переноса тяжелого status engine и без UI-зависимостей.

## `@mototwin/api-client`

Минимальный typed client foundation:
- базовый fetch wrapper (`ApiClient`, `createApiClient`)
- заготовка endpoint-группы (`createMotoTwinEndpoints`) для:
  - `/api/garage`
  - `/api/vehicles/:id`
  - `/api/vehicles/:id/service-events`

Принцип: без auth, без сложных interceptors, без интеграции в текущий web app на этом шаге.

## Что намеренно не перенесено

На bootstrap-этапе **не** переносились:
- текущие Next.js UI-экраны и компоненты;
- текущая API-логика из `src/`;
- сложная доменная логика и вычислительные движки;
- state management слои и cross-app orchestration;
- auth/client session flows.

## Что мигрировать следующим шагом

Практичный следующий минимум:
1. Подключить `@mototwin/types` в новых Expo экранах для типизации DTO.
2. Точечно использовать `@mototwin/domain` форматтеры статусов в mobile UI.
3. Подключить `@mototwin/api-client` в Expo для первых read-only сценариев:
   - garage list
   - vehicle detail
   - service log read
4. Только после этого переносить более сложные части (формы мутаций, shared domain rules).
