# TOP-node Icons

## Purpose

TOP-node icons visualize the main motorcycle service groups and leaf maintenance nodes in garage and vehicle-detail UI.

The current icon system has two active asset sets:

- `images/top-node-icons/` — light-theme source set.
- `images/top-node-icons-dark/` — dark-theme production set used by the current web UI.

The legacy folder `images/top-node-icons/from-cards/` is kept only as historical/source context. Do not use it for new UI.

## Theme Sets

### Light Theme

`images/top-node-icons/` contains transparent PNGs with darker graphite line art. Use this set when a light UI theme is introduced.

### Dark Theme

`images/top-node-icons-dark/` contains matching transparent PNGs with bright white line art and orange accents. This is the active set for the current dark web UI.

Dark icons are intentionally higher contrast than the light originals:

- non-orange visible lines are bright white;
- orange service accents are saturated;
- chain, tires, brakes, suspension, and lubrication have additional orange emphasis;
- selected groups have slightly heavier strokes for readability at card size.

## Directory Structure

Each active set uses the same group folders and filenames:

```text
images/top-node-icons/
images/top-node-icons-dark/
  brakes/
  chain_sprockets/
  engine_cooling/
  lubrication/
  suspension/
  tires/
```

Keep the same relative path in both theme sets when adding or replacing an icon. This makes future theme switching straightforward.

## Group Icons

Group icons represent the six TOP-node groups shown in `Состояние узлов`.

| UI group | Runtime key | File |
| --- | --- | --- |
| Масло | `lubrication` | `lubrication/lubrication.png` |
| Двигатель | `engine` | `engine_cooling/engine_cooling.png` |
| Тормоза | `brakes` | `brakes/brakes.png` |
| Шины | `tires` | `tires/tires.png` |
| Цепь | `chain` | `chain_sprockets/chain_sprockets.png` |
| Подвеска | `suspension` | `suspension/suspension.png` |

The vehicle-detail page maps these runtime keys in `TOP_NODE_CARD_ICON_SRC` inside `src/app/vehicles/[id]/_components/VehicleDashboard.tsx`.

## Leaf Icons

Leaf icons represent concrete TOP service nodes used in attention rows and node-specific UI.

| TOP-node code | File |
| --- | --- |
| `ENGINE.LUBE.OIL` | `lubrication/engine_lube_oil.png` |
| `ENGINE.LUBE.FILTER` | `lubrication/engine_lube_filter.png` |
| `INTAKE.FILTER` | `engine_cooling/intake_filter.png` |
| `ELECTRICS.IGNITION.SPARK` | `engine_cooling/electrics_ignition_spark.png` |
| `COOLING.LIQUID.COOLANT` | `engine_cooling/cooling_liquid_coolant.png` |
| `BRAKES.FRONT.PADS` | `brakes/brakes_front_pads.png` |
| `BRAKES.REAR.PADS` | `brakes/brakes_rear_pads.png` |
| `BRAKES.FLUID` | `brakes/brakes_fluid.png` |
| `TIRES.FRONT` | `tires/tires_front.png` |
| `TIRES.REAR` | `tires/tires_rear.png` |
| `DRIVETRAIN.CHAIN` | `chain_sprockets/drivetrain_chain.png` |
| `DRIVETRAIN.FRONT_SPROCKET` | `chain_sprockets/drivetrain_front_sprocket.png` |
| `DRIVETRAIN.REAR_SPROCKET` | `chain_sprockets/drivetrain_rear_sprocket.png` |
| `SUSPENSION.FRONT.SEALS` | `suspension/suspension_front_seals.png` |
| `SUSPENSION.FRONT.OIL` | `suspension/suspension_front_oil.png` |

The vehicle-detail page maps these codes in `TOP_NODE_LEAF_ICON_SRC`. `getAttentionIconSrc()` first tries the direct leaf icon, then falls back to the group icon by code prefix.

## Current Usage

### Vehicle Detail

`src/app/vehicles/[id]/_components/VehicleDashboard.tsx`

- `Состояние узлов` uses group icons from `TOP_NODE_CARD_ICON_SRC`.
- `Требует внимания` uses leaf icons through `getAttentionIconSrc()`.
- Icons are rendered as PNGs through `next/image`, not CSS masks.

`apps/app/app/vehicles/[id]/index.tsx`

- Expo vehicle detail keeps the same TOP-node grouping semantics but uses the shared `TopNodeIcon` renderer from `apps/app/components/icons/top-nodes/index.tsx`.
- The Expo renderer maps `@mototwin/icons` keys to `MaterialCommunityIcons`; it is the supported mobile fallback until the app adopts direct PNG or SVG rendering for this icon set.
- Do not use legacy `images/top-node-icons/from-cards` assets for new Expo dashboard blocks.

### Garage

`src/app/garage/_components/VehicleCard.tsx`

- The vehicle card attention block uses dark PNG icons and status-colored icon containers.
- Current garage API data provides summary counts, not exact node codes, so garage attention rows use heuristic icons:
  - overdue row: `tires/tires_rear.png`;
  - soon row: `brakes/brakes_front_pads.png`.

`src/app/garage/_components/GarageTasksStrip.tsx`

- The compact tasks strip uses dark PNG icons for brake, engine, and tire task examples.

## Naming Rules

Use stable lowercase snake_case filenames.

- Group files use the group slug: `brakes.png`, `tires.png`, `lubrication.png`.
- Leaf files use the TOP-node code converted to snake_case: `BRAKES.FRONT.PADS` -> `brakes_front_pads.png`.
- Folder names group related leaves by top-level service area.

Do not include spaces, display names, ordering prefixes, or generated prompt text in committed filenames.

## Asset Requirements

All active icons must be PNG with transparency:

- use RGBA PNGs;
- keep background fully transparent;
- do not bake in white, gray, or checkerboard backgrounds;
- preserve a matching file in both light and dark sets when practical;
- keep orange accents as part of the asset when the icon needs emphasis independent of status.

Recommended visual behavior:

- light set: graphite/dark line art with orange accents;
- dark set: white line art with orange accents;
- no CSS grayscale/opacity dimming for unknown status in the current dark UI, because it makes icons too hard to read.

## Adding a New TOP-node Icon

1. Add the transparent PNG to `images/top-node-icons/<group>/`.
2. Add the matching dark-theme PNG to `images/top-node-icons-dark/<group>/`.
3. If it is a group icon, update `TOP_NODE_CARD_ICON_SRC`.
4. If it is a leaf icon, update `TOP_NODE_LEAF_ICON_SRC`.
5. If the garage UI needs the icon, import the same dark PNG in the relevant garage component.
6. Check the icon at actual rendered sizes:
   - `78px` in `Состояние узлов`;
   - `40-44px` in attention rows;
   - `36px` in garage compact cards.

## Maintenance Notes

The source of truth for TOP-node hierarchy/order is split across:

- runtime logic: `src/lib/top-service-nodes.ts`;
- seed flags/order: `prisma/seed.ts`;
- icon mappings: `VehicleDashboard.tsx`.

When TOP-node hierarchy changes, update these files together and verify that every TOP node has either a leaf icon or a group fallback.
