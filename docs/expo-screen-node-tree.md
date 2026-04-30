# Expo Screen: Node Tree (Vehicle Detail)

## What was built

The Expo vehicle node route (`apps/app/app/vehicles/[id]/nodes.tsx`) renders `VehicleDetailScreen` from `apps/app/app/vehicles/[id]/index.tsx` with `forcedView="nodes"`, showing the full hierarchical node tree with expand/collapse interaction.

## How it works

- Top-level nodes (ENGINE, FUEL, BRAKES, etc.) are visible by default — children are collapsed
- Tapping a node with children toggles its children open or closed (local state, `Set<string>`)
- Leaf nodes that have a `statusExplanation.reasonShort` show it as a secondary line below the name
- Nodes without children keep quick actions (`Журнал`, `Купить`, `Добавить сервисное событие`) where allowed
- The tree is rendered recursively via a `NodeRow` component; no external tree library is used
- Search works from 2 characters by node name/code and opens the matching subtree with parents expanded
- Status filter chips support `Все`, `Просрочено`, `Скоро`, `Недавно заменено`, `ОК`
- Status filtering keeps matching nodes plus their parent chain, and automatically expands branches that contain matches
- Search results are scoped by the active status filter
- `ТОП-узлы` limits the tree to up to 15 dashboard overview nodes plus their parent chains
- `Свернуть` clears expanded branches; expanding a single-child branch opens the chain down to the first branch/leaf
- Node context, subtree modal and status explanation modal share the same dark theme tokens and return to the previous overlay/screen when closed
- Node context matches the web action matrix: subtree composition for parent nodes, clickable recent events, compatible parts row vs quick-add, service kit row vs quick-add, and active uninstalled wishlist rows
- Node context **layout** mirrors the web `NodeContextReferencePanel` idea: separate bordered **sections** (header strip + body) instead of one undivided scroll — Actions, maintenance plan, composition, recent events (with **Журнал** in the section header), SKU recommendations, service kits, uninstalled parts (leaf)
- Leaving the node tree for service log or wishlist stores selected node, status filter, TOP mode and expanded branches so return navigation restores the same leaf focus
- Unlike web, Expo currently does not render node expense summary blocks inside the tree

## Visual structure

```
┌─────────────────────────────────────────┐
│ Двигатель                     OVERDUE   │  ← top-level, tappable (▸)
├─────────────────────────────────────────┤
│ ▾ Топливо                     SOON      │  ← expanded
│     Карбюратор / инжектор     OK        │  ← child
│     Топливный фильтр          SOON      │  ← child leaf + reasonShort
│       Скоро по пробегу                  │
├─────────────────────────────────────────┤
│ ▸ Тормоза                     OK        │  ← collapsed
└─────────────────────────────────────────┘
```

With status filter enabled:

```text
Фильтр по статусу
[Все] [Просрочено · 2] [Скоро · 4] [Недавно заменено · 1] [ОК · 18]

┌─────────────────────────────────────────┐
│ ▾ Двигатель                   OVERDUE   │  ← parent kept for context
│     Масло двигателя           OVERDUE   │  ← matching node
└─────────────────────────────────────────┘
```

## Data

Uses `GET /api/vehicles/:id/node-tree` via `getNodeTree` from `@mototwin/api-client`.

The response is `{ nodeTree: NodeTreeItem[] }` — each item contains:
- `id`, `code`, `name`, `level`, `displayOrder`
- `status`, `directStatus`, `computedStatus`, `effectiveStatus`
- `statusExplanation.reasonShort` when the API can explain the current status
- `children: NodeTreeItem[]` (recursive)

Loaded as part of the vehicle detail screen data refresh. The tree has its own loading/error state so a tree failure does not hide the vehicle card.

## Shared packages used

- `@mototwin/types` — `NodeTreeItem`, `VehicleDetail`
- `@mototwin/domain` — `getNodeStatusLabel`
- `@mototwin/api-client` — `getNodeTree`, `getVehicleDetail`

## What is intentionally deferred

- **Animations** — expand/collapse could animate; deferred, not needed for MVP
- **Dedicated node drill-down route** — the current implementation uses Node Context modal instead of a separate route
