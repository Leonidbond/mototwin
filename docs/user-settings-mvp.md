# User Settings MVP (DB-backed, pre-auth)

## Scope

User settings are available on dedicated Profile page/screen on web and Expo.

Current MVP limitations:

- no authentication;
- no real account session yet;
- values are persisted in DB per user via pre-auth current-user context;
- local storage is used as cache/fallback when API is unavailable.

## Available settings and defaults

- `Валюта по умолчанию`: `RUB` (allowed: `RUB`, `USD`, `EUR`)
- `Единицы пробега`: `km` (allowed: `km`, `mi`)
- `Единицы моточасов`: `h` (allowed: `h`)
- `Формат даты`: `DD.MM.YYYY` (allowed: `DD.MM.YYYY`, `YYYY-MM-DD`)
- `Напоминание по умолчанию`: `7` (allowed days: `7`, `14`, `30`)

## Persistence

- primary: DB `UserSettings` per user
- API: `/api/user-settings` (`GET`, `PATCH`) scoped through `getCurrentUserContext()`
- web fallback: `localStorage` (scoped per user identity with global compatibility key)
- Expo fallback: local app storage helper (scoped per user identity with global compatibility key)

## Current integration

- Settings are editable and persisted in Profile page/screen on both platforms through API.
- `Валюта по умолчанию` is used as default currency in:
  - wishlist create form;
  - add service event form (direct add and node-context add).
- Existing wishlist-`INSTALLED` prefill keeps item-specific currency when it is present.
- Demo/Test users in dev switcher have independent settings rows in DB.

## Not implemented yet

- real auth/session ownership source;
- authenticated session integration policy for local-cache merge/conflicts;
- explicit multi-device conflict UX beyond server-wins baseline.

## Dev-only switcher placement

- Development-only user switcher is displayed in Profile under "Разработка".
- It is hidden in production builds and must not be treated as authentication.

## Future migration after auth

After auth rollout:

1. replace pre-auth context source with auth session identity;
2. keep existing backend profile settings contract;
3. finalize local cache merge/conflict strategy on first authenticated sessions;
4. keep backward compatibility for existing pre-auth local cache data.
