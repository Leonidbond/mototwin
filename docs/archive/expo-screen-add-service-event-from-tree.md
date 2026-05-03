# Expo Screen: Add Service Event From Tree

## What was built

Added inline add-service-event action directly in the vehicle node tree for **leaf nodes only**.

- Location: `apps/app/app/vehicles/[id]/index.tsx`
- Action UI: compact `+` button near leaf node status
- Route opened: `vehicles/[id]/service-events/new?source=tree&nodeId=<leafId>`

## How leaf-node action works

- For nodes with children: no add action is shown
- For leaf nodes: add action is visible and tappable
- Tapping `+` opens the existing Add Service Event screen

This keeps the tree readable while providing fast operational entry from the exact part.

## Prefilled node selection

The Add Service Event screen reads optional params:

- `nodeId` - target leaf node id
- `source` - `"tree"` or default `"service-log"`

When `nodeId` is present, the form:

1. Loads `node-tree`
2. Uses `findNodePathById(...)` to derive full path
3. Prefills cascading node selection with that path

Result: user can save immediately without reselecting the node.

## Save/refresh behavior

- On successful save from tree source:
  - returns to `Vehicle Detail`
  - node tree refreshes on focus
- On successful save from manual service-log source:
  - returns to `Service Log`
  - service log refreshes on focus

Both refresh mechanisms are already implemented via `useFocusEffect`.

## What remains deferred

- Inline drawer/sheet form directly in tree row
- Add action badges with richer semantics by status
- Optional confirmation toast after save
- Smart defaults by leaf node type (future quality-of-life improvement)
