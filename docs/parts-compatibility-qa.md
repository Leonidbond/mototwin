# QA: совместимость (отчёт, подбор, панель деталей корзины)

Дата прогона API: **2026-05-16**  
Область: ссылки **«Отчёт о совместимости»** в подборе, блок **«Совместимость»** в панели деталей корзины (web + Expo), страницы отчёта и community.

Связанные документы: [parts-wishlist-mvp.md](./parts-wishlist-mvp.md), [mototwin_recent_implementation_notes_ru.md](./mototwin_recent_implementation_notes_ru.md), [mototwin-parts-cart-and-picker-ui-spec.md](./mototwin-parts-cart-and-picker-ui-spec.md) §6.7.

## Предусловия

| Сервис | Команда | Порт |
|--------|---------|------|
| Next.js (API + web) | `npm run dev` | `3000` |
| Expo | `npm run mobile:dev` | Metro `8081`, API → `http://<LAN>:3000` или `localhost:3000` |
| PostgreSQL | `docker` / локальный Postgres | `5432` |

- БД с сидом (`npx prisma migrate deploy`, `npx prisma db seed` при необходимости).
- Локально API без cookie: контекст **`demo@mototwin.local`** (не передавать `x-mototwin-dev-user-email`, если `MOTOTWIN_ENABLE_DEV_USER_SWITCHER` выключен — иначе `400 DEV_SWITCHER_DISABLED`).
- Тестовое ТС из логов прогона: **BMW F 850 GS** `vehicleId=cmp1bqx1h000m47l461eschhg`, узел **TIRES.FRONT** `nodeId=cmp1bqx1z001747l4jbvmmebs`.

## API checks (выполнено 2026-05-16)

База: `http://127.0.0.1:3000` (активный `npm run dev`).

| Проверка | HTTP | Результат |
|----------|------|-----------|
| `GET /api/garage` | 200 | OK |
| `GET /api/vehicles/:id/wishlist` | 200 | 3 позиции; **1** с `sku.partMasterId` |
| `GET /api/parts/recommended-skus?vehicleId&nodeId` (TIRES.FRONT) | 200 | 4 рекомендации, у всех есть `partMasterId` |
| `GET /api/vehicles/:id/part-compatibility-report?partMasterId&nodeId` | 200 | tier «Средняя уверенность», 5 записей, 3 владельца |
| `buildWishlistDetailCompatibilitySummary(report)` | — | сводка собирается (verdict, dominant, reportsLine, source, catalog) |

Пример `partMasterId` / `nodeId` из прогона: `cmp8c7dv1000obzl4gh3cfa29` + `cmp1bqx1z001747l4jbvmmebs`.

### Web-страницы (HTML, без cookie)

| URL | HTTP |
|-----|------|
| `/vehicles/:id/parts` | 200 |
| `/vehicles/:id/parts/picker?nodeId=…` | 200 |
| `/vehicles/:id/parts/fitment-report?partMasterId=…&nodeId=…` | 200 |

В логах dev-сервера зафиксированы успешные `GET …/part-compatibility-report` при открытии отчёта из UI.

## Web — ручной чеклист

### Подбор (`/vehicles/:id/parts/picker`)

- [ ] Выбрать leaf-узел (например TIRES.FRONT).
- [ ] На карточках **BEST FIT / BEST VALUE / FOR YOUR RIDE**: строка статистики + ссылка **«Отчёт о совместимости →»** (оранжевая).
- [ ] **«Показать ещё рекомендации»** → у альтернативы та же ссылка (muted).
- [ ] Поиск SKU (≥2 символа) → в строке результата ссылка на отчёт.
- [ ] Тап по ссылке → `/parts/fitment-report?nodeId&partMasterId`, страница грузится без ошибки.
- [ ] **«Добавить свою деталь»** → `/parts/community` с `nodeId` в query.
- [ ] **«Сбросить выбор»** очищает узел и draft (с подтверждением, если draft не пуст).

### Корзина — панель деталей (`/vehicles/:id/parts`)

- [ ] Выбрать позицию **с каталожным SKU** и узлом.
- [ ] В правой панели блок **«Совместимость»**: краткая сводка (итог, уровень, отчёты, источник).
- [ ] Ссылка **«Отчёт о совместимости →»** открывает полный отчёт.
- [ ] Позиция **без SKU** → пояснение, без активной ссылки.
- [ ] Позиция с SKU **без PartMaster** → пояснение «нет канонической карточки».

### Страница отчёта

- [ ] Hero: бренд · название, мото, узел.
- [ ] Секции: итог, распределение, источник, отчёты владельцев (фильтры).
- [ ] CTA «Добавить свой опыт» → community (если реализовано на странице).

## Expo — ручной чеклист

Metro: `npm run mobile:dev`. API должен указывать на тот же Next (`EXPO_PUBLIC_API_BASE_URL` или LAN IP в `app.config`).

### Подбор (`/vehicles/:id/wishlist/picker`)

- [ ] Выбрать узел → рекомендации.
- [ ] На карточке: **«Отчёт о совместимости →»** под ценой.
- [ ] В альтернативах и в поиске — та же ссылка.
- [ ] Переход → `/wishlist/fitment-report?…`.
- [ ] **«Добавить свою деталь»** → `/wishlist/community`.

### Корзина (`/vehicles/:id/wishlist`)

- [ ] Тап по строке → нижний лист деталей.
- [ ] Блок **«Совместимость»** со сводкой и **«Отчёт о совместимости →»**.
- [ ] Переход на экран отчёта, назад — без падения.
- [ ] Ссылка **«Добавить свою деталь»** над списком (если видна).

### Отчёт и community

- [ ] `/wishlist/fitment-report` — загрузка, секции, sticky CTA.
- [ ] `/wishlist/community` — форма, prefill из `?partMasterId=` при наличии.

## Таблица результатов

| Сценарий | API | Web UI | Expo UI |
|----------|-----|--------|---------|
| Wishlist возвращает `sku.partMasterId` | PASS (1/3 с SKU) | TODO | TODO |
| Рекомендации с `partMasterId` | PASS (4/4) | TODO | TODO |
| `part-compatibility-report` | PASS | TODO | TODO |
| Сводка `buildWishlistDetailCompatibilitySummary` | PASS | TODO | TODO |
| HTML picker / parts / fitment-report | PASS (200) | TODO | N/A |
| Ссылка в подборе | N/A | TODO | TODO |
| Блок в панели деталей | N/A | TODO | TODO |

## Быстрые команды для повторного API-прогона

```bash
VID=cmp1bqx1h000m47l461eschhg
NODE=cmp1bqx1z001747l4jbvmmebs
PM=cmp8c7dv1000obzl4gh3cfa29
BASE=http://127.0.0.1:3000

curl -sS "$BASE/api/vehicles/$VID/wishlist" | jq '.items[] | select(.sku.partMasterId) | {id, nodeId, partMasterId: .sku.partMasterId}'
curl -sS "$BASE/api/vehicles/$VID/part-compatibility-report?partMasterId=$PM&nodeId=$NODE" | jq '{tier: .confidence.tierLabelRu, total: .breakdown.totalReports, authors: .uniqueAuthorCount}'
```

## Примечания

- Для автоматизации с заголовком dev-user включите `MOTOTWIN_ENABLE_DEV_USER_SWITCHER=true` в `.env.local`.
- UI-пункты помечены **TODO** — пройдите в браузере и на устройстве/симуляторе при работающих `npm run dev` и `npm run mobile:dev`.
