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
