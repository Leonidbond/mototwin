# MotoTwin Cursor Skill: Iterative Parts Catalog Builder (v1.2)

> **Changelog from v1.1:** unified 5-file CSV contract, 40-column `parts-staging.csv`, mandatory `part-applications-staging.csv`, `parts:catalog:validate`, import/admin staging **IMPLEMENTED**. Schema details moved to contract docs — do not duplicate here.
>
> Supersedes: [mototwin_cursor_parts_catalog_skill_v1_1.md](./mototwin_cursor_parts_catalog_skill_v1_1.md)

## Contract docs (read first)

Before collecting or editing catalog data, read:

| Doc | Purpose |
| --- | --- |
| [parts-catalog-schema.md](./parts-catalog-schema.md) | CSV columns, enums, uniqueness, review transitions, DB mapping |
| [parts-source-policy.md](./parts-source-policy.md) | Source tiers, EU/US/RU rules, evidence levels |
| [data/catalog/templates/](../../data/catalog/templates/) | Header + example rows for all 5 CSV files |

Reference pilot batch: `data/parts/bmw/r-1300-gs/`

---

## Назначение

Cursor итеративно создаёт и наполняет каталоги запчастей MotoTwin по моделям мотоциклов.

```text
ModelVariant → MotoTwin top node → OEM part → source URL → region → review status → confidence
```

MotoTwin — не копия EPC. Каталог — нижний слой доказательства для fitment, service log, reminders и community reports.

---

## Когда использовать

**Да:** новая модель, новые top-узлы, обновление OEM по официальному источнику, US/EU/RU сверка, staging для админ-ревью.

**Нет:** массовый парсинг, обход paywall/robots, импорт в production без staging, fitment без источника.

---

## Базовые правила

1. Structured data is the source of truth.
2. LLM must never be the source of truth for fitment.
3. Every part must have source evidence (`source_url`, `source_key`, `verified_at`).
4. Every imported part first goes to staging (`PartCatalogApplication`).
5. Safety-critical nodes require manual review.
6. MVP only — top models and top nodes (18 skill-extended nodes).
7. Preserve region: US / EU / RU / GLOBAL.
8. Preserve source type enum (see contract doc).
9. Unconfirmed data → `NEEDS_REVIEW`, not `MANUAL_APPROVED`.
10. **Mandatory companion:** every batch ships `part-applications-staging.csv` alongside `parts-staging.csv`.

---

## Tool choice

**Cursor** — schema tweaks, model batches, validator fixes, admin UI, local QA.

**Codex / Cloud Agents** — parallel model batches after 2–3 successful BMW pilots (one branch per model).

---

## Source & region policy (summary)

Full rules: [parts-source-policy.md](./parts-source-policy.md).

```text
Tier A — OFFICIAL_EPC, OFFICIAL_PUBLIC_CATALOG
Tier B — OFFICIAL_DEALER_PUBLIC_CATALOG, AUTHORIZED_DEALER
Tier C — REFERENCE_ONLY (never MANUAL_APPROVED)
```

```text
EU  = target evidence for EU/RU users
US  = bootstrap; keep market=US until EU/RU cross-check
RU  = availability reference unless diagram/model-code evidence
```

Cross-check workflow per node: EU/official → US bootstrap → RU regional → reference only → normalize PN → set `evidence_level` / `region_match_status` → conflicts → `review-notes.md`.

---

## Source map (`source-map.md`)

Human-readable hierarchy for the batch. Structure unchanged from v1.1 — see v1.1 § Source map requirements or pilot `data/parts/bmw/r-1300-gs/source-map.md`.

Register every used source in **`catalog-sources.csv`** with stable `source_key` (`{name-slug}.{source-type}.{region}`).

---

## BMW Wave 1 scope

```text
R 1300 GS / 2024–present          ← pilot done
R 1300 GS Adventure / 2025–present
R 1250 GS / 2019–2024
R 1250 GS Adventure / 2019–2024
F 900 GS / 2024–present
F 900 GS Adventure / 2024–present
```

Second wave: F 800 GS, G 310 GS, S 1000 XR/RR/R, R 12 / nineT, R 1300 R.

---

## Top nodes (skill-extended MVP)

Collect **only** these 18 `node_id` values (validator enforces):

```text
ENGINE.LUBE.FILTER, ENGINE.LUBE.OIL, INTAKE.FILTER, ELECTRICS.IGNITION.SPARK,
BRAKES.FRONT.PADS, BRAKES.REAR.PADS, BRAKES.FRONT.DISC, BRAKES.REAR.DISC,
BRAKES.FLUID, TIRES.FRONT, TIRES.REAR, ELECTRICS.BATTERY,
SUSPENSION.FRONT.SEALS, SUSPENSION.FRONT.OIL, COOLING.LIQUID.COOLANT,
DRIVETRAIN.CHAIN, DRIVETRAIN.FRONT_SPROCKET, DRIVETRAIN.REAR_SPROCKET
```

- Shaft BMW (R 1250/1300 GS): chain/sprockets → `NOT_APPLICABLE`.
- Telelever BMW: fork seals/oil → `NOT_APPLICABLE`.
- Tires/oil/fluids: spec-first rows allowed (`SPECIFICATION_ONLY`).

---

## Required output per model batch

```text
data/parts/<brand>/<model-slug>/
  catalog-sources.csv              # source registry (source_key)
  parts-staging.csv                # full evidence row (40 columns)
  part-applications-staging.csv    # mandatory companion (1 row per staging row)
  review-queue.csv                 # NEW / NEEDS_REVIEW / NOT_APPLICABLE queue
  coverage-matrix.csv              # 18 MVP nodes × coverage_status
  source-map.md
  review-notes.md
```

Templates: `data/catalog/templates/`

**Do not** create `parts-staging.json` unless explicitly requested.

---

## CSV schema (pointer)

Full column list, enums, uniqueness: **[parts-catalog-schema.md](./parts-catalog-schema.md)**.

Key fields every staging row must have (in addition to v1.1 base columns):

```text
staging_row_key, source_key, source_model_code, source_year,
verification_region, evidence_level, region_match_status, supersession_status,
verified_at, parser_version, import_batch
```

`staging_row_key` must equal `duplicateKey(row)` (see contract doc).

`raw_notes` — free-form only; do **not** put required metadata only in `raw_notes`.

---

## Review rules (summary)

| Status | When |
| --- | --- |
| `NEEDS_REVIEW` | Default; region mismatch; conflicts; safety-critical; US-only bootstrap |
| `MANUAL_APPROVED` | Tier A/B evidence, no conflict, human review; never from `REFERENCE_ONLY` |
| `NOT_APPLICABLE` | Node N/A for model (no part numbers in row) |

Safety-critical nodes: `BRAKES.*.PADS`, `BRAKES.*.DISC`, `SUSPENSION.FRONT.SEALS`, `ELECTRICS.IGNITION.SPARK`.

Transitions: see [parts-catalog-schema.md § Review status transitions](./parts-catalog-schema.md).

---

## Iterative workflow

### Step 1 — Plan

```text
Target model / generation / years
Sources to check (EU primary, US bootstrap)
Nodes to collect (18 MVP)
Expected batch directory
Risks (drive type, wheel options, conflicting PNs)
```

### Step 2 — Source map + catalog-sources.csv

1. Write `source-map.md` (human hierarchy).
2. Populate `catalog-sources.csv` — one row per `source_key` used in batch.

### Step 3 — Collect parts

One node group at a time: engine → intake/ignition → brakes → electrical → suspension → cooling → tires → drivetrain.

Never mix models in one batch directory.

### Step 4 — Write staging + companion files

1. `parts-staging.csv` — full provenance rows.
2. `part-applications-staging.csv` — slim row per staging row (`application_key` = `staging_row_key`).
3. `review-queue.csv` — rows needing human action.
4. `coverage-matrix.csv` — one row per MVP node.

Or enrich legacy 29-column staging:

```bash
npx tsx scripts/parts/enrich-staging-batch.ts data/parts/<brand>/<model-slug>
```

### Step 5 — Validate

```bash
npm run parts:catalog:validate -- \
  --sources data/parts/<brand>/<model-slug>/catalog-sources.csv \
  --staging data/parts/<brand>/<model-slug>/parts-staging.csv \
  --applications data/parts/<brand>/<model-slug>/part-applications-staging.csv \
  --review-queue data/parts/<brand>/<model-slug>/review-queue.csv \
  --coverage data/parts/<brand>/<model-slug>/coverage-matrix.csv
```

Quick single-file check (staging only):

```bash
npm run parts:validate -- data/parts/<brand>/<model-slug>/parts-staging.csv
```

Fix all **errors** before import. **Warnings** on safety-critical `NEEDS_REVIEW` are expected until admin approval.

### Step 6 — Review notes

Update `review-notes.md`: Confirmed / Needs review / Conflicts / Not applicable / Next batch.

### Step 7 — Import (optional, after human OK)

```bash
npm run parts:import -- --commit --batch <brand>-<model-slug>-<date> \
  data/parts/<brand>/<model-slug>/parts-staging.csv
```

Admin: `/admin/catalog/staging`, `/admin/imports` (`PARTS_STAGING`).

Promote approved rows:

```bash
npm run parts:promote-batch -- --batch <import_batch>
```

---

## Database mapping (IMPLEMENTED — do not recreate)

| Skill concept | Repo model / file |
| --- | --- |
| `CatalogSource` | `CatalogSource` + `catalog-sources.csv` |
| `PartSourceSnapshot` | Embedded in `PartCatalogApplication` (no separate table) |
| Staging application row | `PartCatalogApplication` ← `parts-staging.csv` |
| Production SKU | `PartSku` + `PartNumber` (after promote) |
| Production fitment | `PartFitment` (after promote) |
| Community identity | `PartMaster` (separate from OEM staging) |

Do **not** add `PartApplication` or `PartSourceSnapshot` Prisma tables.

---

## Prompt template — new model batch

```text
Ты работаешь в проекте MotoTwin. Используй skill v1.2 «Iterative Parts Catalog Builder».

Перед работой прочитай:
- docs/catalog/parts-catalog-schema.md
- docs/catalog/parts-source-policy.md
- data/catalog/templates/ (шаблоны CSV)
- data/parts/bmw/r-1300-gs/ (reference pilot)

Задача: создать/обновить staging-каталог для одной модели BMW.

Target model: BMW <MODEL>
Generation: <GENERATION>
Years: <YEARS>

Собери все 18 skill-extended MVP-узлов (см. skill v1.2).

Правила:
1. Не выдумывай OEM-артикулы.
2. Каждая строка: source_url, source_key, verified_at, evidence_level.
3. Пиши 5 CSV + source-map.md + review-notes.md (см. skill v1.2).
4. part-applications-staging.csv обязателен (companion).
5. Safety-critical → safety_critical=true, review_status=NEEDS_REVIEW.
6. Карданные BMW → chain/sprockets NOT_APPLICABLE.
7. US bootstrap не помечать как EU/RU verified.
8. Одна модель на batch directory.

После заполнения:
npm run parts:catalog:validate -- --sources ... --staging ... --applications ... --review-queue ... --coverage ...

Напиши результат валидации. Не импортируй в БД без явной просьбы пользователя.
```

---

## Prompt template — review

```text
Проверь staging-каталог MotoTwin для BMW <MODEL>.

Запусти:
npm run parts:catalog:validate -- (все 5 CSV batch)

Проверь вручную:
1. source_url / source_key / verified_at на каждой строке
2. Дубли duplicateKey
3. safety_critical на тормозах/свечах/сальниках
4. Нет MANUAL_APPROVED без Tier A/B
5. NOT_APPLICABLE без part numbers
6. US-only не помечен TARGET_REGION_MATCH для EU
7. Конфликты в review-notes.md
8. coverage-matrix — все 18 узлов

Не меняй данные без причины. Сомнения → review-notes.md.
```

---

## Definition of done

Batch complete when:

1. `source-map.md` + `review-notes.md` exist.
2. All **5 CSV files** exist and pass `parts:catalog:validate` (0 errors).
3. `catalog-sources.csv` covers every `source_key` in staging.
4. `part-applications-staging.csv` has 1:1 rows with staging.
5. `coverage-matrix.csv` has all 18 MVP nodes.
6. Every node has: confirmed part, spec-only, `NOT_APPLICABLE`, or `UNKNOWN`/`NEEDS_REVIEW`.
7. No invented part numbers.
8. Optional: imported to staging DB and visible in `/admin/catalog/staging`.

---

## Implemented infrastructure (do not rebuild)

```text
docs/catalog/parts-catalog-schema.md
docs/catalog/parts-source-policy.md
data/catalog/templates/*.csv
scripts/parts/validate-parts-catalog.ts
scripts/parts/validate-parts-staging.ts
scripts/parts/enrich-staging-batch.ts
scripts/parts/import-parts-staging.ts
scripts/parts/promote-staging-batch.ts
src/lib/catalog-staging/*
/admin/catalog/staging
```

---

## Important warning

Optimize for **trust**, not volume.

100 verified applications with clear region and source beat 10,000 scraped rows with unclear model code and `REFERENCE_ONLY` approval.
