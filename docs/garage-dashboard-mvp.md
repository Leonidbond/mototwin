# Garage Dashboard MVP

## Purpose

Garage is positioned as a personal dashboard area: **«Личный гараж / Мой гараж»**.

Current MVP scope:

- no login/register;
- no real auth session yet;
- dashboard semantics over existing garage data.
- prepared to migrate to authenticated user-owned garage model later.
 - Phase 1 ownership foundation exists in backend data model (demo user + demo garage).

## Product framing

- Garage is the user home surface for motorcycles and service context.
- UI can show local/mock account wording like `Профиль: Гость`.
- Avoid claims that account is connected or authenticated.

## Dashboard sections

1. Header:
   - title `Мой гараж`;
   - subtitle `Ваши мотоциклы, обслуживание и расходы в одном месте`;
   - prominent CTA `Добавить мотоцикл`.
2. Compact summary (from existing garage payload only):
   - motorcycles count;
   - motorcycles requiring attention;
   - total attention items.
3. Vehicle cards:
   - nickname/title;
   - compact meta line (`year · odometer · version`);
   - motorcycle silhouette;
   - separate `Garage Score` block with status legend;
   - short `Требует внимания` block or healthy fallback state;
   - quick actions:
     - `Открыть`
     - `Добавить ТО`
     - `Расход`
4. Profile entry point:
   - web: карточка пользователя внизу левого сайдбара (ссылка на `/profile`); отдельного пункта «Профиль» в меню сайдбара нет;
   - Expo: available from bottom navigation.
5. Trash entry point:
   - action/link `Свалка` in Garage header.
6. Mobile bottom navigation (Expo):
   - `Мой гараж`
   - `Узлы`
   - `Журнал`
   - `Расходы`
   - `Профиль`
7. Vehicle removal behavior:
   - Garage card action **"Переместить на свалку"** performs soft-delete;
   - vehicle disappears from Garage active list;
   - restore/permanent delete is performed on `Свалка` page/screen.

## Empty state

When no motorcycles exist:

- Web: centered illustration `images/empty_garage.png` with caption
  `В вашем гараже пока нет мотоциклов`; primary action stays in garage header.
- Expo: same illustration-based empty state `images/empty_garage.png` with the
  caption `В вашем гараже пока нет мотоциклов`; primary action stays in header.

## Web

- Route: `src/app/garage/page.tsx`.
- Dashboard header and summary shown above existing cards.
- Existing card navigation to vehicle detail is unchanged.
- Vehicle profile edits are initiated from vehicle detail and can be reached from garage card `Редактировать`.
- Garage settings block removed; settings are moved to `/profile`.
- Active list excludes trashed vehicles.
- Garage delete flow is now move-to-trash flow.
- Left sidebar is a separate collapsible panel; collapsed state is persisted in
  `localStorage` under `garage.sidebar.collapsed`.
- **Garage sidebar** (`src/app/garage/_components/GarageSidebar.tsx`): см. раздел ниже.
- Empty state uses illustration-based layout.
- Root document uses explicit dark background plus `color-scheme: dark`, so
  native scrollbar area stays visually dark on narrow viewports without
  disabling page scroll.
- Garage Score legend uses Russian status labels (`В норме`, `Скоро`, `Просрочено`, `Недавно`).

### Web: левый сайдбар (`GarageSidebar`)

Компонент: `src/app/garage/_components/GarageSidebar.tsx`. Используется на гараже, карточке мотоцикла, расходах, профиле, подборе деталей, формах сервисного события и др. экранах с «гаражным» хромом.

**Состояние и контекст мотоцикла**

- **`contextVehicleId`**: какой мотоцикл считается выбранным для **ссылок меню** (Узлы, Журнал, Расходы, Подбор деталей).
  - Если URL вида `/vehicles/[id]/…`, id берётся из пути и пишется в `localStorage` (`mototwin.lastViewedVehicleId`).
  - Вне маршрута мотоцикла id читается из того же ключа `localStorage` (последний просмотренный).
- **Подсветка активного пункта меню** зависит от **текущего URL** (`pathVehicleId`), а не только от контекста — активен тот раздел, который реально открыт.

**Пункты меню (href)**

- Мой гараж → `/garage`
- Узлы → `/vehicles/{contextId}/nodes` (если контекста нет → `/garage`)
- Журнал → `/vehicles/{contextId}/service-log`
- Расходы → `/vehicles/{contextId}/expenses`
- Подбор деталей → `/vehicles/{contextId}/parts` (корзина; picker — `/parts/picker`, префикс `/parts` совпадает)

Отдельных пунктов «Профиль» и «Выйти» в навигации **нет** (профиль — карточка пользователя под меню).

**Плашка мотоцикла** (`SidebarVehiclePlaque`, `src/app/garage/_components/SidebarVehiclePlaque.tsx`)

- Над списком меню: силуэт класса (PNG по `VehicleDetail`, см. `src/lib/vehicle-detail-silhouette.ts`), название, подзаголовок (год · пробег · стиль езды).
- Ссылка на дашборд текущего мотоцикла (`/vehicles/{id}`).
- Данные карточки: `GET /api/vehicles/{contextVehicleId}`.
- Если в гараже **несколько** мотоциклов (`GET /api/garage`): выбор другого байка — выпадающий список (развёрнутый сайдбар) или прозрачный `<select>` поверх силуэта (свёрнутый сайдбар). При смене выполняется переход на тот же «хвост» пути, что и у текущего URL (например остаётесь в «Узлах», но уже у другого мотоцикла), и обновляется `localStorage`.
- При **одном** мотоцикле UI выбора скрыт, остаётся только ссылка на карточку.

**Свёрнутость**

- Кнопка сворачивания; ключ `garage.sidebar.collapsed` в `localStorage` (на части экранов используются свои ключи, например расходы — `expenses.sidebar.collapsed`, но компонент тот же).

## Expo

- Route: `apps/app/app/index.tsx`.
- Same dashboard semantics with mobile-first header, summary KPI cards, and web-aligned garage cards.
- Garage includes fixed bottom navigation with `Мой гараж`, `Узлы`, `Журнал`, `Расходы`, `Профиль`.
- Garage has profile entry action in the bottom navigation that navigates to `profile` screen.
- Garage has `Свалка` entry action that navigates to `trash` screen.
- Garage Score legend uses Russian status labels (`В норме`, `Скоро`, `Просрочено`, `Недавно`).
- Global help action `?` lives in the top-right corner.

## Shared layer

New shared view model:

- `GarageDashboardSummaryViewModel`
- helper `buildGarageDashboardSummary`

Helper is pure and uses only provided garage list data; no extra backend calls.

Local settings are described in [user-settings-mvp.md](./user-settings-mvp.md) and now live on Profile screen/page.
Planned auth/data ownership foundation is described in [auth-data-ownership-architecture.md](./auth-data-ownership-architecture.md).
