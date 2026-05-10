# Service Log MVP

## Scope

Service Log stores and shows two event kinds:

- `SERVICE`
- `STATE_UPDATE`

Both web and Expo show grouped timeline, filters, sorting, and paid-service filtering. Full expense analytics lives on dedicated expenses pages backed by `ExpenseItem`.

Node source for add/filter flows:

- primary: `GET /api/vehicles/[id]/node-tree` (full technical tree)

## Dedicated page/screen

Service Log is now page/screen-first UX on both clients:

- **Web:** `/vehicles/[id]/service-log`
- **Expo:** `vehicles/[id]/service-log`

Service Log modal is no longer the primary UX entry point.

### Dense operational journal UX

Web and Expo now use the journal as a dense operational index first:

- collapsed web rows use a 6-zone layout: timeline rail/status dot, date/metrics, title/meta, up to two chips, cost, and action affordance;
- collapsed mobile rows target a 64–76px feed item with title/cost first and date/node/mileage/chips second;
- full bundle rows, comments, wishlist origin, expense details, and lifecycle actions are shown only in contextual details: sticky panel on desktop, inline preview + bottom sheet on Expo;
- `serviceEventId` / `highlightServiceEventId` still scrolls to the row and opens the event details after create/edit or when returning from installed parts;
- `STATE_UPDATE` rows stay visually muted and compact, with full before/after lines inside details/sheet;
- `paidOnly=1` keeps cost/expense context visually active in toolbar and detail summaries.

Platform layout:

- **Web:** `/vehicles/[id]/service-log` is rendered inside the vehicle shell with `GarageSidebar`. On desktop the journal uses a reference-style master-detail layout: sticky header/toolbar, dense grouped timeline on the left, and a sticky right details panel. On narrower viewports details open inline under the selected row.
- **Expo:** `vehicles/[id]/service-log` keeps `GarageBottomNav`; service rows are ultra-compact feed rows. Tapping a row expands a short preview/actions area, while **Подробнее** opens an 85–92% bottom sheet with full details.

Supported route/query params:

- `paidOnly=1` — pre-enables paid-only filter
- `nodeId=<nodeId>` or `nodeIds=<id1,id2,...>` with optional `nodeLabel` — pre-applies node filter context
- `serviceEventId=<eventId>` (alias: `highlightServiceEventId`) — scrolls the timeline to a concrete service event and highlights its row
- `expandExpenses=1` — enables expense-focused mode on clients that support this handoff
- `feedback=created|updated` — lifecycle return notice after add/edit flow
- optional lifecycle handoff params for add/edit flow may be used by client UI

Platform notes:

- Web reads both `nodeId` and `nodeIds`; Expo currently uses `nodeIds` for subtree context.
- **Web:** добавление / редактирование / повтор — общая форма **`ServiceEventForm`** (`src/app/vehicles/[id]/_components/service-event-form/`) на страницах **`/vehicles/[id]/service-events/new`** и **`/vehicles/[id]/service-events/[eventId]/edit`**; переходы с журнала и карточки ТС (`service-log/page.tsx`, `vehicle-detail-client.tsx`), одна модель **`AddServiceEventFormValues`**.
- **Expo:** тот же смысл bundle-полей — компонент **`basic-service-event-bundle-form.tsx`** и экран **`service-events/new`** для create/edit/repeat.

### Web: реализация формы сервисного события (bundle)

**Полное описание:** [web-service-event-form.md](./web-service-event-form.md). Выбор узла (общие модалки): [node-picker-reuse.md](./node-picker-reuse.md).

- **Корень:** **`ServiceEventForm`** + тип **`ServiceEventFormProps`** — каталог **`src/app/vehicles/[id]/_components/service-event-form/`**, баррель **`index.ts`**.
- **Страницы:** **`service-events/new/ServiceEventCreateClient.tsx`**, **`service-events/[eventId]/edit/ServiceEventEditClient.tsx`** — загрузка дерева/ТС, сбор `initialForm`, **`router.push` / `returnTo`** после сохранения или отмены.
- **Сброс контекста:** родитель держит `initialForm`, **`resetKey`**; при смене сценария увеличивает `resetKey`, чтобы внутренний слой формы пересоздался.
- **Домен и API:** тот же контракт **`AddServiceEventFormValues`**, **`validateAddServiceEventFormValues`**, **`normalizeAddServiceEventPayload`** / **`normalizeEditServiceEventPayload`**; шаблоны bundle, **`getInstallableForServiceEvent`**, SKU в **ADVANCED** — внутри **`ServiceEventForm`**.
- **Ключевые модули каталога:** `ServiceEventForm.tsx`, `ServiceEventModeControl.tsx` (segmented на страницах), `body/ServiceEventModalBodyUnified.tsx`, **`cards/basic-info-primary-fields.tsx`** (единый блок «Основная информация» для BASIC/ADVANCED), остальные карточки и `bundle/`, оверлеи в `overlays/` (в т.ч. `InstallablePickerOverlay`, `PreviewOverlay`).
- **Визуальный ориентир:** `images/examples/Service-event-fast.png` / `Service-event-extended.png` (UI, не контракт API).

В карточке **`SERVICE`** с пакетом строк (режим **ADVANCED**) клиенты могут показывать **стоимость по каждой строке** (`lineCostRu` во view model из `packages/domain/src/service-log-view-models.ts`), если в данных есть суммы по строкам.

## Expenses integration

The old inline **`Окно расходов`** block is removed from Service Log. Expense analytics is page/screen-first:

- **Web:** `/expenses` for garage-wide analytics, `/vehicles/[id]/expenses` for one motorcycle.
- **Expo:** `vehicles/[id]/expenses` for one motorcycle.
- Service Log header exposes **«Статистика расходов»** as an entry point to the vehicle-scoped expenses page.
- `paidOnly=1` remains a journal filter for rows with service costs, not the primary analytics surface.

Expense source semantics changed:

- analytics is built from `ExpenseItem`;
- `SERVICE` events with `costAmount/currency` create linked `ExpenseItem`;
- wishlist rows with status `BOUGHT` and cost create `BOUGHT_NOT_INSTALLED` `ExpenseItem`;
- standalone technical expenses can exist without `ServiceEvent`.

## Editing SERVICE events

`SERVICE` events are editable on both clients.

Editable fields:

- `nodeId` (leaf node only)
- `eventDate`
- `odometer`
- `engineHours`
- `serviceType`
- `costAmount`
- `currency`
- `comment`
- `installedPartsJson`

API contract:

- `PATCH /api/vehicles/[id]/service-events/[eventId]`
- event must belong to vehicle
- only `SERVICE` kind is accepted
- response returns updated event payload
- UI feedback after success: `Сервисное событие обновлено` (+ `Статусы и расходы обновлены`)
- UI feedback after save error: `Не удалось сохранить сервисное событие`

Implementation note:

- Web edits inside Service Log page.
- Expo edit is routed to `/vehicles/[id]/service-events/new?source=service-log&eventId=...`.

## Deleting SERVICE events

`SERVICE` events are deletable on both clients.

API contract:

- `DELETE /api/vehicles/[id]/service-events/[eventId]`
- event must belong to vehicle
- only `SERVICE` kind is accepted
- response: `{ deleted: true, eventId, affectedNodeId }`
- UI feedback after success: `Сервисное событие удалено` (+ `Статусы и расходы обновлены`)
- UI feedback after delete error: `Не удалось удалить сервисное событие`

## Create feedback

After creating `SERVICE` event, clients show:

- `Сервисное событие добавлено`
- optional detail: `Статусы и расходы обновлены`
- on web, the notice includes **`В журнал`**; clicking it opens `/vehicles/[id]/service-log`
- on Expo, create/update handoff uses `feedback=created|updated` query state on return to Service Log

## Repeat SERVICE events

Both clients support repeat flow for `SERVICE` rows.

- Web: repeat action opens Service Log add form prefilled from selected event.
- Expo: repeat action opens `/vehicles/[id]/service-events/new?source=service-log&repeatFrom=<eventId>`.

## Wishlist origin links

Wishlist-install events are stored as normal `SERVICE` rows. The origin is recognized by the shared wishlist install service type/comment prefix and, when available, by `installedPartsJson`:

- `source: "wishlist"`
- `wishlistItemId: <PartWishlistItem.id>`

Web and Expo behavior:

- if a wishlist-install row has `wishlistItemId`, the label **«Из списка покупок»** is rendered as a button
- clicking it opens the full parts/wishlist screen with `wishlistItemId=...`
- the parts/wishlist screen expands/filters to the matching status group, highlights that part card, and scrolls it into view
- the reverse link exists on installed part cards: **«В журнал»** opens the service log with `serviceEventId=...`, and the journal scrolls/highlights the corresponding event

### Удаление установленной позиции из корзины

Если пользователь удаляет из **«Корзины замен и расходников»** строку со статусом **«Установлено»**, UI предупреждает, что запись журнала не удаляется. Сервер при **`DELETE .../wishlist/[itemId]`** дополнительно **дописывает в `comment`** соответствующих **`SERVICE`** событий** текст о том, что позиция снята с корзины (см. `docs/api-backend.md`, `src/lib/wishlist-delete-service-log-note.ts`).

## STATE_UPDATE in this flow

`STATE_UPDATE` stays read-only in Service Log lifecycle flows:

- no edit action in web timeline row
- no edit action in Expo timeline row
- PATCH endpoint rejects non-`SERVICE` events
- no delete action in web timeline row
- no delete action in Expo timeline row
- DELETE endpoint rejects non-`SERVICE` events

## STATE_UPDATE display rules

STATE updates are rendered via shared domain formatting (`@mototwin/domain`) on both clients:

- if old + new value known: `Пробег: X → Y км`, `Моточасы: X → Y ч`
- if only new value known: `Пробег обновлен до Y км`, `Моточасы обновлены до Y ч`
- if one field is absent, only available field is shown
- no raw JSON is shown in timeline rows

Web and Expo keep platform-specific layout, but state-change meaning is the same.

## Status and expense consistency after edit

After `SERVICE` event edit:

- affected leaf `NodeState` rows are synchronized for old/new node context
- top-level status cache (`TopNodeState`) is recalculated
- `/api/vehicles/[id]/node-tree` reflects updated maintenance statuses
- linked `ExpenseItem` is updated from edited `costAmount`/`currency` values

This keeps service history correction compatible with existing create flows (node context, wishlist install, kits, direct add).

## Status and expense consistency after delete

After `SERVICE` event delete:

- affected leaf `NodeState` is re-synced against latest remaining service event for that node
- top-level status cache (`TopNodeState`) is recalculated
- `/api/vehicles/[id]/node-tree` reflects updated maintenance statuses
- linked `ExpenseItem` is removed after deleted service cost
