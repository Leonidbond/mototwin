# MotoTwin parts catalog — source policy

Regional and tier rules for catalog evidence. Complements [parts-catalog-schema.md](./parts-catalog-schema.md).

## Source hierarchy (tiers)

### Tier A — Primary official

| Type | `source_type` | Use |
| --- | --- | --- |
| Manufacturer EPC / AOS | `OFFICIAL_EPC` | Primary fitment when model/year/VIN or model-code match |
| Official spare-parts finder / public catalog | `OFFICIAL_PUBLIC_CATALOG` | Specs, fluids, tire sizes, repair manual references |

**Evidence level:** `A` when exact model/year/model-code match on diagram.

**OFFICIAL_EPC rules:**

- Prefer exploded diagram + `diagram_position` when available.
- Record `source_model_code` (e.g. `KA1/0M21`) and `source_year`.
- Public microfiche (e.g. bike-parts-bmw.com) counts as `OFFICIAL_EPC` when tied to manufacturer catalog data.
- Dealer-login EPC (BMW AOS) is preferred for EU when legally accessible; until then use public microfiche + cross-check.

### Tier B — Official dealer public catalog

| Type | `source_type` | Use |
| --- | --- | --- |
| Official dealer shop (manufacturer-branded) | `OFFICIAL_DEALER_PUBLIC_CATALOG` | Bootstrap when Tier A not accessible |
| Authorized dealer parts pages | `AUTHORIZED_DEALER` | Bootstrap + regional cross-check |

**Evidence level:** `B` with exact model/year/model-code on dealer page or EPC cross-ref.

### Tier C — Reference only

| Type | `source_type` | Use |
| --- | --- | --- |
| Forums, mirrors, blogs, marketplaces | `REFERENCE_ONLY` | Cross-check only — **never** production source of truth |

**Evidence level:** `D` at most. May inform `raw_notes` / reviewer notes; **cannot** set `MANUAL_APPROVED`.

Set `scraping_allowed_status=FORBIDDEN` in `catalog-sources.csv` for reference mirrors.

## Region roles

```text
EU  — target evidence for European motorcycles
RU  — regional availability / purchasing validation; rarely full EPC
US  — bootstrap and cross-check; not automatically valid for EU/RU
GLOBAL — only when manufacturer source clearly states global applicability
```

Every staging row must set:

```text
market, source_region, verification_region, region_match_status, source_url, verified_at
```

## EU / US / RU rules

### US-only bootstrap

When the only confirmed source is US:

```text
market=US (or keep row US-scoped)
source_region=US
review_status=NEEDS_REVIEW
region_match_status=REGION_MISMATCH or UNKNOWN
```

Do **not** set `market=GLOBAL`, `confidence=HIGH`, or `region_match_status=TARGET_REGION_MATCH` for EU/RU targets.

### EU target (primary for MotoTwin EU/RU users)

Preferred order for BMW:

1. BMW AOS / EPC (`OFFICIAL_EPC`, EU)
2. EU public dealer catalog with model-code match
3. bike-parts-bmw.com microfiche (`OFFICIAL_EPC` or `OFFICIAL_DEALER_PUBLIC_CATALOG`)
4. US dealer bootstrap → cross-check only

Row may reach `MANUAL_APPROVED` only after human review when:

- Tier A/B evidence for target region, or
- US + EU dealer/public sources match PN with no conflict.

### RU

- No RU-only dealer page without diagram/model-code → availability reference, not fitment truth.
- Keep `verification_region=RU` only when RU source contributed; otherwise `UNKNOWN` + `NEEDS_REVIEW`.

### Cross-region match

When US + EU official/dealer sources agree on PN and model scope:

```text
region_match_status=CROSS_REGION_MATCH
confidence=HIGH (after human review for safety-critical)
evidence_level=B or A
```

## Evidence requirements (source snapshot)

Minimum per staging row:

| Field | Requirement |
| --- | --- |
| `source_url` | HTTPS, points to exact page or PDF |
| `source_key` | Registered in `catalog-sources.csv` |
| `source_model_code` | From EPC/manual when available |
| `source_year` | Year context in source |
| `verified_at` | When evidence was last checked |
| `evidence_level` | A/B/C/D per tier table |
| `diagram_name` / `diagram_position` | Required for `OFFICIAL_EPC` OEM rows when diagram exists |

Store supplemental metadata in `raw_notes` (conflicts, supersession, parser hints).

## Evidence levels

```text
A — OFFICIAL_EPC or manufacturer official catalog; exact model/year/model-code
B — Official dealer public catalog; exact model/year/model-code
C — Authorized dealer page; PN + model/year evidence
D — Reference-only, forum, marketplace, unclear region
```

## Confidence mapping

```text
HIGH   — A, or B in target region without conflict, or US+EU public match
MEDIUM — Single official/dealer source with region mismatch or model-code uncertainty
LOW    — D, conflicting PNs, missing diagram, unclear region
```

## Production-ready gate

`review_status=MANUAL_APPROVED` requires:

- `evidence_level` in `A`, `B`
- `source_type` not `REFERENCE_ONLY`
- `verified_at` present
- Regional rules satisfied (see EU/US/RU above)
- Safety-critical: explicit admin approval

## `catalog-sources.csv` policy

- One row per distinct `source_key`.
- `base_url` = origin only (scheme + host).
- `license_notes` — document robots.txt, paywall, dealer-login constraints.
- `scraping_allowed_status`:
  - `OFFICIAL_EPC` / public manufacturer pages → `RESTRICTED` (manual export, no bulk scrape)
  - `REFERENCE_ONLY` → `FORBIDDEN`
- `last_checked_at` — when source accessibility was last verified.

## Brand notes (BMW Wave 1)

```text
1. OFFICIAL_EPC — AOS or public microfiche (KA1/0M21)
2. OFFICIAL_PUBLIC_CATALOG — repair manual, technical data
3. OFFICIAL_DEALER_PUBLIC_CATALOG — bike-parts-bmw.com, bmwestore.com
4. AUTHORIZED_DEALER — Europe-Moto, Hermy's, CalMoto, etc.
5. REFERENCE_ONLY — blogs, ETK mirrors (cross-check only)
```

Shaft-drive GS: mark `DRIVETRAIN.CHAIN|FRONT_SPROCKET|REAR_SPROCKET` as `NOT_APPLICABLE` with Tier A technical-data evidence.

Telelever GS: `SUSPENSION.FRONT.SEALS|OIL` → `NOT_APPLICABLE` with repair-manual evidence.

## Conflict handling

When two Tier A/B sources disagree:

- Keep both rows or one row with conflict in `raw_notes`.
- Set `review_status=NEEDS_REVIEW`, `confidence=LOW`.
- Document in `review-notes.md` (not in DB import).

## Companion files

| File | Role |
| --- | --- |
| `source-map.md` | Human-readable source hierarchy for the batch |
| `catalog-sources.csv` | Machine-readable source registry |
| `review-queue.csv` | Rows blocked by `SAFETY_CRITICAL`, `REGION_MISMATCH`, etc. |
| `review-notes.md` | Conflict narratives for admins |
