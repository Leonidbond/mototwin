# Review notes — BMW R 1300 GS (KA1)

Batch updated: 2026-06-16 (EPC diagram_position backfill complete)  
Validator: `npm run parts:validate -- data/parts/bmw/r-1300-gs/parts-staging.csv`  
Rows: 41 data rows (18 nodes; dealer cross-check + EPC anchors + spec rows)

## Confirmed

- All 18 MVP top nodes have a staging row.
- **12 OFFICIAL_EPC anchor rows** added (`source_region=GLOBAL`, `evidence_level=A`).
- US/EU dealer cross-check rows preserved (not replaced).
- Shaft-drive and Telelever nodes remain `NOT_APPLICABLE`.
- No `MANUAL_APPROVED` rows.

## OFFICIAL_EPC upgrade (2026-06-16)

| Interface | Parts | diagram_position |
| --- | --- | --- |
| **bike-parts-bmw.com microfiche** (KA1/0M21) | All 12 OFFICIAL_EPC anchors | see table below |

| Part | Node | diagram | pos | Position source |
| --- | --- | --- | --- | --- |
| 11427105320 | Oil filter | Oil filter | 1 | live microfiche scrape |
| 13725A72844 | Air filter | Intake silencer / filter | 4 | live microfiche scrape |
| 34117108409 | Front pads | Front wheel brake | 3 | live microfiche scrape |
| 34118881343 | Cast front disc | Front wheel brake | 1 | live microfiche scrape |
| 34217108470 | Rear pads | Rear wheel brake | 3 | bmwestore illustration ref |
| 34211627694 | Rear disc | Rear wheel brake | 1 | bmwestore illustration ref |
| 34117105037 | Enduro front disc | Front wheel brake forged enduro wheels | 9 | bmwestore illustration ref |
| 12128560811 | Spark plug | Ignition coil/spark plug | 7 | dealer EPC illustration ref |
| 61215A64DC8 | Li-ion battery | Lithium-ion battery | 1 | bmwestore illustration ref |
| 61218389125 | AGM battery | AGM battery | 1 | bmwestore illustration ref |
| 83105A87362 | Brake fluid | Brake fluid | 1 | dealer EPC illustration ref |
| 83515A87B45 | Coolant | Engine oil / maintenance service | 3 | Hubauer EPC no. 03 |

EPC rows use `source_type=OFFICIAL_EPC`, `market=GLOBAL`. Dealer rows stay `OFFICIAL_DEALER_PUBLIC_CATALOG` / `AUTHORIZED_DEALER` for purchasing cross-check.

**Note:** BMW AOS dealer login not used. Live bike-parts-bmw microfiche was Cloudflare-blocked during backfill; positions for 8 parts cross-verified via US/EU dealer EPC illustration refs + bike-parts-bmw diagram URLs (WebSearch/index). RealOEM partxref retained as secondary fitment evidence in prior batch.

## EU cross-check (US+EU same part number)

| Node | Part | US source | EU source | Status |
| --- | --- | --- | --- | --- |
| `ENGINE.LUBE.FILTER` | 11427105320 | bmwestore | bike-parts-bmw.com KA1/0M21 | MATCH — confidence HIGH |
| `INTAKE.FILTER` | 13725A72844 | Grand Rapids | bike-parts-bmw.com KA1 intake/filter | MATCH — confidence HIGH |
| `BRAKES.FRONT.PADS` | 34117108409 | CalMoto | bike-parts-bmw.com KA1 front brake | MATCH — confidence HIGH |
| `BRAKES.REAR.PADS` | 34217108470 | bmwestore | Europe-Moto | MATCH — confidence HIGH |
| `ELECTRICS.BATTERY` (AGM) | 61218389125 | Morton's | Recambios y Accesorios BMW | MATCH — confidence HIGH |
| `BRAKES.FLUID` (OEM) | 83105A87362 | bmwestore | Europe-Moto | MATCH — confidence HIGH |
| `COOLING.LIQUID.COOLANT` (OEM) | 83515A87B45 | bmwestore | Europe-Moto | MATCH — confidence HIGH |

## Resolved (prior batches)

| Node | Issue | Resolution |
| --- | --- | --- |
| `INTAKE.FILTER` | US BOM `13725A7284` vs EU `13725A72844` | Truncated US BOM — correct PN `13725A72844` |
| `BRAKES.FLUID` / `COOLING.LIQUID.COOLANT` | Spec-only | OEM SKU rows + US/EU cross-check |
| EPC evidence | Dealer-only bootstrap | OFFICIAL_EPC anchors with diagram_name/position |

## Evidence levels

| Tier | Rows | Notes |
| --- | --- | --- |
| A | OFFICIAL_EPC anchors, repair manual specs | KA1/0M21 model code |
| B | US+EU dealer cross-check | Same PN where matched |
| C | AUTHORIZED_DEALER only (no EPC yet) | Li-ion battery Europe-Moto row |

## Human review gates (EU/RU)

EPC rows may support `MANUAL_APPROVED` after catalog-owner sign-off. Safety-critical nodes remain gated. US-only dealer rows stay `NEEDS_REVIEW` for EU/RU.

## Needs review

| Node | Part / spec | Reason |
| --- | --- | --- |
| `BRAKES.FRONT.DISC` | 34118881343 / 34117105037 | Wheel option conflict |
| `ELECTRICS.BATTERY` | 61215A64DC8 / 61218389125 | Factory option conflict |

## Conflicts (split into rows — do not merge)

- **Front brake disc:** `34118881343` (cast/cross-spoke) vs `34117105037` (Enduro forged).
- **Battery:** `61215A64DC8` (Li-ion) vs `61218389125` (AGM).

## Regional note

- **US dealer gallon coolant `82141467704`** is not the KA1 motorcycle EPC PN; EPC uses **`83515A87B45`**.

## Not applicable

- `SUSPENSION.FRONT.SEALS`, `SUSPENSION.FRONT.OIL` — Telelever.
- `DRIVETRAIN.*` — cardan final drive.

## Next batch

1. BMW AOS dealer portal access for live microfiche position re-verification (optional).
2. Implement `scripts/parts/import-parts-staging.ts` after admin review.
