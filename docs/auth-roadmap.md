# Auth Roadmap (planned, not implemented)

Detailed ownership architecture and migration strategy:

- [auth-data-ownership-architecture.md](./auth-data-ownership-architecture.md)
- [auth-implementation-plan.md](./auth-implementation-plan.md)

## Current state

- Authorization is **not implemented**.
- Product currently behaves as single-user/demo/local-account semantics.
- Garage UI is framed as personal space, but data access is still pre-auth MVP mode.
- Profile `UserSettings` are persisted server-side per user (`UserSettings` model + `/api/user-settings`), with local cache/fallback on clients.
- Phase 1 ownership foundation is implemented (User/Garage + demo ownership context).
- Phase 2A base route scoping is implemented.
- Phase 2B nested route scoping is implemented.
- Phase 2C dev-only switcher is implemented.
- Phase 2D/2E auth foundation hardening is implemented.

## Target direction

Future iterations should add:

1. user account model;
2. garage ownership by user;
3. vehicle ownership and user-scoped access;
4. data isolation between users;
5. login/register/recovery flows.

## Suggested phased rollout

### Phase 1 — Data ownership foundations (implemented)

- Added user/garage ownership foundation and deterministic backfill.
- Demo current-user context is used internally (no login/register/session yet).

### Phase 2A — Base API ownership filtering (implemented, still pre-auth UI)

- Scoped base Garage/Vehicle routes by current-user context:
  - garage list;
  - create vehicle;
  - vehicle detail;
  - vehicle profile update.
- Out-of-scope vehicle ids return `404`.
- Current-user context still resolves to demo user/garage.

### Phase 2B — Nested vehicle routes ownership filtering (implemented)

- Scoped nested vehicle routes (`node-tree`, `state`, `top-nodes`, `service-events`, `wishlist`, `wishlist/kits`) by current-user context.
- Out-of-context vehicle ids return `404`.
- Visible behavior for demo-owned vehicles remains backward-compatible.

### Phase 2C — Dev-only user switcher for QA (implemented, development-only)

- Added development-only user switcher on web + Expo Profile settings.
- Seed now includes deterministic test users/garages for isolation checks.
- API current-user resolver accepts dev header only when explicitly enabled:
  - `NODE_ENV !== "production"`
  - `MOTOTWIN_ENABLE_DEV_USER_SWITCHER=true`
- Production keeps pre-auth demo fallback only when dev header is absent; dev header is rejected with controlled error.

### Phase 2D — Auth foundation hardening (implemented)

- `getCurrentUserContext()` hardened with typed controlled errors and read-only context resolution.
- Invalid dev header now returns controlled `400` JSON error (no silent fallback in QA mode).
- Ownership checks now rely on canonical garage ownership (`vehicle.garageId -> garage.ownerUserId`) with invariant validation.
- Seed repairs safe ownership drift where `vehicle.userId` mismatches `garage.ownerUserId`.
- `UserSettings` remains API-validated and resilient to invalid stored values via normalization.

### Phase 2F — UserSettings DB-backed profile settings (implemented)

- `UserSettings` persisted per user in DB.
- `/api/user-settings` (`GET`/`PATCH`) is ownership-scoped through current user context.
- Web and Expo use server settings as source of truth with local cache/fallback for resilience.

### Phase 2E — Resolver read-only hardening (implemented)

- Removed request-path auto-provisioning for `User` / `Garage` / `UserSettings` from current-user resolver.
- Missing current user/garage/settings now return controlled initialization errors (`503`) with guidance to run seed.
- Vehicle context read now uses ownership predicate in the final data read query (`findFirst` with ownership `where`).
- Seed remains the only source of demo/dev context bootstrap data.

### Phase 3 — Auth session layer (planned)

- See detailed rollout in [auth-implementation-plan.md](./auth-implementation-plan.md):
  - Phase 3A: auth decision + contracts;
  - Phase 3B: web auth;
  - Phase 3C: Expo auth;
  - Phase 3D: replace demo resolver with session/token resolver;
  - Phase 3E: auth session integration + optional conflict policy for existing local cache;
  - Phase 3F: account UI.

### Phase 4 — UI account flows

- Add sign in / sign up / sign out.
- Replace `Гость` placeholder with real account identity.
- Move local Garage settings to authenticated user profile settings.

### Phase 5 — Hardening

- Add audit/monitoring for auth errors and unauthorized access attempts.
- Add regression QA for cross-platform ownership enforcement.

## Migration note

When moving from current local/single-user semantics:

- preserve existing user data;
- provide deterministic ownership assignment during migration;
- keep backward-compatible behavior until full auth rollout is complete.
