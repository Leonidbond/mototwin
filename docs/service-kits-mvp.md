# Service Kits MVP

## Что такое комплект обслуживания

Комплект обслуживания (service kit) — это шаблон, который добавляет в wishlist **несколько независимых позиций** за одно действие.

- Комплект **не** является сервисным событием.
- Комплект **не** устанавливается целиком.
- Устанавливается только отдельная позиция wishlist через обычный flow `INSTALLED -> Add Service Event`.

## MVP модель

Комплект задаётся статически (в shared-domain) и содержит:

- `id` / `code`
- `title`
- `description`
- `targetNodeCodes` (контекстные узлы)
- `items`

Элемент комплекта:

- `title`
- `nodeCode`
- `partType`
- `quantity`
- `role` (`PRIMARY`, `RELATED_CONSUMABLE`, и т.д.)
- `required`
- опционально `preferredSkuId`

## Рекомендуемые коды комплектов (MVP)

- `ENGINE_OIL_CHANGE_KIT`
- `FRONT_BRAKE_SERVICE_KIT`
- `REAR_BRAKE_SERVICE_KIT`
- `CHAIN_SERVICE_KIT`
- `TIRE_FRONT_REPLACEMENT_KIT`
- `TIRE_REAR_REPLACEMENT_KIT`

## Как добавляется комплект

Backend endpoint: `POST /api/vehicles/[id]/wishlist/kits`

Вход:

- `kitCode` (обязателен)
- `contextNodeId` (опционально)

Выход:

- `createdItems` — реально созданные строки wishlist
- `skippedItems` — пропущенные элементы (например, дубликаты)
- `warnings` — предупреждения (например, узел недоступен/не leaf)

## Правила подбора SKU

Для каждого item backend пытается подобрать SKU:

1. по `nodeCode`
2. по `partType`
3. по рекомендациям для узла и мотоцикла
4. приоритет рекомендаций: `EXACT_FIT` -> `MODEL_FIT` -> `GENERIC_NODE_MATCH` -> `RELATED_CONSUMABLE` -> `VERIFY_REQUIRED`

Если SKU найден:

- создаётся wishlist item с `skuId`
- `title` берётся из `canonicalName`
- `costAmount` / `currency` берутся из SKU (если есть)

Если SKU не найден:

- создаётся manual wishlist item c `title` из kit item
- `nodeId` остаётся обязательным
- статус: `NEEDED`

## Дубликаты

Для активных позиций (`NEEDED` / `ORDERED` / `BOUGHT`) backend не создаёт дубликаты:

- тот же `vehicleId + nodeId + skuId` (для SKU-строк)
- тот же `vehicleId + nodeId + normalized(title)` (для manual-строк)
- `normalized(title)` = trim + схлопывание повторных пробелов + case-insensitive сравнение

Такие элементы попадают в `skippedItems`.

Причины пропуска возвращаются кодами:

- `DUPLICATE_ACTIVE_ITEM`
- `MISSING_NODE`
- `NON_LEAF_NODE`
- `NO_MATCHED_SKU` (зарезервировано для случаев, где manual fallback невозможен)

## Preview перед добавлением

Перед финальным добавлением kit в wishlist web и Expo показывают preview по каждой позиции:

- название позиции;
- узел;
- сопоставленный SKU (если найден);
- стоимость/валюта (если есть);
- статус: `Будет добавлено` / `Уже есть в списке` / `Не удалось сопоставить узел`.

Если все позиции в preview уже дубликаты или невалидны, действие добавления недоступно.
Если часть позиций доступна, создаются только доступные строки.

## Ограничения этого шага

- Никаких изменений в `ServiceEvent` schema/route.
- Никаких multi-part service events.
- Никакого автосоздания события при добавлении комплекта.
- Expense Summary меняется только после ручного сохранения сервисного события по отдельной позиции.
- Duplicate safety остаётся и на backend (`POST .../wishlist/kits`) — даже если UI preview устарел, endpoint не создаёт duplicate active items.

## UI-маркировка происхождения из комплекта (без schema changes)

В текущем MVP происхождение wishlist-позиции из service kit помечается **только на уровне UI**:

- при добавлении комплекта в `comment` каждой созданной строки пишется префикс `Из комплекта: <название комплекта>`;
- web и Expo показывают это как компактный badge в карточке позиции;
- строка комментария после префикса остаётся читаемой как обычный комментарий позиции.

Важно:

- в `PartWishlistItem` не добавляются `sourceType`/`sourceKitCode`/`sourceKitGroupId`;
- в Prisma нет новых полей и миграций для kit-origin;
- текущая маркировка выводится из существующего `comment` и не влияет на независимость позиций.
