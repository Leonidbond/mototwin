# QA: сервисные события и «Готово к установке»

Интеграционные смоки дергают **запущенный** Next (`BASE_URL`) и **PostgreSQL** (`DATABASE_URL`), контекст пользователя — как в dev API (**demo@mototwin.local** без переключателя).

## Предусловия

1. В `.env` задан **`DATABASE_URL`**.
2. Выполнен сид: **`npm run db:seed`** (пользователь `demo@mototwin.local`, мотоцикл с ником, содержащим **«KTM 690»**, глобальное дерево узлов с **≥3 листами**).
3. Запущен веб-сервер: **`npm run dev`** (по умолчанию `http://127.0.0.1:3000`).

## Скрипты (`package.json`)

| Команда | Файл | Назначение |
|---------|------|------------|
| `npm run qa:service-event-full-smoke` | `scripts/qa-service-event-full-smoke.ts` | Полный прогон: **BASIC** (1 и 2 узла), **ADVANCED → PATCH BASIC**, установка из **wishlist INSTALLED**, сценарий **«Готово к установке»** (3 строки: expense + wishlist BOUGHT + wishlist NEEDED). Проверяются ответы API, **`ExpenseItem`**, **`NodeState`** / `lastServiceEventId`, статусы wishlist после multi-install. В конце тестовые сущности удаляются. |
| `npm run qa:service-bundle-advanced-smoke` | `scripts/qa-service-bundle-advanced-smoke.ts` | Узкий смок: ADVANCED (2 узла, 2 расхода) → PATCH в BASIC (1 расход) → DELETE. |
| `npx tsx scripts/qa-installed-wishlist-smoke.ts` | `scripts/qa-installed-wishlist-smoke.ts` | Каталог HF155 → wishlist → INSTALLED → событие; затем multi-installable (совпадает с блоком §5 full-smoke). Отдельного `npm run` нет — вызывать через `tsx`. |

Пример:

```bash
BASE_URL=http://127.0.0.1:3000 npm run qa:service-event-full-smoke
```

## Серверная логика, покрытая full-smoke

- Создание bundle-события: **`createBundleServiceEventInTransaction`** — `NodeState` для каждого затронутого листа, пересчёт **`TopNodeState`**.
- Синхронизация расходов: **`syncExpenseItemForServiceEvent`** — в том числе случай **только `installedPartsJson` с wishlist** при **`partsCost` / `laborCost` / `totalCost` = null** (пикер «Готово к установке»): по id из JSON позиции переводятся в **`INSTALLED`**, линкуются standalone-расходы при наличии.
- Линковка выбранных расходов: **`linkInstalledExpenseItemsToServiceEvent`** — `installationStatus`, `serviceEventId`, wishlist по `shoppingListItemId` из расходов.

При изменении этих путей прогоните **`qa:service-event-full-smoke`** перед релизом.

## Ручной mobile parity checklist

Проверяется в Expo simulator/device после изменений mobile формы:

1. Preview: кнопка **«Предпросмотр»** в нижнем footer открывает read-only sheet, значения совпадают с текущей формой, закрытие по фону/кнопке работает.
2. Дата: ввод `YYYY-M-D`, `YYYY.MM.DD` или `YYYY/MM/DD` нормализуется в `YYYY-MM-DD`; дата позже сегодня показывает ошибку рядом с полем и не даёт сохранить.
3. Метрики: пробег/моточасы выше текущих открывают prompt обновления состояния; без подтверждения submit не проходит.
4. Узлы: single picker и multi-add показывают фильтр **«Топ-узлы»** в одной строке с поиском; крестик удаления/очистки находится напротив выбранного узла.
5. ADVANCED: `Готово к установке` находится в header карточки узлов и скрыто в BASIC/edit; поиск SKU появляется сразу после SKU-поля текущего узла.
6. Currency: `RUB` по умолчанию, быстрый выбор `RUB / USD / EUR`, `Другая валюта` принимает uppercase код вроде `KZT`.
7. Service-log return: после create/update из журнала есть `feedback`, журнал скроллит к сохранённому событию и подсвечивает его через `serviceEventId`.
8. Wishlist flow: create из корзины возвращает в wishlist с `wishlistItemId`; установка детали и статусы проверяются серверным smoke.
9. Edit route: mobile edit остаётся query-route `service-events/new?eventId=...`; отдельный Expo route пока не нужен.

## Ручной service-log compact/details checklist

1. Web desktop: `/vehicles/{id}/service-log` открывается с левым `GarageSidebar`; header около 72px, справа одна primary CTA **«Добавить ТО»**, под ним sticky toolbar около 56px.
2. Web timeline: строки выглядят как dense operational timeline, а не карточки; проверяются 6 зон — rail/dot, дата+метрики, title/meta, chips, cost, action.
3. Web details: выбранное событие открыто в правой sticky-панели с metric tiles, компактной таблицей работ/деталей, комментарием и fixed actions.
4. Web deep link: `serviceEventId` / `highlightServiceEventId` скроллит к событию, выделяет row и раскрывает details; `expandExpenses=1` сохраняет paid-only context и усиливает cost/expense акцент.
5. Expo: на экране видно больше compact rows; tap раскрывает только short preview/actions, **Подробнее** открывает bottom sheet на большую часть экрана.
6. Expo sheet: в sheet есть header, metrics, работы/детали, комментарий, lifecycle actions; закрытие по фону/крестику работает.
7. Visual accents: orange используется для selected/highlight/CTA/paid-only, purple — только для service badge, green — для money/success, `STATE_UPDATE` остаётся muted и ниже по высоте.
