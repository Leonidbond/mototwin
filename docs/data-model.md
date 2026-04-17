# MotoTwin Data Model

## 1. Scope

Документ описывает текущее реализованное состояние модели в `prisma/schema.prisma`.

## 2. Enums

- `PlanType`: `FREE`, `PRO`
- `SubscriptionStatus`: `ACTIVE`, `INACTIVE`, `CANCELED`, `TRIAL`
- `UsageType`: `CITY`, `HIGHWAY`, `MIXED`, `OFFROAD`
- `RidingStyle`: `CALM`, `ACTIVE`, `AGGRESSIVE`
- `LoadType`: `SOLO`, `PASSENGER`, `LUGGAGE`, `PASSENGER_LUGGAGE`
- `UsageIntensity`: `LOW`, `MEDIUM`, `HIGH`
- `TopNodeStatus`: `OK`, `SOON`, `OVERDUE`, `RECENTLY_REPLACED`
- `NodeStatus`: `OK`, `SOON`, `OVERDUE`, `RECENTLY_REPLACED`
- `MaintenanceTriggerMode`: `WHICHEVER_COMES_FIRST`, `ANY`, `ALL`
- `ServiceEventKind`: `SERVICE`, `STATE_UPDATE`

## 3. Core entities and relationships

### User / Subscription

- `User` has many `Vehicle`.
- `Subscription` is optional 1:1 to `User` (`userId` unique).
- Runtime MVP currently uses demo user approach for vehicle flows.

### Brand / Model / ModelVariant

- `Brand` -> `Model` is 1:N.
- `Model` -> `ModelVariant` is 1:N.
- `Model` has unique constraint `@@unique([brandId, slug])`.
- `ModelVariant` contains technical fields (`engineType`, `coolingType`, etc.).

### Vehicle / RideProfile

- `Vehicle` links to `User`, `Brand`, `Model`, `ModelVariant`.
- `RideProfile` is effectively 1:1 with `Vehicle` via unique `vehicleId`.
- `Vehicle` also links to `ServiceEvent`, `NodeState`, `TopNodeState`.

### Node hierarchy

- `Node` is a self-relation tree via `parentId` (`NodeHierarchy`).
- Each node has `code`, `name`, `level`, `displayOrder`, `isActive`.
- Node is used by service events and status layers.

### ServiceEvent

- `ServiceEvent` belongs to `Vehicle` and `Node`.
- `eventKind` distinguishes:
  - `SERVICE`
  - `STATE_UPDATE`
- Stores operation facts: `eventDate`, `odometer`, `engineHours`, `serviceType`, optional cost/comment/parts json.

### NodeState / TopNodeState

- `NodeState`: direct per-vehicle per-node status snapshot.
  - unique pair `@@unique([vehicleId, nodeId])`
- `TopNodeState`: top-level compatibility status layer.
  - unique pair `@@unique([vehicleId, nodeId])`

`NodeState` drives direct status behavior in node tree logic.
`TopNodeState` is still present for compatibility endpoints/flows.

### NodeMaintenanceRule

- One rule per node (`@@unique([nodeId])`).
- Stores intervals/warnings for km/hours/days and `triggerMode`.
- Used to compute leaf `computedStatus` in `/api/vehicles/[id]/node-tree`.

## 4. Relationship summary

- `User 1:N Vehicle`
- `Vehicle 1:1 RideProfile` (optional, enforced by unique)
- `Vehicle 1:N ServiceEvent`
- `Vehicle 1:N NodeState`
- `Vehicle 1:N TopNodeState`
- `Node self-tree (parent/children)`
- `Node 1:1 NodeMaintenanceRule` (optional)
- `Node 1:N ServiceEvent`
- `Node 1:N NodeState`
- `Node 1:N TopNodeState`

## 5. Status and maintenance interaction

Current source inputs for node status behavior:
1. `Vehicle` current state (`odometer`, `engineHours`)
2. latest leaf `ServiceEvent`
3. `NodeMaintenanceRule`
4. `NodeState` direct status snapshot

Computed and aggregated statuses are returned by backend node-tree endpoint.

## 6. Current limitations

- `TopNodeState` and `NodeState` coexist (migration compatibility).
- `STATE_UPDATE` log entry still requires `nodeId` due to schema requirement.
- No separate audit actor model in `ServiceEvent` yet.

## 7. Related docs

- `api-backend.md`
- `functional-logic.md`
- `cross-platform-parity.md`
