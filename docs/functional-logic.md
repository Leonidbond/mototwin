# MotoTwin Functional Logic

## 1. Scope

Документ фиксирует текущую реализованную бизнес-логику обслуживания:
- service events
- state updates
- leaf-node rule
- automatic status calculation
- effectiveStatus aggregation
- explanation payload

## 2. Core chain

1. `Vehicle` stores current operational state (`odometer`, `engineHours`).
2. `ServiceEvent` stores maintenance history (`SERVICE`) and system state logs (`STATE_UPDATE`).
3. `NodeMaintenanceRule` defines intervals/warnings for leaf nodes.
4. `GET /api/vehicles/[id]/node-tree` computes node statuses.
5. Client renders `effectiveStatus` tree and explanation details.

## 3. Service events logic

### 3.1 Leaf-node-only servicing rule

`POST /api/vehicles/[id]/service-events` validates that selected `nodeId` has no children.

If node is not leaf -> request fails with `400`.

### 3.2 Service event creation side effects

After successful create:
- `NodeState` is upserted for leaf node with `RECENTLY_REPLACED`
- matching `TopNodeState` is updated to `RECENTLY_REPLACED` (compatibility)

### 3.3 State update logging

`PATCH /api/vehicles/[id]/state`:
- updates vehicle `odometer` / `engineHours`
- writes `ServiceEvent` with `eventKind = STATE_UPDATE`
- uses a selected node id for log entry due to current schema constraint (`ServiceEvent.nodeId` required)

## 4. Automatic status calculation

Implemented in `/api/vehicles/[id]/node-tree`.

### 4.1 Inputs

For each leaf node, backend uses:
- current vehicle state
- latest leaf service event
- maintenance rule
- direct node state snapshot

### 4.2 Computed status

If no active rule or no baseline service event -> `computedStatus = null`.

With sufficient data:
- calculates elapsed/remaining for km/hours/days
- applies `triggerMode`:
  - `WHICHEVER_COMES_FIRST` and `ANY`: any exceeded -> `OVERDUE`, any warning -> `SOON`, else `OK`
  - `ALL`: all active dimensions must meet condition

### 4.3 Merge with direct status

For leaf effective status:
- `SOON`/`OVERDUE` from computed status override direct `RECENTLY_REPLACED`
- `RECENTLY_REPLACED` remains while computed status is `OK` or `null`
- otherwise fallback to available computed/direct status

## 5. `effectiveStatus` aggregation

Parent status is aggregated bottom-up from own + children statuses using fixed priority:

`OVERDUE > SOON > RECENTLY_REPLACED > OK`

If no status candidates exist -> `effectiveStatus = null`.

## 6. Explanation logic

Leaf nodes may include `statusExplanation` with:
- short and detailed reason
- trigger mode
- current values
- latest service baseline
- rule intervals/warnings
- elapsed/remaining usage metrics
- triggering dimension (`km` / `hours` / `days`)

Used by both clients to explain status outcome.

## 7. Maintenance rule usage

`NodeMaintenanceRule` is the rule source for automatic status computation.

- intervals: `intervalKm`, `intervalHours`, `intervalDays`
- warnings: `warningKm`, `warningHours`, `warningDays`
- mode: `triggerMode`
- active flag: `isActive`

## 8. Cross-platform behavior

- Backend computes status logic once; both web and Expo consume same endpoint output.
- UI presentation can differ per platform, but business outcome (`effectiveStatus`, explanation payload) stays aligned.

## 9. Current limitations

- Read-time computation only; no background precompute job.
- `TopNodeState` still coexists with `NodeState`.
- `STATE_UPDATE` events require `nodeId` under current schema.

## 10. Related docs

- `api-backend.md`
- `data-model.md`
- `frontend-web.md`
- `frontend-expo.md`
