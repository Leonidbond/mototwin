# Subscription Access MVP

## Назначение

MotoTwin ограничивает функции по тарифу подписки. В этой итерации **нет реальной оплаты** — план переключается вручную (профиль / `/subscription`, `PATCH /api/subscription/plan`). Сервер — единственный источник истины; UI показывает paywall и блокирует действия заранее, где это возможно.

Полная продуктовая спека (черновик на будущее): [`mototwin_subscription_access_spec.md`](./mototwin_subscription_access_spec.md).

---

## Тарифы

| План | Кратко |
|------|--------|
| **FREE** | 1 мотоцикл, топ-узлы только для чтения, быстрый ввод ТО, 10 видимых событий в журнале |
| **RIDER** | до 3 мотоциклов, выбор топ-узлов, быстрый + подробный ТО (узлы — только топ) |
| **PRO** | без лимита мотоциклов, полное дерево узлов, любые листья в ТО и пикерах |

Новым пользователям при регистрации создаётся `Subscription` с `trialEndsAt = now + 7 days` (триал отображается в UI; переключение плана в MVP не привязано к Stripe).

---

## Матрица возможностей

Источник истины (дублируется в domain для клиентов):

- `src/lib/subscription/capabilities.ts` — сервер
- `packages/domain/src/subscription.ts` — `SUBSCRIPTION_CAPABILITIES`, `canUseServiceEventEntryMode`
- `packages/types/src/subscription.ts` — типы API

| Capability | FREE | RIDER | PRO |
|---|---|---|---|
| `maxVehicles` | 1 | 3 | ∞ (`null`) |
| `nodeAccessLevel` | `TOP_READ_ONLY` | `TOP_SELECTABLE` | `FULL_TREE` |
| `canSelectTopNodeInServiceEvent` | да | да | да |
| `canSelectChildNode` | нет | нет | да |
| `allowedEntryModes` | `QUICK` | `QUICK`, `DETAILED` | `QUICK`, `DETAILED` |
| `maxVisibleServiceEvents` | 10 | ∞ | ∞ |
| `canCustomizeFavoriteNodes` | нет | да | да |
| `defaultNodeViewAll` | нет (старт «топ») | нет | да (старт «всё дерево») |

### Два понятия режима ТО

| Поле | Значения | Смысл |
|------|----------|--------|
| `ServiceEvent.mode` | `BASIC` / `ADVANCED` | Форма: быстрый бандл vs подробный (запчасти, строки по узлам) |
| `ServiceEvent.entryMode` | `QUICK` / `DETAILED` | Доступ по тарифу; `ADVANCED` ⇒ `DETAILED` при сохранении |

На **FREE** в UI доступен только **«Быстро»** (`BASIC` + `QUICK`). Кнопка **«Подробно»** видна, но неактивна; пояснение про **Rider** показывается **только после нажатия** на «Подробно».

---

## API (сервер)

### Подписка

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `/api/subscription/current` | `{ plan, status, trialEndsAt, capabilities, … }` |
| `PATCH` | `/api/subscription/plan` | `{ plan: "FREE" \| "RIDER" \| "PRO" }` (mock) |
| `GET` | `/api/auth/me` | дополнено `planType`, `subscription` |

### Ограничения по доменам

- **`POST /api/vehicles`** — лимит `maxVehicles` → `403` + код ошибки подписки
- **`GET/PATCH/POST` service-events** — `entryMode`, выбор узлов, ротация видимости на FREE (`meta.hiddenCount`, `visibleLimit`)
- **`GET /api/vehicles/[id]/node-tree`** — полное дерево + `locked` / `selectable` на узлах (не обрезание до плоского списка)
- **`GET/PATCH /api/user-settings`**, **`GET /api/nodes/top`** — на FREE нельзя менять `favoriteNodeCodes` (только листья каталога у Pro/Rider при PATCH)

Ошибки: `src/lib/subscription/errors.ts`, хелперы в `src/lib/subscription/service-events.ts`.

### Миграция

`prisma/migrations/20260530143000_subscription_access_tiers/` — enum `PlanType` + `RIDER`, `ServiceEvent.entryMode`, `trialEndsAt`, backfill.

После деплоя: `npx prisma migrate deploy` на VPS.

---

## UI (web + Expo)

### Общие компоненты

| Web | Expo |
|-----|------|
| `src/components/subscription/SubscriptionLock.tsx` | `apps/app/components/subscription/subscription-lock-banner.tsx` |
| `src/components/subscription/FeatureGate.tsx` | — |
| `src/lib/use-subscription.ts` | `apps/app/src/use-mobile-subscription.ts` |

Страница сравнения тарифов: **`/subscription`** (web + `apps/app/app/subscription.tsx`).

### Дерево узлов (Free / Rider)

- Полная иерархия с сервера; у листьев вне топ-набора — `locked: true`.
- Переключатель **«ТОП-узлы»**: выкл. — все узлы видны, не-топовые листья заблокированы; вкл. — только ветки к топ-узлам.
- Предки **не** затемняются, если в поддереве есть активный (не locked) лист.
- Баннер paywall в стиле `variant="surface"` (не amber).

Реализация view-model: `packages/domain/src/node-tree-view-models.ts` (`planLocked`, `hasActiveLeafInSubtree`).

### Модальные пикеры узлов

Единая сборка опций: `packages/domain/src/node-picker-options.ts`

- `buildLeafNodePickerOptionsFromVehicleTree` — листья + `pathLabel` + `planLocked`
- `buildRestrictedPlanVehicleLeafPickerSets` — `allLeaves`, `topLeaves`, `selectableLeaves`, `showTopToggle`

Используется в: журнал (фильтр), расходы, подбор запчастей, wishlist, community part, форма ТО, профиль (только листья каталога, без paywall по дереву мотоцикла).

Web: `NodePickerModal` · Expo: `MobileNodePickerModal` — группировка, поиск, toggle «ТОП-узлы», dim locked rows.

### Прочие экраны

- **Гараж / onboarding** — лимит мотоциклов, CTA на тариф
- **Журнал** — баннер «скрыто N событий» на FREE
- **Профиль** — выбор плана, trial; пикер ТОП-узлов только листья каталога
- **Админ** — `RIDER` в подписках и фильтре пользователей

---

## QA

```bash
# сервер должен быть запущен (npm run dev)
npm run qa:subscription-smoke
```

Скрипт: `scripts/qa-subscription-smoke.ts` — план, лимит мотоциклов, `node-tree` с `locked`, `entryMode` / `403` на FREE.

---

## Parity

Web и Expo выровнены по матрице выше. Отличия только платформенные (навигация, компоненты). Журнал parity: `docs/parity/web-expo-service-log-parity-fixes.md` при доработках журнала.

---

## Не в scope MVP

- Stripe / webhooks / автопродление
- Понижение плана с принудительным удалением лишних мотоциклов
- Отдельный audit «кто сменил план»

---

## Связанные документы

- [`data-model.md`](./data-model.md) — `PlanType`, `Subscription`, `entryMode`
- [`api-backend.md`](./api-backend.md) — §3 Subscription & plan guards
- [`node-tree-page-functional-overview.md`](./node-tree-page-functional-overview.md) — §8 доступ по тарифу
- [`custom-top-nodes-mvp.md`](./custom-top-nodes-mvp.md) — ТОП-узлы (ограничение FREE)
- [`service-log-mvp.md`](./service-log-mvp.md) — журнал и `hiddenCount`
