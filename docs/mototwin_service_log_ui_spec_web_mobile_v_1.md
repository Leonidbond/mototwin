# MotoTwin — UI/UX спецификация страницы «Журнал обслуживания»

## 1. Проблема текущей реализации

Текущий журнал обслуживания перегружен вертикально:

- даже compact-режим визуально остается «карточечным»;
- каждая запись занимает слишком много высоты;
- в expanded-состоянии событие превращается в длинный блок;
- пользователь видит слишком мало событий на одном экране;
- timeline теряет ощущение быстрого технического журнала;
- визуально журнал выбивается из остальных экранов MotoTwin;
- акценты и hierarchy слабее, чем на главной странице мотоцикла.

Главная проблема:

Журнал сейчас воспринимается как набор отдельных форм, а не как быстрый operational timeline владения мотоциклом.

---

# 2. Новый UX-принцип журнала

Журнал должен стать:

- быстрым;
- плотным;
- сканируемым;
- timeline-first;
- service-centered;
- ориентированным на частое использование.

Основной UX-подход:

## «Максимум информации в collapsed-состоянии, минимум вертикального шума»

Expanded-состояние должно использоваться:

- редко;
- только для deep-view;
- только для bundle / installed parts / комментариев / lifecycle.

Collapsed timeline должен позволять видеть:

- 10–20 событий одновременно;
- быстро сканировать историю;
- быстро находить проблемные работы;
- быстро видеть стоимость и пробег;
- быстро переходить в узлы.

---

# 3. Общая концепция UI

## Desktop

Страница строится как:

- sticky header;
- compact operational timeline;
- справа contextual details panel;
- минимальная вертикальная высота строки;
- сильная визуальная иерархия через:
  - typography;
  - spacing;
  - muted surfaces;
  - status colors.

Визуальный ориентир:

- Bloomberg terminal meets modern automotive dashboard;
- NOT Notion-like cards;
- NOT Trello-style blocks;
- больше похоже на:
  - service history;
  - operational log;
  - aviation maintenance logbook.

---

## Mobile

Mobile не должен копировать desktop.

Главный принцип:

- timeline как primary surface;
- detail как temporary layer.

На mobile:

- collapsed rows ultra-compact;
- expand открывается inline;
- full detail — bottom sheet;
- одна expanded row одновременно.

---

# 4. Визуальный язык

Журнал должен использовать тот же visual hierarchy, что и главная страница мотоцикла.

## Основные принципы

### Фон

- глубокий темный фон;
- soft gradient surfaces;
- слабые границы;
- минимум визуального шума.

### Акцентный цвет

Оранжевый MotoTwin:

Используется только для:

- primary CTA;
- active filters;
- selected row;
- active timeline marker;
- important metrics.

Не использовать оранжевый массово.

---

## Статусы

### OK

- muted green;
- без кислотности;
- используется только как indicator.

### Soon

- amber/yellow;
- менее агрессивный чем overdue.

### Overdue

- muted red;
- используется только для:
  - статуса;
  - timeline marker;
  - problem badge.

### Recently

- cold blue.

---

# 5. Архитектура страницы Desktop

# 5.1 Layout

## Верхний уровень

Desktop layout:

- Header
- Toolbar
- Timeline column
- Sticky details column

Соотношение:

- timeline: 65%
- details: 35%

---

# 5.2 Header

Высота:

72 px

Содержимое:

## Левая часть

- Название страницы
- Vehicle breadcrumb
- Compact counters

Пример:

Журнал обслуживания
BMW F850GS Adventure

128 событий · 38 расходов · 12 overdue

---

## Правая часть

Кнопки (продуктовая схема; **текущий web-журнал** см. `service-log/page.tsx` и [service-log-web-reference-pixel-spec.md](./service-log-web-reference-pixel-spec.md)):

- Добавить ТО (**единственная** primary в шапке страницы журнала на web; отдельная «Добавить событие» не дублируется)
- Добавить расход *(на экране журнала web может отсутствовать — расходы вынесены в отдельные страницы)*
- Фильтры
- Search

Primary CTA:

Добавить ТО

Оранжевая кнопка как на dashboard.

---

# 5.3 Sticky Toolbar

Toolbar остается sticky при scroll.

Высота:

56 px

Содержимое:

## Filters

- Все
- Service
- State updates
- Только расходы
- Overdue
- Узлы

---

## Date grouping

- Месяц
- Год
- Все

---

## Sort

- Новые сверху
- Старые сверху

---

## Search

По:

- SKU
- комментарию
- узлу
- сервису
- бренду детали

---

# 6. Новый timeline row — Desktop

Это ключевая часть redesign.

---

# 6.1 Высота collapsed row

Цель:

72–88 px максимум.

Сейчас визуально слишком близко к 160–240 px.

---

# 6.2 Структура строки

Строка делится на 6 зон.

---

## Zone 1 — Timeline marker

Ширина:

40 px

Содержимое:

- vertical line;
- status dot;
- optional warning pulse.

Цвет marker:

- green
- yellow
- red
- blue
- muted gray

---

## Zone 2 — Date

Ширина:

90 px

Содержимое:

14 Apr
2026

42 180 km

Typography:

- compact;
- mono-style numbers.

---

## Zone 3 — Main content

Главная зона.

Содержимое:

### Первая строка

- Название события
- Primary node
- Service type

Пример:

Замена масла · Двигатель

---

### Вторая строка

Compact metadata:

- Масло Motul 7100
- HF155
- 2 детали
- Self-service
- Wishlist install

Через точки.

Без отдельных badge-блоков.

---

## Zone 4 — Status chips

Compact inline chips.

Максимум 2.

Примеры:

- Soon
- Overdue
- Wishlist
- Installed

Размер:

очень компактный.

---

## Zone 5 — Cost

Выделенная зона.

Ширина:

100–120 px.

Пример:

4 200 ₽

Muted secondary:

Parts + labor

Если нет расходов:

—

---

## Zone 6 — Actions

Минималистичные icon actions.

- Expand
- Edit
- Repeat
- More

Показывать:

- при hover;
- либо у selected row.

---

# 6.3 Selected row state

Selected row:

- soft orange border glow;
- slightly brighter surface;
- active timeline marker.

Не использовать тяжелые карточки.

---

# 6.4 Expanded state

Expanded НЕ должен ломать timeline.

Сейчас expanded превращается в giant card.

Новая логика:

Expanded area:

- inset panel;
- compact sections;
- accordion subsections.

---

## Expanded structure

### 1. Installed parts

Compact table:

| Part | SKU | Qty | Cost |

---

### 2. Notes

Collapsed preview.

Expand по кнопке.

---

### 3. Lifecycle

- created
- edited
- wishlist origin
- linked expense

Очень muted.

---

### 4. Quick actions

- Edit
- Repeat
- Open node
- Open expenses

---

# 7. Sticky details panel — Desktop

Главное отличие нового UX.

Expanded detail не должен push timeline вниз.

Detail panel:

- sticky справа;
- обновляется при выборе строки;
- timeline остается плотным.

---

# 7.1 Содержимое панели

## Header

- Event title
- Date
- Odometer
- Cost

---

## Node summary

- affected nodes
- current node status
- next service

---

## Installed parts

Полная таблица.

---

## Expenses

- parts
- labor
- total

---

## Notes

Полный комментарий.

---

## Related actions

- Open node
- Open wishlist item
- Open expenses
- Repeat service

---

# 8. Grouping logic

Timeline обязательно должен иметь smart grouping.

---

# 8.1 Month grouping

Пример:

APR 2026

12 events · 38 200 ₽

---

# 8.2 Day grouping

Внутри dense mode:

14 APR

3 события

---

# 8.3 Same-session grouping

Если несколько SERVICE событий созданы одновременно:

- визуально объединять;
- один timeline connector;
- общий collapsed session.

Пример:

ТО 24 000 км

внутри:

- масло
- фильтр
- колодки
- цепь

Это сильно уменьшает визуальный шум.

---

# 9. STATE_UPDATE redesign

STATE_UPDATE должен быть почти invisible.

Сейчас они визуально слишком тяжелые.

Новый формат:

- ultra compact;
- muted;
- one-line.

Пример:

Пробег обновлен → 42 180 км

Высота:

48–56 px.

Без expanded detail по умолчанию.

---

# 10. Expense-focused mode

При paidOnly=1:

timeline переключается в expense mode.

Изменения:

- cost column becomes stronger;
- появляются category pills;
- справа summary widget.

---

# 11. Mobile UX

# 11.1 Главный принцип

Mobile — это fast operational feed.

Не переносить desktop card-layout.

---

# 11.2 Mobile header

Высота:

64 px.

Содержимое:

- Back
- Журнал
- Add button
- Filter button

---

# 11.3 Mobile filters

Filters открываются как:

Bottom sheet.

НЕ dropdown.

---

# 11.4 Mobile timeline row

Высота:

64–76 px.

---

## Layout

### Верхняя строка

- Event title
- Cost

### Нижняя строка

- date
- node
- mileage
- chips

---

## Пример

Замена масла          4 200 ₽
14 Apr · Engine · 42 180 km · Soon

---

# 11.5 Expand behavior

Expand inline только:

- краткие детали;
- installed parts preview;
- quick actions.

Полный detail:

Bottom sheet.

---

# 11.6 Bottom sheet detail

Высота:

85–92%.

Sections:

- Event header
- Parts
- Expenses
- Notes
- Lifecycle
- Actions

---

# 11.7 Mobile quick actions

Swipe actions:

Right swipe:

- Repeat
- Edit

Left swipe:

- Delete

---

# 12. Visual hierarchy

Журнал должен визуально соответствовать dashboard.

Главный акцент:

- данные;
- статусы;
- пробег;
- стоимость.

НЕ карточки.

НЕ декоративные блоки.

НЕ большие иконки.

---

# 13. Typography

## Numbers

- semi-mono style;
- tighter spacing.

---

## Event titles

- medium weight;
- максимум 1 строка.

---

## Metadata

- muted gray;
- compact;
- secondary hierarchy.

---

# 14. Иконки

Иконки должны быть:

- thin-line;
- muted;
- consistent с dashboard.

Размер:

16–18 px.

Не использовать большие pictogram-style icons.

---

# 15. Анимации

Минимальные.

Использовать:

- fast fade;
- soft expand;
- smooth sticky transitions.

Избегать:

- spring-heavy animations;
- large accordion jumps.

---

# 16. Empty states

## Empty journal

Показывать:

- illustration;
- краткое объяснение;
- CTA «Добавить первое ТО».

---

# 17. Performance UX

Timeline должен быть готов к:

- 500+ событий;
- dense scrolling;
- virtualization.

Нельзя строить UI как набор тяжелых карточек.

---

# 18. Ключевое UX-изменение

Старый подход:

Card-based service events.

Новый подход:

Operational motorcycle history timeline.

Это главное изменение философии страницы.

---

# 19. Что нужно убрать из текущей реализации

Убрать:

- большие expanded cards;
- высокие vertical paddings;
- heavy borders;
- слишком много badges;
- повторяющиеся metadata blocks;
- большие action rows;
- full comments preview;
- giant installed parts lists внутри timeline.

---

# 20. Что должно стать главным

Главное:

- плотность;
- скорость чтения;
- сканируемость;
- status awareness;
- mileage awareness;
- cost awareness;
- быстрые действия.

Журнал должен ощущаться:

как профессиональный журнал эксплуатации техники,
а не как список длинных карточек заметок.

