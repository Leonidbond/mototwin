# Vehicle Trash MVP ("Свалка")

## Scope

`Свалка` is a soft-delete flow for motorcycles in pre-auth ownership mode.

- Garage "delete" moves vehicle to trash (soft delete).
- Trash has restore and permanent delete actions.
- Retention is configurable per user in Profile.
- Real auth is out of scope.

## Product behavior

1. From Garage, user chooses **"Переместить на свалку"**.
2. Vehicle disappears from active Garage list.
3. Vehicle appears on `Свалка` page/screen.
4. User can:
   - restore vehicle;
   - permanently delete vehicle (explicit confirmation, irreversible).

## Data model

`Vehicle` soft-delete fields:

- `trashedAt: DateTime?`
- `trashExpiresAt: DateTime?`

`UserSettings` field:

- `vehicleTrashRetentionDays: Int` (allowed: `7`, `14`, `30`, `60`, `90`; default `30`)

## API contract

- `GET /api/garage` returns only active vehicles (`trashedAt = null`).
- `GET /api/vehicles/trash` returns only trashed vehicles in current ownership context.
- `POST /api/vehicles/[id]/trash` moves vehicle to trash and sets expiration by user setting.
- `POST /api/vehicles/[id]/restore` restores trashed vehicle.
- `DELETE /api/vehicles/[id]/trash` permanently deletes vehicle, only if it is already trashed.

Ownership constraints:

- All trash routes are scoped through current user/garage context.
- Non-owned vehicles return `404`.

## Retention and expiry

- Expiry date is computed on move-to-trash as `trashedAt + retentionDays`.
- If expiry date is in the past, UI shows **"Срок хранения истек"**.
- In this step expired vehicles are **not** auto-deleted.
- Cleanup scheduler/background job is deferred.

## UI

Web:

- Garage contains move-to-trash action and link to `Свалка`.
- Route: `/trash`.

Expo:

- Garage contains move-to-trash action and link to `Свалка`.
- Screen: `trash`.

Trash card displays:

- nickname/title
- brand/model/year
- trashed date
- retention expiry date
- days remaining (if applicable)

## Safety notes

- Soft delete does not remove service events/wishlist data.
- Permanent delete is explicit and irreversible.
- No real auth/session logic is introduced in this MVP step.
