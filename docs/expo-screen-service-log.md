# Expo Screen: Service Log

## What was built

A Service Log screen (`apps/app/app/vehicles/[id]/service-log.tsx`) accessible from the Vehicle Detail screen via the "Журнал обслуживания" button.

Events are grouped by month (newest first), matching the web journal structure.

## Navigation

```
Garage → Vehicle Detail → [Журнал обслуживания] → Service Log
```

Vehicle Detail is now at `apps/app/app/vehicles/[id]/index.tsx` (moved from `[id].tsx` to support the nested route).

## Data

Uses `GET /api/vehicles/:id/service-events` via `getServiceEvents` from `@mototwin/api-client`.

Returns `{ serviceEvents: ServiceEventItem[] }` — sorted newest first by the backend.

## Grouping and summaries

Uses shared helpers from `@mototwin/domain`:

| Helper | Purpose |
|---|---|
| `groupServiceEventsByMonth` | Groups events into `MonthlyServiceLogGroup[]` with per-month summaries |
| `getMonthlyCostLabel` | Formats cost totals per currency for the month header |
| `getStateUpdateSummary` | Returns a human-readable label for `STATE_UPDATE` events |

## Event rendering

### SERVICE events
- Kind badge: "Сервис" (purple)
- Title: `serviceType`
- Secondary: node name
- Meta: date · odometer · engine hours
- Optional: comment, cost

### STATE_UPDATE events  
- Kind badge: "Состояние" (grey)
- Title: summary from `getStateUpdateSummary` ("Пробег обновлен" / "Пробег и моточасы обновлены")
- Meta: date · odometer · engine hours

## Month header

Each month shows:
- Month + year label (e.g. "Январь 2024")
- Summary: service count, state update count, total cost per currency

## States

- Loading spinner
- Error with message
- Empty: shown when no events exist yet
- Populated: grouped list

## Shared packages used

- `@mototwin/types` — `ServiceEventItem`, `MonthlyServiceLogGroup`
- `@mototwin/domain` — `groupServiceEventsByMonth`, `getMonthlyCostLabel`, `getStateUpdateSummary`
- `@mototwin/api-client` — `getServiceEvents`

## What is intentionally deferred

- **Filters and sorting** — the web version has date/kind/node filters; not needed for MVP read-only view
- **Add service event** — requires a form flow; next major step
- **Cost totals across months** — overall vehicle cost summary; deferred
- **Pull-to-refresh** — useful but not MVP
- **Pagination** — all events loaded at once; acceptable for MVP with limited data
