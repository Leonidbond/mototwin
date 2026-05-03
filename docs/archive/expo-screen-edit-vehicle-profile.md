# Expo Screen: Edit Vehicle Profile

## What was built

Added a mobile flow to edit vehicle profile data from the Expo app.

- Entry point: `Vehicle Detail` screen (`Редактировать профиль`)
- New screen: `apps/app/app/vehicles/[id]/profile.tsx`
- API route used: `PATCH /api/vehicles/:id/profile`

## Editable fields

The form allows editing only:

- `nickname`
- `vin`
- `rideProfile.usageType`
- `rideProfile.ridingStyle`
- `rideProfile.loadType`
- `rideProfile.usageIntensity`

Not editable:

- brand/model/modelVariant
- odometer/engineHours

## Data and validation

Form is prefilled from `GET /api/vehicles/:id`.

Simple validation behavior:

- `nickname` can be empty (`null` sent)
- `vin` can be empty (`null` sent)
- ride profile values are selected from fixed option chips that match backend enums:
  - `usageType`: `CITY | HIGHWAY | MIXED | OFFROAD`
  - `ridingStyle`: `CALM | ACTIVE | AGGRESSIVE`
  - `loadType`: `SOLO | PASSENGER | LUGGAGE | PASSENGER_LUGGAGE`
  - `usageIntensity`: `LOW | MEDIUM | HIGH`

## Save behavior

- Shows loading state while saving
- Shows readable backend error message on failure
- On success returns to `Vehicle Detail`

`Vehicle Detail` already reloads on focus, so updated profile values are immediately reflected.

## Shared package updates

- `@mototwin/types`
  - added ride profile enum-like unions
  - `UpdateVehicleProfileInput`
- `@mototwin/api-client`
  - added `updateVehicleProfile(vehicleId, input)`

## What remains deferred

- VIN-specific format validation rules
- richer profile helper text / explanations
- optimistic UI updates
- profile history/audit timeline
