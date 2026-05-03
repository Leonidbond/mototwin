# Expo Screen: Node Tree Visual Refinement

## What visual refinements were made

Node tree in `apps/app/app/vehicles/[id]/index.tsx` was refined to look lighter and cleaner on mobile:

- Removed decorative circular/outlined styling around expand/collapse controls.
- Kept a simple chevron disclosure icon (`▾` / `▸`) with comfortable touch area.
- Softened nested level backgrounds (`#FCFCFD`) to reduce visual heaviness.
- Reduced visual aggression of nested text and status details:
  - leaf short explanation color is lighter
  - nested status badges are slightly smaller and softer
- Kept top-level nodes as primary anchors.
- Kept problematic branch signal, but made it subtler:
  - softer left accent colors for `SOON`/`OVERDUE`.

## UX goals addressed

- **Cleaner look:** less decorative controls, calmer nested rows.
- **Native feel:** disclosure icons behave like lightweight mobile tree affordances.
- **Hierarchy clarity:** top-level nodes remain dominant; deep levels are calmer.
- **One-handed usability:** touch targets for chevron/leaf action remain comfortable.

## What was intentionally kept unchanged

- Tree behavior:
  - expand/collapse
  - status display
  - short explanations
  - leaf add-service-event action
- Backend data and contracts
- Existing navigation flows from the tree
