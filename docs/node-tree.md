# MotoTwin Node Tree

Документ фиксирует единый источник дерева узлов для UI и backend:

- полное техническое дерево `Node` в БД (иерархия сохранена)
- API-контракт UI: `GET /api/vehicles/[id]/node-tree` (без MVP-среза)

## Hierarchy Rules (DB)

- each node has `code`, `name`, `parentId`, `level`, `displayOrder`
- service flags: `isServiceRelevant`, `isMvpVisible`, `isAdvanced`, `serviceGroup`
- hierarchy is stored by `parentId` (self-relation), not only by code prefix
- order below follows `displayOrder`, then `code`

## Full Technical Tree (DB)

- Двигатель (`ENGINE`)
  - Верх двигателя (`ENGINE.TOPEND`)
    - Цилиндр (`ENGINE.TOPEND.CYLINDER`)
    - Поршень (`ENGINE.TOPEND.PISTON`)
    - Кольца (`ENGINE.TOPEND.RINGS`)
    - ГБЦ (`ENGINE.TOPEND.HEAD`)
    - Клапаны/сальники/пружины (`ENGINE.TOPEND.VALVES`)
    - Распредвал/рокеры (`ENGINE.TOPEND.CAM`)
  - ГРМ (`ENGINE.TIMING`)
    - Цепь ГРМ (`ENGINE.TIMING.CHAIN`)
    - Натяжитель/успокоители (`ENGINE.TIMING.TENSIONER`)
  - Низ двигателя (`ENGINE.BOTTOMEND`)
    - Коленвал/шатун (`ENGINE.BOTTOMEND.CRANK`)
    - Подшипники/сальники (`ENGINE.BOTTOMEND.BEARINGS`)
  - Смазка (`ENGINE.LUBE`)
    - Маслонасос (`ENGINE.LUBE.PUMP`)
    - Масло двигателя (`ENGINE.LUBE.OIL`)
    - Маслофильтр/сетка (`ENGINE.LUBE.FILTER`)
    - Прокладки/сальники (двигатель) (`ENGINE.LUBE.GASKETS`)
  - Сцепление (`ENGINE.CLUTCH`)
    - Диски сцепления (`ENGINE.CLUTCH.PLATES`)
    - Корзина/ступица (`ENGINE.CLUTCH.BASKET`)
    - Привод сцепления (трос/гидро) (`ENGINE.CLUTCH.ACTUATION`)
  - КПП (`ENGINE.GEARBOX`)
    - Шестерни/валы (`ENGINE.GEARBOX.GEARS`)
    - Барабан/вилки/механизм переключения (`ENGINE.GEARBOX.SHIFT`)
  - Запуск двигателя (`ENGINE.START`)
    - Стартер/реле/бендикс (если есть) (`ENGINE.START.STARTER`)
    - Кикстартер (если есть) (`ENGINE.START.KICK`)
  - Крепления двигателя/опоры (`ENGINE.MOUNTS`)
- Топливная система (`FUEL`)
  - Бак/крышка/клапаны (`FUEL.TANK`)
  - Топливные шланги/фильтр/кран (`FUEL.LINES`)
  - Насос (если EFI) (`FUEL.PUMP`)
  - Карбюратор (`FUEL.CARB`)
    - Ремкомплект/жиклёры/игла/поплавок (`FUEL.CARB.REPAIR`)
  - Инжектор (если EFI) (`FUEL.EFI`)
    - Форсунка (`FUEL.EFI.INJECTOR`)
    - Дроссель (`FUEL.EFI.THROTTLE`)
    - Датчики (TPS/MAP/…) (`FUEL.EFI.SENSORS`)
- Впуск воздуха (`INTAKE`)
  - Airbox/патрубки (`INTAKE.AIRBOX`)
  - Воздушный фильтр (`INTAKE.FILTER`)
- Охлаждение (`COOLING`)
  - Воздушное (если есть элементы) (`COOLING.AIR`)
  - Жидкостное (`COOLING.LIQUID`)
    - Радиаторы/крышка (`COOLING.LIQUID.RADIATOR`)
    - Помпа/крыльчатка/сальники (`COOLING.LIQUID.PUMP`)
    - Патрубки/хомуты (`COOLING.LIQUID.HOSES`)
    - Термостат (если есть) (`COOLING.LIQUID.THERMOSTAT`)
    - Расширительный бачок (`COOLING.LIQUID.EXPANSION`)
- Выпуск (`EXHAUST`)
  - Коллектор/прокладки (`EXHAUST.HEADER`)
  - Глушитель/банка (`EXHAUST.MUFFLER`)
  - Крепёж/теплоэкраны (`EXHAUST.MOUNTS`)
  - Лямбда/датчики (если есть) (`EXHAUST.SENSOR`)
  - DB-killer/вставки (если есть) (`EXHAUST.DBKILLER`)
- Электрика (`ELECTRICS`)
  - АКБ/клеммы (`ELECTRICS.BATTERY`)
  - Предохранители/реле (`ELECTRICS.FUSES`)
  - Зарядка (`ELECTRICS.CHARGING`)
    - Статор/ротор (`ELECTRICS.CHARGING.STATOR`)
    - Регулятор напряжения (`ELECTRICS.CHARGING.REGULATOR`)
  - Зажигание (`ELECTRICS.IGNITION`)
    - CDI/ECU (`ELECTRICS.IGNITION.CDI_ECU`)
    - Катушка (`ELECTRICS.IGNITION.COIL`)
    - Свеча/колпачок (`ELECTRICS.IGNITION.SPARK`)
  - Проводка/жгуты/разъёмы (`ELECTRICS.WIRING`)
  - Свет (`ELECTRICS.LIGHTS`)
    - Фара (`ELECTRICS.LIGHTS.HEAD`)
    - Задний фонарь (`ELECTRICS.LIGHTS.TAIL`)
    - Поворотники (если есть) (`ELECTRICS.LIGHTS.TURN`)
  - Сигнал (`ELECTRICS.HORN`)
  - Приборка/датчики (`ELECTRICS.DASH`)
    - Датчик скорости (`ELECTRICS.DASH.SPEED`)
    - Датчик нейтрали (`ELECTRICS.DASH.NEUTRAL`)
- Рама и кузов (`CHASSIS`)
  - Рама (`CHASSIS.FRAME`)
  - Подрамник (`CHASSIS.SUBFRAME`)
  - Крепёж/оси/втулки (общие) (`CHASSIS.MOUNTS`)
  - Сиденье/чехол (`CHASSIS.SEAT`)
  - Пластик (`CHASSIS.PLASTICS`)
    - Крылья (`CHASSIS.PLASTICS.FENDERS`)
    - Боковины/панели (`CHASSIS.PLASTICS.SIDE`)
    - Защита вилки (`CHASSIS.PLASTICS.FORK_GUARDS`)
    - Защита рук (если есть) (`CHASSIS.PLASTICS.HANDGUARDS`)
  - Защита (`CHASSIS.PROTECTION`)
    - Защита картера (`CHASSIS.PROTECTION.SKID`)
    - Защита радиаторов (если есть) (`CHASSIS.PROTECTION.RADIATOR`)
    - Защита рамы/маятника (`CHASSIS.PROTECTION.FRAME`)
- Рулевое (`STEERING`)
  - Руль/крепления/проставки (`STEERING.HANDLEBAR`)
  - Грипсы (`STEERING.GRIPS`)
  - Пульты/кнопки (`STEERING.CONTROLS`)
  - Демпфер руля (если есть) (`STEERING.DAMPER`)
  - Рулевая колонка (`STEERING.HEADSET`)
    - Подшипники рулевой (`STEERING.HEADSET.BEARINGS`)
  - Траверсы (`STEERING.TRIPLES`)
- Подвеска (`SUSPENSION`)
  - Передняя (`SUSPENSION.FRONT`)
    - Вилка (`SUSPENSION.FRONT.FORK`)
    - Сальники/пыльники (`SUSPENSION.FRONT.SEALS`)
    - Втулки скольжения (`SUSPENSION.FRONT.BUSHINGS`)
    - Масло/обслуживание (`SUSPENSION.FRONT.OIL`)
    - Пружины (если отдельно) (`SUSPENSION.FRONT.SPRINGS`)
  - Задняя (`SUSPENSION.REAR`)
    - Амортизатор (`SUSPENSION.REAR.SHOCK`)
    - Линк/прогрессия (`SUSPENSION.REAR.LINKAGE`)
    - Маятник (`SUSPENSION.REAR.SWINGARM`)
    - Подшипники/сальники/втулки маятника/линка (`SUSPENSION.REAR.BEARINGS`)
- Колёса/шины (`WHEELS`)
  - Переднее колесо (`WHEELS.FRONT`)
    - Обод (`WHEELS.FRONT.RIM`)
    - Спицы/ниппели (`WHEELS.FRONT.SPOKES`)
    - Ступица (`WHEELS.FRONT.HUB`)
    - Подшипники/ось/проставки (`WHEELS.FRONT.BEARINGS`)
  - Заднее колесо (`WHEELS.REAR`)
    - Обод (`WHEELS.REAR.RIM`)
    - Спицы/ниппели (`WHEELS.REAR.SPOKES`)
    - Ступица (`WHEELS.REAR.HUB`)
    - Подшипники/ось/проставки (`WHEELS.REAR.BEARINGS`)
- Резина/камеры (`TIRES`)
  - Передняя шина/камера (`TIRES.FRONT`)
  - Задняя шина/камера (`TIRES.REAR`)
  - Буксаторы/ободная лента (`TIRES.RIMLOCK`)
- Тормоза (`BRAKES`)
  - Передний тормоз (`BRAKES.FRONT`)
    - Главный цилиндр/рычаг (`BRAKES.FRONT.MASTER`)
    - Суппорт (перед) (`BRAKES.FRONT.CALIPER`)
    - Колодки (перед) (`BRAKES.FRONT.PADS`)
    - Диск (перед) (`BRAKES.FRONT.DISC`)
    - Шланг/фитинги (перед) (`BRAKES.FRONT.LINE`)
  - Задний тормоз (`BRAKES.REAR`)
    - Главный цилиндр/педаль (`BRAKES.REAR.MASTER`)
    - Суппорт (зад) (`BRAKES.REAR.CALIPER`)
    - Колодки (зад) (`BRAKES.REAR.PADS`)
    - Диск (зад) (`BRAKES.REAR.DISC`)
    - Шланг/фитинги (зад) (`BRAKES.REAR.LINE`)
  - Тормозная жидкость/прокачка (`BRAKES.FLUID`)
- Привод (`DRIVETRAIN`)
  - Цепь (`DRIVETRAIN.CHAIN`)
  - Ведущая звезда (`DRIVETRAIN.FRONT_SPROCKET`)
  - Ведомая звезда (`DRIVETRAIN.REAR_SPROCKET`)
  - Ролики/направляющая (`DRIVETRAIN.CHAIN_GUIDE`)
  - Слайдер/ползун цепи (`DRIVETRAIN.SWINGARM_SLIDER`)
  - Натяжители/регулировка (`DRIVETRAIN.TENSIONERS`)
  - Защита цепи (если есть) (`DRIVETRAIN.GUARD`)
- Органы управления (`CONTROLS`)
  - Ручка газа/трос (`CONTROLS.THROTTLE`)
  - Рычаг/трос/гидро (как орган управления) (`CONTROLS.CLUTCH`)
  - Рычаг переднего тормоза (`CONTROLS.FRONT_BRAKE`)
  - Педаль заднего тормоза (`CONTROLS.REAR_BRAKE`)
  - Лапка КПП (`CONTROLS.SHIFTER`)
  - Подножки (`CONTROLS.FOOTPEG`)
  - Тросы/рубашки (общие) (`CONTROLS.CABLES`)

## Notes

- Legacy дублеры `engine_oil` и `chain_drive` сохраняются в БД только как исторические записи и помечаются:
  - `isActive = false`
  - `isServiceRelevant = false`
  - `isMvpVisible = false`
  - `isAdvanced = false`
  - `serviceGroup = null`
- Это live snapshot, а не только seed-контракт.
- При изменении taxonomy/seed этот документ нужно обновлять.

## Full Service Tree (UI contract)

Источник для UI: `GET /api/vehicles/[id]/node-tree`

Фильтр:

- `isActive = true`

Дерево включает полный каталог узлов (service и advanced), со status агрегацией по иерархии:

- `ENGINE_SERVICE` — Двигатель и масло
  - `ENGINE.LUBE.OIL`
  - `ENGINE.LUBE.FILTER`
  - `ELECTRICS.IGNITION.SPARK`
- `INTAKE_FUEL` — Впуск и топливо
  - `INTAKE.FILTER`
  - `FUEL.LINES`
  - `FUEL.PUMP`
  - `FUEL.CARB`
  - `FUEL.EFI`
- `COOLING` — Охлаждение
  - `COOLING.LIQUID.COOLANT`
  - `COOLING.LIQUID.RADIATOR`
  - `COOLING.LIQUID.PUMP`
  - `COOLING.LIQUID.HOSES`
  - `COOLING.LIQUID.THERMOSTAT`
- `BRAKES` — Тормоза
  - `BRAKES.ABS`
  - `BRAKES.FRONT.CALIPER`
  - `BRAKES.FRONT.PADS`
  - `BRAKES.FRONT.DISC`
  - `BRAKES.REAR.CALIPER`
  - `BRAKES.REAR.PADS`
  - `BRAKES.REAR.DISC`
  - `BRAKES.FLUID`
- `CHAIN_DRIVE` — Цепь и звезды
  - `DRIVETRAIN.CHAIN`
  - `DRIVETRAIN.FRONT_SPROCKET`
  - `DRIVETRAIN.REAR_SPROCKET`
  - `DRIVETRAIN.CHAIN_GUIDE`
  - `DRIVETRAIN.SWINGARM_SLIDER`
  - `DRIVETRAIN.TENSIONERS`
- `TIRES` — Шины
  - `TIRES.FRONT`
  - `TIRES.REAR`
  - `TIRES.RIMLOCK`
- `WHEELS` — Колеса
  - `WHEELS.FRONT.SPOKES`
  - `WHEELS.FRONT.BEARINGS`
  - `WHEELS.REAR.SPOKES`
  - `WHEELS.REAR.BEARINGS`
- `FRONT_SUSPENSION` — Передняя подвеска
  - `SUSPENSION.FRONT.FORK`
  - `SUSPENSION.FRONT.SEALS`
  - `SUSPENSION.FRONT.BUSHINGS`
  - `SUSPENSION.FRONT.OIL`
- `REAR_SUSPENSION` — Задняя подвеска
  - `SUSPENSION.REAR.SHOCK`
  - `SUSPENSION.REAR.LINKAGE`
  - `SUSPENSION.REAR.SWINGARM`
  - `SUSPENSION.REAR.BEARINGS`
- `ELECTRICS` — Электрика
  - `ELECTRICS.BATTERY`
  - `ELECTRICS.FUSES`
  - `ELECTRICS.CHARGING`
  - `ELECTRICS.IGNITION`
  - `ELECTRICS.WIRING`
  - `ELECTRICS.LIGHTS`
- `CONTROLS` — Органы управления
  - `CONTROLS.THROTTLE`
  - `CONTROLS.CLUTCH`
  - `CONTROLS.FRONT_BRAKE`
  - `CONTROLS.REAR_BRAKE`
  - `CONTROLS.SHIFTER`
  - `CONTROLS.FOOTPEG`
  - `CONTROLS.CABLES`
- `STEERING` — Рулевое
  - `STEERING.HANDLEBAR`
  - `STEERING.GRIPS`
  - `STEERING.HEADSET`
  - `STEERING.HEADSET.BEARINGS`
  - `STEERING.TRIPLES`
- `EXHAUST` — Выпуск
  - `EXHAUST.HEADER`
  - `EXHAUST.MUFFLER`
  - `EXHAUST.MOUNTS`
  - `EXHAUST.SENSOR`
- `BODY_PROTECTION` — Кузов и защита
  - `CHASSIS.SEAT`
  - `CHASSIS.PLASTICS`
  - `CHASSIS.PROTECTION`
  - `CHASSIS.PROTECTION.SKID`
  - `CHASSIS.PROTECTION.RADIATOR`

## Full Tree UI Behavior

Полное дерево — отдельный flow на web (`/vehicles/[id]/nodes`) и Expo (`vehicles/[id]` в режиме узлов). Overview мотоцикла показывает только top-node агрегаты и явный переход `Все узлы`.

Текущий контракт UI:

- статус показывается текстовым бейджем для групп и leaf-узлов; цвет не является единственным носителем смысла;
- поиск по дереву работает по name/code от 2 символов и открывает нужный subtree с раскрытыми родителями;
- фильтр по статусу поддерживает `Все`, `Просрочено`, `Скоро`, `Недавно заменено`, `ОК`;
- фильтр по статусу сохраняет родительскую цепочку найденных узлов, чтобы пользователь видел контекст в иерархии;
- при активном статус-фильтре ветки с совпадениями раскрываются автоматически;
- поиск применяется поверх выбранного статус-фильтра;
- пустой результат статус-фильтра отображается как empty state, без изменения backend-контракта;
- action icons в строках дерева: `Контекст`, `Журнал`, `Купить`, `Добавить сервисное событие`.

Навигация/закрытие:

- закрытие modal/subtree/status/context возвращает к предыдущему overlay-состоянию, если оно было открыто из него;
- переходы на отдельные страницы используют history back (`router.back()` / `router.canGoBack()`) с fallback на логический экран.

Advanced (сохранены в техдереве, но скрыты из MVP):

- `ENGINE.TOPEND.CYLINDER`
- `ENGINE.TOPEND.PISTON`
- `ENGINE.TOPEND.RINGS`
- `ENGINE.TOPEND.HEAD`
- `ENGINE.TOPEND.VALVES`
- `ENGINE.TOPEND.CAM`
- `ENGINE.BOTTOMEND.CRANK`
- `ENGINE.BOTTOMEND.BEARINGS`
- `ENGINE.GEARBOX.GEARS`
- `ENGINE.GEARBOX.SHIFT`
- `ELECTRICS.CHARGING.STATOR`
- `ELECTRICS.IGNITION.CDI_ECU`
- `ELECTRICS.DASH.SPEED`
- `ELECTRICS.DASH.NEUTRAL`
- `CHASSIS.FRAME`
- `CHASSIS.SUBFRAME`
- `ELECTRICS.SENSORS`

## TOP-12 -> Overview-6 mapping

На overview-странице мотоцикла используется компактный слой из 6 агрегированных карточек.
Источник данных для него — строго `TOP-12` узлы (`isTopNode=true`, endpoint `/api/nodes/top`).

- `engine` / Двигатель:
  - `ENGINE.LUBE.OIL`
  - `ENGINE.LUBE.FILTER`
  - `INTAKE.FILTER`
  - `ELECTRICS.IGNITION.SPARK`
- `brakes` / Тормоза:
  - `BRAKES.FRONT.PADS`
  - `BRAKES.REAR.PADS`
  - `BRAKES.FLUID`
- `tires` / Шины:
  - `TIRES.FRONT`
  - `TIRES.REAR`
- `chain` / Цепь / звезды:
  - `DRIVETRAIN.CHAIN`
  - `DRIVETRAIN.FRONT_SPROCKET`
  - `DRIVETRAIN.REAR_SPROCKET`
- `electrics` / Электрика:
  - резервная карточка overview; в текущем TOP-12 отдельных кодов нет
- `suspension` / Подвеска:
  - резервная карточка overview; в текущем TOP-12 отдельных кодов нет
