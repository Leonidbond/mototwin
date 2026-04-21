# UI Action Icons MVP

## Purpose

Action-heavy screens use compact, conventional icons to reduce visual clutter while keeping intent clear.

## Icon semantics

- edit: pencil
- move to trash / delete: trash can
- restore: restore arrow
- profile: user
- service log: history / list
- add: plus
- save: check
- close/cancel: x

## Usage rules

- Web behavior is canonical for action semantics and icon meaning.
- Entity-level secondary actions are icon-only by default.
- For icon-only actions, visible label text is removed; meaning is kept in tooltip/aria/accessibility label.
- Keep text labels for primary actions where intent can be ambiguous.
- For destructive actions, keep restrained danger styling and existing confirmations.

## Web requirements

- Every icon-only action must include:
  - `title`
  - `aria-label`
- This is the MVP tooltip/accessibility baseline (no heavy tooltip system required).

## Expo requirements

- Expo must mirror web icon-only behavior for the same secondary/entity actions (garage header actions, vehicle entity actions, service log edit/delete, trash restore/delete, node tree/search/context quick actions, wishlist secondary actions).
- Icon actions must include:
  - `accessibilityLabel`
  - `accessibilityRole="button"` where applicable.
- Keep comfortable tap targets.
- If icon meaning is not obvious, keep text label near icon (exception allowed).
- Destructive icon actions must still use text confirmation dialogs (`Alert`) before irreversible operations.

## Primary actions stay text

Do not force icon-only for primary form/page actions (for example: `Сохранить`, `Отмена`, `Добавить мотоцикл`, `Вернуться в гараж`).

## Placement rules

- Place icon actions near the entity they affect.
- Avoid detached global icon toolbars.
- Keep card and row layouts readable; avoid icon overload.

## Safety

- Icons do not change business logic.
- Confirm dialogs for destructive actions must remain.
