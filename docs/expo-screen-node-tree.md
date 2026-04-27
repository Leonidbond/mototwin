# Expo Screen: Node Tree (Vehicle Detail)

## What was built

The Vehicle Detail screen (`apps/app/app/vehicles/[id].tsx`) now shows the full hierarchical node tree with expand/collapse interaction.

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
- Node context, subtree modal and status explanation modal share the same dark theme tokens and return to the previous overlay/screen when closed

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
- `name`, `effectiveStatus`, `statusExplanation.reasonShort`
- `children: NodeTreeItem[]` (recursive)

Loaded in parallel with vehicle detail on screen mount.

## Shared packages used

- `@mototwin/types` — `NodeTreeItem`, `VehicleDetail`
- `@mototwin/domain` — `getNodeStatusLabel`
- `@mototwin/api-client` — `getNodeTree`, `getVehicleDetail`

## What is intentionally deferred

- **Animations** — expand/collapse could animate; deferred, not needed for MVP
- **Dedicated node drill-down route** — the current implementation uses Node Context modal instead of a separate route
