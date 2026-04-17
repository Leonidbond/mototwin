# Expo Screen: Vehicle Detail Data Parity

## What data was added

Vehicle Detail in Expo now shows the key data already present in web Vehicle Detail, organized into mobile sections:

- **Identity block**
  - nickname
  - brand + model
  - year / version
  - VIN
- **Current state**
  - odometer
  - engine hours
- **Ride profile**
  - usageType
  - ridingStyle
  - loadType
  - usageIntensity
- **Technical info** (only when present)
  - market
  - engineType
  - coolingType
  - wheelSizes
  - brakeSystem
  - chainPitch
  - stockSprockets

## UX behavior

- Empty/absent technical fields are hidden rather than rendered as noisy placeholders.
- Ride profile shows a clean empty message when profile is not set.
- Existing operational flows are preserved:
  - node tree
  - service log
  - add service event
  - update state
  - edit profile

## Type updates

`VehicleDetail` type in `packages/types/src/vehicle.ts` was minimally expanded to include optional `modelVariant` technical fields used by existing backend responses.

## What remains not yet matched with web

- Desktop-specific layouts and modal-heavy interactions are intentionally not mirrored.
- Some web-only explanatory micro-copy and dense table layouts are intentionally omitted for mobile readability.

## Intentional mobile omissions

- Full desktop composition parity was intentionally avoided to keep the screen concise and one-hand friendly.
- Information parity is prioritized over layout parity.
