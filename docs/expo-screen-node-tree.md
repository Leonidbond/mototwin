# Expo Screen: Node Tree (Vehicle Detail)

## What was built

The Vehicle Detail screen (`apps/app/app/vehicles/[id].tsx`) now shows the full hierarchical node tree with expand/collapse interaction.

## How it works

- Top-level nodes (ENGINE, FUEL, BRAKES, etc.) are visible by default — children are collapsed
- Tapping a node with children toggles its children open or closed (local state, `Set<string>`)
- Leaf nodes that have a `statusExplanation.reasonShort` show it as a secondary line below the name
- Nodes without children are not interactive (no tap feedback)
- The tree is rendered recursively via a `NodeRow` component; no external tree library is used

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

- **Full status explanation** — the detailed breakdown (elapsed km, remaining days, rule intervals) is shown on web but not yet on mobile; too much data for a compact row
- **Node drill-down screen** — tapping a leaf to see its full detail; deferred
- **Add service event from tree** — tapping a leaf to log maintenance; next major mobile step
- **Animations** — expand/collapse could animate; deferred, not needed for MVP
- **Scroll-to-node** — deep expand could benefit from auto-scroll; deferred
