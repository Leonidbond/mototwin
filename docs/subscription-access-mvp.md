# Subscription Access MVP

## Scope

MotoTwin now applies feature access by subscription plan using a single capabilities config:

- `FREE`
- `RIDER`
- `PRO`

Real billing is not connected in this iteration. Plan switch is mock-controlled via API.

## Core rules

- New users get a trial window (`trialEndsAt = now + 7 days`) and can switch plan in profile/subscription UI.
- Server-side checks are the source of truth for all limits.
- `FREE` keeps old service events in DB; only latest 10 are visible in the service log.
- `RIDER` and `PRO` have unlimited visible service events.

## Implemented capabilities

Source of truth:

- `src/lib/subscription/capabilities.ts`
- `packages/domain/src/subscription.ts`
- `packages/types/src/subscription.ts`

Matrix:

| Capability | FREE | RIDER | PRO |
|---|---|---|---|
| Max vehicles | 1 | 3 | unlimited |
| Node access | top read-only | top selectable | full tree |
| Service-event node pick | top only | top only | any |
| Service-event entry mode | quick only | quick + detailed | quick + detailed |
| Visible service events | 10 | unlimited | unlimited |
| Customize TOP nodes | no | yes | yes |

## Server guards

- Vehicle create limit: `POST /api/vehicles`
- Subscription APIs:
  - `GET /api/subscription/current`
  - `PATCH /api/subscription/plan`
- Service events:
  - `POST /api/vehicles/[id]/service-events`
  - `PATCH /api/vehicles/[id]/service-events/[eventId]`
  - `GET /api/vehicles/[id]/service-events` (includes `meta.hiddenCount` for Free)
- TOP-node customization restriction for Free:
  - `PATCH /api/user-settings`
  - `GET /api/nodes/top`
- Node-tree output by plan:
  - `GET /api/vehicles/[id]/node-tree`

## UI surfaces

- Web profile: plan selector and trial info.
- Web subscription compare page: `/subscription`.
- Service log: Free visibility notice for limited history.
- Sidebar/user plan labels updated for `RIDER`.

## Notes

- `ServiceEvent.mode` (`BASIC`/`ADVANCED`) remains the bundle form mode.
- Plan access adds `entryMode` (`QUICK`/`DETAILED`) on service events.
- Existing historical data is backfilled in migration.
