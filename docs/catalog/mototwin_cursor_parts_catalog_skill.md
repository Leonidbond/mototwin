# MotoTwin Cursor Skill: Iterative Parts Catalog Builder

> **Use current version:** [mototwin_cursor_parts_catalog_skill_v1_2.md](./mototwin_cursor_parts_catalog_skill_v1_2.md)

## Назначение

Этот skill / workflow нужен, чтобы Cursor итеративно создавал и наполнял каталоги запчастей MotoTwin по моделям мотоциклов.

Главная цель: не собрать «все запчасти мира», а создать проверенную матрицу:

```text
ModelVariant → MotoTwin top node → OEM part → source URL → region → review status → confidence
```

MotoTwin не должен превращаться в копию EPC-каталога. Каталог запчастей нужен как нижний слой доказательства для fitment, service log, reminders и community reports.

---

## Когда использовать

Использовать этот workflow, когда нужно:

- добавить каталог запчастей для новой модели;
- расширить уже добавленную модель новыми top-узлами;
- обновить OEM-артикулы по официальному источнику;
- сверить US/EU/RU источники;
- подготовить seed/CSV для импорта в БД;
- создать staged records для ручной проверки админом.

Не использовать для:

- массового парсинга всего сайта;
- обхода защит, rate limits, paywall или robots restrictions;
- импорта неподтвержденных данных сразу в production tables;
- генерации fitment-истины без источника.

---

## Базовые правила MotoTwin

1. Structured data is the source of truth.
2. LLM must never be the source of truth for fitment.
3. Every part must have source evidence.
4. Every imported part first goes to staging.
5. Safety-critical nodes require manual review.
6. Do not import all screws, washers and decorative items for MVP.
7. Start with top models and top nodes.
8. Preserve region: US / EU / RU / GLOBAL.
9. Preserve source type: OFFICIAL_EPC / OFFICIAL_PUBLIC_CATALOG / OFFICIAL_DEALER_PUBLIC_CATALOG / AUTHORIZED_DEALER / REFERENCE_ONLY.
10. If data is not confirmed, mark it as NEEDS_REVIEW, not MANUAL_APPROVED.

---

## Recommended tool choice

### Use Cursor for

- modifying MotoTwin repo;
- adding Prisma models/migrations;
- adding import scripts;
- adding CSV/YAML source maps;
- building admin review UI;
- running local tests;
- iterating with small diffs;
- keeping context close to current codebase.

### Use Codex for

- parallel model batches after the process is stable;
- one branch / PR per model;
- large repetitive refactors;
- isolated import-script improvements;
- running tasks in cloud worktrees with verifiable logs.

### Practical recommendation

Start in Cursor. Stabilize the schema, source map, importer, validator and review flow.

After 2–3 successful BMW models, use Codex or Cursor Cloud Agents to parallelize:

```text
Agent 1 → R 1300 GS Adventure
Agent 2 → R 1250 GS
Agent 3 → R 1250 GS Adventure
Agent 4 → F 900 GS
Agent 5 → F 900 GS Adventure
```

---

## Source hierarchy

### Tier A — Primary official source

Use when available:

- manufacturer EPC / AOS;
- official manufacturer spare parts finder;
- official manufacturer parts catalog.

Examples:

- BMW AOS / EPC
- KTM Spare Parts Finder
- Ducati Genuine Part Catalogue
- Yamaha official Parts Catalog

Source type:

```text
OFFICIAL_EPC
OFFICIAL_PUBLIC_CATALOG
```

### Tier B — Official dealer public catalog

Use for bootstrap and verification when public manufacturer EPC is not accessible.

Examples:

- shopbmwmotorcycles.com
- bike-parts-bmw.com
- official dealer catalog pages

Source type:

```text
OFFICIAL_DEALER_PUBLIC_CATALOG
AUTHORIZED_DEALER
```

### Tier C — Reference only

Use only for cross-checking, never as final source of truth.

Examples:

- ETK mirrors
- forums
- club databases
- marketplace listings

Source type:

```text
REFERENCE_ONLY
```

---

## BMW Wave 1 model scope

Start with these models:

```text
BMW R 1300 GS / current / 2024–present
BMW R 1300 GS Adventure / current / 2025–present
BMW R 1250 GS / K50 EU5 / 2019–2024
BMW R 1250 GS Adventure / K51 EU5 / 2019–2024
BMW F 900 GS / current / 2024–present
BMW F 900 GS Adventure / current / 2024–present
```

Second wave:

```text
BMW F 800 GS / current / 2024–present
BMW G 310 GS / current / 2017–present
BMW S 1000 XR / current / 2025–present
BMW S 1000 RR / current / 2025–present
BMW S 1000 R / current / 2025–present
BMW R 12 / current / 2024–present
BMW R 12 nineT / current / 2024–present
BMW R 1300 R / current / 2026–present
```

---

## Top nodes for MVP catalog

Only collect parts for these nodes at first:

```text
ENGINE.LUBE.FILTER
ENGINE.LUBE.OIL
INTAKE.FILTER
ELECTRICS.IGNITION.SPARK
BRAKES.FRONT.PADS
BRAKES.REAR.PADS
BRAKES.FRONT.DISC
BRAKES.REAR.DISC
BRAKES.FLUID
TIRES.FRONT
TIRES.REAR
ELECTRICS.BATTERY
SUSPENSION.FRONT.SEALS
SUSPENSION.FRONT.OIL
COOLING.LIQUID.COOLANT
DRIVETRAIN.CHAIN
DRIVETRAIN.FRONT_SPROCKET
DRIVETRAIN.REAR_SPROCKET
```

Important:

- For BMW R 1250 GS / R 1300 GS with shaft drive, mark chain/sprockets as `NOT_APPLICABLE`.
- Tire nodes may store size/specification first, not tire SKU.
- Oil and fluids may store specification and volume where OEM part number is not practical.

---

## Required output format for each model batch

For every model batch Cursor must create or update:

```text
data/parts/bmw/<model-slug>/source-map.md
data/parts/bmw/<model-slug>/parts-staging.csv
data/parts/bmw/<model-slug>/review-notes.md
```

Optional if importer exists:

```text
data/parts/bmw/<model-slug>/parts-staging.json
```

---

## CSV schema

Every row in `parts-staging.csv` must use this schema:

```csv
brand,model_family,variant,generation,year_from,year_to,market,node_id,node_applicability,part_manufacturer,part_number,normalized_part_number,part_name,part_category,is_oem,application_type,source_name,source_type,source_region,source_url,diagram_name,diagram_position,raw_quantity,raw_notes,review_status,safety_critical,confidence,parsed_at
```

Allowed values:

```text
node_applicability: APPLICABLE | NOT_APPLICABLE | UNKNOWN
is_oem: true | false
application_type: OEM_REPLACEMENT | OEM_SERVICE_ITEM | SPECIFICATION_ONLY | COMPATIBLE_AFTERMARKET | COMMUNITY_REPORTED
review_status: NEW | NEEDS_REVIEW | MANUAL_APPROVED | REJECTED | DUPLICATE | NOT_APPLICABLE
safety_critical: true | false
confidence: HIGH | MEDIUM | LOW
```

---

## Review rules

### Auto-approved candidates

May be marked `MANUAL_APPROVED` only if all are true:

- source is OFFICIAL_EPC / OFFICIAL_PUBLIC_CATALOG / OFFICIAL_DEALER_PUBLIC_CATALOG;
- exact model/generation/year match is clear;
- exact node match is clear;
- part number is visible in source;
- source URL is saved;
- no conflict with another official source.

### Needs review

Must be marked `NEEDS_REVIEW` if:

- source is not official;
- region mismatch exists;
- model code is unclear;
- part number may be superseded;
- same node has multiple conflicting OEM numbers;
- part is safety-critical.

### Safety-critical nodes

Always treat as safety-critical:

```text
BRAKES.FRONT.PADS
BRAKES.REAR.PADS
BRAKES.FRONT.DISC
BRAKES.REAR.DISC
SUSPENSION.FRONT.SEALS
ELECTRICS.IGNITION.SPARK
```

For these nodes Cursor must not invent compatibility. It must preserve source and set `NEEDS_REVIEW` unless there is very strong official evidence and the user explicitly accepts manual approval.

---

## Iterative workflow

### Step 1 — Plan

Cursor must first create a short plan:

```text
Target model:
Target generation:
Target years:
Sources to check:
Nodes to collect:
Expected files to update:
Risks / uncertainties:
```

### Step 2 — Source map

Create/update source map:

```md
# Source map — BMW R 1300 GS / current / 2024–present

## Primary sources
- Source name:
- Source type:
- Region:
- URL:
- Notes:

## Secondary sources
...

## Reference-only sources
...
```

### Step 3 — Collect parts

Collect one node group at a time:

1. engine service
2. intake / ignition
3. brakes
4. electrical / battery
5. suspension
6. cooling
7. tires
8. drivetrain

Never mix multiple models in one batch unless the user explicitly asked for it.

### Step 4 — Write staging file

Write records to `parts-staging.csv`.

Do not write directly to seed or production import unless staging validator passes.

### Step 5 — Validate

Run or create a validator that checks:

- required fields are not empty;
- part numbers are normalized;
- source URLs exist;
- no duplicate model + node + part number rows;
- NOT_APPLICABLE rows do not contain part numbers;
- safety-critical rows are not silently approved.

Suggested script path:

```text
scripts/parts/validate-parts-staging.ts
```

### Step 6 — Review notes

Create/update `review-notes.md`:

```md
# Review notes

## Confirmed
- ...

## Needs review
- ...

## Conflicts
- ...

## Not applicable
- ...

## Next batch
- ...
```

### Step 7 — Import

Only after review, import to DB staging tables.

Suggested command:

```bash
pnpm parts:import --brand BMW --model r-1300-gs --file data/parts/bmw/r-1300-gs/parts-staging.csv
```

---

## Database target model

Cursor should prefer staging-first architecture.

Recommended Prisma models:

```prisma
model CatalogSource {
  id                     String   @id @default(cuid())
  brand                  String
  sourceName             String
  sourceType             String
  region                 String
  baseUrl                String
  licenseNotes           String?
  scrapingAllowedStatus  String   @default("UNKNOWN")
  lastCheckedAt          DateTime?
  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt
}

model PartSourceSnapshot {
  id                String   @id @default(cuid())
  sourceId          String
  sourceUrl         String
  sourceBrand       String
  sourceModelName   String
  sourceModelCode   String?
  sourceYear        Int?
  sourceMarket      String?
  sourceCategory    String?
  sourceSubcategory String?
  diagramName       String?
  diagramPosition   String?
  rawPartName       String
  rawPartNumber     String?
  rawQuantity       String?
  rawNotes          String?
  rawPrice          String?
  rawCurrency       String?
  rawAvailability   String?
  parsedAt          DateTime @default(now())
  parserVersion     String
  importStatus      String   @default("NEW")
}

model PartMaster {
  id                    String   @id @default(cuid())
  manufacturer          String
  partNumber            String
  normalizedPartNumber  String
  title                 String
  category              String
  description           String?
  isOem                 Boolean  @default(false)
  oemBrand              String?
  supersededByPartNumber String?
  status                String   @default("ACTIVE")
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}

model PartApplication {
  id                String   @id @default(cuid())
  partId            String
  brandId           String?
  modelFamilyId     String?
  variantId         String?
  generationId      String?
  yearFrom          Int?
  yearTo            Int?
  market            String?
  nodeId            String
  applicationType   String
  sourceId          String?
  sourceUrl         String?
  sourceConfidence  String
  reviewStatus      String   @default("NEEDS_REVIEW")
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

Adapt field names to existing Prisma schema instead of blindly adding duplicates.

---

## Prompt template for Cursor

Use this prompt for one model batch:

```text
Ты работаешь в проекте MotoTwin. Используй workflow “Iterative Parts Catalog Builder”.

Задача: создать/обновить staging-каталог запчастей для одной модели BMW.

Target model:
BMW <MODEL>
Generation: <GENERATION>
Years: <YEARS>
Support level: <SUPPORT_LEVEL>

Нужно собрать только TOP-узлы MotoTwin:
- ENGINE.LUBE.FILTER
- ENGINE.LUBE.OIL
- INTAKE.FILTER
- ELECTRICS.IGNITION.SPARK
- BRAKES.FRONT.PADS
- BRAKES.REAR.PADS
- BRAKES.FRONT.DISC
- BRAKES.REAR.DISC
- BRAKES.FLUID
- TIRES.FRONT
- TIRES.REAR
- ELECTRICS.BATTERY
- SUSPENSION.FRONT.SEALS
- SUSPENSION.FRONT.OIL
- COOLING.LIQUID.COOLANT
- DRIVETRAIN.CHAIN
- DRIVETRAIN.FRONT_SPROCKET
- DRIVETRAIN.REAR_SPROCKET

Правила:
1. Не выдумывай OEM-артикулы.
2. Каждая строка должна иметь source_url.
3. Сначала пиши в staging CSV, не в production seed.
4. Safety-critical узлы помечай safety_critical=true и review_status=NEEDS_REVIEW, если нет явного ручного подтверждения.
5. Для карданных BMW пометь chain/sprockets как NOT_APPLICABLE.
6. Если данные не найдены, создай строку с node_applicability=UNKNOWN и review_status=NEEDS_REVIEW.
7. Сохраняй регион источника: US / EU / RU / GLOBAL.
8. Не смешивай разные модели в одном файле.

Создай/обнови файлы:
- data/parts/bmw/<model-slug>/source-map.md
- data/parts/bmw/<model-slug>/parts-staging.csv
- data/parts/bmw/<model-slug>/review-notes.md

После заполнения запусти или создай validator для CSV и напиши результат проверки.
```

---

## Prompt template for review

```text
Проверь staging-каталог запчастей MotoTwin для BMW <MODEL>.

Проверь:
1. Нет ли строк без source_url.
2. Нет ли дубликатов part_number + node_id + model.
3. Все ли safety-critical узлы помечены safety_critical=true.
4. Не попали ли неподтвержденные строки в MANUAL_APPROVED.
5. Корректно ли помечены NOT_APPLICABLE узлы.
6. Не смешаны ли регионы US/EU без явной пометки market/source_region.
7. Есть ли конфликтующие OEM-артикулы.
8. Можно ли импортировать файл в staging tables.

Не меняй данные без причины. Если есть сомнения — добавь их в review-notes.md.
```

---

## Prompt template for import script

```text
Реализуй безопасный импорт MotoTwin parts-staging.csv в staging tables.

Требования:
1. Используй TypeScript.
2. Используй существующий Prisma client из src/lib/prisma.ts.
3. Не создавай production PartMaster / PartApplication напрямую, если review_status != MANUAL_APPROVED.
4. Импорт должен быть idempotent по ключу source_url + node_id + normalized_part_number + model.
5. Добавь dry-run режим.
6. Добавь понятный summary после импорта:
   - created
   - updated
   - skipped
   - needs_review
   - errors
7. Не добавляй новых библиотек без необходимости.
```

---

## Definition of done

A model batch is done only if:

1. `source-map.md` exists.
2. `parts-staging.csv` exists and follows schema.
3. `review-notes.md` exists.
4. Every part has source evidence.
5. Every top node has one of:
   - confirmed part;
   - specification-only entry;
   - NOT_APPLICABLE;
   - UNKNOWN / NEEDS_REVIEW.
6. Safety-critical rows are marked.
7. Validator passes or review-notes explains failures.
8. No invented part numbers.
9. Data can be imported into staging without breaking the app.

---

## First recommended tasks

### Task 1

Create repository structure for parts data:

```text
data/parts/bmw/
scripts/parts/
docs/catalog/
```

### Task 2

Add CSV schema documentation:

```text
docs/catalog/parts-staging-csv-schema.md
```

### Task 3

Create BMW R 1300 GS batch:

```text
data/parts/bmw/r-1300-gs/source-map.md
data/parts/bmw/r-1300-gs/parts-staging.csv
data/parts/bmw/r-1300-gs/review-notes.md
```

### Task 4

Create validator:

```text
scripts/parts/validate-parts-staging.ts
```

### Task 5

Only after validation, create import script:

```text
scripts/parts/import-parts-staging.ts
```

---

## Important warning

Do not optimize for volume. Optimize for trust.

A catalog with 100 verified part applications is more valuable for MotoTwin than 10,000 scraped rows with unclear region, model code and source quality.
