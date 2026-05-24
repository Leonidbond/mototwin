# MotoTwin Suzuki Model Technical Master for Cursor — unified structure

Дата подготовки: 2026-05-24  
Назначение: Suzuki seed-файл с техническими параметрами, приведенный к единой структуре MotoTwin Model Technical Master.

---

## 1. Каноническая структура

```text
Brand → ModelFamily → Variant → Generation → TechnicalSpecs
```

Этот файл совместим с ранее подготовленным стандартом:

```text
mototwin_model_technical_master_standard_cursor.md
```

---

## 2. Важная оговорка по качеству данных

Это **MVP technical seed**, а не полный всемирный каталог Suzuki.  
Для строк со статусом `official_current_*` основные параметры взяты с официальных страниц производителя или официальных PDF.  
Для строк со статусом `needs_manual_verification` часть значений заполнена как первичная база для разработки и должна быть перепроверена перед production-импортом.

---

## 3. Suzuki technical master table

| brand | model_family | variant | generation | year_from | year_to | years_label | market_region | segment | engine | displacement_cc | displacement_is_approx | power_value | power_unit | power_hp_normalized | power_is_approx | torque_nm | torque_is_approx | gearbox | drive | front_wheel_in | rear_wheel_in | front_tire | rear_tire | fuel_l | fuel_is_approx | weight_kg | weight_type | seat_mm | support_level | data_status | mototwin_comment | source_url |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Suzuki | V-Strom 800DE | V-Strom 800DE | V-Strom 800DE / MY2026 | 2023 | null | 2023-н.в. / MY2026 | US | Middle adventure / off-road | 776cc 4-stroke liquid-cooled DOHC parallel twin | 776 | false | 83 | hp | 83 | true | 78 | true | 6-speed | CHAIN | 21 | 17 | 90/90-21M/C | 150/70R17 M/C | 20.0 | false | 230 | curb | 855 | MVP_CORE | official_current_us_partial | Ключевая Suzuki adventure-модель; 21/17 и новый 776cc twin. | https://suzukicycles.com/adventure/2026/v-strom-800de |
| Suzuki | V-Strom 800 | V-Strom 800 | V-Strom 800 / MY2026 | 2024 | null | 2024-н.в. / MY2026 | US | Middle adventure / road-biased | 776cc 4-stroke liquid-cooled DOHC parallel twin | 776 | false | 83 | hp | 83 | true | 78 | true | 6-speed | CHAIN | 19 | 17 | 110/80R19 | 150/70R17 | 20.0 | false | 223 | curb | 825 | COMMUNITY_SUPPORT | official_current_us_partial | Дорожная версия V-Strom 800: 19/17 против 21/17 у DE. | https://suzukicycles.com/adventure/2026/v-strom-800 |
| Suzuki | V-Strom 1050 | V-Strom 1050DE | V-Strom 1050DE / MY2026 | 2023 | null | 2023-н.в. / MY2026 | US | Big adventure / off-road touring | 1037cc 4-stroke liquid-cooled DOHC 90-degree V-twin | 1037 | false | 107 | hp | 107 | true | 100 | true | 6-speed | CHAIN | 21 | 17 | 90/90-21 M/C | 150/70R17 M/C | 20.0 | false | 252 | curb | 880 | MVP_CORE | official_current_us_partial | Большой V-Strom с 21/17; важно отделять от дорожного 1050. | https://suzukicycles.com/adventure/2026/v-strom-1050de |
| Suzuki | V-Strom 1050 | V-Strom 1050 | V-Strom 1050 / current | 2020 | null | 2020-н.в. | US | Big adventure / road touring | 1037cc 4-stroke liquid-cooled DOHC 90-degree V-twin | 1037 | false | 107 | hp | 107 | true | 100 | true | 6-speed | CHAIN | 19 | 17 | 110/80R19 | 150/70R17 | 20.0 | false | 242 | curb | 855 | COMMUNITY_SUPPORT | needs_manual_verification | Дорожный 1050; отдельная конфигурация от DE из-за колес и подвески. | https://suzukicycles.com/adventure/2026/v-strom-1050 |
| Suzuki | GSX-8S | GSX-8S | GSX-8S / MY2026 | 2023 | null | 2023-н.в. / MY2026 | US | Naked / middleweight | 776cc 4-stroke liquid-cooled DOHC parallel twin | 776 | false | 83 | hp | 83 | true | 78 | true | 6-speed | CHAIN | 17 | 17 | 120/70ZR17 | 180/55ZR17 | 14.0 | false | 202 | curb | 810 | COMMUNITY_SUPPORT | official_current_us_partial | Naked на 776cc платформе; не смешивать с GSX-8R из-за пластика/посадки. | https://suzukicycles.com/street/2026/gsx-8s |
| Suzuki | GSX-8R | GSX-8R | GSX-8R / MY2026 | 2024 | null | 2024-н.в. / MY2026 | US | Sport / middleweight | 776cc 4-stroke liquid-cooled DOHC parallel twin | 776 | false | 83 | hp | 83 | true | 78 | true | 6-speed | CHAIN | 17 | 17 | 120/70ZR17 | 180/55ZR17 | 14.0 | false | 205 | curb | 810 | COMMUNITY_SUPPORT | official_current_us_partial | Спортивная 776cc конфигурация; отличать от GSX-8S по обвесу и эргономике. | https://suzukicycles.com/street/2026/gsx-8r |
| Suzuki | Hayabusa | Hayabusa | Hayabusa / Gen 3 MY2026 | 2021 | null | 2021-н.в. / MY2026 | US | Sport touring / hypersport | 1340cc 4-stroke liquid-cooled DOHC inline-four | 1340 | false | 187 | hp | 187 | true | 150 | true | 6-speed | CHAIN | 17 | 17 | 120/70ZR17 | 190/50ZR17 | 20.0 | false | 264 | curb | 800 | EARLY_BETA | official_current_us_partial | Флагман Suzuki; отдельные шины/тормоза/цепь для мощного спорт-туринга. | https://suzukicycles.com/sportbike/2026/hayabusa |
| Suzuki | SV650 | SV650 ABS | SV650 / current | 2017 | null | 2017-н.в. | US | Naked / middleweight V-twin | 645cc 4-stroke liquid-cooled DOHC 90-degree V-twin | 645 | false | 75 | hp | 75 | true | 64 | true | 6-speed | CHAIN | 17 | 17 | 120/70ZR17 | 160/60ZR17 | 14.5 | true | 199 | curb | 785 | EARLY_BETA | needs_manual_verification | Массовый V-twin Suzuki; важен для вторичного рынка. | https://suzukicycles.com/street/2026/sv650-abs |
| Suzuki | GSX-S1000GT | GSX-S1000GT+ | GSX-S1000GT / current | 2022 | null | 2022-н.в. | US | Sport touring | 999cc 4-stroke liquid-cooled DOHC inline-four | 999 | false | 150 | hp | 150 | true | 106 | true | 6-speed | CHAIN | 17 | 17 | 120/70ZR17 | 190/50ZR17 | 19.0 | true | 226 | curb | 810 | EARLY_BETA | needs_manual_verification | Sport-tourer на литровой рядной четверке; для MotoTwin отдельный сегмент. | https://suzukicycles.com/street/2026/gsx-s1000gt-plus |

---

## 4. CSV seed для Cursor / Prisma importer

Скопируй этот блок в файл:

```text
prisma/seed-data/suzuki-model-technical-master.csv
```

```csv
brand,model_family,variant,generation,year_from,year_to,years_label,market_region,segment,engine,displacement_cc,displacement_is_approx,power_value,power_unit,power_hp_normalized,power_is_approx,torque_nm,torque_is_approx,gearbox,drive,front_wheel_in,rear_wheel_in,front_tire,rear_tire,fuel_l,fuel_is_approx,weight_kg,weight_type,seat_mm,support_level,data_status,mototwin_comment,source_url
Suzuki,V-Strom 800DE,V-Strom 800DE,V-Strom 800DE / MY2026,2023,,2023-н.в. / MY2026,US,Middle adventure / off-road,776cc 4-stroke liquid-cooled DOHC parallel twin,776,False,83,hp,83,True,78,True,6-speed,CHAIN,21,17,90/90-21M/C,150/70R17 M/C,20.0,False,230,curb,855,MVP_CORE,official_current_us_partial,Ключевая Suzuki adventure-модель; 21/17 и новый 776cc twin.,https://suzukicycles.com/adventure/2026/v-strom-800de
Suzuki,V-Strom 800,V-Strom 800,V-Strom 800 / MY2026,2024,,2024-н.в. / MY2026,US,Middle adventure / road-biased,776cc 4-stroke liquid-cooled DOHC parallel twin,776,False,83,hp,83,True,78,True,6-speed,CHAIN,19,17,110/80R19,150/70R17,20.0,False,223,curb,825,COMMUNITY_SUPPORT,official_current_us_partial,Дорожная версия V-Strom 800: 19/17 против 21/17 у DE.,https://suzukicycles.com/adventure/2026/v-strom-800
Suzuki,V-Strom 1050,V-Strom 1050DE,V-Strom 1050DE / MY2026,2023,,2023-н.в. / MY2026,US,Big adventure / off-road touring,1037cc 4-stroke liquid-cooled DOHC 90-degree V-twin,1037,False,107,hp,107,True,100,True,6-speed,CHAIN,21,17,90/90-21 M/C,150/70R17 M/C,20.0,False,252,curb,880,MVP_CORE,official_current_us_partial,Большой V-Strom с 21/17; важно отделять от дорожного 1050.,https://suzukicycles.com/adventure/2026/v-strom-1050de
Suzuki,V-Strom 1050,V-Strom 1050,V-Strom 1050 / current,2020,,2020-н.в.,US,Big adventure / road touring,1037cc 4-stroke liquid-cooled DOHC 90-degree V-twin,1037,False,107,hp,107,True,100,True,6-speed,CHAIN,19,17,110/80R19,150/70R17,20.0,False,242,curb,855,COMMUNITY_SUPPORT,needs_manual_verification,Дорожный 1050; отдельная конфигурация от DE из-за колес и подвески.,https://suzukicycles.com/adventure/2026/v-strom-1050
Suzuki,GSX-8S,GSX-8S,GSX-8S / MY2026,2023,,2023-н.в. / MY2026,US,Naked / middleweight,776cc 4-stroke liquid-cooled DOHC parallel twin,776,False,83,hp,83,True,78,True,6-speed,CHAIN,17,17,120/70ZR17,180/55ZR17,14.0,False,202,curb,810,COMMUNITY_SUPPORT,official_current_us_partial,Naked на 776cc платформе; не смешивать с GSX-8R из-за пластика/посадки.,https://suzukicycles.com/street/2026/gsx-8s
Suzuki,GSX-8R,GSX-8R,GSX-8R / MY2026,2024,,2024-н.в. / MY2026,US,Sport / middleweight,776cc 4-stroke liquid-cooled DOHC parallel twin,776,False,83,hp,83,True,78,True,6-speed,CHAIN,17,17,120/70ZR17,180/55ZR17,14.0,False,205,curb,810,COMMUNITY_SUPPORT,official_current_us_partial,Спортивная 776cc конфигурация; отличать от GSX-8S по обвесу и эргономике.,https://suzukicycles.com/street/2026/gsx-8r
Suzuki,Hayabusa,Hayabusa,Hayabusa / Gen 3 MY2026,2021,,2021-н.в. / MY2026,US,Sport touring / hypersport,1340cc 4-stroke liquid-cooled DOHC inline-four,1340,False,187,hp,187,True,150,True,6-speed,CHAIN,17,17,120/70ZR17,190/50ZR17,20.0,False,264,curb,800,EARLY_BETA,official_current_us_partial,Флагман Suzuki; отдельные шины/тормоза/цепь для мощного спорт-туринга.,https://suzukicycles.com/sportbike/2026/hayabusa
Suzuki,SV650,SV650 ABS,SV650 / current,2017,,2017-н.в.,US,Naked / middleweight V-twin,645cc 4-stroke liquid-cooled DOHC 90-degree V-twin,645,False,75,hp,75,True,64,True,6-speed,CHAIN,17,17,120/70ZR17,160/60ZR17,14.5,True,199,curb,785,EARLY_BETA,needs_manual_verification,Массовый V-twin Suzuki; важен для вторичного рынка.,https://suzukicycles.com/street/2026/sv650-abs
Suzuki,GSX-S1000GT,GSX-S1000GT+,GSX-S1000GT / current,2022,,2022-н.в.,US,Sport touring,999cc 4-stroke liquid-cooled DOHC inline-four,999,False,150,hp,150,True,106,True,6-speed,CHAIN,17,17,120/70ZR17,190/50ZR17,19.0,True,226,curb,810,EARLY_BETA,needs_manual_verification,Sport-tourer на литровой рядной четверке; для MotoTwin отдельный сегмент.,https://suzukicycles.com/street/2026/gsx-s1000gt-plus
```

---

## 5. Prompt для Cursor

```text
Используй этот файл как Suzuki seed для MotoTwin Model Technical Master.

Требования:
1. Импортируй Suzuki по общей структуре Brand → ModelFamily → Variant → Generation → TechnicalSpecs.
2. Не создавай отдельную схему под бренд. Все бренды должны импортироваться одним importer-ом и в одну Prisma-модель.
3. Пустые значения из CSV преобразуй в null.
4. Булевы значения `True` / `False` преобразуй в boolean.
5. Каталог запчастей, сервисные интервалы и fitment-правила должны ссылаться на `generation_id`.
6. Поле `drive` означает final drive. Для Harley-Davidson не путай primary chain с final belt.
7. Строки с `data_status=needs_manual_verification` не использовать как production-verified без повторной проверки по мануалам/официальным каталогам.
8. После импорта проверь счетчики:
   - Brand: 1
   - Model families: 8
   - Variants/configurations: 9
   - Generations: 9
```

---

## 6. Source notes

- https://suzukicycles.com/adventure/2026/v-strom-1050
- https://suzukicycles.com/adventure/2026/v-strom-1050de
- https://suzukicycles.com/adventure/2026/v-strom-800
- https://suzukicycles.com/adventure/2026/v-strom-800de
- https://suzukicycles.com/sportbike/2026/hayabusa
- https://suzukicycles.com/street/2026/gsx-8r
- https://suzukicycles.com/street/2026/gsx-8s
- https://suzukicycles.com/street/2026/gsx-s1000gt-plus
- https://suzukicycles.com/street/2026/sv650-abs
