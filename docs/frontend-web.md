# MotoTwin Frontend Web

## 1. Scope

Документ описывает текущую реализованную web-часть в `src/app/**`.

## 2. Implemented pages

- `src/app/page.tsx` — landing page
- `src/app/onboarding/page.tsx` — add motorcycle flow (web)
- `src/app/garage/page.tsx` — garage list
- `src/app/vehicles/[id]/page.tsx` — vehicle operational page

## 3. Main web flows

### 3.1 Landing
- Product intro, value blocks, CTA transitions
- Main transitions: `/onboarding`, `/garage`

### 3.2 Add motorcycle (onboarding)
- Cascading selections:
  - `/api/brands`
  - `/api/models?brandId=...`
  - `/api/model-variants?modelId=...`
- Form fields:
  - identity (`nickname`, `vin`)
  - state (`odometer`, `engineHours`)
  - ride profile fields
- Submit to `/api/vehicles`

### 3.3 Garage
- Loads `/api/garage`
- States: loading / error / empty / list
- Shows vehicle cards with summary and navigation to `/vehicles/[id]`
- Left-side navigation is a collapsible **`GarageSidebar`** (`src/app/garage/_components/GarageSidebar.tsx`); collapsed state is persisted in `localStorage` (`garage.sidebar.collapsed`). Контекст мотоцикла для ссылок меню, плашка с выбором байка и поведение пунктов описаны в [garage-dashboard-mvp.md](./garage-dashboard-mvp.md) (раздел «Web: левый сайдбар»).
- Empty state shows illustration `images/empty_garage.png` with caption
  `В вашем гараже пока нет мотоциклов`; primary action `Добавить мотоцикл`
  lives in garage header
- Root document uses explicit dark background and `color-scheme: dark`, so the
  garage keeps a dark native scrollbar area on narrow viewports
- Garage Score legend uses Russian status labels
  (`В норме`, `Скоро`, `Просрочено`, `Недавно`)
- Durable Garage behavior/spec lives in `garage-dashboard-mvp.md`

### 3.4 Vehicle detail (web workspace)

The page consolidates multiple operational blocks and modal flows:
- vehicle identity/profile
- current state with inline update (`PATCH /state`)
- node tree with expand/collapse and status badges
- link to **Service Log** page `/vehicles/[id]/service-log` (primary journal UX: фильтры — узлы через **`NodePickerModal`**, период, раскрываемая строка пробег/сумма/тип работы/исполнитель, сортировка; см. [service-log-mvp.md](./service-log-mvp.md), [web-expo-service-log-parity-fixes.md](./parity/web-expo-service-log-parity-fixes.md))
- **`ServiceEventForm`** (`src/app/vehicles/[id]/_components/service-event-form/`) — создание / редактирование / повтор (bundle, только **листовые** узлы); страницы **`/vehicles/[id]/service-events/new`** и **`…/edit`**; навигация из **`vehicle-detail-client.tsx`** и **`service-log/page.tsx`** (см. [service-log-mvp.md](./service-log-mvp.md), [web-service-event-form.md](./web-service-event-form.md))
- status explanation modal
- edit profile modal (`PATCH /profile`)

## 4. Web interaction with backend

Vehicle page uses:
- `GET /api/vehicles/[id]`
- `GET /api/vehicles/[id]/node-tree`
- `GET /api/vehicles/[id]/service-events`
- `POST /api/vehicles/[id]/service-events`
- `PATCH /api/vehicles/[id]/state`
- `PATCH /api/vehicles/[id]/profile`

After successful mutation, page reloads relevant datasets to reflect updated status/log state.

## 5. Current web-specific notes

- **`src/app/layout.tsx`:** на `<html>` и `<body>` задан **`suppressHydrationWarning`**, чтобы не получать ложные предупреждения гидрации, когда расширения браузера дописывают атрибуты на `<body>` до React (типичный признак — атрибуты вида `bis_register`, `__processed_*` в diff).
- Выбор узла дерева в модалках (сервисное событие, wishlist, каталог запчастей, **журнал**): общий **`NodePickerModal`** / обёртки — см. [node-picker-reuse.md](./node-picker-reuse.md).
- Часть операционных сценариев (профиль, пояснения статуса) по-прежнему через модалки; сервисное событие — отдельные full-page маршруты (`service-events/new`, `…/edit`).
- This differs from Expo route-based decomposition, but backend outcome remains aligned.
- Web does not currently use shared `@mototwin/api-client` as primary data layer for page fetches.
- **Яндекс.Карты (опционально):** для поля «Место установки» на страницах `service-events/new` и `…/edit` задайте `NEXT_PUBLIC_YANDEX_MAPS_API_KEY` в корневом `.env` (см. `.env.example`, [web-service-event-form.md](./web-service-event-form.md) §5.1).

## 6. Responsive layout (web в мобильном браузере)

Web-клиент рассчитан на desktop, но должен оставаться юзабельным при просмотре в мобильном браузере (≈ 360–480 px). Общая политика:

- **Брейкпоинт.** Базовый порог — **`max-width: 1023px`** (соответствует Tailwind v4 `lg`). Часть страниц использует собственные пороги (`service-log` — 1180 px, `parts/picker` — 1279 px, `parts/community` — 900 px) — это сохраняется как есть.
- **Общие хуки** (только для web client components) живут в `src/lib/`:
  - **`useIsNarrow(maxWidthPx = 1023)`** (`src/lib/use-is-narrow.ts`) — подписка на `matchMedia("(max-width: …px)")`; используется страницами для переключения многоколоночных сеток в одну колонку и для условного рендера sheet/модалок.
  - **`useSidebarCollapsed(storageKey?)`** (`src/lib/use-sidebar-collapsed.ts`) — единый источник состояния свёрнутости **`GarageSidebar`** на всех страницах с «гаражным» хромом. На узком viewport (`useIsNarrow`) сайдбар принудительно `collapsed=true`, `toggle()` — no-op. Пользовательский выбор на широком — в `localStorage` по переданному ключу (обратная совместимость с уже сохранёнными ключами: `garage.sidebar.collapsed`, `expenses.sidebar.collapsed`, `vehicle.detail.sidebar.collapsed`, и т. д.).

Конкретные адаптации страниц:

- **`/vehicles/[id]/nodes` (Дерево узлов).** На ширине ≥ 1024 px — двухколоночная сетка `minmax(0, 1fr) minmax(0, 1fr)` (дерево + «Контекст узла»). На ≤ 1023 px дерево занимает всю ширину; при выборе узла «Контекст узла» открывается **полноэкранным sheet** поверх дерева (`position: fixed; inset: 0; zIndex: 40`) с шапкой «← Назад к дереву» и именем узла. Кнопка «Назад» вызывает `closeNodeContextModal({ restorePrevious: false })` и снимает `?nodeId=` из URL через `history.replaceState`, чтобы после возврата к странице sheet не всплывал автоматически.
- **`/expenses` и `/vehicles/[id]/expenses`.** На узком — `dashboardGridStyle` переключается в `minmax(0, 1fr)` (было `minmax(0, 1.5fr) minmax(320px, 1fr)` — правая колонка с `min-width: 320px` ранее выдавливала горизонтальный скролл); строка из шести KPI-метрик идёт через `repeat(auto-fit, minmax(140px, 1fr))` вместо жёстких 6 колонок.
- **`GarageSidebar`** на всех страницах с «гаражным» хромом подключён через `useSidebarCollapsed`. На мобильнике это освобождает ≈ 140 px ширины (сайдбар «свёрнутый» = 64 px вместо развёрнутого 204 px / 220 px).

## 7. Related docs

- `node-picker-reuse.md`
- `frontend-expo.md`
- `parity/cross-platform-parity.md`
- `api-backend.md`
- `functional-logic.md`
- `garage-dashboard-mvp.md`
- `web-service-event-form.md` — форма сервисного события и страницы new/edit (Next.js); `web-service-event-modal.md` — редирект на него
