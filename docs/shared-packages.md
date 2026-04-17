# MotoTwin Shared Packages

## 1. Scope

Документ описывает текущий shared-слой в `packages/*` и его границы.

## 2. `packages/types`

Purpose: shared data contracts for web, Expo, and API integration.

Current key groups:
- `status.ts` — status unions
- `node.ts` — `NodeTreeItem`, status explanation types, node selection types
- `service-event.ts` — service event DTO/input types
- `vehicle.ts` — vehicle/garage/detail/profile/state/create DTO types
- `service-log.ts` — filters/sort/grouping types

Usage:
- consumed by Expo screens
- consumed by shared domain helpers
- aligns payload expectations with backend routes

## 3. `packages/domain`

Purpose: shared pure business helpers (no network, no UI framework dependencies).

Current modules:
- `status.ts`
  - status priority/labels/comparison helpers
- `node-tree.ts`
  - node path search/select helpers
  - leaf reason short extraction
- `service-log.ts`
  - filtering and sorting service events
  - monthly grouping
  - summary labels (`STATE_UPDATE` summary, monthly cost labels)

Usage:
- used by web vehicle page
- used by Expo service log and node-tree-related flows

## 4. `packages/api-client`

Purpose: typed API client wrappers around current backend routes.

Core:
- `fetcher.ts` — base request/error handling
- `mototwin-endpoints.ts` — route-level methods

Current endpoint methods:
- `getGarage`
- `getVehicleDetail`
- `getVehicleNodeTree`
- `getVehicleServiceEvents`
- `createVehicleServiceEvent`
- `updateVehicleState`
- `updateVehicleProfile`
- `getBrands`
- `getModels`
- `getModelVariants`
- `createVehicle`

Usage:
- actively used in Expo client
- web currently mostly uses direct `fetch` in page components

## 5. Shared-first rules in practice

Should be shared:
- business-critical data contracts
- deterministic business helpers
- API request/response wrappers

Should remain platform-specific:
- navigation and route composition
- UI layouts/components/styles
- platform-specific interaction details

## 6. Current gaps

- Web does not yet consistently consume `@mototwin/api-client`.
- Some web page-local utility logic still duplicates shared behavior.

These gaps are tracked in `cross-platform-parity.md` as implementation parity follow-ups.

## 7. Related docs

- `technical-overview.md`
- `frontend-web.md`
- `frontend-expo.md`
- `cross-platform-parity.md`
