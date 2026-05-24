# MotoTwin Honda Model Technical Master for Cursor — unified structure

Дата подготовки: 2026-05-24  
Назначение: Honda seed-файл с техническими параметрами, приведенный к единой структуре MotoTwin Model Technical Master.

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

Это **MVP technical seed**, а не полный всемирный каталог Honda.  
Для строк со статусом `official_current_*` основные параметры взяты с официальных страниц производителя или официальных PDF.  
Для строк со статусом `needs_manual_verification` часть значений заполнена как первичная база для разработки и должна быть перепроверена перед production-импортом.

---

## 3. Honda technical master table

| brand | model_family | variant | generation | year_from | year_to | years_label | market_region | segment | engine | displacement_cc | displacement_is_approx | power_value | power_unit | power_hp_normalized | power_is_approx | torque_nm | torque_is_approx | gearbox | drive | front_wheel_in | rear_wheel_in | front_tire | rear_tire | fuel_l | fuel_is_approx | weight_kg | weight_type | seat_mm | support_level | data_status | mototwin_comment | source_url |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Honda | CRF1100L Africa Twin | CRF1100L Africa Twin MT | CRF1100L Africa Twin / current | 2024 | null | 2024-н.в. / current | EU | Big adventure / off-road touring | Liquid-cooled 4-stroke 8-valve parallel twin Unicam | 1084 | false | 75 | kW | 100.6 | false | 112 | false | 6-speed manual | CHAIN | 21 | 18 | 90/90-21 | 150/70 R18 | 18.8 | false | 231 | curb | 850/870 | MVP_CORE | official_current_eu_partial | Ключевая Honda adventure-модель; важно отделять MT/DCT и Adventure Sports. | https://www.honda.co.uk/motorcycles/range/adventure/crf1100l-africa-twin/specifications-and-price.html |
| Honda | CRF1100L Africa Twin | CRF1100L Africa Twin Adventure Sports ES MT | CRF1100L Africa Twin Adventure Sports / current | 2024 | null | 2024-н.в. / current | EU | Big adventure / long-range touring | Liquid-cooled 4-stroke 8-valve parallel twin Unicam | 1084 | false | 75 | kW | 100.6 | false | 112 | false | 6-speed manual | CHAIN | 19 | 18 | 110/80 R19 | 150/70 R18 | 24.8 | false | 243 | curb | 835/855 | MVP_CORE | official_current_eu_partial | Adventure Sports отличается баком, весом, передним колесом 19 и дорожной туристической геометрией. | https://www.honda.co.uk/motorcycles/range/adventure/crf1100l-africa-twin-adventure-sports/specifications-and-price.html |
| Honda | XL750 Transalp | XL750 Transalp | XL750 Transalp / current | 2023 | null | 2023-н.в. / current | EU | Middle adventure / travel enduro | Liquid-cooled SOHC 8-valve parallel twin | 755 | false | 67.5 | kW | 90.5 | false | 75 | false | 6-speed manual | CHAIN | 21 | 18 | 90/90-21 | 150/70 R18 | 16.9 | false | 210 | curb | 850 | MVP_CORE | official_current_eu_partial | Средний adventure Honda; для MotoTwin важны 21/18, цепь и расходники платформы 755. | https://www.honda.co.uk/motorcycles/range/adventure/xl750_transalp/specifications-and-price.html |
| Honda | CB750 Hornet | CB750 Hornet | CB750 Hornet / current | 2023 | null | 2023-н.в. / current | EU | Naked / street | Liquid-cooled SOHC 8-valve parallel twin | 755 | false | 67.5 | kW | 90.5 | false | 75 | false | 6-speed manual | CHAIN | 17 | 17 | 120/70 ZR17 | 160/60 ZR17 | 15.2 | false | 192 | curb | 795 | COMMUNITY_SUPPORT | official_current_eu_partial | Та же 755-платформа, но дорожные 17/17; не смешивать с Transalp. | https://www.honda.co.uk/motorcycles/range/street/hornet/specifications-and-price.html |
| Honda | NC750X | NC750X DCT | NC750X / current | 2021 | null | 2021-н.в. / current | EU | Urban adventure / commuter crossover | Liquid-cooled 8-valve parallel twin | 745 | false | 43.1 | kW | 57.8 | false | 69 | false | 6-speed DCT | CHAIN | 17 | 17 | 120/70 ZR17 | 160/60 ZR17 | 14.1 | true | 224 | curb | 800 | COMMUNITY_SUPPORT | official_current_eu_partial | DCT-особенности важны для UI и сервисных работ; бак под сиденьем и багажный отсек. | https://www.honda.co.uk/motorcycles/range/adventure/nc750x/overview.html |
| Honda | CBR650R | CBR650R | CBR650R / current | 2024 | null | 2024-н.в. / current | EU | Sport / middleweight supersport | Liquid-cooled DOHC inline-four | 649 | false | 70 | kW | 93.9 | false | 63 | false | 6-speed manual | CHAIN | 17 | 17 | 120/70 ZR17 | 180/55 ZR17 | 15.4 | false | 211 | curb | 810 | COMMUNITY_SUPPORT | official_current_eu_partial | Четырехцилиндровая Honda; для MotoTwin важны 17/17, тормоза и спортивные расходники. | https://www.honda.co.uk/motorcycles/range/super-sport/cbr650r/specifications-and-price.html |
| Honda | CB500 Hornet | CB500 Hornet | CB500 Hornet / current | 2024 | null | 2024-н.в. / current | EU | Naked / A2 street | Liquid-cooled DOHC parallel twin | 471 | false | 35 | kW | 47 | false | 43 | true | 6-speed manual | CHAIN | 17 | 17 | 120/70 ZR17 | 160/60 ZR17 | 17.1 | false | 191 | curb | 785 | EARLY_BETA | official_current_eu_partial | A2-friendly массовая Honda; полезна для входного сегмента. | https://www.honda.co.uk/motorcycles/range/street/cb500-hornet/specifications-and-price.html |
| Honda | CBR500R | CBR500R | CBR500R / current | 2024 | null | 2024-н.в. / current | EU | Sport / A2 | Liquid-cooled DOHC parallel twin | 471 | false | 35 | kW | 47 | false | 43 | true | 6-speed manual | CHAIN | 17 | 17 | 120/70 ZR17 | 160/60 ZR17 | 17.1 | false | 194 | curb | 785 | EARLY_BETA | official_current_eu_partial | Спортивная 500-платформа Honda; не смешивать с naked из-за пластика, посадки и ряда деталей. | https://www.honda.co.uk/motorcycles/range/super-sport/cbr500r/specifications-and-price.html |
| Honda | CRF300L | CRF300L | CRF300L / current | 2021 | null | 2021-н.в. / current | EU | Dual sport / light enduro | Liquid-cooled DOHC single-cylinder | 286 | false | 20.1 | kW | 27 | true | 26.6 | true | 6-speed manual | CHAIN | 21 | 18 | 80/100-21 | 120/80-18 | 7.8 | false | 142 | curb | 880 | EARLY_BETA | official_current_eu_partial | Легкий dual-sport; расходники и защита отличаются от adventure-туристов. | https://www.honda.co.uk/motorcycles/range/adventure/crf300l/specifications.html |
| Honda | CMX500 Rebel | CMX500 Rebel | CMX500 Rebel / current | 2017 | null | 2017-н.в. / current | EU | Cruiser / A2 | Liquid-cooled DOHC parallel twin | 471 | false | 34 | kW | 45.6 | true | 43.3 | true | 6-speed manual | CHAIN | 16 | 16 | 130/90-16 | 150/80-16 | 11.2 | false | 192 | curb | 690 | EARLY_BETA | official_current_eu_partial | Круизерная 500-платформа; отдельная логика шин/посадки против CB/CBR500. | https://www.honda.co.uk/motorcycles/range/street/cmx500-rebel/specifications-and-price.html |

---

## 4. CSV seed для Cursor / Prisma importer

Скопируй этот блок в файл:

```text
prisma/seed-data/honda-model-technical-master.csv
```

```csv
brand,model_family,variant,generation,year_from,year_to,years_label,market_region,segment,engine,displacement_cc,displacement_is_approx,power_value,power_unit,power_hp_normalized,power_is_approx,torque_nm,torque_is_approx,gearbox,drive,front_wheel_in,rear_wheel_in,front_tire,rear_tire,fuel_l,fuel_is_approx,weight_kg,weight_type,seat_mm,support_level,data_status,mototwin_comment,source_url
Honda,CRF1100L Africa Twin,CRF1100L Africa Twin MT,CRF1100L Africa Twin / current,2024,,2024-н.в. / current,EU,Big adventure / off-road touring,Liquid-cooled 4-stroke 8-valve parallel twin Unicam,1084,False,75,kW,100.6,False,112,False,6-speed manual,CHAIN,21,18,90/90-21,150/70 R18,18.8,False,231,curb,850/870,MVP_CORE,official_current_eu_partial,Ключевая Honda adventure-модель; важно отделять MT/DCT и Adventure Sports.,https://www.honda.co.uk/motorcycles/range/adventure/crf1100l-africa-twin/specifications-and-price.html
Honda,CRF1100L Africa Twin,CRF1100L Africa Twin Adventure Sports ES MT,CRF1100L Africa Twin Adventure Sports / current,2024,,2024-н.в. / current,EU,Big adventure / long-range touring,Liquid-cooled 4-stroke 8-valve parallel twin Unicam,1084,False,75,kW,100.6,False,112,False,6-speed manual,CHAIN,19,18,110/80 R19,150/70 R18,24.8,False,243,curb,835/855,MVP_CORE,official_current_eu_partial,"Adventure Sports отличается баком, весом, передним колесом 19 и дорожной туристической геометрией.",https://www.honda.co.uk/motorcycles/range/adventure/crf1100l-africa-twin-adventure-sports/specifications-and-price.html
Honda,XL750 Transalp,XL750 Transalp,XL750 Transalp / current,2023,,2023-н.в. / current,EU,Middle adventure / travel enduro,Liquid-cooled SOHC 8-valve parallel twin,755,False,67.5,kW,90.5,False,75,False,6-speed manual,CHAIN,21,18,90/90-21,150/70 R18,16.9,False,210,curb,850,MVP_CORE,official_current_eu_partial,"Средний adventure Honda; для MotoTwin важны 21/18, цепь и расходники платформы 755.",https://www.honda.co.uk/motorcycles/range/adventure/xl750_transalp/specifications-and-price.html
Honda,CB750 Hornet,CB750 Hornet,CB750 Hornet / current,2023,,2023-н.в. / current,EU,Naked / street,Liquid-cooled SOHC 8-valve parallel twin,755,False,67.5,kW,90.5,False,75,False,6-speed manual,CHAIN,17,17,120/70 ZR17,160/60 ZR17,15.2,False,192,curb,795,COMMUNITY_SUPPORT,official_current_eu_partial,"Та же 755-платформа, но дорожные 17/17; не смешивать с Transalp.",https://www.honda.co.uk/motorcycles/range/street/hornet/specifications-and-price.html
Honda,NC750X,NC750X DCT,NC750X / current,2021,,2021-н.в. / current,EU,Urban adventure / commuter crossover,Liquid-cooled 8-valve parallel twin,745,False,43.1,kW,57.8,False,69,False,6-speed DCT,CHAIN,17,17,120/70 ZR17,160/60 ZR17,14.1,True,224,curb,800,COMMUNITY_SUPPORT,official_current_eu_partial,DCT-особенности важны для UI и сервисных работ; бак под сиденьем и багажный отсек.,https://www.honda.co.uk/motorcycles/range/adventure/nc750x/overview.html
Honda,CBR650R,CBR650R,CBR650R / current,2024,,2024-н.в. / current,EU,Sport / middleweight supersport,Liquid-cooled DOHC inline-four,649,False,70,kW,93.9,False,63,False,6-speed manual,CHAIN,17,17,120/70 ZR17,180/55 ZR17,15.4,False,211,curb,810,COMMUNITY_SUPPORT,official_current_eu_partial,"Четырехцилиндровая Honda; для MotoTwin важны 17/17, тормоза и спортивные расходники.",https://www.honda.co.uk/motorcycles/range/super-sport/cbr650r/specifications-and-price.html
Honda,CB500 Hornet,CB500 Hornet,CB500 Hornet / current,2024,,2024-н.в. / current,EU,Naked / A2 street,Liquid-cooled DOHC parallel twin,471,False,35,kW,47,False,43,True,6-speed manual,CHAIN,17,17,120/70 ZR17,160/60 ZR17,17.1,False,191,curb,785,EARLY_BETA,official_current_eu_partial,A2-friendly массовая Honda; полезна для входного сегмента.,https://www.honda.co.uk/motorcycles/range/street/cb500-hornet/specifications-and-price.html
Honda,CBR500R,CBR500R,CBR500R / current,2024,,2024-н.в. / current,EU,Sport / A2,Liquid-cooled DOHC parallel twin,471,False,35,kW,47,False,43,True,6-speed manual,CHAIN,17,17,120/70 ZR17,160/60 ZR17,17.1,False,194,curb,785,EARLY_BETA,official_current_eu_partial,"Спортивная 500-платформа Honda; не смешивать с naked из-за пластика, посадки и ряда деталей.",https://www.honda.co.uk/motorcycles/range/super-sport/cbr500r/specifications-and-price.html
Honda,CRF300L,CRF300L,CRF300L / current,2021,,2021-н.в. / current,EU,Dual sport / light enduro,Liquid-cooled DOHC single-cylinder,286,False,20.1,kW,27,True,26.6,True,6-speed manual,CHAIN,21,18,80/100-21,120/80-18,7.8,False,142,curb,880,EARLY_BETA,official_current_eu_partial,Легкий dual-sport; расходники и защита отличаются от adventure-туристов.,https://www.honda.co.uk/motorcycles/range/adventure/crf300l/specifications.html
Honda,CMX500 Rebel,CMX500 Rebel,CMX500 Rebel / current,2017,,2017-н.в. / current,EU,Cruiser / A2,Liquid-cooled DOHC parallel twin,471,False,34,kW,45.6,True,43.3,True,6-speed manual,CHAIN,16,16,130/90-16,150/80-16,11.2,False,192,curb,690,EARLY_BETA,official_current_eu_partial,Круизерная 500-платформа; отдельная логика шин/посадки против CB/CBR500.,https://www.honda.co.uk/motorcycles/range/street/cmx500-rebel/specifications-and-price.html
```

---

## 5. Prompt для Cursor

```text
Используй этот файл как Honda seed для MotoTwin Model Technical Master.

Требования:
1. Импортируй Honda по общей структуре Brand → ModelFamily → Variant → Generation → TechnicalSpecs.
2. Не создавай отдельную схему под бренд. Все бренды должны импортироваться одним importer-ом и в одну Prisma-модель.
3. Пустые значения из CSV преобразуй в null.
4. Булевы значения `True` / `False` преобразуй в boolean.
5. Каталог запчастей, сервисные интервалы и fitment-правила должны ссылаться на `generation_id`.
6. Поле `drive` означает final drive. Для Harley-Davidson не путай primary chain с final belt.
7. Строки с `data_status=needs_manual_verification` не использовать как production-verified без повторной проверки по мануалам/официальным каталогам.
8. После импорта проверь счетчики:
   - Brand: 1
   - Model families: 9
   - Variants/configurations: 10
   - Generations: 10
```

---

## 6. Source notes

- https://www.honda.co.uk/motorcycles/range/adventure/crf1100l-africa-twin-adventure-sports/specifications-and-price.html
- https://www.honda.co.uk/motorcycles/range/adventure/crf1100l-africa-twin/specifications-and-price.html
- https://www.honda.co.uk/motorcycles/range/adventure/crf300l/specifications.html
- https://www.honda.co.uk/motorcycles/range/adventure/nc750x/overview.html
- https://www.honda.co.uk/motorcycles/range/adventure/xl750_transalp/specifications-and-price.html
- https://www.honda.co.uk/motorcycles/range/street/cb500-hornet/specifications-and-price.html
- https://www.honda.co.uk/motorcycles/range/street/cmx500-rebel/specifications-and-price.html
- https://www.honda.co.uk/motorcycles/range/street/hornet/specifications-and-price.html
- https://www.honda.co.uk/motorcycles/range/super-sport/cbr500r/specifications-and-price.html
- https://www.honda.co.uk/motorcycles/range/super-sport/cbr650r/specifications-and-price.html
