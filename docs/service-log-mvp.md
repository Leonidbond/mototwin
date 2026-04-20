# Service Log MVP

## Scope

Service Log stores and shows two event kinds:

- `SERVICE`
- `STATE_UPDATE`

Both web and Expo show grouped timeline, filters, sorting, and expense rollups from `SERVICE` cost fields.

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
