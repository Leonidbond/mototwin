# Expo Screen: Add Service Event

## What was built

Added the first mobile flow for creating a service event:

- Entry point from `Service Log` screen via `+ Добавить сервисное событие`
- New screen: `apps/app/app/vehicles/[id]/service-events/new.tsx`
- Save to existing backend route: `POST /api/vehicles/:id/service-events`

## UX flow

`Vehicle Detail -> Service Log -> Add Service Event -> Save -> back to Service Log`

After save, the app navigates back to Service Log and data refreshes on focus.

## Data used

- Vehicle detail (`GET /api/vehicles/:id`) for default odometer/engine-hours
- Node tree (`GET /api/vehicles/:id/node-tree`) for hierarchical node selection
- Create service event (`POST /api/vehicles/:id/service-events`)

## Form fields

- leaf node selection (required)
- eventDate (`YYYY-MM-DD`)
- odometer
- engineHours (optional)
- serviceType
- costAmount (optional)
- currency (optional, used if cost is set)
- comment (optional)

## Leaf-node selection

Implemented as a simple cascading level selector:

- Top level shown first
- Selecting a node reveals the next level
- Save is enabled only when a **leaf** node is selected

This keeps the first mobile version explicit and safe without complex widgets.

## Refresh behavior

- `Service Log` reloads on screen focus
- `Vehicle Detail` reloads on screen focus

This ensures newly created service events are reflected in:

- service history
- computed node statuses/tree after returning to vehicle detail

## Shared packages used

- `@mototwin/types`: `CreateServiceEventInput`, `NodeTreeItem`, `SelectedNodePath`
- `@mototwin/domain`: `getNodeSelectLevels`, `getSelectedNodeFromPath`, `getLeafStatusReasonShort`
- `@mototwin/api-client`: `createServiceEvent`

## What is intentionally deferred

- Editing/deleting service events
- Attachments / installed parts editor
- Advanced date picker UI (native calendar)
- Inline creation from node tree rows
- Offline draft mode
