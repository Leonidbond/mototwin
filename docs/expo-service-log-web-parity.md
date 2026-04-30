# Expo Service Log: Web Parity

## What was changed

`apps/app/app/vehicles/[id]/service-log.tsx` was visually reworked to match the web service log concept more closely while staying mobile-first.

### Structural parity improvements

- Kept monthly grouping and made it more explicit with a **month header card**
- Added compact **monthly summary chips**:
  - SERVICE count
  - STATE_UPDATE count
  - monthly costs (if present)
- Entries are now rendered in a clearer **timeline-like flow**:
  - left rail
  - event dot (different for SERVICE / STATE_UPDATE)
  - event card content

### Entry hierarchy improvements

- **SERVICE** remains visually primary:
  - stronger card presence
  - serviceType + node name emphasis
- **STATE_UPDATE** remains secondary:
  - lighter visual treatment
  - clear Russian label and compact summary

### Preserved behavior

- Loading / error / empty states
- Navigation and focus-based refresh (`useFocusEffect`)
- Shared timeline pipeline from `@mototwin/domain` (`buildServiceLogTimelineProps`, filters, sort, month groups)

## What now matches web conceptually

- Grouped historical timeline by month
- Monthly summary as a first-class element
- Distinction between maintenance events and state updates
- Easier scan of maintenance history over time

## What remains intentionally mobile-specific

- No desktop-like dense table layout or wide filter panel
- No heavy timeline decorations
- More compact cards and spacing tuned for one-hand use
- Add/edit/repeat flows open the dedicated `service-events/new` screen instead of web’s inline modal on the journal page

## Parity since this doc was first written

- Filtering, sorting, `paidOnly`, subtree filter via `nodeIds`/`nodeLabel`, comment preview/expand, and wishlist-origin affordances are aligned with web at the **data + rules** level (see [expo-service-log-filter-sort-parity.md](./expo-service-log-filter-sort-parity.md) and [web-expo-service-log-parity-fixes.md](./web-expo-service-log-parity-fixes.md)).

## Still not a pixel clone of web

- Layout density and control chrome differ by design (mobile-first toolbar vs desktop page)
