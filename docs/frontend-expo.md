# MotoTwin Frontend Expo

## 1. Scope

Документ описывает текущие реализованные экраны Expo в `apps/app/app/**`.

### Запуск Metro / Expo CLI

Проект приложения — пакет **`@mototwin/app`** (`apps/app`), в нём `package.json` с `"main": "expo-router/entry"`.

- Из **корня** репозитория: `npm run mobile:dev` или `npm run expo -- start` (скрипт `expo` проксирует CLI в workspace).
- Из **`apps/app`**: `npx expo start`.
- **`npx expo` из корня** без workspace приводит к стандартному `expo/AppEntry.js` и ошибке «Unable to resolve module ../../App» — так запускать не нужно.

## 2. Route map (Expo Router)

Defined in `apps/app/app/_layout.tsx`:
- `index` — Garage
- `vehicles/new` — Add Motorcycle
- `vehicles/[id]/index` — Vehicle Detail
- `vehicles/[id]/service-log` — Service Log
- `vehicles/[id]/service-events/new` — Add Service Event
- `vehicles/[id]/state` — Update Vehicle State
- `vehicles/[id]/profile` — Edit Vehicle Profile
- `vehicles/[id]/parts` — «Корзина замен» (алиас маршрута к wishlist с паритетом web `/parts`)
- `vehicles/[id]/wishlist/*` — полный список покупок, picker, редактирование позиции

Переиспользуемые экранные блоки вынесены из `app/**` в **`apps/app/components/`**:
- `expo-shell/` — `ScreenHeader`, **`InternalScreenChrome`** (крошки + заголовок + опциональные действия), `KeyboardAwareScrollScreen`, `ActionIconButton`, контекст ТС и т.п.
- `garage/` — **`GarageVehicleContextPlaque`**: компактная плашка мотоцикла под крошками (слот `belowNavRow` у `InternalScreenChrome`), переход на дашборд ТС по тапу, смена мотоцикла из гаража с сохранением хвоста маршрута (паритет с web `SidebarVehiclePlaque` / `GarageSidebar`). Хелпер пути: `apps/app/src/garage-vehicle-route.ts` (`replaceVehicleIdInPath`). Для query при смене ТС используется **`useGlobalSearchParams`** (в этой версии Expo Router **`useSearchParams` из пакета не экспортируется**).
- `vehicle-detail/` — bundle-форма сервисного события, `MobileNodePickerModal`, модалки статуса
- `vehicle-wishlist/` — блоки picker/корзины, редактор позиции, href-хелперы

**Где подключён `InternalScreenChrome` + плашка:** дерево узлов (`vehicles/[id]/index` в режиме nodes), журнал, расходы, корзина замен, подбор (`wishlist/picker`), форма ТО (`service-events/new`), редактор позиции wishlist. Простые экраны (`ScreenHeader` без крошек) — профиль, свалка, добавление мото и т.д.

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
- Шапка: **`InternalScreenChrome`**; кнопка **«Добавить сервисное событие»** — отдельной полосой **под** заголовком (не в одной строке с заголовком). Кнопка перехода к экрану расходов из шапки журнала убрана (расходы доступны из нижней навигации и сценариев карточек).
- Action to `vehicles/[id]/service-events/new`

### 3.5 Add Service Event (`vehicles/[id]/service-events/new.tsx` + `components/vehicle-detail/basic-service-event-bundle-form.tsx`)
- Screen loads node tree / vehicle / existing event (edit/repeat); builds initial **`AddServiceEventFormValues`** with shared domain helpers (same contract as web **`ServiceEventForm`**).
- Bundle UI: multiple leaf rows in BASIC, parts + labor + total, SKU lookup, uninstalled expenses, JSON — see [web-expo-service-log-parity-fixes.md](./parity/web-expo-service-log-parity-fixes.md).
- Submit to `/api/vehicles/[id]/service-events` (create) or update route when editing.
- Supports return `source` (service-log, tree, attention, wishlist, …).

### 3.6 Update Vehicle State (`vehicles/[id]/state.tsx`)
- Prefills current state
- Validates numeric input
- Calls `updateVehicleState()` -> `/api/vehicles/[id]/state`

### 3.7 Edit Vehicle Profile (`vehicles/[id]/profile.tsx`)
- Prefills nickname, vin, ride profile
- Calls `updateVehicleProfile()` -> `/api/vehicles/[id]/profile`

### 3.8 Parts wishlist / «корзина замен» (`vehicles/[id]/wishlist/index.tsx`, алиас `vehicles/[id]/parts.tsx`)
- Full-vehicle wishlist list + status groups, summary cards, search, detail bottom sheet, and swipe actions; behavior and contracts match [parts-wishlist-mvp.md](./parts-wishlist-mvp.md). В блоке **«Действия»** детальной модалки — короткие подписи **Редактировать / Заказать / Купить / Установить / Повторить / Удалить**, к журналу — **Перейти** (с `accessibilityLabel` полной фразы).
- **Deep link из журнала** (`wishlistItemId` и др. через `vehicles/[id]/parts.tsx`): после фокуса на строке и открытия детальной панели экран **не** делает `router.replace` на `/vehicles/[id]/wishlist` без query — иначе срабатывает повторный `useFocusEffect` → `load()`, возможен сброс состояния и скачок фильтра **«Установленные» → «Все»**. Поведение согласовано с комментарием у `applyWishlistRowFocus`: лишняя смена URL не нужна для стабильного UI.
- **Repeat purchase** from the cart matches web `PartsCartPage`: confirmation modal, `createWishlistItem` with `NEEDED`, comment suffix «Повтор из корзины замен», no cost copy, then filter to NEEDED. Фокус на новую строку (**`applyWishlistRowFocus`**) вызывается **после** закрытия системного **`Alert`** (кнопка «OK»), чтобы не совмещать **`Modal`** детали и **`Alert`** в одном кадре — иначе на React Native возможен «пустой» экран и подвисание. Перед показом модалки подтверждения «Повторить покупку» вызывается **`openRepeatPurchaseConfirm`**: закрыть лист детали / меню статуса, затем **`InteractionManager.runAfterInteractions`** — иначе второй **`Modal`** поверх первого часто не отображается.
- Сценарий **`picked=`** после подбора: сначала показывается **`Alert` «Готово»**; **`router.replace`** (сброс query) и открытие листа детали со скроллом выполняются **в `onPress` «OK»** — та же причина (избежать конфликта Modal + Alert и отмены таймеров при смене URL до показа алерта).
- **Picker** (`vehicles/[id]/wishlist/picker.tsx`): при добавлении SKU или комплекта в черновик **автоматически открывается нижний лист корзины** (`PickerDraftCartSheet`), чтобы сразу менять количество без лишнего тапа по бару корзины. Модалка превью сабмита как на web (`quantityUpgrade`: **`addAllFromDraft`** / **`setQtyToDraft`** с теми же правилами **`max(existing, draft)`** и **`noOpQuantityUpdates`**); **`submitPickerDraft`**; редирект с **`picked=`**. Бар черновика **`PickerDraftCartBar`** с `placement="inline"` стоит **под шапкой** (сразу под `InternalScreenChrome`), чтобы не перекрывать **`GarageBottomNav`** внизу экрана.

## 4. Expo-specific technical notes

- API base URL is resolved dynamically from Expo host (`apps/app/src/api-base-url.ts`).
- Expo uses shared packages for API contracts and core domain formatting helpers.
- UI and navigation remain mobile-specific (React Native + Expo Router).
- `apps/app/app.json` allows both portrait and landscape via Expo `orientation: "default"`. Screens should therefore avoid portrait-only assumptions and use SafeArea + responsive layout primitives.

### 4.1 Keyboard-aware forms policy

- Все формы Expo с `TextInput` обязаны использовать keyboard-aware layout. На данный момент покрытие:
  - **Полноэкранные формы:** добавление мотоцикла (`vehicles/new`), редактирование профиля (`vehicles/[id]/profile`), обновление состояния (`vehicles/[id]/state`), добавление/редактирование сервисного события (`vehicles/[id]/service-events/new` + `BasicServiceEventBundleForm`), фильтры журнала (`vehicles/[id]/service-log`), wishlist-picker (`vehicles/[id]/wishlist/picker`), wishlist-редактор (`components/vehicle-wishlist/wishlist-item-editor`), форма «своей детали» (`components/vehicle-wishlist/community-part-screen`), расходы (`vehicles/[id]/expenses`).
  - **Модалки с `TextInput`:** `MobileNodePickerModal` (поиск узла), `PickerUserKitSaveModal` (название комплекта), фильтр поиска в `wishlist/picker`, внутренние модалки `BasicServiceEventBundleForm` («Сохранить как шаблон», «Валюта»). RN-`Modal` рендерится в отдельный native-оверлей, поэтому каждая такая модалка оборачивается **своим** `KeyboardAvoidingView` — внешний KAV родителя до неё не достаёт.
- Базовый паттерн: `KeyboardAvoidingView` (`behavior={Platform.OS === "ios" ? "padding" : "height"}`, `keyboardVerticalOffset` ≈ 8 на iOS) + `ScrollView` + `keyboardShouldPersistTaps="handled"` + `keyboardDismissMode="on-drag"`.
- Для типового случая «экран = scroll + клавиатура» используется общий helper **`apps/app/components/expo-shell/keyboard-aware-scroll-screen.tsx`** (`KeyboardAwareScrollScreen`). В экранах с абсолютно-позиционированным футером (например, `community-part-screen`) KAV оборачивает только `ScrollView`, а футер остаётся снаружи — это сознательный выбор: пока клавиатура открыта, инпуты доступны, submit-кнопка появляется после dismiss клавиатуры.
- Логика валидации и API-вызовов не меняется; правки касаются только UX и достижимости полей/кнопок при открытой клавиатуре.

### 4.2 API / debug line policy (product UI)

- **Production-like builds** (`__DEV__ === false`, e.g. release): the app **must not** show raw API base URLs or other developer-only diagnostics in normal screens.
- **Development** (`__DEV__ === true`): the garage **error** state may show **«Текущий API: …»** so engineers can confirm which host `getApiBaseUrl()` resolved to. User-facing copy (title, explanation, «Повторить») is unchanged.
- **Behavior:** gating is display-only; `getApiBaseUrl()` and `createApiClient` are unaffected.

## 5. Current parity status

- Garage flow: mostly aligned with web, with mobile-first layout.
- Add motorcycle flow: now implemented in Expo route-based flow.
- Vehicle detail/service log/state/profile/wishlist flows: implemented and functionally aligned (including **repeat purchase** from the full wishlist screen vs web cart). Vehicle detail now mirrors the web dashboard's first-screen information hierarchy while keeping mobile route-based flows and Expo icon fallback.
- Web still keeps richer modal orchestration in one page; Expo uses decomposed routes.

Detailed parity matrix: `parity/cross-platform-parity.md`.

## 6. Related docs

- `node-picker-reuse.md` — **`MobileNodePickerModal`** (`apps/app/components/vehicle-detail/mobile-node-picker-modal.tsx`) и паритет с web
- `frontend-web.md`
- `shared-packages.md`
- `parity/cross-platform-parity.md`
- `api-backend.md`
- `garage-dashboard-mvp.md`
