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
- Header matches current Garage product hierarchy:
  - large title `Мой гараж`
  - concise subtitle
  - top action `Свалка`
  - global help action `?` in the top-right corner
- Uses compact 2x2 KPI cards with the same garage summary icons as web
- Uses fixed bottom navigation:
  - `Мой гараж`
  - `Узлы`
  - `Журнал`
  - `Расходы`
  - `Профиль`
- Empty state uses illustration `images/empty_garage.png` and caption
  `В вашем гараже пока нет мотоциклов`
- Vehicle cards are web-aligned by information architecture:
  - title + compact meta line
  - silhouette block
  - dedicated `Garage Score` panel
  - short `Требует внимания` section
  - quick actions `Открыть`, `Добавить ТО`, `Расход`
- Garage Score legend uses Russian status labels:
  - `В норме`
  - `Скоро`
  - `Просрочено`
  - `Недавно`

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
  - `getTopServiceNodes()`
  - `getServiceEvents()`
- Shows:
  - first-screen dashboard aligned with web semantics:
    - hero/identity card with edit, trash, and primary orange mileage update action
    - quick actions: `Добавить ТО`, `Расход`, `Деталь`
    - KPI strip: `Garage Score`, current mileage/engine hours, `Ride readiness`, season readiness
    - compact `Требует внимания` rows from shared attention summary
    - compact `Состояние узлов` cards from `buildTopNodeOverviewCards`: the card itself is static, the group icon drills into issue nodes (`SOON` / `OVERDUE`), and each leaf badge opens the exact node in the tree
    - compact recent service events
    - expenses and wishlist entry cards
  - collapsible ride profile section
  - collapsible technical summary section
  - full hierarchical node tree only after `Все узлы`
- Uses `useWindowDimensions()` to adapt the dashboard:
  - phone portrait: single-column cards, TOP-node overview in compact wrapped cards
  - phone landscape / wide screens: hero + KPI and dashboard sections are arranged in denser horizontal groups
  - tablet-width: constrained centered content with wider multi-column dashboard blocks
- `Требует внимания` follows web visual rule: the row background stays neutral; status color is applied to badge and icon container.
- TOP-node icons use the shared Expo `TopNodeIcon` renderer (`@mototwin/icons` MaterialCommunityIcons fallback). The app does not import the web PNG icon set directly in this screen.
- Leaf node actions still navigate to add service event / wishlist flows with preselected node; service log remains the journal route.

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
- `apps/app/app.json` allows both portrait and landscape via Expo `orientation: "default"`. Screens should therefore avoid portrait-only assumptions and use SafeArea + responsive layout primitives.

### 4.1 Keyboard-aware forms policy

- Все формы Expo с `TextInput` (добавление мотоцикла, редактирование профиля, обновление состояния, добавление сервисного события, wishlist-редактор, фильтры журнала) используют keyboard-aware layout.
- Базовый паттерн: `KeyboardAvoidingView` + `ScrollView` + `keyboardShouldPersistTaps="handled"` + `keyboardDismissMode="on-drag"`.
- Для повторного использования применяется локальный helper в Expo app: `apps/app/app/components/keyboard-aware-scroll-screen.tsx`.
- Логика валидации и API-вызовов не меняется; правки касаются только UX и достижимости полей/кнопок при открытой клавиатуре.

### 4.2 API / debug line policy (product UI)

- **Production-like builds** (`__DEV__ === false`, e.g. release): the app **must not** show raw API base URLs or other developer-only diagnostics in normal screens.
- **Development** (`__DEV__ === true`): the garage **error** state may show **«Текущий API: …»** so engineers can confirm which host `getApiBaseUrl()` resolved to. User-facing copy (title, explanation, «Повторить») is unchanged.
- **Behavior:** gating is display-only; `getApiBaseUrl()` and `createApiClient` are unaffected.

## 5. Current parity status

- Garage flow: mostly aligned with web, with mobile-first layout.
- Add motorcycle flow: now implemented in Expo route-based flow.
- Vehicle detail/service log/state/profile flows: implemented and functionally aligned. Vehicle detail now mirrors the web dashboard's first-screen information hierarchy while keeping mobile route-based flows and Expo icon fallback.
- Web still keeps richer modal orchestration in one page; Expo uses decomposed routes.

Detailed parity matrix: `cross-platform-parity.md`.

## 6. Related docs

- `frontend-web.md`
- `shared-packages.md`
- `cross-platform-parity.md`
- `api-backend.md`
- `garage-dashboard-mvp.md`
