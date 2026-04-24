# MotoTwin Frontend Web

## 1. Scope

Документ описывает текущую реализованную web-часть в `src/app/**`.

## 2. Implemented pages

- `src/app/page.tsx` — landing page
- `src/app/onboarding/page.tsx` — add motorcycle flow (web)
- `src/app/garage/page.tsx` — garage list
- `src/app/vehicles/[id]/page.tsx` — vehicle operational page

## 3. Main web flows

### 3.1 Landing
- Product intro, value blocks, CTA transitions
- Main transitions: `/onboarding`, `/garage`

### 3.2 Add motorcycle (onboarding)
- Cascading selections:
  - `/api/brands`
  - `/api/models?brandId=...`
  - `/api/model-variants?modelId=...`
- Form fields:
  - identity (`nickname`, `vin`)
  - state (`odometer`, `engineHours`)
  - ride profile fields
- Submit to `/api/vehicles`

### 3.3 Garage
- Loads `/api/garage`
- States: loading / error / empty / list
- Shows vehicle cards with summary and navigation to `/vehicles/[id]`
- Left-side navigation is a collapsible sidebar; collapsed state is persisted
  in `localStorage` (`garage.sidebar.collapsed`)
- Empty state shows illustration `images/empty_garage.png` with caption
  `В вашем гараже пока нет мотоциклов`; primary action `Добавить мотоцикл`
  lives in garage header
- Root document uses explicit dark background and `color-scheme: dark`, so the
  garage keeps a dark native scrollbar area on narrow viewports
- Garage Score legend uses Russian status labels
  (`В норме`, `Скоро`, `Просрочено`, `Недавно`)
- Durable Garage behavior/spec lives in `garage-dashboard-mvp.md`

### 3.4 Vehicle detail (web workspace)

The page consolidates multiple operational blocks and modal flows:
- vehicle identity/profile
- current state with inline update (`PATCH /state`)
- node tree with expand/collapse and status badges
- service log modal with filters/sorting
- add service event modal (leaf-node-only)
- status explanation modal
- edit profile modal (`PATCH /profile`)

## 4. Web interaction with backend

Vehicle page uses:
- `GET /api/vehicles/[id]`
- `GET /api/vehicles/[id]/node-tree`
- `GET /api/vehicles/[id]/service-events`
- `POST /api/vehicles/[id]/service-events`
- `PATCH /api/vehicles/[id]/state`
- `PATCH /api/vehicles/[id]/profile`

After successful mutation, page reloads relevant datasets to reflect updated status/log state.

## 5. Current web-specific notes

- Web currently uses modal-heavy orchestration for operational flows.
- This differs from Expo route-based decomposition, but backend outcome remains aligned.
- Web does not currently use shared `@mototwin/api-client` as primary data layer for page fetches.

## 6. Related docs

- `frontend-expo.md`
- `cross-platform-parity.md`
- `api-backend.md`
- `functional-logic.md`
- `garage-dashboard-mvp.md`
