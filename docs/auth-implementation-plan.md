# Auth Implementation Plan (planned, not implemented)

## 1. Purpose

This document defines a practical implementation plan for real authentication in MotoTwin after ownership Phase 2B.

Scope:

- planning only;
- no code/schema/UI changes in this step;
- web + Expo parity by auth outcome (not identical UI).

## 2. Current baseline

- Ownership foundations are in place: `User` + `Garage` + vehicle scoping.
- Base and nested vehicle APIs are already ownership-filtered.
- `getCurrentUserContext()` currently resolves demo user/garage.
- Real auth/session is not implemented yet.

## 2.1 Development-only user switcher (implemented for QA)

- A dev-only user switcher exists on web and Expo Profile surface.
- It supports selecting seeded users: `Demo User`, `Test User A`, `Test User B`.
- Selection is local-only:
  - web: `localStorage`;
  - Expo: local file persistence helper.
- API client sends `x-mototwin-dev-user-email` only in development.
- Backend resolves current context from this header only in development.
- Production ignores dev header and keeps pre-auth demo fallback behavior.
- This is not real auth and not a security boundary.

## 2.2 Pre-auth profile surface (implemented)

- Web route: `/profile`.
- Expo route: `profile`.
- Garage acts as dashboard entry point and links to Profile.
- Profile currently shows pre-auth context info (name/email/garage, fallback-safe values).
- This is not sign-in and must not imply authenticated session state.

## 3. Auth options comparison

### A) Email/password

Pros:

- familiar UX;
- works on web + Expo;
- no email provider dependency required for first local MVP.

Cons:

- password reset flow is required later;
- secure hashing and brute-force controls are mandatory.

### B) Magic link

Pros:

- no password storage burden;
- simple login UX for many users.

Cons:

- requires reliable email delivery from day one;
- worse offline/dev ergonomics for Expo/device testing.

### C) OAuth/social login

Pros:

- low friction sign-in;
- no password UX.

Cons:

- provider setup and compliance overhead;
- callback complexity across web + Expo;
- weaker fit for first MVP auth milestone.

### D) Dev-only login

Pros:

- fastest dev/testing bootstrap.

Cons:

- not production auth;
- can hide real-world auth issues.

Use only as explicit local fallback mode.

### E) Auth.js / NextAuth for web

Pros:

- mature session/cookie handling for Next.js;
- built-in support for credentials and magic link providers.

Cons:

- Expo still needs token strategy and bridging decisions;
- must avoid web-only assumptions in backend user resolution.

### F) Expo session/token approach

Pros:

- standard mobile pattern;
- can share backend ownership checks.

Cons:

- requires secure token storage and refresh handling;
- session invalidation semantics must stay aligned with web.

## 4. Recommended MVP approach

Recommendation:

1. Start with **email/password + server sessions** as primary MVP auth.
2. Use **Auth.js on web** with credentials provider.
3. For Expo, use **token-based session** (short-lived access token + refresh token).
4. Keep **dev-only demo fallback** behind explicit dev flag only.

Why this approach:

- lowest integration risk with current architecture;
- no immediate dependency on transactional email reliability;
- clear migration path to magic link or OAuth later.

Why not overbuild roles yet:

- current product is single-owner garage workflow;
- ownership isolation is already enforced at vehicle scope;
- early role systems add complexity without immediate product value.

## 5. Target auth flow (web + Expo)

### Register

- create user with normalized email and hashed password;
- create default garage for the new user (`Мой гараж` or localized equivalent);
- optionally initialize empty server-side `UserSettings` record in later phase.

### Login

- verify credentials;
- issue session (web cookie session, Expo token session);
- return/resolve current user context for API layer.

### Logout

- invalidate server session / refresh token;
- clear client auth state;
- protected routes return unauthorized after logout.

### Current user

- add a current-user endpoint (for profile and auth state bootstrap);
- response must be minimal and safe (id, displayName, email, auth flags).

### Session expiration

- short access lifetime, renewable session via refresh;
- expired sessions require re-auth;
- consistent behavior across web and Expo.

### Web cookie/session handling

- `HttpOnly`, `Secure`, `SameSite` cookies in production;
- CSRF protection for state-changing requests if cookie session is used.

### Expo token/session storage

- store refresh token in secure storage;
- keep access token in memory where practical;
- rotate tokens and handle refresh failure by forcing re-login.

## 6. API user resolution plan

Current:

- `getCurrentUserContext()` returns demo context.

Target:

- `getCurrentUserContext()` resolves user from session/token identity;
- loads garage context from authenticated user ownership;
- returns unauthorized when auth is missing/invalid;
- keeps `404` for non-owned resources to avoid existence leaks.

Dev fallback:

- optional demo context only in explicit dev mode;
- must be disabled in production.

## 7. Demo-user migration options

### Option A: keep demo user only for local/dev

- safest operationally;
- no automatic data reassignment for production users.

### Option B: first registered user claims demo garage

- convenient for early demos;
- risk of accidental ownership transfer.

### Option C: explicit migration script/tooling

- deterministic and auditable;
- more implementation work.

Recommended MVP path:

- **A + C**.
- Keep demo data local/dev only.
- Use explicit migration tooling for any environment where demo data must be reassigned.

## 8. Ownership rules after auth

- `User` owns `Garage`.
- `Garage` owns `Vehicle`.
- All `/api/vehicles/[id]` base and nested routes remain ownership-scoped.
- Out-of-context vehicle ids continue returning `404`.
- Global catalog/fitment reference endpoints remain public/readable where business-appropriate.

## 9. User settings migration plan

Current:

- settings are local on device.

Target:

- add server `UserSettings` per user;
- sync on login/startup.

Conflict policy for MVP:

1. first authenticated login with empty server settings -> upload local defaults/current values;
2. if server settings exist -> server wins by default;
3. optional one-time "apply local settings" action can be added later.

## 10. Security requirements

- Passwords hashed with strong algorithm (`argon2id` preferred, `bcrypt` acceptable).
- Never store plain passwords or reversible hashes.
- Web cookie session hardening: `HttpOnly`, `Secure`, `SameSite`, CSRF controls.
- Expo secure token storage (no plain localStorage for secrets).
- Preserve `404` for non-owned resources (no existence leak).
- Add rate limiting and suspicious-login monitoring in hardening phase.

## 11. Implementation phases

### Phase 3A — Auth decision and contracts

- finalize auth stack choices;
- define auth/session contracts for web + Expo;
- add any minimal schema updates if truly required.

### Phase 3B — Web auth implementation

- register/login/logout on web;
- cookie-backed session handling;
- current-user bootstrap for web client.

### Phase 3C — Expo auth implementation

- Expo login/logout;
- token + refresh flow;
- secure token storage and session restore.

### Phase 3D — Replace demo context

- switch `getCurrentUserContext()` from demo resolver to auth resolver;
- preserve existing ownership guards and `404` behavior.

### Phase 3E — Settings sync

- introduce server `UserSettings`;
- implement login-time sync policy.

### Phase 3F — Account UI

- account/profile surfaces;
- replace guest placeholders with authenticated identity;
- expose session actions and status.

## 12. QA plan for auth rollout

Core checks:

1. register -> login -> current user -> logout;
2. web session persists across reloads;
3. Expo session persists across app restart;
4. logout immediately blocks protected endpoints;
5. user A cannot read/update user B vehicles (base + nested routes);
6. non-owned ids return `404` without data leak;
7. public catalog endpoints remain accessible.

Cross-platform parity checks:

- same ownership outcomes for web and Expo;
- same unauthorized behavior semantics;
- same resource-not-found semantics for out-of-scope vehicles.

## 13. Out of scope for this plan

- implementing auth code now;
- introducing roles/teams/sharing model now;
- marketplace/social account concepts.

## 14. Related docs

- [auth-roadmap.md](./auth-roadmap.md)
- [auth-data-ownership-architecture.md](./auth-data-ownership-architecture.md)
- [data-model.md](./data-model.md)
