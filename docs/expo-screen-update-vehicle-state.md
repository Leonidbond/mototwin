# Expo Screen: Update Vehicle State

## What was built

Added a mobile flow to update current motorcycle state (odometer + engine hours).

- Entry point: `Vehicle Detail` screen
- New screen: `apps/app/app/vehicles/[id]/state.tsx`
- API call: `PATCH /api/vehicles/:id/state`

## Route and data

The new screen:

1. Loads current values from `GET /api/vehicles/:id` to prefill the form
2. Sends updated values to `PATCH /api/vehicles/:id/state`

API method added in shared client:

- `updateVehicleState(vehicleId, { odometer, engineHours })`

## Validation

Simple MVP validation in screen logic:

- `odometer` is required and must be `>= 0`
- `engineHours` can be empty (sent as `null`) or `>= 0`

## Save behavior

On save:

- shows loading state on button
- handles backend error messages in a readable way
- returns to `Vehicle Detail`

## What refreshes after save

- `Vehicle Detail` refreshes on focus (already implemented)
- `Node Tree` on `Vehicle Detail` refreshes together with detail data
- `Service Log` refreshes when opened next (screen reload on focus is already implemented)

This keeps data consistent without adding global state.

## What is intentionally deferred

- Native date/time or batch state update UX
- Client-side dirty-state tracking
- Inline state update directly inside vehicle detail card
- Advanced validation hints per field
