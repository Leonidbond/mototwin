# MotoTwin MVP Technical Overview

## 1. Scope of this document

Этот документ описывает **текущее фактическое состояние** MotoTwin MVP на основе реализованного кода в `src/app/**`, `src/app/api/**` и `prisma/schema.prisma`.

Документ не фиксирует planned/future функциональность как реализованную.

## 2. High-level architecture

- **Frontend framework:** Next.js (App Router, pages in `src/app/**`)
- **Backend API:** Next.js Route Handlers (`src/app/api/**/route.ts`)
- **ORM/Data access:** Prisma Client (`src/lib/prisma.ts`)
- **Database:** PostgreSQL (Prisma datasource `provider = "postgresql"`)
- **Runtime model:** one monolith app (UI + API in one Next.js project)

Текущий стек реализует server API + client UI без выделенных внешних сервисов и без message queue/background workers.

## 3. Data model (implemented)

Ключевые сущности в Prisma:

- `Vehicle` + связи на `Brand`, `Model`, `ModelVariant`, `RideProfile`
- `Node` (иерархия узлов обслуживания через self-relation `NodeHierarchy`)
- `ServiceEvent` (журнал событий, включая `eventKind`)
- `TopNodeState` (legacy/compatibility статус верхних узлов)
- `NodeState` (прямой статус конкретного узла для конкретного `vehicle`)
- `NodeMaintenanceRule` (правила интервалов/warning для leaf узлов)

Ключевые enum:

- `ServiceEventKind`: `SERVICE`, `STATE_UPDATE`
- `NodeStatus`: `OK`, `SOON`, `OVERDUE`, `RECENTLY_REPLACED`
- `MaintenanceTriggerMode`: `WHICHEVER_COMES_FIRST`, `ANY`, `ALL`

## 4. Frontend modules (implemented)

## 4.1 Landing / start page

`src/app/page.tsx`

- Маркетинговый/интро экран с CTA на onboarding.
- Статический контент (features/benefits/audience), без динамических API запросов.

## 4.2 Onboarding

`src/app/onboarding/page.tsx`

- Каскадный выбор `Brand -> Model -> ModelVariant` через:
  - `GET /api/brands`
  - `GET /api/models?brandId=...`
  - `GET /api/model-variants?modelId=...`
- Ввод базового профиля мотоцикла (`nickname`, `vin`, `odometer`, `engineHours`) и `RideProfile`.
- Создание мотоцикла через `POST /api/vehicles`.

## 4.3 Garage

`src/app/garage/page.tsx`

- Загрузка списка мотоциклов через `GET /api/garage`.
- Карточки мотоциклов с базовыми параметрами и ссылкой на `/vehicles/[id]`.

## 4.4 Vehicle detail

`src/app/vehicles/[id]/page.tsx`

Реализовано:

- Загрузка карточки мотоцикла через `GET /api/vehicles/[id]`.
- Inline редактирование текущего состояния (`odometer`, `engineHours`) с `PATCH /api/vehicles/[id]/state`.
- Иерархическое дерево узлов (expand/collapse) с бейджами статусов.
- Leaf action `+` для быстрого открытия формы сервисного события.
- Модалка сервисного журнала (таблица, sticky header, сортировки, фильтры, reset).
- Модалка создания сервисного события (каскадный выбор узла, валидации, submit).
- Модалка подробного пояснения расчета статуса (`statusExplanation`) для leaf узла.

## 5. Backend API modules (implemented)

## 5.1 Catalog endpoints

- `GET /api/brands`
- `GET /api/models?brandId=...`
- `GET /api/model-variants?modelId=...`

Возвращают справочники для onboarding UI.

## 5.2 Vehicle lifecycle endpoints

- `POST /api/vehicles`  
  Создает `Vehicle` + `RideProfile` (используется demo user `demo@mototwin.local`).

- `GET /api/garage`  
  Возвращает список мотоциклов demo user.

- `GET /api/vehicles/[id]`  
  Возвращает полную карточку одного мотоцикла.

- `PATCH /api/vehicles/[id]/state`  
  Обновляет `vehicle.odometer` и `vehicle.engineHours`, и в той же транзакции пишет `ServiceEvent` с `eventKind = STATE_UPDATE`.

## 5.3 Service log / service events

- `GET /api/vehicles/[id]/service-events`  
  Возвращает журнал событий по мотоциклу (`eventDate desc`, затем `createdAt desc`), включая узел.

- `POST /api/vehicles/[id]/service-events`  
  Создает сервисное событие только для leaf узла (backend check), обновляет:
  - `NodeState` leaf узла -> `RECENTLY_REPLACED`
  - `TopNodeState` соответствующего top-level узла (compatibility)

## 5.4 Node status endpoints

- `GET /api/vehicles/[id]/node-tree`  
  Возвращает дерево узлов с полями:
  - `directStatus` (из `NodeState`)
  - `computedStatus` (rule-based для leaf)
  - `effectiveStatus` (итог leaf + агрегация вверх по иерархии)
  - `statusExplanation` (детализированное объяснение расчета)

  В расчете используются:
  - `Vehicle` current state (`odometer`, `engineHours`)
  - latest leaf `ServiceEvent`
  - `NodeMaintenanceRule`
  - приоритет статусов: `OVERDUE > SOON > RECENTLY_REPLACED > OK`

- `GET /api/vehicles/[id]/top-nodes`  
  Legacy endpoint верхнеуровневых статусов (`TopNodeState`) сохранен и работает.

## 6. Frontend-backend interaction (current flow)

1. Пользователь добавляет мотоцикл в onboarding -> `POST /api/vehicles`.
2. Garage показывает список -> `GET /api/garage`.
3. Vehicle detail загружает:
   - профиль мотоцикла (`GET /api/vehicles/[id]`)
   - дерево статусов (`GET /api/vehicles/[id]/node-tree`)
   - журнал (`GET /api/vehicles/[id]/service-events`)
4. Создание сервисного события (`POST /service-events`) обновляет историю и статусы.
5. Обновление текущего состояния (`PATCH /state`) обновляет vehicle state и добавляет `STATE_UPDATE` в общий журнал.
6. UI перезагружает `node-tree` и `service-events` после операций сохранения.

## 7. Automatic node status calculation (implemented behavior)

Для leaf узлов:

- Если нет `NodeMaintenanceRule` -> `computedStatus = null`
- Если есть rule, но нет service history -> `computedStatus = null`
- Если есть rule + latest service event:
  - считаются elapsed/remaining для km, hours, days
  - `WHICHEVER_COMES_FIRST` (и `ANY`) -> любой exceeded => `OVERDUE`, любой warning => `SOON`, иначе `OK`
  - `ALL` поддерживается в коде отдельно

Взаимодействие с `NodeState`:

- `directStatus = RECENTLY_REPLACED` сохраняется как `effectiveStatus`, пока computed не стал `SOON/OVERDUE`
- если computed = `SOON` или `OVERDUE`, computed имеет приоритет

Для parent узлов:

- `effectiveStatus` агрегируется из собственного статуса + child статусов по fixed priority.

## 8. What is implemented vs not yet implemented

## Implemented now

- Полный onboarding -> garage -> vehicle detail flow
- Service log + service event creation на leaf узлах
- Автоматический расчет статусов узлов с explain payload
- Inline update текущего state мотоцикла + log entry `STATE_UPDATE`
- Табличный service log UI с сортировкой/фильтрами

## Not implemented as completed features (in current codebase)

- Multi-user auth flow (используется fixed demo user в API)
- Background reminder engine / scheduler
- Отдельная сервисная архитектура (service layer, queue workers)
- Persisted precomputed statuses (расчет выполняется read-time в `node-tree` endpoint)
- Полноценный fitment/recommendation engine в runtime API (на landing есть продуктовый copy, но соответствующая runtime функциональность не реализована как завершенный модуль в текущем коде)

## 9. Notes for further documentation updates

- При изменении API contracts для `service-events`, `state`, `node-tree` обновлять этот документ синхронно.
- Для новых модулей фиксировать: endpoint, payload, validation, side effects, UI integration point.
