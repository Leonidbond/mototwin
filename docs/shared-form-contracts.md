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
| Service event | **`DEFAULT_ADD_SERVICE_EVENT_CURRENCY`** (`"RUB"`, ISO 4217), `createInitialAddServiceEventFormValues` (initial `currency` = RUB), `normalizeAddServiceEventPayload` / `normalizeEditServiceEventPayload`, `validateAddServiceEventFormValues` (web), **`validateAddServiceEventFormValuesMobile`** (Expo UI — делегирует те же правила, см. `forms.ts`), **`parseExpenseAmountInputToNumberOrNull`** / **`stripLocaleMoneyGroupingSeparators`** (суммы в форме и ввода wishlist; `ru-RU`, обычный и неразрывный пробел как разделитель групп), **`createInitialEditServiceEventValues`** (в **ADVANCED** верхние «Запчасти»/«Работа» = **остаток** к сумме по строкам bundle, чтобы повторное сохранение не удваивало учёт), **`sumFiniteBundleItemField`** |
| Vehicle state | `createInitialVehicleStateFormValues`, `normalizeVehicleStatePayload`, `validateVehicleStateFormValues` (`web` vs `mobile` wording / parsing) |
| Vehicle profile | `createInitialEditVehicleProfileFormValues`, `normalizeEditVehicleProfilePayload`, `validateEditVehicleProfileFormValues` (no extra client checks yet) |
| Add motorcycle | `createInitialAddMotorcycleFormValues`, `normalizeAddMotorcyclePayload`, `validateAddMotorcycleFormValues` (`web` vs `mobile`; engine-hours field validation only on **mobile** to match prior web onboarding) |

### Ride profile options (`packages/domain/src/ride-profile-form-options.ts`)

Stable **`value`** enums plus **Russian labels** (aligned with web onboarding / vehicle profile):  
`RIDE_USAGE_TYPE_OPTIONS`, `RIDE_RIDING_STYLE_OPTIONS`, `RIDE_LOAD_TYPE_OPTIONS`, `RIDE_USAGE_INTENSITY_OPTIONS`.

## What stays platform-specific

- **State**: expanded modals, `useState`, navigation, loading flags.
- **Layout**: Tailwind vs React Native `StyleSheet`, select vs chips.
- **Validation context:** service event **дата не в будущем**, **пробег** и сопоставление с текущим пробегом ТС — через **`AddServiceEventValidationContext`** (`todayDateYmd`, `currentVehicleOdometer`, **`leafNodeIds`**) и на web, и в Expo bundle-форме.
- **Layout / навигация:** на web форма — модалка (`BasicServiceEventModal`); на Expo — полноэкранный блок (`basic-service-event-bundle-form`) внутри `service-events/new.tsx`.
- **Defaults**: e.g. Expo «новый мотоцикл» still initializes **`ridingStyle`** with **`CALM`** locally; shared `createInitialAddMotorcycleFormValues` defaults match **web** (`ACTIVE`) for onboarding-style flows.

## Where it is wired

- **Web:** `src/app/vehicles/[id]/page.tsx` (state, profile и обёртка карточки), `src/app/onboarding/page.tsx` (create vehicle + shared ride selects). **Сервисное событие (bundle):** `src/app/vehicles/[id]/_components/BasicServiceEventModal.tsx` — из `service-log/page.tsx`, `vehicle-detail-client.tsx` и других точек входа с тем же UI.
- **Expo:** `apps/app/app/vehicles/new.tsx`, `vehicles/[id]/state.tsx`, `vehicles/[id]/profile.tsx`. **Сервисное событие (bundle):** `vehicles/[id]/_components/basic-service-event-bundle-form.tsx` + экран `vehicles/[id]/service-events/new.tsx`.

## Parity notes

- **Add service event:** canonical default currency is **RUB** (`DEFAULT_ADD_SERVICE_EVENT_CURRENCY`); web and Expo инициализируют **`AddServiceEventFormValues`** доменными хелперами (`createInitialAddServiceEventFormValues`, `createInitialAddServiceEventFromNode`, `createInitialAddServiceEventFromWishlistItem`, `createInitialEditServiceEventValues`, `createInitialRepeatServiceEventValues`, …), чтобы валюта и bundle-поля не расходились между клиентами.
- One source for **payload normalization** (trim, `null` for empty optional strings, integers, ISO `eventDate` for service events).
- **ADVANCED service event:** в payload **`partsCost` / `laborCost`** = сумма по соответствующим полям строк bundle **плюс** числа из верхних полей «Данные события»; **`totalCost`** = их сумма, если есть хотя бы одно число. Превью «Итого» в UI web/Expo использует ту же логику (см. [web-expo-service-log-parity-fixes.md](./web-expo-service-log-parity-fixes.md)).
- One source for **ride profile labels** so web and Expo don’t drift (some mobile chip captions may differ slightly from older hard-coded copy — e.g. load type wording aligned with web).
- Validation remains **MVP client-side**; backend Zod and DB rules are unchanged.

## Boundaries

- No API route or Prisma changes.
- No new npm dependencies.
- No React / Next / Expo imports under `packages/domain` form modules.
