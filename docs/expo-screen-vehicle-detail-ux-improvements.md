# Expo Screen: Vehicle Detail UX Improvements

## What was improved

The Vehicle Detail screen was polished to feel like the main control center for one motorcycle, without changing backend behavior or core flows.

### Top section (identity + state)

- Reworked top card to improve visual hierarchy:
  - small eyebrow label
  - title (nickname if present, otherwise brand + model)
  - brand + model line
  - year + version line
- Added clearer "Текущее состояние" block with two compact metric cards:
  - Пробег
  - Моточасы
- Kept VIN in the same card as secondary information.

### Actions area

- Grouped key actions into a single dedicated card:
  - `Журнал обслуживания`
  - `Обновить текущее состояние`
  - `Редактировать профиль`
- Added a short subtitle to explain purpose of the actions.
- Improved spacing and consistent button style for better thumb reach and scanability.

### Node tree section

- Added section subtitle in Russian for guidance.
- Improved spacing around section and tree card.
- Kept all existing interactions intact:
  - expand/collapse
  - leaf add-service-event action
  - status badge + short reason display

## UX decisions

- Prioritized a simple card-based layout for mobile readability.
- Kept all existing routes and flows unchanged; only visual structure was improved.
- Avoided flashy styling and new abstractions to stay MVP-safe.

## What remains deferred

- Collapsible "Actions" card for ultra-dense screens
- Sticky quick actions while scrolling
- Rich visual state history in the top card
- Advanced node tree affordances (e.g. mini legends or filtering)
