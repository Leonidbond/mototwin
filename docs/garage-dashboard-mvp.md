# Garage Dashboard MVP

## Purpose

Garage is positioned as a personal dashboard area: **«Личный гараж / Мой гараж»**.

Current MVP scope:

- no login/register;
- no account backend model yet;
- dashboard semantics over existing garage data.

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
4. Settings placeholder (local-only):
   - user preferences section in Garage;
   - local persistence only;
   - no auth profile sync yet.

## Empty state

When no motorcycles exist:

- `Добавьте первый мотоцикл, чтобы начать вести обслуживание`;
- primary action `Добавить мотоцикл`.

## Web

- Route: `src/app/garage/page.tsx`.
- Dashboard header and summary shown above existing cards.
- Existing card navigation to vehicle detail is unchanged.

## Expo

- Route: `apps/app/app/index.tsx`.
- Same dashboard semantics with mobile-friendly header and summary chips.
- Existing card navigation and collapsible behavior are unchanged.

## Shared layer

New shared view model:

- `GarageDashboardSummaryViewModel`
- helper `buildGarageDashboardSummary`

Helper is pure and uses only provided garage list data; no extra backend calls.

Local settings are described in [user-settings-mvp.md](./user-settings-mvp.md).
