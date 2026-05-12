# Shared service log view models

## What was extracted

Service log **data preparation** now lives in `@mototwin/types` and `@mototwin/domain` so web and Expo can share the same rules without sharing UI.

### Types (`@mototwin/types`)

- **`ServiceLogEntryViewModel`** — One journal row: ids, kind (`SERVICE` / `STATE_UPDATE`), Russian-facing titles and labels, odometer / motochasy / cost fields, comment, `compactMetricsLine` for mobile meta, and `expoServiceNodeLabel` where Expo historically differed from web for the node line.
- **`ServiceLogMonthGroupViewModel`** — Month section: key, sort timestamp, Russian month/year label, **`entries`** (view models), and **`summary`** with counts plus a preformatted **`costLabel`**.
- **`ServiceLogMonthlySummaryViewModel`** — Counts, `costByCurrency`, and **`costLabel`** (multi-currency MVP string from existing `getMonthlyCostLabel` logic).
- **`ServiceLogFilters`** — Alias of **`ServiceEventsFilters`**: диапазон дат (`dateFrom` / `dateTo`), вид события (`eventKind`), текстовый поиск по полю **`serviceType`** (legacy-строка события), опционально **`node`** (подстрока имени узла, в основном для Expo/совместимости), **`paidOnly`**, а также **расширенные клиентские поля**: **`odometerMin` / `odometerMax`**, **`costMin` / `costMax`**, **`performerKind`** (`SELF` | `SERVICE` | `OTHER`), **`actionType`** (тип работы из bundle, `REPLACE` …). Фильтр **по поддереву узлов** задаётся отдельно аргументом **`restrictToNodeIds`** в `buildServiceLogTimelineProps` / `filterAndSortServiceEvents`, а в URL на web — **`nodeIds`** + **`nodeLabel`** (см. `docs/parity/web-expo-service-log-parity-fixes.md`).
- **`ServiceLogSortState`** — Sort field + direction (same as the existing service-events sort types).
- **`ServiceLogEntryDateStyle`** — `"default"` (full `ru-RU` date, web) vs `"compact"` (short month, Expo).

### Pure helpers (`@mototwin/domain`)

- **`buildServiceLogEntryViewModel`** — Maps `ServiceEventItem` → `ServiceLogEntryViewModel` (SERVICE vs STATE_UPDATE, Russian copy, hidden empty cost fields).
- **`groupServiceLogByMonth`** — Wraps **`groupServiceEventsByMonth`** and maps each event through **`buildServiceLogEntryViewModel`**, attaching **`buildServiceLogMonthlySummary`** for the header chips.
- **`buildServiceLogMonthlySummary`** — Adds **`costLabel`** to the numeric monthly summary.
- **`buildServiceLogTimelineViewModel`** — Filter + sort + map to entries (flat list) for future screens or tooling.
- **`filterServiceLogEntries`** / **`sortServiceLogEntries`** — Split from the previous **`filterAndSortServiceEvents`** implementation; **`filterAndSortServiceEvents`** still composes them with **unchanged behavior**.

## Why view models are shared but rendering stays platform-specific

- **Parity** is about the same **meaning** of filters, sort order, grouping, counts, cost aggregation, and human-readable Russian strings—not pixel-identical layouts.
- **Web** keeps its modal timeline, badges, comment expand/collapse, and Tailwind styling.
- **Expo** keeps its cards, timeline rail, and React Native `StyleSheet`s.
- Shared code avoids drifting rules (e.g. monthly grouping, STATE_UPDATE summary text, cost rollups) when one client is edited.

## Where it is used

- **Web:** основной журнал — **`src/app/vehicles/[id]/service-log/page.tsx`** (отдельная страница): **`groupServiceLogByMonth(..., "default")`**, **`group.entries`**, **`group.summary.costLabel`**. У каждой записи во view model есть **`mode`** (`BASIC` \| `ADVANCED`) и **`bundleItemsSummary`**; на web блок **«Установленные запчасти»** в деталях события показывается **только для `ADVANCED`** (в BASIC строки bundle = узлы/работы, без SKU-строк).
- **Expo:** `apps/app/app/vehicles/[id]/service-log.tsx` — **`groupServiceLogByMonth(..., "compact")`** and the same summary/entry fields inside existing components.

## Boundaries

- No API, Prisma, or backend changes.
- No new npm dependencies.
- **`ServiceEventItem`** and API shapes are still the source of truth; view models are derived only.
