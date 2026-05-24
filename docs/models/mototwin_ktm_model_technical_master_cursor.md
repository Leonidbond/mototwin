# MotoTwin KTM Model Technical Master for Cursor

Дата подготовки: 2026-05-24  
Назначение: KTM seed-файл с моделями, конфигурациями и техническими параметрами в единой структуре MotoTwin.

---

## 1. Важное исправление структуры

Этот файл заменяет упрощенный KTM-файл, где структура была только:

```text
Brand → ModelFamily → Variant → Generation
```

Правильная структура для KTM такая же, как для BMW и всех следующих брендов:

```text
Brand → ModelFamily → Variant → Generation → TechnicalSpecs
```

То есть KTM и BMW должны импортироваться одним и тем же importer-ом, в одну и ту же Prisma-схему.

---

## 2. Правила использования

- Одна строка = одна конфигурация модели в одном годовом диапазоне.
- `year_to = null`, если модель выпускается сейчас.
- `н/д` не хранится в базе. В seed используется пустое значение, которое importer должен преобразовать в `null`.
- Для приблизительных значений используется `*_is_approx = true`.
- Каталог запчастей должен ссылаться на `MotorcycleGeneration`, а не создавать собственные модели.
- Источник данных для этого файла: текущий ручной seed из обсуждения. Поля со статусом `manual_seed_needs_official_verification` нужно позже сверить с официальными мануалами / техническими страницами производителя.

---

## 3. KTM technical master table

| brand | model_family         | variant                        | generation                                    | year_from | year_to | years_label    | market_region | segment                       | engine                    | displacement_cc | displacement_is_approx | power_value | power_unit | power_hp_normalized | power_is_approx | torque_nm | torque_is_approx | gearbox | drive | front_wheel_in | rear_wheel_in | front_tire | rear_tire | fuel_l | fuel_is_approx | weight_kg | weight_type  | seat_mm | support_level     | data_status                             | mototwin_comment                                                                                                              | source_url |
| ----- | -------------------- | ------------------------------ | --------------------------------------------- | --------- | ------- | -------------- | ------------- | ----------------------------- | ------------------------- | --------------- | ---------------------- | ----------- | ---------- | ------------------- | --------------- | --------- | ---------------- | ------- | ----- | -------------- | ------------- | ---------- | --------- | ------ | -------------- | --------- | ------------ | ------- | ----------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------- |
| KTM   | 390 Adventure        | 390 Adventure R                | 390 Adventure R / 2025-current                | 2025      | null    | 2025/2026-н.в. | GLOBAL        | Light adventure / off-road    | 1-cylinder, 4-stroke      | 398.7           | false                  | 45          | PS         | 44.4                | false           | 39        | false            | 6-speed | CHAIN | 21             | 18            | null       | null      | null   | false          | null      | null         | null    | MVP_CORE          | manual_seed_needs_official_verification | Отличная модель для A2/лайт-эндуро, важно для молодой аудитории.                                                              | null       |
| KTM   | 390 Adventure        | 390 Adventure X                | 390 Adventure X / 2025-current                | 2025      | null    | 2025/2026-н.в. | GLOBAL        | Light adventure / road-biased | 1-cylinder, 4-stroke      | 398.7           | false                  | 45          | PS         | 44.4                | false           | 39        | false            | 6-speed | CHAIN | 19             | 17            | null       | null      | null   | false          | null      | null         | null    | MVP_CORE          | manual_seed_needs_official_verification | Отдельно от R: другая геометрия и колеса.                                                                                     | null       |
| KTM   | 390 Duke             | 390 Duke                       | 390 Duke / 2024-current                       | 2024      | null    | 2024-н.в.      | GLOBAL        | Naked / city                  | 1-cylinder, 4-stroke      | 398.7           | false                  | 45          | PS         | 44.4                | false           | 39        | false            | 6-speed | CHAIN | 17             | 17            | null       | null      | null   | false          | null      | null         | null    | COMMUNITY_SUPPORT | manual_seed_needs_official_verification | Хорошая модель для расширения в городские мотоциклы.                                                                          | null       |
| KTM   | 690 Enduro R         | 690 Enduro R                   | 690 Enduro R / 2019-current                   | 2019      | null    | 2019-н.в.      | GLOBAL        | Dual sport / enduro           | 1-cylinder, 4-stroke      | 693             | true                   | 74          | hp         | 74                  | true            | 73.5      | true             | 6-speed | CHAIN | 21             | 18            | null       | null      | 13.3   | false          | 162       | fully_fueled | 935     | MVP_CORE          | manual_seed_needs_official_verification | Критична для эндуро-сегмента: колеса 21/18, расходники, защита, подвеска. В исходных данных также указано 152 kg без топлива. | null       |
| KTM   | 790 Adventure        | 790 Adventure                  | 790 Adventure / 2023-current                  | 2023      | null    | 2023-н.в.      | GLOBAL        | Mid adventure                 | 2-cylinder, parallel twin | 799             | false                  | 95          | PS         | 93.7                | true            | 88        | true             | 6-speed | CHAIN | 21             | 18            | null       | null      | 20     | true           | null      | null         | 840/860 | MVP_CORE          | manual_seed_needs_official_verification | Более доступная средняя adventure-платформа.                                                                                  | null       |
| KTM   | 890 Adventure        | 890 Adventure R                | 890 Adventure R / 2021-current                | 2021      | null    | 2021-н.в.      | GLOBAL        | Mid adventure / off-road      | 2-cylinder, parallel twin | 889             | false                  | 105         | PS         | 103.6               | false           | 100       | false            | 6-speed | CHAIN | 21             | 18            | null       | null      | 20     | true           | null      | null         | 880     | MVP_CORE          | manual_seed_needs_official_verification | Одна из ключевых KTM-моделей для MotoTwin.                                                                                    | null       |
| KTM   | 1290 Super Adventure | 1290 Super Adventure S         | 1290 Super Adventure S / 2021-2024            | 2021      | 2024    | 2021-2024      | GLOBAL        | Big adventure / touring       | V-twin 75°                | 1301            | false                  | 160         | hp         | 160                 | true            | 138       | false            | 6-speed | CHAIN | 19             | 17            | null       | null      | 23     | false          | 228       | without_fuel | 849/869 | MVP_CORE_LEGACY   | manual_seed_needs_official_verification | Дорожно-туристическая конфигурация, отличать от R.                                                                            | null       |
| KTM   | 1290 Super Adventure | 1290 Super Adventure R         | 1290 Super Adventure R / 2021-2024            | 2021      | 2024    | 2021-2024      | GLOBAL        | Big adventure / off-road      | V-twin 75°                | 1301            | false                  | 160         | hp         | 160                 | true            | 138       | false            | 6-speed | CHAIN | 21             | 18            | null       | null      | 23     | false          | 228       | without_fuel | 880     | MVP_CORE_LEGACY   | manual_seed_needs_official_verification | Крупная внедорожная adventure-конфигурация.                                                                                   | null       |
| KTM   | 1390 Super Adventure | 1390 Super Adventure R         | 1390 Super Adventure R / 2025-current         | 2025      | null    | 2025/2026-н.в. | GLOBAL        | Big adventure / off-road      | V-twin 75°                | 1350            | false                  | null        | null       | null                | false           | null      | false            | 6-speed | CHAIN | 21             | 18            | null       | null      | null   | false          | null      | null         | null    | EARLY_BETA        | manual_seed_missing_specs               | Новая флагманская платформа KTM вместо 1290.                                                                                  | null       |
| KTM   | 1390 Super Adventure | 1390 Super Adventure S / S EVO | 1390 Super Adventure S / S EVO / 2025-current | 2025      | null    | 2025/2026-н.в. | GLOBAL        | Big adventure / touring       | V-twin 75°                | 1350            | false                  | null        | null       | null                | false           | null      | false            | 6-speed | CHAIN | 19             | 17            | null       | null      | null   | false          | null      | null         | null    | EARLY_BETA        | manual_seed_missing_specs               | Дорожная версия, важно отделить от R по колесам и подвеске.                                                                   | null       |

---

## 4. CSV seed для Cursor / Prisma importer

Скопируй этот блок в файл:

```text
prisma/seed-data/ktm-model-technical-master.csv
```

```csv
brand,model_family,variant,generation,year_from,year_to,years_label,market_region,segment,engine,displacement_cc,displacement_is_approx,power_value,power_unit,power_hp_normalized,power_is_approx,torque_nm,torque_is_approx,gearbox,drive,front_wheel_in,rear_wheel_in,front_tire,rear_tire,fuel_l,fuel_is_approx,weight_kg,weight_type,seat_mm,support_level,data_status,mototwin_comment,source_url
KTM,390 Adventure,390 Adventure R,390 Adventure R / 2025-current,2025,,2025/2026-н.в.,GLOBAL,Light adventure / off-road,"1-cylinder, 4-stroke",398.7,False,45,PS,44.4,False,39,False,6-speed,CHAIN,21,18,,,,False,,,,MVP_CORE,manual_seed_needs_official_verification,"Отличная модель для A2/лайт-эндуро, важно для молодой аудитории.",
KTM,390 Adventure,390 Adventure X,390 Adventure X / 2025-current,2025,,2025/2026-н.в.,GLOBAL,Light adventure / road-biased,"1-cylinder, 4-stroke",398.7,False,45,PS,44.4,False,39,False,6-speed,CHAIN,19,17,,,,False,,,,MVP_CORE,manual_seed_needs_official_verification,Отдельно от R: другая геометрия и колеса.,
KTM,390 Duke,390 Duke,390 Duke / 2024-current,2024,,2024-н.в.,GLOBAL,Naked / city,"1-cylinder, 4-stroke",398.7,False,45,PS,44.4,False,39,False,6-speed,CHAIN,17,17,,,,False,,,,COMMUNITY_SUPPORT,manual_seed_needs_official_verification,Хорошая модель для расширения в городские мотоциклы.,
KTM,690 Enduro R,690 Enduro R,690 Enduro R / 2019-current,2019,,2019-н.в.,GLOBAL,Dual sport / enduro,"1-cylinder, 4-stroke",693,True,74,hp,74,True,73.5,True,6-speed,CHAIN,21,18,,,13.3,False,162,fully_fueled,935,MVP_CORE,manual_seed_needs_official_verification,"Критична для эндуро-сегмента: колеса 21/18, расходники, защита, подвеска. В исходных данных также указано 152 kg без топлива.",
KTM,790 Adventure,790 Adventure,790 Adventure / 2023-current,2023,,2023-н.в.,GLOBAL,Mid adventure,"2-cylinder, parallel twin",799,False,95,PS,93.7,True,88,True,6-speed,CHAIN,21,18,,,20,True,,,840/860,MVP_CORE,manual_seed_needs_official_verification,Более доступная средняя adventure-платформа.,
KTM,890 Adventure,890 Adventure R,890 Adventure R / 2021-current,2021,,2021-н.в.,GLOBAL,Mid adventure / off-road,"2-cylinder, parallel twin",889,False,105,PS,103.6,False,100,False,6-speed,CHAIN,21,18,,,20,True,,,880,MVP_CORE,manual_seed_needs_official_verification,Одна из ключевых KTM-моделей для MotoTwin.,
KTM,1290 Super Adventure,1290 Super Adventure S,1290 Super Adventure S / 2021-2024,2021,2024,2021-2024,GLOBAL,Big adventure / touring,V-twin 75°,1301,False,160,hp,160,True,138,False,6-speed,CHAIN,19,17,,,23,False,228,without_fuel,849/869,MVP_CORE_LEGACY,manual_seed_needs_official_verification,"Дорожно-туристическая конфигурация, отличать от R.",
KTM,1290 Super Adventure,1290 Super Adventure R,1290 Super Adventure R / 2021-2024,2021,2024,2021-2024,GLOBAL,Big adventure / off-road,V-twin 75°,1301,False,160,hp,160,True,138,False,6-speed,CHAIN,21,18,,,23,False,228,without_fuel,880,MVP_CORE_LEGACY,manual_seed_needs_official_verification,Крупная внедорожная adventure-конфигурация.,
KTM,1390 Super Adventure,1390 Super Adventure R,1390 Super Adventure R / 2025-current,2025,,2025/2026-н.в.,GLOBAL,Big adventure / off-road,V-twin 75°,1350,False,,,,False,,False,6-speed,CHAIN,21,18,,,,False,,,,EARLY_BETA,manual_seed_missing_specs,Новая флагманская платформа KTM вместо 1290.,
KTM,1390 Super Adventure,1390 Super Adventure S / S EVO,1390 Super Adventure S / S EVO / 2025-current,2025,,2025/2026-н.в.,GLOBAL,Big adventure / touring,V-twin 75°,1350,False,,,,False,,False,6-speed,CHAIN,19,17,,,,False,,,,EARLY_BETA,manual_seed_missing_specs,"Дорожная версия, важно отделить от R по колесам и подвеске.",
```

---

## 5. TypeScript типы

Использовать те же типы, что и для BMW. Не создавать отдельные KTM-типы.

```ts
export type MotoDriveType = 'CHAIN' | 'SHAFT' | 'BELT' | 'UNKNOWN';
export type MotoPowerUnit = 'hp' | 'PS' | 'kW';
export type MotoMarketRegion = 'GLOBAL' | 'EU' | 'US' | 'RU' | 'OTHER';
export type MotoWeightType = 'dry' | 'wet' | 'curb' | 'fully_fueled' | 'without_fuel' | 'unknown';

export type MotoTwinSupportLevel =
  | 'MVP_CORE'
  | 'MVP_CORE_LEGACY'
  | 'COMMUNITY_SUPPORT'
  | 'EARLY_BETA'
  | 'NO_FITMENT_DATA_YET';

export interface MotoModelTechnicalMasterRow {
  brand: string;
  model_family: string;
  variant: string;
  generation: string;
  year_from: number;
  year_to: number | null;
  years_label: string;
  market_region: MotoMarketRegion;
  segment: string;
  engine: string;
  displacement_cc: number | null;
  displacement_is_approx: boolean;
  power_value: number | null;
  power_unit: MotoPowerUnit | null;
  power_hp_normalized?: number | null;
  power_is_approx: boolean;
  torque_nm: number | null;
  torque_is_approx: boolean;
  gearbox: string | null;
  drive: MotoDriveType;
  front_wheel_in: number | null;
  rear_wheel_in: number | null;
  front_tire?: string | null;
  rear_tire?: string | null;
  fuel_l: number | null;
  fuel_is_approx: boolean;
  weight_kg: number | null;
  weight_type?: MotoWeightType | null;
  seat_mm: string | null;
  support_level: MotoTwinSupportLevel;
  data_status: string;
  mototwin_comment?: string | null;
  source_url?: string | null;
}
```

---

## 6. Prompt для Cursor

```text
Используй этот файл как KTM seed для MotoTwin Model Technical Master.

Требования:
1. Импортируй KTM по той же структуре, что BMW:
   Brand → ModelFamily → Variant → Generation → TechnicalSpecs.
2. Не создавай отдельную структуру для KTM.
3. Пустые значения из CSV преобразуй в null.
4. Поля *_is_approx используй для отображения приблизительных значений в UI.
5. Мощность храни как power_value + power_unit, а power_hp_normalized используй только для фильтров и сортировки.
6. Каталог запчастей должен ссылаться на generation_id.
7. После импорта проверь счетчики:
   - Brand: 1
   - Model families: 7
   - Variants/configurations: 10
   - Generations: 10
8. Не используй каталог запчастей для создания новых ModelFamily/Variant без отдельного процесса валидации.
```

---

## 7. Ожидаемые счетчики по этому KTM seed

```text
Brand: 1
Model families: 7
Variants / configurations: 10
Generations: 10
```

Семейства:

```text
390 Adventure
390 Duke
690 Enduro R
790 Adventure
890 Adventure
1290 Super Adventure
1390 Super Adventure
```

Важно: если считать строго уникальные `model_family`, получится 7, потому что `390 Adventure` содержит две конфигурации, а `1290 Super Adventure` и `1390 Super Adventure` содержат по две конфигурации. Если нужен счетчик “маркетинговых моделей на экране”, использовать `variant_count = 10`.
