# Auth Roadmap (planned, not implemented)

Detailed ownership architecture and migration strategy:

- [auth-data-ownership-architecture.md](./auth-data-ownership-architecture.md)

## Current state

- Authorization is **not implemented**.
- Product currently behaves as single-user/demo/local-account semantics.
- Garage UI is framed as personal space, but data access is still pre-auth MVP mode.
- Local Garage settings are stored per-device only and are not user-profile data yet.
- Phase 1 ownership foundation is implemented (User/Garage + demo ownership context).

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

### Phase 2 — API ownership filtering (still pre-auth UI)

- Scope vehicle data access by current-user context.
- Keep context resolved as demo user until real auth is introduced.

### Phase 3 — Auth session layer

- Introduce session/auth provider.
- Add protected API access checks by owner scope.

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
