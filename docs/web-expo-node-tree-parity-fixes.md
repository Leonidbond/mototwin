# Паритет дерева узлов и статусов (Web + Expo)

**Дата:** 2026-04-18  
**Цель:** Одинаковый смысл статусов, подписей, кратких пояснений и доступа к детальному объяснению; общие view models и токены; отдельная обработка ошибок дерева на Expo.

## Shared (`packages/domain`, `packages/types`, `packages/design-tokens`)

- **Статусы:** `buildNodeTreeItemViewModel` по-прежнему задаёт `effectiveStatus`, `statusLabel` (RU из `statusTextLabelsRu`), `statusBadgeLabel` (EN из `statusBadgeLabelsEn` — для компактных сценариев).
- **Краткая строка пояснения:** `shortExplanationLabel` берётся из `getNodeTreeItemReasonShortLine` → `node.statusExplanation?.reasonShort` для **любого узла**, если API вернул блок `statusExplanation` (раньше строка показывалась только для листьев через `getLeafStatusReasonShort`).
- **Детальное пояснение:** `canOpenNodeStatusExplanationModal(node)` — `node.statusExplanation != null`. Web и Expo открывают модалку только если есть полный объект объяснения и показывают кликабельную строку только при непустом `shortExplanationLabel` и этой проверке.
- **Лист / не лист:** `canAddServiceEvent` и `actions.addServiceEventAvailable` остаются привязаны к отсутствию дочерних узлов (`!hasChildren`).
- **Цвета бейджей:** web и Expo используют `statusSemanticTokens` из `@mototwin/design-tokens`.

## Web (`src/app/vehicles/[id]/page.tsx`)

- В дереве узлов в бейдже отображается **`statusLabel`** (русский текст), как на Expo, а не `statusBadgeLabel`.
- Кнопка краткого пояснения: условие `shortExplanationLabel && canOpenNodeStatusExplanationModal(node)` (защита от рассинхрона данных).

## Expo (`apps/app/app/vehicles/[id]/index.tsx`)

- Загрузка **разделена:** сначала `getVehicleDetail`, затем `getNodeTree`. Ошибка карточки ТС не скрывает успешный ответ по дереву и наоборот.
- При ошибке дерева: сообщение **«Не удалось загрузить дерево узлов.»**, кнопка **«Повторить»** (повторный полный `load` через `useFocusEffect` уже обновляет экран при фокусе).
- Во время загрузки дерева: строка **«Загрузка дерева узлов...»** под заголовком секции (аналог web).
- Краткое пояснение: `canOpenNodeStatusExplanationModal` вместо прямой проверки `statusExplanation` (семантика как на web).

## Намеренные отличия UX

- Web: сетка корневых карточек, раскрытие `+`/`−` только на кнопке.
- Expo: вертикальный список в одной карточке, раскрытие по нажатию на строку узла с детьми.

## QA (ручная проверка)

1. Сверить **одинаковые** подписи статусов (RU) на корнях и листьях при одном ответе API.
2. У узлов с `reasonShort` и `statusExplanation` — открытие модалки с полным текстом на web и Expo.
3. **+** добавления сервиса только у листьев; у узлов с детьми кнопки нет.
4. Expo: симулировать сбой только `getNodeTree` — карточка ТС видна, под секцией деревьев ошибка и «Повторить».
5. После сохранения пробега / сервиса — повторный заход на экран: статусы совпадают по смыслу на обоих клиентах.

## Проверки в репозитории

- `npx tsc --noEmit`
- при правках UI: `npx eslint` на затронутых файлах.
