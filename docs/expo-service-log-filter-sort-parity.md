# Expo Service Log Filter/Sort Parity

## What was added/improved

`apps/app/app/vehicles/[id]/service-log.tsx` now includes a compact mobile filter/sort toolbar that works on the loaded dataset in the client layer.

### Filters

- Date range:
  - `Дата с`
  - `Дата по`
- Node filter (text input, case-insensitive, forgiving starts-with/includes via shared helper)
- Event kind:
  - `Все`
  - `SERVICE`
  - `STATE_UPDATE`
- Service type text filter
- `Сбросить` action resets filters + sorting to defaults

### Sorting

- Sort field:
  - date
  - odometer
  - node name
  - event kind
- Sort direction:
  - ascending
  - descending
- Default stays web-like:
  - date desc (newest first)

## Conceptual parity with web

Now matches web behavior conceptually on mobile:

- practical filtering controls
- practical sort controls
- filtering/sorting applied before grouping
- month grouping and monthly summaries update from the filtered dataset
- filtered empty state appears when no records match

## Mobile-specific choices

- Controls are compact chips + simple text/date inputs
- No dense table/grid UI from desktop web
- Timeline presentation is preserved and remains easy to scan one-handed

## What remains intentionally different from web

- No full desktop-style advanced controls layout
- No separate sortable table header paradigm
- Simpler compact mobile toolbar instead of wide desktop filter panel
