# Service Log MVP

## Scope

Service Log stores and shows two event kinds:

- `SERVICE`
- `STATE_UPDATE`

Both web and Expo show grouped timeline, filters, sorting, and expense rollups from `SERVICE` cost fields.

## Dedicated page/screen

Service Log is now page/screen-first UX on both clients:

- **Web:** `/vehicles/[id]/service-log`
- **Expo:** `vehicles/[id]/service-log`

Service Log modal is no longer the primary UX entry point.

Supported route/query params:

- `paidOnly=1` — pre-enables paid-only filter
- `nodeId=<nodeId>` or `nodeIds=<id1,id2,...>` with optional `nodeLabel` — pre-applies node filter context
- `expandExpenses=1` — opens inline expenses block on initial load
- optional lifecycle handoff params for add/edit flow may be used by client UI

## Expenses block (inline)

Expense view is inline inside Service Log on both clients and is toggled by the existing
`Окно расходов` action.

- no expense modal/overlay
- block is collapsed by default
- toggle behavior: first click/tap opens, second closes
- opening expense block enables paid-only mode for journal
- period selector uses concrete month/year (`<Месяц Год>`) and updates journal date filter immediately
- default expense period is current calendar month
- supported query: `month=YYYY-MM` (applies to expense dashboard + journal date filter)
- section rows in expense block apply journal node filter by top-level section/subtree
- `Все расходы в журнале` keeps paid-only mode and keeps current period/section focus
- totals are grouped per currency (no cross-currency merge)
- helper note: sums in different currencies are shown separately

Expense source semantics are unchanged:

- only `SERVICE` events are considered
- include only events with `costAmount > 0` and currency
- exclude `STATE_UPDATE`
- exclude wishlist rows (wishlist affects expenses only after explicit service-event save)

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
- expense blocks/totals update from edited `costAmount`/`currency` values

This keeps service history correction compatible with existing create flows (node context, wishlist install, kits, direct add).

## Status and expense consistency after delete

After `SERVICE` event delete:

- affected leaf `NodeState` is re-synced against latest remaining service event for that node
- top-level status cache (`TopNodeState`) is recalculated
- `/api/vehicles/[id]/node-tree` reflects updated maintenance statuses
- expense blocks/totals update after removed service cost
