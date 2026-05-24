# MotoTwin Yamaha Model Technical Master for Cursor — unified structure

Дата подготовки: 2026-05-24  
Назначение: Yamaha seed-файл с техническими параметрами, приведенный к единой структуре MotoTwin Model Technical Master.

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

Это **MVP technical seed**, а не полный всемирный каталог Yamaha.  
Для строк со статусом `official_current_*` основные параметры взяты с официальных страниц производителя или официальных PDF.  
Для строк со статусом `needs_manual_verification` часть значений заполнена как первичная база для разработки и должна быть перепроверена перед production-импортом.

---

## 3. Yamaha technical master table

| brand | model_family | variant | generation | year_from | year_to | years_label | market_region | segment | engine | displacement_cc | displacement_is_approx | power_value | power_unit | power_hp_normalized | power_is_approx | torque_nm | torque_is_approx | gearbox | drive | front_wheel_in | rear_wheel_in | front_tire | rear_tire | fuel_l | fuel_is_approx | weight_kg | weight_type | seat_mm | support_level | data_status | mototwin_comment | source_url |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Yamaha | Tenere 700 | Ténéré 700 | Ténéré 700 / MY2026 | 2025 | null | 2025/2026-н.в. | US | Middle adventure / off-road | 689cc liquid-cooled DOHC inline twin-cylinder CP2 | 689 | false | 72 | hp | 72 | true | 68 | true | 6-speed | CHAIN | 21 | 18 | 90/90R21 | 150/70R18 | 15.9 | false | 208.2 | wet | 874 | MVP_CORE | official_current_us_partial | Ключевая adventure-модель Yamaha; 21/18 и CP2-платформа. | https://yamahamotorsports.com/models/tenere-700/specs |
| Yamaha | MT-07 | MT-07 | MT-07 / MY2026 | 2025 | null | 2025/2026-н.в. | US | Naked / middleweight | 689cc liquid-cooled DOHC inline twin-cylinder CP2 | 689 | false | 72 | hp | 72 | true | 67 | true | 6-speed | CHAIN | 17 | 17 | 120/70ZR17 | 180/55ZR17 | 14.0 | false | 182.8 | wet | 805 | COMMUNITY_SUPPORT | official_current_us_partial | Массовая CP2 naked-платформа; не смешивать с R7/Ténéré по геометрии и колесам. | https://yamahamotorsports.com/models/mt-07/specs |
| Yamaha | YZF-R7 | YZF-R7 | YZF-R7 / MY2026 | 2022 | null | 2022-н.в. / MY2026 | US | Sport / middleweight | 689cc liquid-cooled DOHC inline twin-cylinder CP2 | 689 | false | 72 | hp | 72 | true | 67 | true | 6-speed | CHAIN | 17 | 17 | 120/70ZR17 | 180/55ZR17 | 14.0 | false | 189.1 | wet | 831 | COMMUNITY_SUPPORT | official_current_us_partial | CP2 sport; важны отличия в тормозах, клипонах, пластике и посадке. | https://yamahamotorsports.com/models/yzf-r7/specs |
| Yamaha | MT-09 | MT-09 | MT-09 / MY2026 | 2024 | null | 2024-н.в. / MY2026 | US | Naked / sport roadster | 890cc liquid-cooled DOHC inline 3-cylinder CP3 | 890 | false | 117 | hp | 117 | true | 93 | true | 6-speed | CHAIN | 17 | 17 | 120/70ZR17 | 180/55ZR17 | 14.0 | false | 192.8 | wet | 826 | COMMUNITY_SUPPORT | official_current_us_partial | CP3 roadster; база для Tracer/XSR, но своя эргономика и подвеска. | https://yamahamotorsports.com/models/mt-09/specs |
| Yamaha | Tracer 9 | Tracer 9 | Tracer 9 / MY2026 | 2021 | null | 2021-н.в. / MY2026 | US | Sport touring / crossover | 890cc liquid-cooled DOHC inline 3-cylinder CP3 | 890 | false | 117 | hp | 117 | true | 93 | true | 6-speed | CHAIN | 17 | 17 | 120/70ZR17 | 180/55ZR17 | 18.9 | false | 219.1 | wet | 846/861 | COMMUNITY_SUPPORT | official_current_us_partial | Sport-tourer на CP3; бак и масса отличаются от MT-09/XSR900. | https://yamahamotorsports.com/models/tracer-9/specs |
| Yamaha | XSR900 | XSR900 | XSR900 / MY2026 | 2022 | null | 2022-н.в. / MY2026 | US | Retro / sport heritage | 890cc liquid-cooled DOHC inline 3-cylinder CP3 | 890 | false | 117 | hp | 117 | true | 93 | true | 6-speed | CHAIN | 17 | 17 | 120/70ZR17 | 180/55ZR17 | 14.0 | false | 192.8 | wet | 810 | EARLY_BETA | official_current_us_partial | Retro CP3; отдельная посадка, подрамник и косметические детали. | https://yamahamotorsports.com/models/xsr900/specs |
| Yamaha | YZF-R1 | YZF-R1 | YZF-R1 / MY2026 | 2025 | null | 2025/2026-н.в. | US | Sport / superbike | 998cc liquid-cooled inline-four crossplane | 998 | false | 198 | hp | 198 | true | 113 | true | 6-speed | CHAIN | 17 | 17 | 120/70ZR17 | 190/55ZR17 | 17.0 | false | 203.2 | wet | 856 | EARLY_BETA | official_current_us_partial | Флагманский спорт; важно для спорт/трек расходников. | https://yamahamotorsports.com/models/yzf-r1/specs |
| Yamaha | YZF-R3 | YZF-R3 | YZF-R3 / MY2026 | 2019 | null | 2019-н.в. / MY2026 | US | Sport / entry | 321cc liquid-cooled DOHC inline twin-cylinder | 321 | false | 42 | hp | 42 | true | 29.5 | true | 6-speed | CHAIN | 17 | 17 | 110/70-17 | 140/70-17 | 14.0 | false | 169.2 | wet | 780 | EARLY_BETA | official_current_us_partial | Входной спорт; полезна для массового сегмента и молодых пользователей. | https://yamahamotorsports.com/models/yzf-r3/specs |

---

## 4. CSV seed для Cursor / Prisma importer

Скопируй этот блок в файл:

```text
prisma/seed-data/yamaha-model-technical-master.csv
```

```csv
brand,model_family,variant,generation,year_from,year_to,years_label,market_region,segment,engine,displacement_cc,displacement_is_approx,power_value,power_unit,power_hp_normalized,power_is_approx,torque_nm,torque_is_approx,gearbox,drive,front_wheel_in,rear_wheel_in,front_tire,rear_tire,fuel_l,fuel_is_approx,weight_kg,weight_type,seat_mm,support_level,data_status,mototwin_comment,source_url
Yamaha,Tenere 700,Ténéré 700,Ténéré 700 / MY2026,2025,,2025/2026-н.в.,US,Middle adventure / off-road,689cc liquid-cooled DOHC inline twin-cylinder CP2,689,False,72,hp,72,True,68,True,6-speed,CHAIN,21,18,90/90R21,150/70R18,15.9,False,208.2,wet,874,MVP_CORE,official_current_us_partial,Ключевая adventure-модель Yamaha; 21/18 и CP2-платформа.,https://yamahamotorsports.com/models/tenere-700/specs
Yamaha,MT-07,MT-07,MT-07 / MY2026,2025,,2025/2026-н.в.,US,Naked / middleweight,689cc liquid-cooled DOHC inline twin-cylinder CP2,689,False,72,hp,72,True,67,True,6-speed,CHAIN,17,17,120/70ZR17,180/55ZR17,14.0,False,182.8,wet,805,COMMUNITY_SUPPORT,official_current_us_partial,Массовая CP2 naked-платформа; не смешивать с R7/Ténéré по геометрии и колесам.,https://yamahamotorsports.com/models/mt-07/specs
Yamaha,YZF-R7,YZF-R7,YZF-R7 / MY2026,2022,,2022-н.в. / MY2026,US,Sport / middleweight,689cc liquid-cooled DOHC inline twin-cylinder CP2,689,False,72,hp,72,True,67,True,6-speed,CHAIN,17,17,120/70ZR17,180/55ZR17,14.0,False,189.1,wet,831,COMMUNITY_SUPPORT,official_current_us_partial,"CP2 sport; важны отличия в тормозах, клипонах, пластике и посадке.",https://yamahamotorsports.com/models/yzf-r7/specs
Yamaha,MT-09,MT-09,MT-09 / MY2026,2024,,2024-н.в. / MY2026,US,Naked / sport roadster,890cc liquid-cooled DOHC inline 3-cylinder CP3,890,False,117,hp,117,True,93,True,6-speed,CHAIN,17,17,120/70ZR17,180/55ZR17,14.0,False,192.8,wet,826,COMMUNITY_SUPPORT,official_current_us_partial,"CP3 roadster; база для Tracer/XSR, но своя эргономика и подвеска.",https://yamahamotorsports.com/models/mt-09/specs
Yamaha,Tracer 9,Tracer 9,Tracer 9 / MY2026,2021,,2021-н.в. / MY2026,US,Sport touring / crossover,890cc liquid-cooled DOHC inline 3-cylinder CP3,890,False,117,hp,117,True,93,True,6-speed,CHAIN,17,17,120/70ZR17,180/55ZR17,18.9,False,219.1,wet,846/861,COMMUNITY_SUPPORT,official_current_us_partial,Sport-tourer на CP3; бак и масса отличаются от MT-09/XSR900.,https://yamahamotorsports.com/models/tracer-9/specs
Yamaha,XSR900,XSR900,XSR900 / MY2026,2022,,2022-н.в. / MY2026,US,Retro / sport heritage,890cc liquid-cooled DOHC inline 3-cylinder CP3,890,False,117,hp,117,True,93,True,6-speed,CHAIN,17,17,120/70ZR17,180/55ZR17,14.0,False,192.8,wet,810,EARLY_BETA,official_current_us_partial,"Retro CP3; отдельная посадка, подрамник и косметические детали.",https://yamahamotorsports.com/models/xsr900/specs
Yamaha,YZF-R1,YZF-R1,YZF-R1 / MY2026,2025,,2025/2026-н.в.,US,Sport / superbike,998cc liquid-cooled inline-four crossplane,998,False,198,hp,198,True,113,True,6-speed,CHAIN,17,17,120/70ZR17,190/55ZR17,17.0,False,203.2,wet,856,EARLY_BETA,official_current_us_partial,Флагманский спорт; важно для спорт/трек расходников.,https://yamahamotorsports.com/models/yzf-r1/specs
Yamaha,YZF-R3,YZF-R3,YZF-R3 / MY2026,2019,,2019-н.в. / MY2026,US,Sport / entry,321cc liquid-cooled DOHC inline twin-cylinder,321,False,42,hp,42,True,29.5,True,6-speed,CHAIN,17,17,110/70-17,140/70-17,14.0,False,169.2,wet,780,EARLY_BETA,official_current_us_partial,Входной спорт; полезна для массового сегмента и молодых пользователей.,https://yamahamotorsports.com/models/yzf-r3/specs
```

---

## 5. Prompt для Cursor

```text
Используй этот файл как Yamaha seed для MotoTwin Model Technical Master.

Требования:
1. Импортируй Yamaha по общей структуре Brand → ModelFamily → Variant → Generation → TechnicalSpecs.
2. Не создавай отдельную схему под бренд. Все бренды должны импортироваться одним importer-ом и в одну Prisma-модель.
3. Пустые значения из CSV преобразуй в null.
4. Булевы значения `True` / `False` преобразуй в boolean.
5. Каталог запчастей, сервисные интервалы и fitment-правила должны ссылаться на `generation_id`.
6. Поле `drive` означает final drive. Для Harley-Davidson не путай primary chain с final belt.
7. Строки с `data_status=needs_manual_verification` не использовать как production-verified без повторной проверки по мануалам/официальным каталогам.
8. После импорта проверь счетчики:
   - Brand: 1
   - Model families: 8
   - Variants/configurations: 8
   - Generations: 8
```

---

## 6. Source notes

- https://yamahamotorsports.com/models/mt-07/specs
- https://yamahamotorsports.com/models/mt-09/specs
- https://yamahamotorsports.com/models/tenere-700/specs
- https://yamahamotorsports.com/models/tracer-9/specs
- https://yamahamotorsports.com/models/xsr900/specs
- https://yamahamotorsports.com/models/yzf-r1/specs
- https://yamahamotorsports.com/models/yzf-r3/specs
- https://yamahamotorsports.com/models/yzf-r7/specs
