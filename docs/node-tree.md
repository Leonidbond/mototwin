# MotoTwin Node Tree and Data Model

## Purpose

This document describes:
- the hierarchical node taxonomy used in MotoTwin MVP;
- how node-related entities are stored in the database;
- how `TopNodeState` and `ServiceEvent` are linked to nodes.

The scope is MVP foundation: topology, status storage, and service logging linkage.

## Node Tree Structure

`Node` uses dot-separated codes to represent hierarchy.

Examples:
- `ENGINE` (top level)
- `ENGINE.TOPEND` (child of `ENGINE`)
- `ENGINE.TOPEND.CYLINDER` (child of `ENGINE.TOPEND`)

Hierarchy rules:
- parent is derived from code prefix before the last dot;
- level is the number of code segments;
- top-level nodes have one segment and `level = 1`.

Top-level categories (used for vehicle top-node states):
- `ENGINE`
- `FUEL`
- `COOLING`
- `EXHAUST`
- `ELECTRICS`
- `CHASSIS`
- `STEERING`
- `SUSPENSION`
- `WHEELS`
- `BRAKES`
- `DRIVETRAIN`
- `CONTROLS`

Important example in lubrication branch:
- `ENGINE.LUBE`
- `ENGINE.LUBE.OIL`
- `ENGINE.LUBE.FILTER`
- `ENGINE.LUBE.GASKETS`

## Database Model

### `Node`

Dictionary table for the full taxonomy (top-level + child nodes).

Core fields:
- `id`
- `code` (unique machine-readable path, e.g. `BRAKES.FRONT.PADS`)
- `name` (human-readable RU label)
- `parentId` (nullable self-reference)
- `level` (depth by code)
- `displayOrder` (stable order in UI/dictionary)
- `isActive`
- `createdAt`

Relations:
- self relation:
  - `parent` (`Node?`)
  - `children` (`Node[]`)
- `topNodeStates` (`TopNodeState[]`)
- `serviceEvents` (`ServiceEvent[]`)

### `TopNodeState`

Represents current state of one top-level node for one vehicle.

Core fields:
- `id`
- `vehicleId`
- `nodeId` (references `Node`)
- `status` (`TopNodeStatus`)
- `lastServiceEventId` (nullable string, no relation yet by design)
- `note` (nullable)
- `createdAt`
- `updatedAt`

Constraints:
- unique pair: `[vehicleId, nodeId]`
- index on `vehicleId`
- index on `nodeId`

Usage notes:
- in MVP, records are created only for top-level node codes;
- child nodes are kept in `Node` dictionary only.
- `TopNodeState` is used for top-level status only, not for full tree nodes.

### `ServiceEvent`

Maintenance/service event linked to vehicle and node.

Core fields:
- `id`
- `vehicleId`
- `nodeId` (references `Node`)
- `eventDate`
- `odometer`
- `engineHours` (nullable)
- `serviceType`
- `installedPartsJson` (nullable JSON)
- `costAmount` (nullable)
- `currency` (nullable)
- `comment` (nullable)
- `createdAt`

Relations:
- `vehicle` (`Vehicle`)
- `node` (`Node`)

Constraints:
- index on `vehicleId`
- index on `nodeId`

## Status Enum

`TopNodeStatus` values:
- `OK`
- `SOON`
- `OVERDUE`
- `RECENTLY_REPLACED`

Current backend behavior:
- after successful `ServiceEvent` creation for allowed node+vehicle pair,
  matching `TopNodeState` is set to `RECENTLY_REPLACED`.
- service event can be created only for nodes available in vehicle `TopNodeState`.

## API Notes

Current APIs around nodes:
- `GET /api/vehicles/[id]/top-nodes` - top-level states for vehicle.
- `GET /api/vehicles/[id]/node-tree` - nested node tree with top-level status fields.
- `GET /api/vehicles/[id]/service-events` - service log with related `node` metadata.
- `POST /api/vehicles/[id]/service-events` - create event with `nodeId`.

## Seed Behavior (Current)

Seed populates:
- full `Node` taxonomy;
- `TopNodeState` only for top-level nodes and existing vehicles.

Seed is rerunnable and non-destructive for garage data:
- does not wipe vehicles/ride profiles;
- avoids duplicates through upsert + unique constraints.
