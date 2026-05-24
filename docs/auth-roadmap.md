# Auth Roadmap

Detailed ownership architecture and migration strategy:

- [auth-data-ownership-architecture.md](./auth-data-ownership-architecture.md)
- [auth-implementation-plan.md](./auth-implementation-plan.md)

## Current state

- Authorization is **implemented for local accounts** on web + Expo:
  - `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `POST /api/auth/refresh`, `GET /api/auth/me`.
- Web now supports Auth.js sessions and OAuth providers (Google/Apple/Yandex) when env credentials are configured.
- Expo keeps token-based auth (access + refresh), and can sign in through provider tokens via `POST /api/auth/oauth/mobile`.
- Password recovery flow is implemented:
  - `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`;
  - reset tokens are one-time, hashed, and time-limited.
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

Implemented:

- web credentials + session login;
- Expo token + refresh flow;
- Auth.js integration for web session/OAuth;
- mobile OAuth exchange endpoint;
- password recovery endpoints and UI.

Open hardening tasks:

- add provider-specific e2e smoke tests (Google/Apple/Yandex);
- add per-IP/email rate limiter storage for auth endpoints;
- add optional 2FA / passkeys roadmap phase.

### Phase 4 — Extended auth UX

- Account linking management UI (multiple providers per account).
- Session/device management (list and revoke active sessions).
- Optional passwordless magic link.

### Phase 5 — Security hardening

- Audit/monitoring for auth errors and suspicious attempts.
- Regression QA for cross-platform ownership enforcement.

## Migration note

When moving from current local/single-user semantics:

- preserve existing user data;
- provide deterministic ownership assignment during migration;
- keep backward-compatible behavior until full auth rollout is complete.
