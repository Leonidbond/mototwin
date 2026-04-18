# MotoTwin Cross-Platform Parity

## 1. Scope

Документ фиксирует текущее состояние parity между:
- web client
- Expo mobile client

Parity оценивается по core workflows, business outcome и пользовательскому пониманию результата.

## 2. Parity principles in current project

- Backend contracts are shared truth.
- Business result should remain aligned between platforms.
- UI/layout may differ by platform conventions.
- Divergence must be explicit and documented.

## 3. Current parity matrix

## 3.1 Garage

- **Web:** implemented (`/garage`)
- **Expo:** implemented (`index`)
- **Parity status:** aligned for spec highlights (both use `filterMeaningfulGarageSpecHighlights` after `buildGarageCardProps`)
- **Notes:** both show list states and navigation to vehicle detail; visual composition differs. See **4.2** for spec highlight rules.

## 3.2 Add motorcycle

- **Web:** implemented (`/onboarding`)
- **Expo:** implemented (`vehicles/new`)
- **Parity status:** aligned by business outcome
- **Notes:** both use same catalog/vehicle creation routes; UX differs (web form vs mobile progressive sections).

## 3.3 Vehicle detail

- **Web:** implemented (`/vehicles/[id]`)
- **Expo:** implemented (`vehicles/[id]/index`)
- **Parity status:** mostly aligned
- **Notes:** both expose identity/state/profile/technical/node-tree context; web uses larger single-page modal orchestration.

## 3.4 Service log

- **Web:** implemented inside vehicle page modal
- **Expo:** implemented as dedicated route (`vehicles/[id]/service-log`)
- **Parity status:** aligned by business outcome
- **Notes:** both support reading `SERVICE` and `STATE_UPDATE`, filtering/sorting and grouped understanding. Entry date string: web `default`, Expo `compact`; month headers shared — **4.1**.

## 3.5 Add service event

- **Web:** implemented via modal form
- **Expo:** implemented route form (`vehicles/[id]/service-events/new`)
- **Parity status:** aligned
- **Notes:** both enforce leaf-node-only servicing and use same backend validations.

## 3.6 Update vehicle state

- **Web:** inline edit in vehicle page
- **Expo:** dedicated route (`vehicles/[id]/state`)
- **Parity status:** aligned
- **Notes:** both call same backend endpoint and produce `STATE_UPDATE` log side effect.

## 3.7 Edit vehicle profile

- **Web:** modal edit in vehicle page
- **Expo:** dedicated route (`vehicles/[id]/profile`)
- **Parity status:** aligned
- **Notes:** both update nickname/vin/ride profile via shared backend contract.

## 3.8 Node status semantics

- **Web:** consumes `node-tree` payload
- **Expo:** consumes same payload
- **Parity status:** aligned
- **Notes:** `effectiveStatus`, explanation semantics and severity ordering are shared.

## 4. Intentional platform differences (acceptable)

1. **Flow composition**
- web: one operational page with modals
- Expo: decomposed route-based screens

2. **Visual layout**
- web: desktop/table-like patterns
- Expo: mobile cards/chips/timeline patterns

These differences are acceptable because business result and terminology remain aligned.

### 4.1 Date display policy (shared meaning, optional compact rows)

| Context | Web | Expo | Shared helper |
|--------|-----|------|----------------|
| Service log **entry** line | `buildServiceLogTimelineProps(…, "default")` — full `ru-RU` date | `…, "compact")` — short month form | `formatServiceLogEntryDate` in `@mototwin/domain` |
| Service log **month group** header | Long month + year (`ru-RU`) | Same | `formatMonthYearLabel` in `packages/domain` (grouping) |
| **Status explanation** dates | `formatIsoCalendarDateRu` | Same | `@mototwin/domain` |

Invalid or unparseable timestamps: compact journal line falls back to `YYYY-MM-DD` slice; full/compact explanation-style formatting returns the raw string unchanged.

### 4.2 Garage spec highlights policy

- **Garage list (web + Expo):** after `buildGarageCardProps`, apply **`filterMeaningfulGarageSpecHighlights`**. Only non-empty values that are not the Russian “not specified” placeholders are shown (engine, cooling, wheels, brakes subset).
- **Vehicle detail:** full technical specs via **`buildVehicleTechnicalInfoViewModel`** (additional fields; only rows with real values).

This keeps garage cards scannable without hiding data that remains on the vehicle screen.

## 5. Partial parity / known gaps

1. **Shared client adoption**
- Expo actively uses `@mototwin/api-client`.
- Web still uses mostly direct `fetch` inside pages.
- Impact: possible drift in client-side request handling behavior.

2. **Interaction density**
- Web provides denser all-in-one operational view.
- Expo optimizes one-handed and step-by-step interactions.
- Impact: user journey shape differs, but result is kept aligned.

## 6. Parity follow-up expectations

When implementing new user-facing features:
1. explicitly state web impact
2. explicitly state mobile impact
3. record parity status
4. if one side deferred, define concrete next parity step

## 7. Related docs

- `frontend-web.md`
- `frontend-expo.md`
- `shared-packages.md`
- `api-backend.md`
