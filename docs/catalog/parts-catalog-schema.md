# MotoTwin parts catalog — unified data contract

Single source of truth for CSV ingest, staging validation, and DB mapping.

See also:

- [parts-source-policy.md](./parts-source-policy.md) — source hierarchy and regional rules
- [mototwin_cursor_parts_catalog_skill_v1_2.md](./mototwin_cursor_parts_catalog_skill_v1_2.md) — Cursor workflow (current)
- [parts-staging-csv-schema.md](./parts-staging-csv-schema.md) — legacy pointer (superseded by this doc)

## Scope

- **Staging-first:** every catalog row enters via CSV → `PartCatalogApplication` → optional promote to `PartSku` / `PartFitment`.
- **No duplicate entities:** reuse existing Prisma models (`CatalogSource`, `PartCatalogApplication`, `PartSku`, `PartFitment`, `Node`).
- **Mandatory companion:** every model batch ships **five CSV files** (see below). `part-applications-staging.csv` is required alongside `parts-staging.csv`.

## Entity map

| Concept | CSV | Prisma (staging) | Prisma (production) |
| --- | --- | --- | --- |
| Source registry | `catalog-sources.csv` | `CatalogSource` (+ `sourceKey`) | — |
| Full evidence row | `parts-staging.csv` | `PartCatalogApplication` (incl. extended cols) | — |
| Application link | `part-applications-staging.csv` | same row via `stagingRowKey` | — |
| Review queue | `review-queue.csv` | filter on `reviewStatus` | — |
| Coverage grid | `coverage-matrix.csv` | admin completeness | — |
| Promoted SKU | — | `promotedSkuId` | `PartSku` + `PartNumber` |
| Promoted fitment | — | `promotedFitmentId` | `PartFitment` |

`PartCatalogApplication` stores the full v1.2 contract: base provenance fields plus explicit columns `sourceKey`, `sourceModelCode`, `sourceYear`, `verificationRegion`, `evidenceLevel`, `regionMatchStatus`, `supersessionStatus`, `verifiedAt`, `parserVersion` (and `importBatch`, `stagingRowKey`). Legacy metadata duplicated in `raw_notes` is still parsed as fallback for old rows only.

## Model batch layout

```text
data/parts/<brand>/<model-slug>/
  catalog-sources.csv
  parts-staging.csv
  part-applications-staging.csv   # mandatory companion
  review-queue.csv
  coverage-matrix.csv
  source-map.md
  review-notes.md
```

Templates: `data/catalog/templates/`

## 1. catalog-sources.csv

Registry of deduplicated sources. Referenced by `source_key` from staging and applications.

| Column | Required | Description |
| --- | --- | --- |
| `source_key` | yes | Stable slug: `{name-slug}.{source-type}.{region}` — lowercase, `[a-z0-9._-]` |
| `source_name` | yes | Human-readable catalog name |
| `source_type` | yes | See enums |
| `source_region` | yes | `US`, `EU`, `RU`, `GLOBAL` |
| `brand` | no | Manufacturer scope, e.g. `BMW` |
| `base_url` | yes | HTTPS origin of the catalog |
| `license_notes` | no | Scraping / licensing notes |
| `scraping_allowed_status` | yes | `ALLOWED`, `RESTRICTED`, `FORBIDDEN`, `UNKNOWN` |
| `last_checked_at` | yes | ISO-8601 UTC |

**Uniqueness:** `source_key` (primary), fallback natural key `(source_name, source_type, source_region, base_url)`.

## 2. parts-staging.csv

Canonical ingest row — full provenance. Maps 1:1 to `PartCatalogApplication`.

### Base columns (28)

| Column | Required | Notes |
| --- | --- | --- |
| `brand` | yes | e.g. `BMW` |
| `model_family` | yes | e.g. `R 1300 GS` |
| `variant` | yes | e.g. `base` (resolver also tries `model_family`) |
| `generation` | yes | Platform code, e.g. `KA1` |
| `year_from` | yes | `YYYY` |
| `year_to` | no | Empty = current production |
| `market` | yes | Target market for this row |
| `node_id` | yes | Skill-extended MVP node (see below) |
| `node_applicability` | yes | `APPLICABLE`, `NOT_APPLICABLE`, `UNKNOWN` |
| `part_manufacturer` | cond. | Required unless N/A or spec-only |
| `part_number` | cond. | Raw OEM or spec token |
| `normalized_part_number` | cond. | Uppercase alphanumeric; must match normalized `part_number` |
| `part_name` | yes | Display title |
| `part_category` | yes | e.g. `filter`, `brake_pad` |
| `is_oem` | yes | `true` / `false` |
| `application_type` | yes | See enums |
| `source_name` | yes | Denormalized; must match `catalog-sources` |
| `source_type` | yes | See enums |
| `source_region` | yes | Region of this evidence |
| `source_url` | yes | HTTPS evidence URL |
| `diagram_name` | no | EPC diagram title |
| `diagram_position` | no | Position on diagram |
| `raw_quantity` | no | Quantity text from source |
| `raw_notes` | no | Free-form fitment / conflict notes |
| `review_status` | yes | See enums + transitions |
| `safety_critical` | yes | `true` / `false` |
| `confidence` | yes | `HIGH`, `MEDIUM`, `LOW` |
| `parsed_at` | yes | ISO-8601 UTC — when row was parsed |

### Extended columns (11) — required since contract v1

| Column | Required | Notes |
| --- | --- | --- |
| `staging_row_key` | yes | **Must equal** `duplicateKey(row)` (see uniqueness) |
| `source_key` | yes | FK → `catalog-sources.csv` |
| `source_model_code` | yes | EPC / manual model code, e.g. `KA1/0M21` |
| `source_year` | yes | Model year in source context |
| `verification_region` | yes | `US`, `EU`, `RU`, `GLOBAL`, `UNKNOWN` |
| `evidence_level` | yes | `A`, `B`, `C`, `D` |
| `region_match_status` | yes | `TARGET_REGION_MATCH`, `CROSS_REGION_MATCH`, `REGION_MISMATCH`, `UNKNOWN` |
| `supersession_status` | yes | `CURRENT`, `SUPERSEDED`, `POSSIBLY_SUPERSEDED`, `UNKNOWN` |
| `verified_at` | yes | ISO-8601 UTC — last verification timestamp |
| `parser_version` | yes | e.g. `parts-catalog-v1` |
| `import_batch` | yes | e.g. `bmw-r-1300-gs-2026-06-16` |

**Uniqueness keys:**

```text
staging_row_key = duplicateKey(row)
  = brand|model_family|variant|generation|node_id|normalized_part_number|source_region

Natural duplicate (same evidence): same duplicateKey
Cross-source same PN: allowed (different source_region / source_key)
```

**OEM part number format:** when `is_oem=true` and not `SPECIFICATION_ONLY`, `normalized_part_number` must match `^[A-Z0-9]{5,14}$`.

## 3. part-applications-staging.csv (mandatory companion)

Slim application layer without repeating full source metadata. **One row per staging row.**

| Column | Required | Notes |
| --- | --- | --- |
| `application_key` | yes | **Must equal** `staging_row_key` in v1 |
| `staging_row_key` | yes | FK → `parts-staging.csv` |
| `source_key` | yes | FK → `catalog-sources.csv` |
| `brand`, `model_family`, `variant`, `generation` | yes | Must match staging row |
| `year_from`, `year_to` | yes / no | Must match staging row |
| `market` | yes | Must match staging row |
| `node_id` | yes | Skill-extended MVP node |
| `node_applicability` | yes | Must match staging row |
| `normalized_part_number` | cond. | Empty for N/A rows |
| `application_type` | yes | Must match staging row |
| `review_status` | yes | Must match staging row |
| `safety_critical` | yes | Must match staging row |
| `confidence` | yes | Must match staging row |
| `verified_at` | yes | Must match staging row |

**Uniqueness:** `application_key` (unique).

## 4. review-queue.csv

Admin export of rows awaiting human action.

| Column | Required | Notes |
| --- | --- | --- |
| `staging_row_key` | yes | FK → staging |
| `application_key` | yes | Same as `staging_row_key` in v1 |
| `review_status` | yes | Typically `NEW`, `NEEDS_REVIEW`, `NOT_APPLICABLE` |
| `blocker_codes` | no | Pipe-separated: `SAFETY_CRITICAL`, `REGION_MISMATCH`, `US_BOOTSTRAP`, `LOW_EVIDENCE` |
| `priority` | yes | `LOW`, `NORMAL`, `HIGH`, `URGENT` |
| `safety_critical` | yes | `true` / `false` |
| `assigned_reviewer` | no | Admin username |
| `notes` | no | Short summary |
| `queued_at` | yes | ISO-8601 UTC |

## 5. coverage-matrix.csv

Model × MVP node completeness tracker.

| Column | Required | Notes |
| --- | --- | --- |
| `brand`, `model_family`, `variant`, `generation` | yes | Model scope |
| `node_id` | yes | One row per MVP node |
| `coverage_status` | yes | `VERIFIED`, `NEEDS_REVIEW`, `NOT_FOUND`, `NOT_APPLICABLE`, `SOURCE_UNAVAILABLE` |
| `applicable_count` | yes | Staging rows with `node_applicability=APPLICABLE` |
| `na_count` | yes | `NOT_APPLICABLE` rows |
| `needs_review_count` | yes | `review_status` in `NEW`, `NEEDS_REVIEW` |
| `approved_count` | yes | `MANUAL_APPROVED` rows |
| `last_updated_at` | yes | ISO-8601 UTC |

**Uniqueness:** `(brand, model_family, variant, generation, node_id)`.

Must include **all 18 skill-extended MVP nodes** per model batch.

## Skill-extended MVP nodes

Validator accepts only these `node_id` values:

```text
ENGINE.LUBE.FILTER, ENGINE.LUBE.OIL, INTAKE.FILTER, ELECTRICS.IGNITION.SPARK,
BRAKES.FRONT.PADS, BRAKES.REAR.PADS, BRAKES.FRONT.DISC, BRAKES.REAR.DISC,
BRAKES.FLUID, TIRES.FRONT, TIRES.REAR, ELECTRICS.BATTERY,
SUSPENSION.FRONT.SEALS, SUSPENSION.FRONT.OIL, COOLING.LIQUID.COOLANT,
DRIVETRAIN.CHAIN, DRIVETRAIN.FRONT_SPROCKET, DRIVETRAIN.REAR_SPROCKET
```

Shaft-drive BMW (e.g. R 1300 GS): chain/sprocket nodes → `NOT_APPLICABLE`.

## Enums (canonical: `@mototwin/types`)

```text
node_applicability: APPLICABLE | NOT_APPLICABLE | UNKNOWN
application_type: OEM_REPLACEMENT | OEM_SERVICE_ITEM | SPECIFICATION_ONLY | COMPATIBLE_AFTERMARKET | COMMUNITY_REPORTED
review_status: NEW | NEEDS_REVIEW | MANUAL_APPROVED | REJECTED | DUPLICATE | NOT_APPLICABLE
confidence: HIGH | MEDIUM | LOW
source_type: OFFICIAL_EPC | OFFICIAL_PUBLIC_CATALOG | OFFICIAL_DEALER_PUBLIC_CATALOG | AUTHORIZED_DEALER | REFERENCE_ONLY
market / source_region: US | EU | RU | GLOBAL
verification_region: US | EU | RU | GLOBAL | UNKNOWN
evidence_level: A | B | C | D
region_match_status: TARGET_REGION_MATCH | CROSS_REGION_MATCH | REGION_MISMATCH | UNKNOWN
supersession_status: CURRENT | SUPERSEDED | POSSIBLY_SUPERSEDED | UNKNOWN
coverage_status: VERIFIED | NEEDS_REVIEW | NOT_FOUND | NOT_APPLICABLE | SOURCE_UNAVAILABLE
scraping_allowed_status: ALLOWED | RESTRICTED | FORBIDDEN | UNKNOWN
```

## Regional applicability rules

1. **US bootstrap:** `source_region=US` may not use `market=GLOBAL` or `confidence=HIGH` without EU/RU cross-check.
2. **False EU/RU verification:** `source_region=US` + `region_match_status=TARGET_REGION_MATCH` + `verification_region` in `EU`/`RU`/`GLOBAL` → error.
3. **MANUAL_APPROVED** for EU/RU users requires evidence_level `A` or `B` and non-`REFERENCE_ONLY` source.
4. **REFERENCE_ONLY** never `MANUAL_APPROVED`.
5. Preserve `market`, `source_region`, `verification_region`, `region_match_status` on every row.

## Review status transitions

```text
NEW → NEEDS_REVIEW | MANUAL_APPROVED | REJECTED | DUPLICATE | NOT_APPLICABLE
NEEDS_REVIEW → MANUAL_APPROVED | REJECTED | DUPLICATE
MANUAL_APPROVED → REJECTED (admin revoke only)
REJECTED, DUPLICATE, NOT_APPLICABLE → terminal
```

**Gates:**

- Safety-critical nodes: warn while `NEW` / `NEEDS_REVIEW`; block `MANUAL_APPROVED` in staging validator.
- `NOT_APPLICABLE` rows: no part numbers; `review_status=NOT_APPLICABLE`.

## Validation

```bash
npm run parts:catalog:validate -- \
  --sources data/parts/bmw/r-1300-gs/catalog-sources.csv \
  --staging data/parts/bmw/r-1300-gs/parts-staging.csv \
  --applications data/parts/bmw/r-1300-gs/part-applications-staging.csv \
  --review-queue data/parts/bmw/r-1300-gs/review-queue.csv \
  --coverage data/parts/bmw/r-1300-gs/coverage-matrix.csv
```

Single-file staging check (backward compatible):

```bash
npm run parts:validate -- data/parts/bmw/r-1300-gs/parts-staging.csv
```

Enrich legacy 29-column staging → full batch:

```bash
npx tsx scripts/parts/enrich-staging-batch.ts data/parts/bmw/r-1300-gs
```

## Import

### CLI

```bash
npm run parts:import -- --commit --file data/parts/.../parts-staging.csv
```

- `--batch <id>` — fallback when CSV `import_batch` column is empty; **CSV column wins** when present.
- `--auto-promote-approved` — promote rows with `review_status` in `MANUAL_APPROVED`, `NOT_APPLICABLE`.
- Dry-run by default without `--commit`.

Local full reset (purge catalog SKUs + re-import + promote):

```bash
npx tsx scripts/parts/reset-local-catalog.ts \
  --file data/parts/bmw/r-1300-gs/parts-staging.csv \
  --promote
```

Promote pending staging rows for one batch:

```bash
npm run parts:promote-batch -- --batch <import_batch>
```

Import reads **`parts-staging.csv` only**; companion files are validated pre-import, not loaded separately.

### Admin bulk import (`PARTS_STAGING`)

Path: **`/admin/imports/new`** → type **Parts staging (каталог v1.2)**.

| Step | API / UI |
| --- | --- |
| Download template | `GET /api/admin/imports/template?type=PARTS_STAGING` — CSV with headers + example row from `data/catalog/templates/parts-staging.csv` |
| Headers only | `GET /api/admin/imports/template?type=PARTS_STAGING&headersOnly=1` |
| Upload | `POST /api/admin/imports` — CSV/TSV/XLSX, max 8 MB; validates all **39 columns** before creating batch |
| Dry-run | `POST /api/admin/imports/[id]/dry-run` → `importPartsStagingRows(dryRun: true)` |
| Commit | `POST /api/admin/imports/[id]/commit` → upserts `PartCatalogApplication` + `CatalogSource` |
| Review / promote | `/admin/catalog/staging` — approve rows; promote to `PartSku` / `PartFitment` |

Roles: upload requires `SUPER_ADMIN` or `CATALOG_MANAGER`.

Other supported admin import types (each with template download):

| Type | Template file |
| --- | --- |
| `PARTS` | `parts-master-template.csv` |
| `PART_ALIASES` | `part-aliases-template.csv` |
| `SERVICE_RULES` | `service-rules-template.csv` |

Implementation: `src/lib/admin-import-templates.ts`, `src/lib/catalog-staging/import-core.ts`.

### Post-import UX

- Picker / fitment report show catalog provenance from promoted rows (`MANUAL_APPROVED` evidence only in user UI).
- Extended fields (`evidenceLevel`, `regionMatchStatus`, …) come from DB columns, not `raw_notes` parsing, after v1.2 import.
