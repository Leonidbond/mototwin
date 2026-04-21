# Auth & Data Ownership Architecture

## 1. Purpose

This document defines the target architecture for user-owned data in MotoTwin.

Scope of this document:

- describe the migration path from current single-user/local MVP semantics;
- define future ownership entities and relationships;
- define phased rollout without enabling real login/session now.

Out of scope in current phase:

- real authentication (login/register/session);
- web/Expo auth UI;
- auth dependencies/session provider.

## 1.1 Phase status

- Phase 1 (schema/data ownership foundation) is implemented.
- Phase 2A (base Garage/Vehicle API ownership scope) is implemented.
- Phase 2B (nested vehicle routes ownership scope) is implemented.
- Phase 2D (context + ownership hardening) is implemented.

## 2. Current state (as-is)

- MotoTwin currently behaves as single-user/demo-local MVP.
- Garage already acts as a personal dashboard (`Мой гараж`).
- Real auth (login/register/session) is not implemented.
- `UserSettings` is implemented server-side and scoped per user.
- Profile settings API is implemented: `GET/PATCH /api/user-settings`.
- Local settings are now cache/fallback layer on clients (not primary persistence).
- Existing APIs are not fully enforced by user isolation semantics yet.

## 3. Target concepts (to-be)

Future ownership model should introduce and stabilize:

1. **User**
   - identity root for ownership and future account/session.
2. **Garage (UserGarage)**
   - user-owned container for vehicles and dashboard context.
3. **Vehicle ownership**
   - each vehicle must belong to exactly one ownership root.
4. **User profile/settings**
   - persistent account-level settings (`currency`, `units`, `date format`, snooze defaults).
5. **Account/session layer**
   - maps runtime requests to current user.
6. **Data isolation**
   - every user-scoped query/mutation filtered by ownership.

## 4. Target data model proposal

Planned entities:

### User

- `id`
- `email` (nullable in bootstrap phase)
- `displayName` (nullable)
- `createdAt`
- `updatedAt`

### Garage

- `id`
- `ownerUserId`
- `title`
- `createdAt`
- `updatedAt`

### Vehicle ownership relation

Recommended choice: **`Vehicle` -> `garageId`** (instead of direct `ownerUserId`).

Justification:

- keeps ownership extensible for multi-garage scenarios;
- preserves a clear product concept: user home = garage container;
- supports future family/shared access patterns at garage boundary;
- avoids duplicated ownership source (`ownerUserId` + `garageId`) drift.

`ownerUserId` can still be derived through `Vehicle.garage.ownerUserId`.

### UserSettings

- `userId`
- `defaultCurrency`
- `distanceUnit`
- `dateFormat`
- `defaultSnoozeDays`
- implemented as DB-backed per-user settings in current pre-auth foundation.

## 5. Recommended MVP direction (before auth)

1. Add `User` + `Garage` ownership foundation in schema/migrations.
2. Create stable demo/local user and demo garage.
3. Attach all existing vehicles to demo garage.
4. Keep current API behavior externally unchanged, but resolve current user context internally as demo user.
5. Do not expose multi-user behavior in UI until auth phase.

## 6. Migration strategy by phases

### Phase 1 — Schema foundation only

- Implemented:
  - `User.displayName` and nullable unique `User.email`;
  - `Garage` model with owner relation and timestamps;
  - `Vehicle.garageId` relation + index;
  - idempotent seed for demo user and demo garage;
  - backfill: vehicles with `garageId = null` are attached to demo garage.
- Transitional note:
  - `Vehicle.garageId` remains nullable in this phase to keep migration risk low.
  - Phase 2+ can tighten constraints after stable backfill/ownership filtering rollout.

### Phase 2 — API ownership filtering

- Phase 2A implemented:
  - `GET /api/garage` scoped by current user/garage context;
  - `POST /api/vehicles` writes current user/garage ownership;
  - `GET /api/vehicles/[id]` returns vehicle only inside current context;
  - `PATCH /api/vehicles/[id]/profile` updates vehicle only inside current context.
- Security behavior for out-of-scope vehicle ids in base routes: return `404` (no existence leak).
- Phase 2B deferred:
  - none.
- Current user context still resolves to demo user (no login UI yet).

### Phase 2B — Nested `/api/vehicles/[id]` route guards

Implemented:

- shared backend helper for ownership checks by current context;
- nested routes now verify vehicle ownership before processing:
  - `node-tree`;
  - `state`;
  - `top-nodes`;
  - `service-events`;
  - `service-events/[eventId]`;
  - `wishlist`;
  - `wishlist/[itemId]`;
  - `wishlist/kits`.
- out-of-context vehicle ids return `404`.

### Phase 2C — Dev-only context switch for QA (implemented)

Implemented:

- development-only resolver override via request header `x-mototwin-dev-user-email`;
- header is honored only in development mode and only for seeded dev users;
- web + Expo Garage expose local dev-only user switcher for QA isolation checks;
- ownership guards remain unchanged (`404` for out-of-context resources).

Safety notes:

- this is not authentication and not a production security control;
- production rejects dev header with controlled error and continues pre-auth demo fallback only when header is absent.

### Phase 2D — Current-user/ownership hardening (implemented)

Implemented:

- explicit gate for dev override:
  - `NODE_ENV !== "production"`
  - `MOTOTWIN_ENABLE_DEV_USER_SWITCHER=true`
- `getCurrentUserContext()` now returns controlled typed errors for invalid dev header flows;
- resolver is read-only on request path (no implicit user/garage/settings creation);
- API routes map context errors to controlled JSON responses (no raw stack exposure);
- ownership checks use canonical path `vehicle.garageId -> garage.ownerUserId`;
- seed repairs safe mismatch cases where `vehicle.userId` drifted from `garage.ownerUserId`.

Notes:

- `Vehicle.userId` remains transitional/denormalized for compatibility.
- Canonical runtime ownership source is garage ownership.
- Missing seeded context is a controlled initialization error (suggests running `prisma seed`) rather than runtime auto-bootstrap.

Deferred:

- any remaining non-vehicle-global routes can be reviewed in a separate hardening pass if new nested endpoints are added later.

### Phase 3 — Real auth implementation

- add login/register/session;
- replace demo user resolver with session user resolver;
- keep existing ownership filtering logic, only user-context source changes.
- detailed implementation sequence is defined in [auth-implementation-plan.md](./auth-implementation-plan.md) (Phase 3A-3F).

### Phase 4 — Account settings session integration

- reuse existing server `UserSettings` as authenticated source of truth;
- finalize login/session-time merge strategy for existing local caches;
- define conflict strategy (first-login merge, server-wins/client-wins policy).

### Phase 5 — Optional multi-garage / sharing

- support multiple garages per user or garage sharing model if product requires it;
- extend policy model without breaking existing single-garage baseline.

## 7. Demo user approach (transitional)

- stable demo identity key, e.g. `demo@mototwin.local`;
- seed must create demo user and demo garage idempotently;
- existing vehicles must be attached to demo garage/user deterministically;
- no visible login UI in this transitional mode.

## 8. API design note

Planned internal helper:

- `getCurrentUserContext()`

Behavior:

- pre-auth phase: returns demo user + demo garage context;
- dev-only QA phase: resolver accepts seeded dev header only when explicit flag is enabled;
- post-auth phase: resolves from session provider.

Pre-auth runtime contract:

- context resolver does not mutate ownership data;
- demo/dev bootstrap data is created by seed only;
- missing user/garage/settings are explicit controlled errors.

Rule after Phase 2:

- APIs should not query all vehicles globally without user scope.

Current Phase 1 usage:

- `GET /api/garage` resolves demo context and loads vehicles by demo `garageId`.
- `POST /api/vehicles` resolves demo context and writes `userId + garageId`.
- `GET /api/vehicles/[id]` and `PATCH /api/vehicles/[id]/profile` resolve demo context and enforce ownership match.

## 9. Security and honesty constraints

- until auth/session is implemented, there is no real multi-user security boundary;
- documentation and UI must not claim user isolation before it actually exists;
- transitional state must be explicitly marked as pre-auth/demo ownership mode.

## 10. Web/Expo impact by phase

- Phase 1: no mandatory UI changes; Garage remains user home dashboard.
- Phase 2: no visible behavior changes expected for demo user.
- Phase 3: Garage/account surfaces can show real user identity from auth session.
- Server `UserSettings` is primary in current pre-auth profile surface; local cache remains fallback.

## 11. Main risks

1. Existing seed data breakage during ownership backfill.
2. Orphan vehicles without garage/user mapping.
3. API endpoints accidentally missing ownership scope after Phase 2.
4. Local cache merge/conflict handling during auth-session rollout.
5. Multi-device consistency differences before server settings sync.

## 12. Acceptance criteria for future implementation

- Existing app behavior remains working after ownership migration.
- All current vehicles are assigned to demo user/garage.
- Garage list and vehicle detail remain visually unchanged in pre-auth phase.
- API layer can enforce user-scoped vehicle access through user context.
- No login UI is exposed until explicit auth phase is started.

## 13. Nested vehicle route guardrail checklist

For every new `/api/vehicles/[id]/**` route:

1. Call `getVehicleInCurrentContext()` (or equivalent scoped ownership guard) first.
2. Filter child entities by `vehicleId` in addition to route params.
3. Return `404` for non-owned/missing vehicle resources.
4. Keep global catalog/reference routes public only when they do not access vehicle-specific data.
5. Do not perform unscoped `findUnique({ where: { id } })` as a final vehicle read after guard checks.

## 14. Related docs

- [auth-roadmap.md](./auth-roadmap.md)
- [auth-implementation-plan.md](./auth-implementation-plan.md)
- [garage-dashboard-mvp.md](./garage-dashboard-mvp.md)
- [data-model.md](./data-model.md)
- [cross-platform-parity.md](./cross-platform-parity.md)
