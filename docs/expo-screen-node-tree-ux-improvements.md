# Expo Screen: Node Tree UX Improvements

## What was improved

The node tree on `Vehicle Detail` (`apps/app/app/vehicles/[id]/index.tsx`) was refined for mobile readability and one-hand usage without changing behavior.

- Top-level nodes are now visually stronger and easier to identify as entry points.
- Nested rows have clearer density and spacing for hierarchy scanning.
- Expand/collapse affordance is more obvious with a dedicated chevron touch area.
- Leaf-node `+` action now has a larger, friendlier touch target.
- Short explanations remain visible but secondary.

## Mobile UX decisions

- **Hierarchy first:** top-level rows are emphasized, nested rows are softened.
- **Touch clarity:** chevron and leaf action targets were enlarged to reduce missed taps.
- **Status readability:** status badges remain prominent; `SOON`/`OVERDUE` rows get a subtle left accent to aid quick triage.
- **Low visual noise:** all changes stay restrained and card-based, with no flashy animations.

## Behavior kept intact

- Expand/collapse logic unchanged.
- Effective status labels unchanged.
- Short status explanations unchanged.
- Add-service-event from leaf nodes unchanged.

## What remains deferred

- Sticky tree controls (expand/collapse all)
- Optional status filtering within the tree
- Animation polish for expand/collapse transitions
- Deep-linking to a specific node and auto-expand path
