# Expo Screen: Vehicle Detail

## What was built

A Vehicle Detail screen (`apps/app/app/vehicles/[id]/index.tsx`) that:

- Loads full motorcycle data and top-level node statuses in parallel
- Shows an info card with key motorcycle details
- Shows each top-level node with a colour-coded status badge
- Handles loading, error, and not-found states
- Is navigated to from the Garage screen

## Navigation

From the Garage screen (`apps/app/app/index.tsx`), tapping a motorcycle title calls:

```ts
router.push(`/vehicles/${item.id}`)
```

Expo Router maps this to `apps/app/app/vehicles/[id]/index.tsx`.  
The screen is registered in `_layout.tsx` as `vehicles/[id]` with the title "Мотоцикл".

## Data and routes

Two backend requests are made in parallel via `Promise.all`:

| Request | Backend route | Purpose |
|---|---|---|
| `getVehicleDetail(id)` | `GET /api/vehicles/:id` | Nickname, brand, model, year, VIN, odometer, engine hours |
| `getNodeTree(id)` | `GET /api/vehicles/:id/node-tree` | Full node tree with computed `effectiveStatus` per node |

Both methods are defined in `packages/api-client/src/mototwin-endpoints.ts`.

## Displayed information

**Info card**
- Nickname (if set) or "Brand · Model" as the title
- Brand · Model subtitle
- Year · version
- Odometer (km)
- Engine hours (or "—" if not set)
- VIN (or "—" if not set)

**Node status list**
- Each top-level node (ENGINE, FUEL, BRAKES, etc.) as a row
- Status badge with colour coding:
  - `OK` → green
  - `SOON` → amber
  - `OVERDUE` → red
  - `RECENTLY_REPLACED` → blue
- Status labels are localised via `getNodeStatusLabel` from `@mototwin/domain`

## Shared packages used

- `@mototwin/types` — `VehicleDetail`, `TopNodeStateItem`
- `@mototwin/domain` — `getNodeStatusLabel`
- `@mototwin/api-client` — `createMotoTwinEndpoints`, `getVehicleTopNodes`

## What is intentionally deferred

- **Service log** — not shown yet; the full journal with monthly grouping is a dedicated next screen
- **Add service event** — requires form flow, deferred
- **Node tree drill-down** — tapping a node to see child nodes; not in this MVP step
- **Status explanations** — the full reason/interval breakdown shown on web; deferred for mobile
- **Edit vehicle info** — read-only for now
- **Ride profile** — available in the API response but not displayed yet

## Next steps

1. Service log screen: list of service events grouped by month
2. Add-event flow: simple form to log a service action on a leaf node
3. Node drill-down: tap a top-level node to see child statuses
