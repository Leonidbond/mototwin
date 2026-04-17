# Expo Garage Card Data Parity

## What data was added to Garage cards

Expo Garage cards now display a richer summary based on existing backend `GET /api/garage` fields (already used by web):

- nickname (or brand+model fallback)
- brand + model
- year / version
- vin (shown only if present)
- odometer
- engineHours (shown only if present)
- compact secondary info (shown only if present):
  - ride profile usage type
  - engine type
  - cooling type

## Mobile-first card hierarchy

Card structure is organized as:

1. **Primary identity**: title, brand/model, year/version
2. **Current state**: odometer (always), engineHours (if present)
3. **Secondary chips**: profile/engine/cooling (only when available)

This keeps the card informative without becoming too dense.

## What remains intentionally left to Vehicle Detail

The following stay on Vehicle Detail to avoid Garage card overload:

- full ride profile (all fields)
- full technical summary (wheels, brakes, chain pitch, stock sprockets, market)
- node tree status and maintenance explanations
- service log timeline

## Mobile compromises

- Empty values are hidden instead of showing repetitive placeholders
- Secondary data is shown as compact chips for quick scanning
- The card remains tappable and navigation to Vehicle Detail is unchanged
