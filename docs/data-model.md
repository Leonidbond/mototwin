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
- `User` has many `Garage`.
- `User` has optional 1:1 `UserSettings` (`userId` unique).
- `User.email` is nullable unique (transitional pre-auth ownership mode).
- `User.displayName` is optional.
- `Subscription` is optional 1:1 to `User` (`userId` unique).
- Runtime MVP currently uses demo user approach for vehicle flows.

### Garage

- `Garage` belongs to `User` via `ownerUserId`.
- `Garage` has many `Vehicle`.
- Current pre-auth runtime uses stable demo garage title `Мой гараж`.

### UserSettings

- `UserSettings` belongs to `User` via unique `userId` (1:1).
- Stores `defaultCurrency`, `distanceUnit`, `engineHoursUnit`, `dateFormat`, `defaultSnoozeDays`.
- Stores `vehicleTrashRetentionDays` for trash retention policy.
- Runtime reads/writes are done via `/api/user-settings` and scoped through current user context.
- Local client storage is fallback/cache only; DB is primary source when API is available.

### Brand / Model / ModelVariant

- `Brand` -> `Model` is 1:N.
- `Model` -> `ModelVariant` is 1:N.
- `Model` has unique constraint `@@unique([brandId, slug])`.
- `ModelVariant` contains technical fields (`engineType`, `coolingType`, etc.).

### Vehicle / RideProfile

- `Vehicle` links to `User`, optional `Garage`, `Brand`, `Model`, `ModelVariant`.
- `Vehicle` has soft-delete fields: `trashedAt`, `trashExpiresAt`.
- `RideProfile` is effectively 1:1 with `Vehicle` via unique `vehicleId`.
- `Vehicle` also links to `ServiceEvent`, `NodeState`, `TopNodeState`.
- Ownership canonical source: `Vehicle.garageId -> Garage.ownerUserId`.
- `Vehicle.userId` is transitional/denormalized compatibility field and should match `Garage.ownerUserId`.
- Seed includes safe repair step for mismatched `Vehicle.userId` vs `Garage.ownerUserId`.
- Runtime API ownership reads use ownership predicate directly in final vehicle read query.
- Active Garage routes exclude trashed vehicles; Trash routes read vehicles with `trashedAt != null`.

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
- `User 1:N Garage`
- `User 1:1 UserSettings` (optional in schema, seed-initialized for demo/dev users)
- `Garage 1:N Vehicle`
- `Vehicle 1:1 RideProfile` (optional, enforced by unique)
- `Vehicle` soft-delete timeline: active (`trashedAt = null`) or trashed (`trashedAt != null`).
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
- `UserSettings` stores values as strings at DB layer; allowed value set is currently enforced in API/domain validation (enum/check DB hardening is deferred).
- `UserSettings` bootstrap is seed-driven; request-path context resolver does not auto-create missing rows.
- Expired trashed vehicles are not auto-deleted in current MVP step (no scheduler/background cleanup yet).

## 7. Ownership transition status

Implemented in Phase 1:

- `Garage` model and relation to `User`;
- `Vehicle.garageId` relation (nullable transitional field);
- demo user + demo garage seeding and backfill path for missing `garageId`.
- `Vehicle.userId` remains transitional; runtime guards rely on garage ownership and validate invariant consistency.

Planned next:

- Phase 2A implemented for base Garage/Vehicle routes (list/create/detail/profile update);
- Phase 2B implemented for nested vehicle routes (`node-tree`, `state`, `top-nodes`, `service-events`, `wishlist`, `wishlist/kits`) with `404` on out-of-context vehicle ids;
- later login/session replacement for demo resolver;
- later auth-session integration for already implemented server-side `UserSettings`.

Reference:

- [auth-data-ownership-architecture.md](./auth-data-ownership-architecture.md)

## 8. Related docs

- `api-backend.md`
- `functional-logic.md`
- `cross-platform-parity.md`
