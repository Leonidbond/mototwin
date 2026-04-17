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
- Add-service-event action
- Navigation and focus-based refresh behavior
- Shared grouping/summary helpers from `@mototwin/domain`

## What now matches web conceptually

- Grouped historical timeline by month
- Monthly summary as a first-class element
- Distinction between maintenance events and state updates
- Easier scan of maintenance history over time

## What remains intentionally mobile-specific

- No desktop-like dense table/filter layout
- No heavy timeline decorations
- More compact cards and spacing tuned for one-hand use

## Not yet at full parity

- Web-level filtering/sorting controls are not mirrored in mobile
- Advanced comments expansion behavior from web is not replicated
- Desktop modal composition is intentionally not cloned
