# MotoTwin UI Refactor Playbook

## Назначение

Этот документ — прикладная рабочая спецификация для UI-рефакторинга MotoTwin.

Он консолидирует:

- `docs/mototwin_unified_design_concept.md` (актуальный источник правил);
- `docs/mototwin_full_design_concept_for_cursor.md` (полные продуктовые и визуальные детали);
- `docs/mototwin_design_concept_with_existing_tree_and_journal.md` (ограничения интеграции с уже реализованными flow);
- анализ референсов из `images/examples`.

Цель: дать команде единый практический план "что, в каком порядке и по каким критериям" делать в UI-рефакторинге.

---

## 1. Product North Star

MotoTwin должен ощущаться как **Digital Garage / Premium Pit Box**, где пользователь за 3-5 секунд понимает:

1. что за мотоцикл;
2. в каком состоянии ключевые узлы;
3. что нужно сделать сейчас;
4. куда перейти за деталями.

Ключевая формула:

```text
Эмоция владения + техническая аккуратность + быстрые понятные действия
```

---

## 2. Жесткие ограничения (do not break)

1. Не ломать существующие маршруты и бизнес-логику:
   - полного дерева узлов;
   - полного журнала обслуживания;
   - текущих API-контрактов.
2. Не показывать полное дерево узлов на overview страницы мотоцикла.
3. Не показывать полный журнал на overview страницы мотоцикла.
4. Не выходить за MVP scope:
   - без 3D;
   - без тяжелых анимаций;
   - без фотореалистичного "каталога точных моделей";
   - без новых библиотек без обоснованной необходимости.
5. Не строить UX, зависящий только от цвета (статус всегда с текстом).

---

## 3. Целевая информационная архитектура

### Уровень 1 — Гараж

- список мотоциклов;
- агрегированное состояние;
- Garage Score;
- краткий блок "Требует внимания";
- быстрые действия.

### Уровень 2 — Страница мотоцикла (overview)

- профиль и контекст состояния;
- top-node overview (агрегированный);
- "Требует внимания";
- preview последних событий;
- preview расходов;
- preview подбора деталей;
- явные переходы в full-flow.

### Уровень 3 — Детальные экраны

- полное дерево узлов;
- страница узла;
- полный журнал;
- расширенные расходы;
- подбор деталей.

---

## 4. Референсные UI-паттерны (из images/examples)

### Desktop

- стабильный sidebar;
- верхняя зона: заголовок + описание + primary CTA;
- summary KPI отдельной строкой;
- модульная карточная сетка;
- операционный блок задач в нижней части.

### Mobile

- mobile-first вертикальный сценарий;
- CTA в верхней части;
- compact summary;
- фиксированная нижняя навигация;
- карточная композиция для всех основных блоков.

### Главный вывод

Рефакторинг должен сохранить **модульность** и **иерархию приоритетов**:

```text
Состояние -> Следующее действие -> Переход в детализацию
```

---

## 5. Силуэты мотоциклов (MVP)

Принцип: схематичный силуэт класса, не точная модель.

Источник эталонной библиотеки силуэтов: [`images/classes.png`](../images/classes.png).
Готовые к использованию ассеты (прозрачный PNG, цвет штрихов `#e2e7ef`, рассчитан на тёмный фон) лежат в [`images/motorcycle-class-silhouettes/`](../images/motorcycle-class-silhouettes).

Рекомендуемые классы и соответствующие файлы:

| # | Класс | Ассет |
| - | - | - |
| 1 | Adventure / Touring | [`adventure_touring.png`](../images/motorcycle-class-silhouettes/adventure_touring.png) |
| 2 | Enduro / Dual-sport | [`enduro_dual_sport.png`](../images/motorcycle-class-silhouettes/enduro_dual_sport.png) |
| 3 | Naked / Roadster | [`naked_roadster.png`](../images/motorcycle-class-silhouettes/naked_roadster.png) |
| 4 | Sport / Supersport | [`sport_supersport.png`](../images/motorcycle-class-silhouettes/sport_supersport.png) |
| 5 | Cruiser | [`cruiser.png`](../images/motorcycle-class-silhouettes/cruiser.png) |
| 6 | Classic / Retro | [`classic_retro.png`](../images/motorcycle-class-silhouettes/classic_retro.png) |
| 7 | Scooter / Maxi-scooter | [`scooter_maxi_scooter.png`](../images/motorcycle-class-silhouettes/scooter_maxi_scooter.png) |

Стартовый минимум первого этапа:

1. Adventure
2. Enduro
3. Naked
4. Sport Touring
5. Cruiser

Правило: силуэт поддерживает распознавание класса, но не должен доминировать над данными/статусами.

Технические заметки по ассетам:

- Формат: PNG, RGBA, прозрачный фон; рассчитаны на тёмный фон карточки (`#0d1118`..`#121820`). На светлой теме компонент `VehicleSilhouette` должен инвертировать/перекрашивать штрихи.
- Единый стиль: тонкая линия, цвет `#e2e7ef`, без теней и заливок; силуэт обрезан с 40 px паддингом.
- Перегенерация: `node scripts/extract-motorcycle-class-silhouettes.js` (берёт `images/classes.png` как источник).

---

## 6. Единая статусная модель

Статусы:

- OK
- Soon
- Overdue
- Recently

Русские подписи:

- В норме
- Скоро
- Просрочено
- Недавно обслужено

Цветовая семантика:

- OK — зеленый;
- Soon — желтый;
- Overdue — красный;
- Recently — голубой.

Правило доступности: цвет всегда дублируется текстом статуса.

---

## 7. Иконки top-nodes (line-art)

Требования:

- единый technical line-art стиль;
- `stroke: currentColor`;
- `viewBox: 0 0 24 24`;
- `strokeWidth: 1.75-2`;
- rounded caps/joins;
- читаемость на 20/24/28/32 px.

MVP-группы и готовые ассеты ([`images/top-node-icons/`](../images/top-node-icons)):

| # | Top-node | Метка в UI | TOP-узлы | SVG |
| - | - | - | - | - |
| 1 | lubrication | Смазка | `ENGINE.LUBE.OIL`, `ENGINE.LUBE.FILTER` | [`lubrication.svg`](../images/top-node-icons/lubrication.svg) |
| 2 | engine | Двигатель / охлаждение | `INTAKE.FILTER`, `ELECTRICS.IGNITION.SPARK`, `COOLING.LIQUID.COOLANT` | [`engine.svg`](../images/top-node-icons/engine.svg) |
| 3 | brakes | Тормоза | `BRAKES.FRONT.PADS`, `BRAKES.REAR.PADS`, `BRAKES.FLUID` | [`brakes.svg`](../images/top-node-icons/brakes.svg) |
| 4 | tires | Шины | `TIRES.FRONT`, `TIRES.REAR` | [`tires.svg`](../images/top-node-icons/tires.svg) |
| 5 | chain | Цепь / звёзды | `DRIVETRAIN.CHAIN`, `DRIVETRAIN.FRONT_SPROCKET`, `DRIVETRAIN.REAR_SPROCKET` | [`chain.svg`](../images/top-node-icons/chain.svg) |
| 6 | suspension | Подвеска | `SUSPENSION.FRONT.SEALS`, `SUSPENSION.FRONT.OIL` | [`suspension.svg`](../images/top-node-icons/suspension.svg) |

Превью в целевых размерах 24 / 32 / 48 / 96 px на тёмном фоне: [`preview/grid.png`](../images/top-node-icons/preview/grid.png).

Правило: базовая иконка нейтральная, статус — отдельный индикатор/бейдж.

Интеграция:

- Импортировать SVG как React-компоненты (SVGR / `?react`) и применять к ним цвет через `color` родителя — все ассеты рассчитаны на `stroke="currentColor"`.
- В карточке `TopNodeStatusCard` иконка принимает нейтральный `color` (`--color-text-muted`); статус живёт в отдельном `StatusBadge` и не влияет на заливку иконки.
- Перегенерация: `node scripts/generate-top-node-icons.js` (обновит `.svg` и `preview/`).

---

## 8. Навигация и parity

Desktop:

- sidebar navigation.

Mobile:

- bottom navigation.

Минимальные разделы:

- Гараж
- Узлы
- Журнал
- Расходы
- Профиль

Parity-правило: логика и порядок смысла на web/mobile одинаковые, отличается только плотность и композиция.

---

## 9. Обязательная структура ключевых экранов

## 9.1 Гараж

Экран должен содержать:

1. Header (title + subtitle + CTA `Добавить мотоцикл`);
2. summary;
3. список карточек мотоциклов;
4. empty state;
5. быстрые переходы.

Карточка мотоцикла:

1. название/год/пробег/ride profile;
2. компактный силуэт класса;
3. Garage Score;
4. статусные счетчики;
5. блок "Требует внимания" или "Все в порядке";
6. действия: `Открыть`, `ТО`, `Расход`.

## 9.2 Страница мотоцикла (overview)

Порядок блоков:

1. Header;
2. Hero;
3. Quick actions;
4. `Состояние основных узлов` (только агрегированный top-level);
5. `Требует внимания`;
6. `Последние события` (3-5);
7. `Расходы` (preview);
8. `Подбор деталей` (preview);
9. переходы в full-flow.

## 9.3 Полные экраны

Остаются существующими по бизнес-логике:

- полное дерево;
- полный журнал;
- полные расходы;
- detail узла;
- подбор деталей.

Рефакторинг касается визуальной интеграции и UX-связки с overview.

---

## 10. Прикладной backlog рефакторинга

## P0 — Foundation (обязательно перед экранными задачами)

1. Зафиксировать дизайн-токены dark/light:
   - surface/background/border/text/accent/status.
2. Унифицировать примитивы:
   - `StatusBadge`;
   - `Card`;
   - `SectionHeader`;
   - `PrimaryButton` / `SecondaryButton`.
3. Подготовить/унифицировать иконки top-nodes.
4. Сверить типографику и ритм отступов.

Definition of done (P0):

- единые токены используются в новых блоках;
- статусы выглядят одинаково на всех экранах;
- иконки в одном стиле.

## P1 — Гараж и карточки мотоциклов

1. Рефактор header/summary/call-to-action.
2. Рефактор карточки мотоцикла:
   - структура;
   - визуальная иерархия;
   - действия;
   - состояния attention/healthy.
3. Реализовать/улучшить empty state.
4. Проверить mobile parity + bottom nav.

Definition of done (P1):

- гараж читается как digital garage;
- карточка action-first;
- empty state полнофункционален и не декоративный.

## P2 — Страница мотоцикла overview

1. Упорядочить секции в целевой последовательности.
2. Вынести top-node overview в отдельный агрегированный блок (6 карточек: Смазка, Двигатель/охлаждение, Тормоза, Шины, Цепь/звезды, Подвеска).
3. Привести блок "Требует внимания" к единому компактному формату.
4. Унифицировать preview-блоки:
   - последние события;
   - расходы;
   - детали.
5. Зафиксировать явные переходы:
   - `Все узлы →`;
   - `Весь журнал →`;
   - `Все расходы →`.

Definition of done (P2):

- на overview нет глубокой иерархии;
- preview не дублирует full-screen;
- все ключевые переходы явно видимы.

## P3 — Детальные экраны (визуальная консолидация без переписывания логики)

1. Привести tree/journal/expenses/detail к единой карточной системе.
2. Выравнять заголовки, фильтры, action-области.
3. Проверить консистентность статусов/иконок/тем.

Definition of done (P3):

- общий визуальный язык одинаковый;
- существующая логика не сломана.

---

## 11. Компонентная карта (рекомендуемая)

Минимальный целевой набор:

- `GaragePage`
- `GarageHeader`
- `GarageSummary`
- `VehicleCard`
- `VehicleSilhouette`
- `GarageScore`
- `StatusBadge`
- `TopNodesOverview`
- `TopNodeStatusCard`
- `VehicleAttentionList`
- `RecentServiceEventsPreview`
- `ExpensesPreview`
- `PartsPreview`
- `SectionHeader`
- `BottomNavigation`
- `SidebarNavigation`

Правило: если аналог уже существует, расширять его, не плодить дубли.

---

## 12. Чеклист QA по экранам

## Гараж

- Есть header, summary, CTA.
- Карточка содержит все обязательные поля.
- Есть healthy/attention состояния.
- Empty state корректный и информативный.
- Действия работают и не перегружены.

## Страница мотоцикла

- Есть агрегированный top-node блок (без child-tree).
- Есть приоритетный блок "Требует внимания".
- Есть preview событий (3-5).
- Есть preview расходов и деталей.
- Есть явные переходы в full-flow.

## Темы и доступность

- Dark и light обе читаемы.
- Контраст достаточен на основных карточках.
- Статус всегда имеет текст.
- Фокус/hover/active состояния различимы.

## Mobile parity

- Порядок смысловых блоков сохранен.
- Bottom nav работает и подсвечивает активный раздел.
- Кнопки и touch targets удобны.

---

## 13. Нефункциональные критерии

1. Рефакторинг не ухудшает производительность рендера.
2. Не добавляет лишние зависимости.
3. Не ухудшает читаемость кода.
4. Сохраняет текущие API-контракты.
5. Не изменяет data model без отдельного решения.

---

## 14. Риски и контрольные точки

Основные риски:

- смешение overview и full-flow;
- визуальная перегрузка карточек;
- расхождение web/mobile;
- частичная деградация light theme;
- локальные улучшения без единого паттерна.

Контрольные точки:

1. После P0 — ревью токенов и примитивов.
2. После P1 — UX-ревью гаража на mobile/desktop.
3. После P2 — продуктовая проверка "3-5 секунд на понимание состояния".
4. После P3 — финальная проверка консистентности всей системы.

---

## 15. Definition of Ready для UI-задач

Перед началом любой задачи должны быть определены:

1. экран и конкретный блок;
2. целевой сценарий (healthy/attention/empty);
3. требуемый переход в full-flow;
4. набор данных для отображения;
5. критерий готовности.

---

## 16. Итоговый критерий успеха рефакторинга

Рефакторинг успешен, если:

1. MotoTwin визуально и UX-поведенчески ощущается как digital garage;
2. overview каждого мотоцикла компактный и action-first;
3. детальные сценарии доступны через существующие full-flow без переписывания логики;
4. web/mobile и dark/light ведут себя консистентно;
5. команда может расширять UI по модульной схеме без потери целостности.

