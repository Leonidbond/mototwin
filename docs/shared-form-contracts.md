# Shared form contracts

## What was extracted

Cross-platform **form value shapes**, **normalization** to API payloads, **lightweight validation** (Russian messages), and **ride profile option lists** live in `@mototwin/types` and `@mototwin/domain`. UI (modals, screens, chips) stays in Next.js and Expo.

### Types (`packages/types/src/forms.ts`)

- **`AddServiceEventFormValues`** / **`AddServiceEventPayload`** (`CreateServiceEventInput`)
- **`UpdateVehicleStateFormValues`** / **`UpdateVehicleStatePayload`**
- **`EditVehicleProfileFormValues`** / **`EditVehicleProfilePayload`**
- **`AddMotorcycleFormValues`** / **`AddMotorcyclePayload`** (`CreateVehicleInput`)
- **`FormValidationResult`**, **`AddServiceEventValidationContext`**, **`RideProfileFieldOption`**

### Domain helpers (`packages/domain/src/forms.ts`)

| Area | Functions |
|------|-----------|
| Service event | **`DEFAULT_ADD_SERVICE_EVENT_CURRENCY`** (`"RUB"`, ISO 4217), `createInitialAddServiceEventFormValues` (initial `currency` = RUB), `normalizeAddServiceEventPayload`, `validateAddServiceEventFormValues` (web cascaded picker + odometer vs vehicle), `validateAddServiceEventFormValuesMobile` (Expo field order) |
| Vehicle state | `createInitialVehicleStateFormValues`, `normalizeVehicleStatePayload`, `validateVehicleStateFormValues` (`web` vs `mobile` wording / parsing) |
| Vehicle profile | `createInitialEditVehicleProfileFormValues`, `normalizeEditVehicleProfilePayload`, `validateEditVehicleProfileFormValues` (no extra client checks yet) |
| Add motorcycle | `createInitialAddMotorcycleFormValues`, `normalizeAddMotorcyclePayload`, `validateAddMotorcycleFormValues` (`web` vs `mobile`; engine-hours field validation only on **mobile** to match prior web onboarding) |

### Ride profile options (`packages/domain/src/ride-profile-form-options.ts`)

Stable **`value`** enums plus **Russian labels** (aligned with web onboarding / vehicle profile):  
`RIDE_USAGE_TYPE_OPTIONS`, `RIDE_RIDING_STYLE_OPTIONS`, `RIDE_LOAD_TYPE_OPTIONS`, `RIDE_USAGE_INTENSITY_OPTIONS`.

## What stays platform-specific

- **State**: expanded modals, `useState`, navigation, loading flags.
- **Layout**: Tailwind vs React Native `StyleSheet`, select vs chips.
- **Web-only rules**: service event **future date** and **odometer ≤ current vehicle odometer** (passed via `AddServiceEventValidationContext`).
- **Expo-only**: leaf-node guard on the service-event screen before shared field validation.
- **Defaults**: e.g. Expo «новый мотоцикл» still initializes **`ridingStyle`** with **`CALM`** locally; shared `createInitialAddMotorcycleFormValues` defaults match **web** (`ACTIVE`) for onboarding-style flows.

## Where it is wired

- **Web:** `src/app/vehicles/[id]/page.tsx` (service event, state, profile), `src/app/onboarding/page.tsx` (create vehicle + shared ride selects).
- **Expo:** `apps/app/app/vehicles/new.tsx`, `vehicles/[id]/state.tsx`, `vehicles/[id]/profile.tsx`, `vehicles/[id]/service-events/new.tsx`.

## Parity notes

- **Add service event:** canonical default currency is **RUB** (`DEFAULT_ADD_SERVICE_EVENT_CURRENCY`); web and Expo should initialize the currency field from `createInitialAddServiceEventFormValues()` (or the constant) so the stored/submitted code stays **`RUB`** unless the user changes it.
- One source for **payload normalization** (trim, `null` for empty optional strings, integers, ISO `eventDate` for service events).
- One source for **ride profile labels** so web and Expo don’t drift (some mobile chip captions may differ slightly from older hard-coded copy — e.g. load type wording aligned with web).
- Validation remains **MVP client-side**; backend Zod and DB rules are unchanged.

## Boundaries

- No API route or Prisma changes.
- No new npm dependencies.
- No React / Next / Expo imports under `packages/domain` form modules.
