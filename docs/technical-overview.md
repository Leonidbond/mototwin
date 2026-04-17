# MotoTwin Technical Overview

## 1. Scope

Документ фиксирует текущее реализованное состояние MotoTwin:
- web клиент (Next.js)
- mobile клиент (Expo)
- shared packages
- backend API
- Prisma/PostgreSQL data model

Документ не описывает будущие модули как реализованные.

## 2. Current architecture

MotoTwin сейчас работает как monorepo с двумя клиентскими поверхностями и общим backend:

- **Web client:** Next.js App Router (`src/app/**`)
- **Mobile client:** Expo Router (`apps/app/app/**`)
- **Backend API:** Next.js Route Handlers (`src/app/api/**/route.ts`)
- **Data access:** Prisma Client (`src/lib/prisma.ts`)
- **Database:** PostgreSQL (`prisma/schema.prisma`)
- **Shared layer:**
  - `packages/types`
  - `packages/domain`
  - `packages/api-client`

## 3. Repository-level module boundaries

- `src/app/**` — web pages and web-specific UI orchestration.
- `apps/app/**` — Expo routes/screens and mobile-specific UI orchestration.
- `src/app/api/**` — backend contracts and business side effects.
- `prisma/**` — schema, migrations, seed.
- `packages/types` — shared domain/API data contracts.
- `packages/domain` — shared pure business helpers/formatters.
- `packages/api-client` — shared typed API client for web/mobile data access.

## 4. Implemented product surface

### 4.1 Shared backend capabilities

Implemented routes:
- Catalog: `/api/brands`, `/api/models`, `/api/model-variants`
- Garage/vehicle: `/api/garage`, `/api/vehicles`, `/api/vehicles/[id]`
- Vehicle updates: `/api/vehicles/[id]/state`, `/api/vehicles/[id]/profile`
- Service log/events: `/api/vehicles/[id]/service-events`
- Node status: `/api/vehicles/[id]/node-tree`
- Legacy compatibility: `/api/vehicles/[id]/top-nodes`

### 4.2 Web client (current)

Key pages:
- `/` (landing)
- `/onboarding` (create motorcycle flow)
- `/garage` (garage list)
- `/vehicles/[id]` (vehicle operational workspace)

Web `vehicle` page currently contains rich modal-based flows (service log, add service event, status explanation, profile edit, state update inline).

### 4.3 Expo client (current)

Key screens:
- `index` (Garage)
- `vehicles/new` (Add Motorcycle)
- `vehicles/[id]/index` (Vehicle Detail)
- `vehicles/[id]/service-log`
- `vehicles/[id]/service-events/new`
- `vehicles/[id]/state`
- `vehicles/[id]/profile`

Expo flow uses explicit route-based screens instead of heavy modal orchestration.

## 5. Core business model and logic (high level)

- `Vehicle` + `RideProfile` define motorcycle identity and usage profile.
- `ServiceEvent` stores both `SERVICE` and `STATE_UPDATE` events.
- Service events are allowed only for leaf nodes in node tree.
- `NodeMaintenanceRule` + latest leaf service + current vehicle state -> computed leaf status.
- `NodeState` stores direct status snapshots (e.g. `RECENTLY_REPLACED`).
- `effectiveStatus` is aggregated upward in hierarchy (`OVERDUE > SOON > RECENTLY_REPLACED > OK`).
- `TopNodeState` remains as legacy compatibility layer.

## 6. Cross-platform architecture direction

Текущее направление миграции: **Expo-first client experience with shared contracts**, while backend stays common truth.

Practical direction:
- business-critical contracts and helper logic shared in `packages/*`
- UI/layout/navigation remain platform-specific
- web and Expo should converge on core workflow parity
- parity gaps are tracked explicitly (see `cross-platform-parity.md`)

## 7. Current constraints

- Auth/session flows are not implemented as production multi-user flow; garage creation uses demo user contract on backend routes where applicable.
- Status calculation is read-time in `node-tree` route; no background recalculation worker.
- `TopNodeState` and `NodeState` coexist during migration.

## 8. Related docs

- `repository-structure.md`
- `data-model.md`
- `api-backend.md`
- `frontend-web.md`
- `frontend-expo.md`
- `shared-packages.md`
- `functional-logic.md`
- `cross-platform-parity.md`
