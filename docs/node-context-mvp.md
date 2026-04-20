# Node Context MVP

## Purpose

`Node Context` is the unified entry point for node-related work in Vehicle Detail.
It reduces drift between tree/search/attention flows and keeps one compact place for:

- node status and explanation;
- maintenance-plan details;
- recent service history;
- SKU recommendations;
- service kits;
- common actions.

## Core Content

For selected node, Node Context shows:

- node name, code, full path;
- effective status + short explanation;
- action to open detailed status explanation;
- maintenance-plan block (when meaningful data exists);
- latest service events (up to 3);
- compact SKU recommendations + add-to-wishlist action;
- relevant service kits + quick add action.

## Actions

Node Context action set is built in shared domain and follows safety rules:

- always: `Журнал`;
- leaf only: `Добавить сервисное событие`, `Добавить в список покупок`;
- `Добавить комплект` if kits are available for the node;
- `Пояснение статуса` when `statusExplanation` exists.

### Snooze reminder (local only)

For nodes with `effectiveStatus` = `OVERDUE` or `SOON`, Node Context provides local reminder actions:

- `Отложить на 7 дней`
- `Отложить на 30 дней`
- `Снять отложенное` (shown when active snooze exists)

Snooze state is local-only per `vehicleId + nodeId` and does not touch backend contracts, Prisma, service events, or maintenance calculations.  
Active snooze is displayed as `Отложено до <date>`.
Attention view can additionally filter items by snooze state (`Все`, `Без отложенных`, `Только отложенные`) without changing status semantics.

### Add Service Event prefills from node context

When `Добавить сервисное событие` is opened directly from node context (and related node entry points: tree/search/attention), web and Expo use shared domain helper `createInitialAddServiceEventFromNode`:

- `nodeId` = selected leaf node;
- `eventDate` = current local date;
- `odometer` / `engineHours` = current vehicle state;
- `serviceType` + `comment` = node template from `getServiceEventTemplateForNode`.

Template examples include `ENGINE.LUBE.OIL`, `BRAKES.FRONT.PADS`, `DRIVETRAIN.CHAIN`, `TIRES.FRONT` and other common maintenance nodes.  
If no node-specific template exists, fallback is:

- service type: `Обслуживание узла`;
- comment: `Зафиксировано обслуживание узла: <node name>`.

Wishlist `INSTALLED → Добавить сервисное событие` keeps its own wishlist-specific prefill and does not use node template defaults.

Node Context does not add separate lifecycle actions for historical events: service-history correction/deletion is done from Service Log timeline (`SERVICE` rows only).

## Entry Points

Node Context is opened from:

- search result action `Открыть`;
- node-tree row action `Контекст` (including subtree modal rows);
- attention item action `Контекст узла`.

Search quick shortcuts (`Журнал`, `Купить`) remain available and continue to bypass context when needed.

## Web Behavior

- Implemented as modal on `src/app/vehicles/[id]/page.tsx`.
- Top-level subtree modal remains in place.
- From subtree rows, `Контекст` opens Node Context.
- To avoid nested-modal confusion, opening Node Context closes subtree/attention modal first.

## Expo Behavior

- Implemented as mobile modal on `apps/app/app/vehicles/[id]/index.tsx`.
- Existing subtree modal remains in place.
- Node rows expose `Контекст` action with tap-friendly target.
- Modal content is scrollable and uses existing keyboard-safe pattern.

## Shared Layer

Shared types and builders live in `@mototwin/types` and `@mototwin/domain`:

- `NodeContextViewModel`
- `NodeContextActionViewModel`
- `NodeContextServiceEventSummary`
- `NodeContextRecommendationSummary`
- `NodeContextServiceKitSummary`
- `buildNodeContextViewModel`
- `getRecentServiceEventsForNode`
- `getNodeContextActions`
- `buildNodeContextPathLabel`
