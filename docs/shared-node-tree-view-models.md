# Shared node tree view models

## What was extracted

Node tree **data preparation** is centralized in `@mototwin/types` and `@mototwin/domain` so web and Expo share semantics (status labels, leaf vs parent, short explanations, actions) without sharing UI.

### Types (`@mototwin/types`)

- **`NodeTreeItemViewModel`** — Hierarchical node with `effectiveStatus`, Russian **`statusLabel`**, English short **`statusBadgeLabel`** (for web badges), **`shortExplanationLabel`** (leaf-only, from `statusExplanation.reasonShort`), **`hasChildren`**, **`canAddServiceEvent`**, nested **`children`**, **`statusExplanation`**, and **`actions`** (`addServiceEventAvailable`, same rule as `canAddServiceEvent`).
- **`NodeTreeActionViewModel`** — Structured flags for actions derived from tree rules.
- **`NodePathItemViewModel`** — `id`, `code`, `name`, `level` for a path segment (breadcrumbs / picker summaries).
- **`NodeStatusExplanationViewModel`** — Type alias of **`NodeStatusExplanation`** (API-aligned).
- **`NodeTreeSelectionOption`** — Alias of **`FlattenedNodeSelectOption`** for flattened picker rows.

### Pure helpers (`@mototwin/domain`)

**View models**

- **`buildNodeTreeItemViewModel`** / **`buildNodeTreeViewModel`** — Map `NodeTreeItem` → view model tree (deterministic, no I/O).
- **`getNodePathItemViewModels`** — Resolve a **`SelectedNodePath`** to display segments.
- **`getNodePathItemViewModelsByNodeId`** — Resolve by leaf/target id.

**Tree utilities** (in `node-tree.ts`, shared naming with view-model work)

- **`getNodePathById`** — Alias of **`findNodePathById`**.
- **`getNodeShortExplanationLabel`** — Same rules as **`getLeafStatusReasonShort`** (short line only for leaves).
- **`isLeafNode`** — `children.length === 0`.
- **`flattenNodeTreeForSelection`** — Wrapper around **`flattenNodeTreeToSelectOptions`**.
- **`getLeafNodeOptions`** — Flattened options with **`!hasChildren`**.
- **`getTopLevelNodes`** — Identity on root array (explicit API for callers).
- **`getProblematicNodes`** — DFS collection of nodes whose **`effectiveStatus`** is `OVERDUE` or `SOON` (MVP helper for future summaries).

**Existing**

- **`getNodeStatusLabel`** remains in **`status.ts`** (Russian labels via design tokens); view models use it when building **`statusLabel`**.

## Why view models are shared but rendering stays platform-specific

- **Parity** means the same **effective status**, **leaf-only service event affordance**, and **explanation snippets**—not the same components.
- **Web** keeps expand/collapse state in React, grid of root cards, Tailwind, and the status explanation modal layout.
- **Expo** keeps `Set`-based expansion, `Pressable` rows, and `@mototwin/design-tokens` colors.
- Expand/collapse and navigation state **stay in apps**, not in `packages/domain`.

## Where it is used

- **Web:** `src/app/vehicles/[id]/page.tsx` — `buildNodeTreeViewModel(nodeTree)` drives the node tree section; modal selection still uses raw `nodeTree` with **`findNodePathById`** for path by id.
- **Expo:** `apps/app/app/vehicles/[id]/index.tsx` — same builder for **`NodeRow`**; API still loads **`NodeTreeItem[]`**.
- **Expo:** `apps/app/app/vehicles/[id]/service-events/new.tsx` — **`getNodePathById`**, **`isLeafNode`**, **`getNodeShortExplanationLabel`** for path init and leaf validation copy.

## Boundaries

- No API or Prisma changes.
- No new npm dependencies.
- **`NodeTreeItem`** from the API remains the source shape; view models are derived only.
