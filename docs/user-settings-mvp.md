# User Settings MVP (local only)

## Scope

Local user settings are available in Garage settings placeholder on web and Expo.

Current MVP limitations:

- no authentication;
- no backend sync;
- no Prisma/API changes for settings;
- values are persisted locally per device/session storage.

## Available settings and defaults

- `Валюта по умолчанию`: `RUB` (allowed: `RUB`, `USD`, `EUR`)
- `Единицы пробега`: `km` (allowed: `km`, `mi`)
- `Единицы моточасов`: `h` (allowed: `h`)
- `Формат даты`: `DD.MM.YYYY` (allowed: `DD.MM.YYYY`, `YYYY-MM-DD`)
- `Напоминание по умолчанию`: `7` (allowed days: `7`, `14`, `30`)

## Persistence

- web: `localStorage`
- Expo: local app storage helper (file/local storage abstraction already used in app UI settings)

Shared storage key constant:

- `USER_LOCAL_SETTINGS_STORAGE_KEY = "mototwin.userLocalSettings"`

## Current integration

- Settings are editable and persisted in Garage dashboard settings section on both platforms.
- Value usage in forms (wishlist/service-event default currency) is intentionally deferred to a follow-up step to avoid broad cross-screen refactor in this task scope.

## Not implemented yet

- account-bound settings;
- server-side profile settings;
- cross-device sync;
- migration runner for multi-user account profiles.

## Future migration after auth

After auth rollout:

1. map local settings to authenticated user profile;
2. add backend profile settings contract;
3. migrate local defaults into server profile;
4. keep backward compatibility for pre-auth local data.
