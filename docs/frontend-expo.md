# MotoTwin Frontend Expo

## 1. Scope

Документ описывает текущие реализованные экраны Expo в `apps/app/app/**`.

## 2. Route map (Expo Router)

Defined in `apps/app/app/_layout.tsx`:
- `index` — Garage
- `vehicles/new` — Add Motorcycle
- `vehicles/[id]/index` — Vehicle Detail
- `vehicles/[id]/service-log` — Service Log
- `vehicles/[id]/service-events/new` — Add Service Event
- `vehicles/[id]/state` — Update Vehicle State
- `vehicles/[id]/profile` — Edit Vehicle Profile

## 3. Main Expo flows

### 3.1 Garage (`index.tsx`)
- Uses shared `@mototwin/api-client` + dynamic base URL (`api-base-url.ts`)
- Loads `/api/garage`
- States: loading / error / empty / list
- Primary action: "Добавить мотоцикл" -> `vehicles/new`
- Refresh on focus (`useFocusEffect`)

### 3.2 Add Motorcycle (`vehicles/new.tsx`)
- Progressive single-screen flow
- Cascading fetch:
  - `getBrands()`
  - `getModels(brandId)`
  - `getModelVariants(modelId)`
- Required fields:
  - brand, model, modelVariant
  - odometer >= 0
- Optional:
  - nickname, vin, engineHours
- Ride profile selection included
- Create via `createVehicle()` -> `POST /api/vehicles`
- Success: `router.replace("/")`

### 3.3 Vehicle Detail (`vehicles/[id]/index.tsx`)
- Loads:
  - `getVehicleDetail()`
  - `getNodeTree()`
- Shows:
  - identity/state card
  - collapsible ride profile section
  - collapsible technical summary section
  - hierarchical node tree with status badges
- Leaf node action `+` navigates to add service event screen with preselected node
- Action to open service log under node-tree header

### 3.4 Service Log (`vehicles/[id]/service-log.tsx`)
- Loads `getServiceEvents()`
- Uses shared domain helpers:
  - `filterAndSortServiceEvents`
  - `groupServiceEventsByMonth`
  - `getStateUpdateSummary`
  - `getMonthlyCostLabel`
- Supports filters/sort with collapsible toolbar (default collapsed)
- Distinguishes `SERVICE` vs `STATE_UPDATE`
- Action to `vehicles/[id]/service-events/new`

### 3.5 Add Service Event (`vehicles/[id]/service-events/new.tsx`)
- Uses node tree and vehicle context for form defaults and constraints
- Leaf-node-only selection
- Submit to `/api/vehicles/[id]/service-events`
- Supports return source (from log/tree)

### 3.6 Update Vehicle State (`vehicles/[id]/state.tsx`)
- Prefills current state
- Validates numeric input
- Calls `updateVehicleState()` -> `/api/vehicles/[id]/state`

### 3.7 Edit Vehicle Profile (`vehicles/[id]/profile.tsx`)
- Prefills nickname, vin, ride profile
- Calls `updateVehicleProfile()` -> `/api/vehicles/[id]/profile`

## 4. Expo-specific technical notes

- API base URL is resolved dynamically from Expo host (`apps/app/src/api-base-url.ts`).
- Expo uses shared packages for API contracts and core domain formatting helpers.
- UI and navigation remain mobile-specific (React Native + Expo Router).

### 4.1 API / debug line policy (product UI)

- **Production-like builds** (`__DEV__ === false`, e.g. release): the app **must not** show raw API base URLs or other developer-only diagnostics in normal screens.
- **Development** (`__DEV__ === true`): the garage **error** state may show **«Текущий API: …»** so engineers can confirm which host `getApiBaseUrl()` resolved to. User-facing copy (title, explanation, «Повторить») is unchanged.
- **Behavior:** gating is display-only; `getApiBaseUrl()` and `createApiClient` are unaffected.

## 5. Current parity status

- Garage flow: mostly aligned with web, with mobile-first layout.
- Add motorcycle flow: now implemented in Expo route-based flow.
- Vehicle detail/service log/state/profile flows: implemented and functionally aligned.
- Web still keeps richer modal orchestration in one page; Expo uses decomposed routes.

Detailed parity matrix: `cross-platform-parity.md`.

## 6. Related docs

- `frontend-web.md`
- `shared-packages.md`
- `cross-platform-parity.md`
- `api-backend.md`
