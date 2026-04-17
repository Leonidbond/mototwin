# Expo Screen: Garage UX Improvements

## What was improved

Garage screen (`apps/app/app/index.tsx`) was updated to feel more like a product screen:

- Added a clear top structure: title -> short explanation -> primary action
- Added concise explanatory text in Russian about what Garage is for
- Added primary CTA button: `Добавить мотоцикл`
- Kept navigation to vehicle detail intact

## Motorcycle cards

Cards were made more informative and easier to scan:

- Nickname (or fallback title) as primary text
- Brand + model as secondary text
- Year + version (if available)
- VIN (if available, otherwise `—`)
- Odometer
- Engine hours (if available, otherwise `—`)

Hierarchy was improved with a small metrics block and restrained visual separators.

## Empty state

Empty state now:

- explains what Garage is
- provides primary action `Добавить мотоцикл`
- keeps secondary refresh action

## Add motorcycle action status

`Добавить мотоцикл` currently opens a placeholder screen:

- `apps/app/app/vehicles/new.tsx`

This keeps the UX clear while the full add-motorcycle flow is still deferred.

## What remains deferred

- Full add-motorcycle form and save flow
- Validation and brand/model/variant selection in Expo
- Post-create redirect back to Garage with optimistic update
