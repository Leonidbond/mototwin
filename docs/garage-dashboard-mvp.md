# Garage Dashboard MVP

## Purpose

Garage is positioned as a personal dashboard area: **«Личный гараж / Мой гараж»**.

Current MVP scope:

- no login/register;
- no real auth session yet;
- dashboard semantics over existing garage data.
- prepared to migrate to authenticated user-owned garage model later.
 - Phase 1 ownership foundation exists in backend data model (demo user + demo garage).

## Product framing

- Garage is the user home surface for motorcycles and service context.
- UI can show local/mock account wording like `Профиль: Гость`.
- Avoid claims that account is connected or authenticated.

## Dashboard sections

1. Header:
   - title `Мой гараж`;
   - subtitle `Все мотоциклы, обслуживание и покупки в одном месте`;
   - prominent CTA `Добавить мотоцикл`.
2. Compact summary (from existing garage payload only):
   - motorcycles count;
   - motorcycles requiring attention;
   - total attention items.
3. Vehicle cards (existing behavior preserved):
   - nickname/title;
   - brand/model/year;
   - attention indicator;
   - odometer/engine hours;
   - collapsible usage profile;
   - collapsible technical summary.
4. Profile entry point:
   - user/profile icon in Garage header (top-right);
   - opens dedicated Profile page/screen.

## Empty state

When no motorcycles exist:

- `Добавьте первый мотоцикл, чтобы начать вести обслуживание`;
- primary action `Добавить мотоцикл`.

## Web

- Route: `src/app/garage/page.tsx`.
- Dashboard header and summary shown above existing cards.
- Existing card navigation to vehicle detail is unchanged.
- Garage settings block removed; settings are moved to `/profile`.

## Expo

- Route: `apps/app/app/index.tsx`.
- Same dashboard semantics with mobile-friendly header and summary chips.
- Existing card navigation and collapsible behavior are unchanged.
- Garage has profile entry action that navigates to `profile` screen.

## Shared layer

New shared view model:

- `GarageDashboardSummaryViewModel`
- helper `buildGarageDashboardSummary`

Helper is pure and uses only provided garage list data; no extra backend calls.

Local settings are described in [user-settings-mvp.md](./user-settings-mvp.md) and now live on Profile screen/page.
Planned auth/data ownership foundation is described in [auth-data-ownership-architecture.md](./auth-data-ownership-architecture.md).
