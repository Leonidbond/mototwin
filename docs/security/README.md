# MotoTwin — Security audit

Аудит выполнен по плану [`.cursor/plans/security_audit_plan_mototwin_88ffeb05.plan.md`](../../.cursor/plans/security_audit_plan_mototwin_88ffeb05.plan.md).

Скоуп: только приложение — web (Next.js 16, App Router), mobile (Expo 54 + Expo Router), API (`src/app/api/**`). Инфраструктура (Nginx, Docker, systemd, VPS) и supply chain — вне скоупа этой итерации; пограничные находки помечены тегом `scope:infra` и вынесены в `findings.md` как «к рассмотрению» без P0/P1/P2.

Стандарты:

- [OWASP Top 10 — 2021](https://owasp.org/Top10/) — web.
- [OWASP API Security Top 10 — 2023](https://owasp.org/API-Security/editions/2023/en/0x11-t10/) — API.
- [OWASP Mobile Top 10 — 2024](https://owasp.org/www-project-mobile-top-10/) + [MASVS L1](https://mas.owasp.org/MASVS/) — Expo.

## Документы

| Файл | Что внутри |
|------|------------|
| [threat-model.md](./threat-model.md) | Активы, актеры, trust boundaries, диаграмма потоков |
| [finding-template.md](./finding-template.md) | Шаблон находки + шкала severity |
| [api-findings.md](./api-findings.md) | Аудит API по OWASP API Top 10 2023 (по 10 категориям) |
| [web-findings.md](./web-findings.md) | Аудит web по OWASP Top 10 2021 |
| [mobile-findings.md](./mobile-findings.md) | Аудит mobile по OWASP Mobile Top 10 2024 |
| [findings.md](./findings.md) | Сводный реестр находок, сгруппированный по severity P0 / P1 / P2; включает раздел «Input validation audit» (MT-SEC-065..075) |
| [roadmap.md](./roadmap.md) | Roadmap фиксов с приоритетом, оценкой, owner-ами и acceptance criteria; «Итерация 1» и «Итерация 2 — Input Validation audit» |

## Состояние фикса (итерации)

| # | Период | Скоуп | Где детали |
|---|--------|-------|------------|
| 1 | первичный аудит | OAuth audience, rate-limit auth, headers, body-size guard, fetch timeouts, env validation, RBAC moderation/admin | `MT-SEC-001`..`MT-SEC-064`; [roadmap.md#итерация-1--что-закрыто](./roadmap.md#итерация-1--что-закрыто) |
| 2 | Input Validation audit | Полный обход 122 route handler-ов, новые helpers (`strictObject`, `boundedText/Number/JsonValue`, `safeUrl`, `parseSearchParam*`, `safeRenderUrl`), `parseJsonBody` на write-ручках, auth+rate-limit на `geocode`/`recommended-skus`/`duplicates` | `MT-SEC-065`..`MT-SEC-075`; [findings.md#input-validation-audit-итерация-2--полный-обход-97-ручек--122-handler-ов](./findings.md#input-validation-audit-итерация-2--полный-обход-97-ручек--122-handler-ов); [roadmap.md#итерация-2--input-validation-audit-закрыто](./roadmap.md#итерация-2--input-validation-audit-закрыто) |
| 3 | Infra hardening + Input-validation follow-up | Nginx → HTTPS + Mozilla intermediate + HSTS + security headers + 301 redirect (`MT-SEC-029` resolved); `mototwin.dump` untracked (`MT-SEC-027` partial — open: rewrite history + ротация секретов); `MT-SEC-068`/`069`/`070`/`071` **закрыты полностью**: оставшиеся 18 handler-ов мигрированы на `strictObject`/`parseJsonBody`/`parseSearchParam*`; добавлен ESLint guard `no-restricted-syntax` против регрессий | [roadmap.md#итерация-3--infra-hardening--input-validation-follow-up-закрыто](./roadmap.md#итерация-3--infra-hardening--input-validation-follow-up-закрыто) |

| 4 | Auth audit log | `AuthAuditLog` model + `logAuthEvent` во всех auth flows; admin `/admin/audit?type=auth`; smoke `qa:auth-audit-smoke` (`MT-SEC-054` resolved) | [roadmap.md#итерация-4--auth-audit-log-закрыто](./roadmap.md#итерация-4--auth-audit-log-закрыто) |

| 5 | Auth audit retention | 90-day purge + failed-login burst alerts; cron + VPS crontab (`MT-SEC-055` resolved) | [roadmap.md#итерация-5--auth-audit-retention--alerting-закрыто](./roadmap.md#итерация-5--auth-audit-retention--alerting-закрыто) |

## Как читать

1. Начать с [threat-model.md](./threat-model.md) — общая картина и активы.
2. Затем [findings.md](./findings.md) — единый список всех находок (`MT-SEC-001`, `MT-SEC-002`, …) с severity и быстрым описанием. Каждая запись ссылается на соответствующий per-stream-документ (`api-findings.md` / `web-findings.md` / `mobile-findings.md`) с детальным разбором.
3. Для планирования работ — [roadmap.md](./roadmap.md): группы P0 / P1 / P2 + Quick Wins (≤1 ч) и Sprint Bundle.

## Методика

- Только статический ревью кода. Динамический pentest, ZAP/Burp, fuzz, `npm audit`/CI-сканеры не использовались (вне скоупа).
- Оценка severity — экспертная, по шкале из [finding-template.md](./finding-template.md). CVSS не считался; рейтинг отражает риск в текущей модели угроз MotoTwin (закрытая бета, ~ru.mototwin.app, нет платёжных данных).
- Все ссылки на код используют пути относительно корня репозитория. Конкретные строки указаны при наличии (формат `file.ts:42`).

## Дата и состояние

- Версия отчета: **1.5** (после итерации 5 — Auth audit retention).
- Дата: 2026-05-31.
- HEAD на момент аудита: см. `git log -1` (на момент составления — ветка main, без коммитов с пометкой `security:*`).
- Артефакты согласованы между собой: при правке `findings.md` правьте per-stream-файл (или наоборот) — оба источника должны совпадать.

### Changelog

- **1.5** (2026-05-31) — итерация 5 «Auth audit retention»: `MT-SEC-055` resolved (90-day purge cron + failed-login burst alerts).
- **1.4** (2026-05-31) — итерация 4 «Auth audit log»: `MT-SEC-054` resolved (`AuthAuditLog`, `logAuthEvent`, admin UI, smoke test).
- **1.3** (2026-05-31) — итерация 3 продолжена: `MT-SEC-068`/`069`/`070`/`071` **полностью закрыты** (18 оставшихся handler-ов мигрированы на `strictObject`/`parseJsonBody`/`parseSearchParam*`; outer + nested item-схемы; service-events / wishlist / vehicles `rideProfile`); ESLint guard `no-restricted-syntax` в `eslint.config.mjs` блокирует регрессии. `findings.md` / `roadmap.md` обновлены.
- **1.2** (2026-05-30) — итерация 3 «Infra hardening»: `MT-SEC-029` resolved (nginx переписан); `MT-SEC-027` partial (untracked, open follow-up на rewrite history + ротация секретов).
- **1.1** (2026-05-24) — добавлен раздел «Input validation audit» в `findings.md`; `roadmap.md` дополнен «Итерация 2»; статусы `resolved` проставлены `MT-SEC-065`..`MT-SEC-075`.
- **1.0** (2026-05-24) — первичный аудит и первая итерация фиксов (`MT-SEC-001`..`MT-SEC-064`).
