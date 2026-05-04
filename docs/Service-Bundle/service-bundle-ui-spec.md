# MotoTwin — UI Spec: Complex Service / Service Bundle

## 1. Purpose

This document describes the UI specification for the **Complex Service / Service Bundle** feature in MotoTwin.

The feature allows the user to create one service log entry that affects multiple motorcycle nodes.

The same bundle concept is used in two product areas:

1. **Service Log** — as one service event with multiple affected nodes.
2. **Part Selection / Kits** — as a predefined service kit that can be used to select compatible parts for several nodes.

The UI must stay simple, service-centered, and MVP-safe.

**Implementation note (2026-05):** waves 1–3 from the internal plan are reflected in code: Basic/Advanced bundle forms (web modal + Expo), bundle templates picker, multi-line wishlist install into one event, journal deep links for multiple wishlist ids, and node-tree “last service” derived from all `ServiceEventItem` rows. See `docs/Service-Bundle/service-bundle-concept.md` § «Статус реализации».

---

## 2. Product Definition

A **Service Bundle** is a grouped maintenance operation.

Examples:

- Oil change
- 10,000 km service
- Brake service
- Chain and sprockets replacement
- Season preparation

A Service Bundle always creates **one ServiceEvent** and one or more **ServiceEventItems** inside it.

Only selected nodes inside the bundle must be updated after save.

---

## 3. Modes

The feature has two modes:

1. **Basic mode**
2. **Advanced mode**

The mode switch is visible at the top of the create/edit form.

Default mode: **Basic**.

---

## 4. Basic Mode

### 4.1. Goal

Basic mode is for fast logging of a completed service operation.

The user does not need to enter SKU, part names, or per-node details.

### 4.2. User Inputs

Required fields:

- Title
- Date
- At least one node

Optional fields:

- Mileage, km
- Engine hours
- Parts cost
- Labor cost
- Comment

### 4.3. Basic Mode Rules

- The user can select multiple nodes.
- One common action type is applied to all selected nodes.
- The user can enter one total parts cost and one total labor cost.
- SKU, part name, quantity, and per-node cost are not shown.
- After save, only selected nodes are updated.

### 4.4. Basic Mode Layout

```text
Create service event

[ Basic ] [ Advanced ]

Template
[ Select template ▼ ]

Title
[ ТО 10 000 км ]

Date
[ 03.05.2026 ]

Mileage
[ 18420 km ]

Engine hours
[ optional ]

Action type
[ Replace ▼ ]

Nodes
[ ] Engine oil
[ ] Oil filter
[ ] Air filter
[ ] Spark plugs

Costs
Parts cost
[ 12000 ]

Labor cost
[ 5000 ]

Total
17 000 ₽

Comment
[ optional ]

[ Cancel ] [ Save service event ]
```

---

## 5. Advanced Mode

### 5.1. Goal

Advanced mode is for detailed service logging.

The user can describe each node separately and add part information.

### 5.2. User Inputs

Required fields:

- Title
- Date
- At least one service item
- Node for each item

Optional fields per service item:

- Action type
- Part name
- SKU
- Quantity
- Part cost
- Labor cost
- Comment

### 5.3. Advanced Mode Rules

- Each node has its own service row/card.
- Each row can have its own part, SKU, cost, and labor cost.
- Top-level parts cost and labor cost are calculated automatically from item rows.
- If item costs are empty, top-level costs may be entered manually.
- If a part is added to the service event, it is considered installed.
- The feature does not track purchased-but-not-installed status inside Service Bundle.

### 5.4. Advanced Mode Layout

```text
Create service event

[ Basic ] [ Advanced ]

Template
[ Brake service ▼ ]

Title
[ Brake service ]

Date
[ 03.05.2026 ]

Mileage
[ 18420 km ]

Service items

------------------------------------------------
Front brake pads
Action: [ Replace ▼ ]
Part name: [ Brembo front pads ]
SKU: [ 07BB38SA ]
Quantity: [ 1 ]
Part cost: [ 6200 ]
Labor cost: [ 1500 ]
Comment: [ optional ]
[ Remove item ]
------------------------------------------------

------------------------------------------------
Brake fluid
Action: [ Replace ▼ ]
Part name: [ Motul DOT 4 ]
SKU: [ DOT4-500 ]
Quantity: [ 1 ]
Part cost: [ 3600 ]
Labor cost: [ 1000 ]
Comment: [ optional ]
[ Remove item ]
------------------------------------------------

[ + Add node ]

Summary
Parts: 9 800 ₽
Labor: 2 500 ₽
Total: 12 300 ₽

[ Cancel ] [ Save service event ]
```

---

## 6. Template Selection

### 6.1. Purpose

Templates speed up service creation and make complex service predictable.

### 6.2. Template Examples

#### Oil change

Nodes:

- ENGINE.LUBE.OIL
- ENGINE.LUBE.FILTER

#### 10,000 km service

Nodes:

- ENGINE.LUBE.OIL
- ENGINE.LUBE.FILTER
- INTAKE.FILTER
- ELECTRICS.IGNITION.SPARK
- BRAKES.FLUID

#### Brake service

Nodes:

- BRAKES.FRONT.PADS
- BRAKES.REAR.PADS
- BRAKES.FLUID

#### Chain and sprockets

Nodes:

- DRIVETRAIN.CHAIN
- DRIVETRAIN.FRONT_SPROCKET
- DRIVETRAIN.REAR_SPROCKET

### 6.3. Template UI Behavior

When the user selects a template:

- The form title is filled with the template title.
- Template nodes are added to the selected nodes list.
- Default action types are applied.
- The user can remove optional nodes before saving.
- The user can add extra nodes manually.

### 6.4. Template Selector Layout

```text
Template
[ Select template ▼ ]

Dropdown:
- Oil change
- 10,000 km service
- Brake service
- Chain and sprockets
- Season preparation
```

---

## 7. Entry Points

### 7.1. Service Log Entry Point

Location: Service Log page.

Primary action:

```text
[ + Add service event ]
```

Secondary action:

```text
[ + Add complex service ]
```

If there is only one button, use:

```text
[ + Add service event ]
```

and include Basic / Advanced mode inside the form.

### 7.2. Node Detail Entry Point

Location: Node Detail page.

Button:

```text
[ Add service ]
```

Behavior:

- The current node is preselected.
- The user can add more nodes.

### 7.3. Part Selection / Kits Entry Point

Location: Part Selection page, Kits section.

Each kit card has action:

```text
[ Use as service bundle ]
```

Behavior:

- Opens service event form.
- Preselects bundle template.
- Adds template nodes.
- In Advanced mode, compatible part suggestions may be shown per node.

---

## 8. Service Log List UI

### 8.1. Service Event Card

Each complex service appears as one card in the service log.

Card content:

- Title
- Date
- Mileage / engine hours
- Mode badge: Basic / Advanced
- Affected nodes count
- Affected node chips
- Parts cost
- Labor cost
- Total cost
- Short comment if present

### 8.2. Card Layout

```text
ТО 10 000 км                              Advanced
03.05.2026 · 18 420 км

Nodes: Oil · Oil filter · Air filter · Spark plugs

Parts: 12 000 ₽    Labor: 5 000 ₽    Total: 17 000 ₽

[ Open ] [ Edit ]
```

### 8.3. Collapsed vs Expanded

Collapsed card shows summary.

Expanded card shows service items:

```text
Oil filter
Replace · Mann MW 75 · SKU: MW75 · 900 ₽

Air filter
Replace · BMW OEM air filter · SKU: 13718532703 · 2 800 ₽
```

---

## 9. Service Event Detail UI

### 9.1. Purpose

The detail view must clearly explain what was serviced and which nodes were updated.

### 9.2. Layout

```text
ТО 10 000 км
Advanced service event

Date: 03.05.2026
Mileage: 18 420 km
Engine hours: —

Summary
Parts: 12 000 ₽
Labor: 5 000 ₽
Total: 17 000 ₽

Affected nodes
[ Oil ] [ Oil filter ] [ Air filter ] [ Spark plugs ]

Service items
1. Engine oil
   Action: Replace
   Part: Motul 7100 10W-40
   SKU: 104092
   Qty: 3
   Part cost: 5 400 ₽
   Labor cost: 1 000 ₽

2. Oil filter
   Action: Replace
   Part: Hiflo HF160
   SKU: HF160
   Qty: 1
   Part cost: 900 ₽
   Labor cost: 0 ₽

Comment
Плановое ТО перед сезоном.

[ Edit ] [ Delete ]
```

---

## 10. Part Selection / Kits UI

### 10.1. Purpose

Service Bundle templates must be visible in the Kits section.

A kit is not a marketplace cart. It is a structured group of nodes for service and part selection.

### 10.2. Kit Card

Card content:

- Kit title
- Description
- Nodes included
- Estimated number of parts
- Suitable for current vehicle
- CTA buttons

### 10.3. Kit Card Layout

```text
ТО 10 000 км
Oil, oil filter, air filter, spark plugs, brake fluid

5 nodes · compatible with your motorcycle

[ Select parts ] [ Use as service bundle ]
```

### 10.4. Select Parts Behavior

When user clicks **Select parts**:

- Open kit detail view.
- Show each node as a section.
- Show compatible SKU recommendations per node.
- Allow user to select one part per required node.
- Allow user to skip optional nodes.

### 10.5. Use as Service Bundle Behavior

When user clicks **Use as service bundle**:

- Open create service event form.
- Preselect template.
- Add template nodes.
- Default mode may remain Basic.
- User may switch to Advanced if they want part details.

---

## 11. Node Status Update Rules

After saving a service event:

- Only selected nodes inside the bundle are updated.
- Non-selected nodes from the same template are not updated.
- Removed optional nodes are not updated.
- Each selected node receives new last service date.
- Mileage and engine hours are saved when provided.
- Reminder engine recalculates node status.

Status values:

- OK
- Soon
- Overdue
- Recently replaced

---

## 12. Form States

### 12.1. Empty State

If no templates exist:

```text
No service templates yet.
You can still create a custom service event by selecting nodes manually.
```

### 12.2. Loading State

Show loading skeleton or disabled fields while loading:

- templates
- nodes
- existing event for edit mode

### 12.3. Validation Errors

Show inline errors:

- Title is required.
- Date is required.
- Select at least one node.
- Cost cannot be negative.
- Quantity must be greater than zero.

### 12.4. Save Loading State

Save button text:

```text
Saving...
```

Button disabled while request is in progress.

### 12.5. Success State

After save:

- Close modal or navigate to service event detail.
- Show toast:

```text
Service event saved.
```

### 12.6. Error State

Show user-friendly message:

```text
Failed to save service event. Please try again.
```

Do not expose internal server details.

---

## 13. Modal vs Page

### 13.1. Desktop

Use a large modal or drawer.

Recommended:

- Width: 720–960 px
- Max height: 90vh
- Internal scroll for long Advanced mode
- Sticky footer with Save / Cancel

### 13.2. Mobile

Use full-screen modal or dedicated page.

Recommended:

- Full-screen bottom sheet or page
- Sticky bottom save button
- Service item cards stacked vertically
- Template selector near the top

---

## 14. Visual Style

The UI must follow MotoTwin tone:

- dark theme friendly
- restrained
- technical but clear
- no flashy colors
- strong hierarchy
- compact but readable
- suitable for power users and serious owners

Recommended visual components:

- segmented control for Basic / Advanced
- node chips
- cost summary card
- service item cards
- template dropdown
- sticky footer
- inline validation

---

## 15. Components

### 15.1. Main Components

```text
ServiceEventForm
ServiceModeSwitch
ServiceTemplateSelect
BasicServiceFields
AdvancedServiceItems
ServiceNodeMultiSelect
ServiceItemCard
ServiceCostSummary
ServiceEventCard
ServiceEventDetail
ServiceBundleKitCard
```

### 15.2. Component Responsibilities

#### ServiceEventForm

Owns the form state and submit logic.

Props:

```ts
type ServiceEventFormProps = {
  vehicleId: string;
  initialNodeId?: string;
  templateId?: string;
  serviceEventId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
};
```

#### ServiceModeSwitch

Switches between Basic and Advanced.

Modes:

```ts
type ServiceEventMode = "BASIC" | "ADVANCED";
```

#### ServiceTemplateSelect

Loads and displays service bundle templates.

On selection, it applies template nodes to the form.

#### ServiceNodeMultiSelect

Allows selecting several nodes.

Must support:

- search
- grouped display by top-level category
- selected chips

#### AdvancedServiceItems

Displays one `ServiceItemCard` per selected node.

#### ServiceItemCard

Displays per-node fields in Advanced mode.

#### ServiceCostSummary

Shows:

- parts cost
- labor cost
- total cost

In Advanced mode, it should prefer calculated values from item rows.

---

## 16. API Integration

### 16.1. Load Templates

```text
GET /api/service-bundle-templates
```

### 16.2. Load Template Detail

```text
GET /api/service-bundle-templates/:templateId
```

### 16.3. Create Service Event

```text
POST /api/vehicles/:vehicleId/service-events
```

### 16.4. Update Service Event

```text
PATCH /api/service-events/:serviceEventId
```

### 16.5. Load Service Events

```text
GET /api/vehicles/:vehicleId/service-events
```

### 16.6. Load Service Event Detail

```text
GET /api/service-events/:serviceEventId
```

---

## 17. Payload Rules

### 17.1. Basic Mode Payload

```json
{
  "title": "ТО 10 000 км",
  "mode": "BASIC",
  "date": "2026-05-03T00:00:00.000Z",
  "mileageKm": 18420,
  "engineHours": null,
  "partsCost": 12000,
  "laborCost": 5000,
  "comment": "Плановое ТО",
  "items": [
    {
      "nodeId": "engine-lube-oil",
      "actionType": "REPLACE"
    },
    {
      "nodeId": "engine-lube-filter",
      "actionType": "REPLACE"
    }
  ]
}
```

### 17.2. Advanced Mode Payload

```json
{
  "title": "Обслуживание тормозов",
  "mode": "ADVANCED",
  "date": "2026-05-03T00:00:00.000Z",
  "mileageKm": 18420,
  "partsCost": 9800,
  "laborCost": 2500,
  "comment": null,
  "items": [
    {
      "nodeId": "brakes-front-pads",
      "actionType": "REPLACE",
      "partName": "Brembo front pads",
      "sku": "07BB38SA",
      "quantity": 1,
      "partCost": 6200,
      "laborCost": 1500
    },
    {
      "nodeId": "brakes-fluid",
      "actionType": "REPLACE",
      "partName": "Motul DOT 4",
      "sku": "DOT4-500",
      "quantity": 1,
      "partCost": 3600,
      "laborCost": 1000
    }
  ]
}
```

---

## 18. Validation Rules

### 18.1. Common Rules

- `title` is required.
- `date` is required.
- `items.length` must be at least 1.
- `mileageKm` must be non-negative.
- `engineHours` must be non-negative.
- `partsCost` must be non-negative.
- `laborCost` must be non-negative.

### 18.2. Basic Mode Rules

In Basic mode:

- `partName` must not be shown.
- `sku` must not be shown.
- `quantity` must not be shown.
- `partCost` and `laborCost` on item level must not be shown.

### 18.3. Advanced Mode Rules

In Advanced mode:

- Item-level fields are visible.
- `quantity`, if provided, must be greater than zero.
- Item costs must be non-negative.
- Top-level totals are calculated from item-level values when available.

---

## 19. Editing Behavior

When editing a service event:

- Existing mode is preserved.
- Existing nodes are loaded.
- Existing costs are loaded.
- In Basic mode, user may add/remove nodes.
- In Advanced mode, user may edit item cards.
- After save, node status recalculation must use the final selected node list.

Important:

If a node is removed from an existing service event, its derived status may need recalculation based on previous service history.

For MVP, it is acceptable to trigger a generic recalculation for affected vehicle nodes after edit.

---

## 20. Empty and Edge Cases

### 20.1. No Nodes Available

```text
No service nodes are available for this motorcycle yet.
```

Disable Save.

### 20.2. No Compatible Parts in Kit Selection

```text
No compatible parts found for this node yet.
You can still add the service manually.
```

### 20.3. Template Has Missing Nodes

If a template references nodes not available for the current vehicle:

- show available nodes
- show skipped nodes in a warning block

```text
Some nodes from this template are not available for this motorcycle.
```

### 20.4. Switching Mode

When switching from Basic to Advanced:

- keep selected nodes
- create one item per selected node
- keep title/date/mileage/comments
- copy common action type to all items

When switching from Advanced to Basic:

- warn if detailed part data exists

```text
Switching to Basic mode will hide detailed part fields. Existing detailed values will not be used in Basic mode.
```

For MVP, do not delete hidden values until save unless implementation is simpler with explicit reset.

---

## 21. Acceptance Criteria

### 21.1. Basic Mode

- User can create one service event with several nodes.
- User can enter parts cost and labor cost separately.
- User cannot enter SKU or part names.
- After save, only selected nodes are updated.
- Service log shows the event as one card.

### 21.2. Advanced Mode

- User can create one service event with several item rows.
- Each item row can have its own node, part, SKU, quantity, part cost, and labor cost.
- Cost summary is calculated correctly.
- After save, only selected nodes are updated.
- Detail view shows all service items.

### 21.3. Templates

- User can select a service bundle template.
- Template preselects nodes.
- User can remove optional nodes.
- User can add extra nodes.
- Template can be used from both Service Log and Part Selection / Kits.

### 21.4. UX

- Loading state is visible.
- Save button is disabled while saving.
- Validation errors are shown inline.
- Error messages are understandable.
- Mobile layout is usable with vertical scrolling.
- Desktop layout is usable as large modal or drawer.

---

## 22. MVP Implementation Order

Recommended order:

1. Add Prisma models and migration.
2. Seed initial service bundle templates.
3. Build API routes for templates.
4. Build API route for creating service events.
5. Build Basic mode UI.
6. Build service log card display.
7. Build Advanced mode UI.
8. Build service event detail view.
9. Add Kit entry point from Part Selection.
10. Add edit behavior.

---

## 23. Do Not Build Yet

Do not include in the first implementation unless explicitly requested:

- custom user-created templates
- purchased-but-not-installed tracking inside Service Bundle
- marketplace cart
- supplier ordering
- automatic receipt parsing
- advanced cost analytics
- community features
- telemetry-based service bundles

---

## 24. Final Product Rule

Complex Service must feel like a natural maintenance workflow:

> one real-world service operation, one log entry, several affected nodes, optional detailed parts and costs.

The feature must stay focused on the MotoTwin core: service history, node status, fitment, and ownership clarity.
