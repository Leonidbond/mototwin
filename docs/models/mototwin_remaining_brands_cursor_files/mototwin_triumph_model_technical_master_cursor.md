# MotoTwin Triumph Model Technical Master for Cursor — unified structure

Дата подготовки: 2026-05-24  
Назначение: Triumph seed-файл с техническими параметрами, приведенный к единой структуре MotoTwin Model Technical Master.

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

Это **MVP technical seed**, а не полный всемирный каталог Triumph.  
Для строк со статусом `official_current_*` основные параметры взяты с официальных страниц производителя или официальных PDF.  
Для строк со статусом `needs_manual_verification` часть значений заполнена как первичная база для разработки и должна быть перепроверена перед production-импортом.

---

## 3. Triumph technical master table

| brand | model_family | variant | generation | year_from | year_to | years_label | market_region | segment | engine | displacement_cc | displacement_is_approx | power_value | power_unit | power_hp_normalized | power_is_approx | torque_nm | torque_is_approx | gearbox | drive | front_wheel_in | rear_wheel_in | front_tire | rear_tire | fuel_l | fuel_is_approx | weight_kg | weight_type | seat_mm | support_level | data_status | mototwin_comment | source_url |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Triumph | Tiger 900 | Tiger 900 GT Pro | Tiger 900 GT Pro / current | 2024 | null | 2024-н.в. / current | US | Middle adventure / road touring | 888cc liquid-cooled inline 3-cylinder | 888 | false | 108 | PS | 106.5 | false | 90 | false | 6-speed | CHAIN | 19 | 17 | 100/90-19 | 150/70R17 | 20.0 | true | 222 | wet | 820/840 | MVP_CORE | official_current_partial | Дорожная Tiger 900; 19/17, не смешивать с Rally Pro 21/17. | https://www.triumphmotorcycles.com/motorcycles/adventure/tiger-900/specification |
| Triumph | Tiger 900 | Tiger 900 Rally Pro | Tiger 900 Rally Pro / current | 2024 | null | 2024-н.в. / current | US | Middle adventure / off-road | 888cc liquid-cooled inline 3-cylinder | 888 | false | 108 | PS | 106.5 | false | 90 | false | 6-speed | CHAIN | 21 | 17 | 90/90-21 | 150/70R17 | 20.0 | true | 228 | wet | 860/880 | MVP_CORE | official_current_partial | Off-road версия Tiger 900; отдельная подвеска/колеса. | https://www.triumphmotorcycles.com/motorcycles/adventure/tiger-900/specification |
| Triumph | Tiger 1200 | Tiger 1200 GT Pro | Tiger 1200 GT Pro / current | 2022 | null | 2022-н.в. / current | US | Big adventure / road touring | 1160cc liquid-cooled inline 3-cylinder T-plane | 1160 | false | 150 | PS | 148 | false | 130 | false | 6-speed | SHAFT | 19 | 18 | 120/70R19 | 150/70R18 | 20.0 | true | 245 | wet | 850/870 | COMMUNITY_SUPPORT | official_current_partial | Крупный Tiger с карданом; отличается от BMW GS по узлам и расходникам. | https://www.triumphmotorcycles.com/motorcycles/adventure/tiger-1200/specification |
| Triumph | Tiger 1200 | Tiger 1200 Rally Explorer | Tiger 1200 Rally Explorer / current | 2022 | null | 2022-н.в. / current | US | Big adventure / long-range off-road | 1160cc liquid-cooled inline 3-cylinder T-plane | 1160 | false | 150 | PS | 148 | false | 130 | false | 6-speed | SHAFT | 21 | 18 | 90/90-21 | 150/70R18 | 30.0 | false | 261 | wet | 875/895 | COMMUNITY_SUPPORT | official_current_partial | Rally Explorer: 21/18, 30 л бак, кардан; отдельная конфигурация. | https://www.triumphmotorcycles.com/motorcycles/adventure/tiger-1200/specification |
| Triumph | Trident 660 | Trident 660 | Trident 660 / MY2026 | 2021 | null | 2021-н.в. / MY2026 | EU | Naked / middleweight | 660cc liquid-cooled inline 3-cylinder | 660 | false | 95 | PS | 94 | true | 68 | true | 6-speed | CHAIN | 17 | 17 | 120/70R17 | 180/55R17 | 14.0 | true | 190 | wet | 805 | COMMUNITY_SUPPORT | official_current_partial | Массовая 660-платформа Triumph; для entry/middle naked. | https://www.triumphmotorcycles.com/motorcycles/roadsters/trident-660 |
| Triumph | Tiger Sport 660 | Tiger Sport 660 | Tiger Sport 660 / MY2026 | 2022 | null | 2022-н.в. / MY2026 | EU | Sport touring / light crossover | 660cc liquid-cooled inline 3-cylinder | 660 | false | 95 | PS | 94 | true | 68 | true | 6-speed | CHAIN | 17 | 17 | 120/70R17 | 180/55R17 | 17.2 | true | 207 | wet | 835 | EARLY_BETA | official_current_partial | Crossover на 660-платформе; бак/обвес/посадка отличаются от Trident. | https://www.triumphmotorcycles.com/motorcycles/adventure/tiger-sport-660 |
| Triumph | Street Triple 765 | Street Triple 765 RS | Street Triple 765 RS / current | 2023 | null | 2023-н.в. / current | EU | Naked / sport roadster | 765cc liquid-cooled inline 3-cylinder | 765 | false | 130 | PS | 128.2 | true | 80 | true | 6-speed | CHAIN | 17 | 17 | 120/70ZR17 | 180/55ZR17 | 15.0 | true | 188 | wet | 836 | EARLY_BETA | needs_manual_verification | Sport-naked Triumph; высокий интерес к тормозам/подвеске/цепи. | https://www.triumphmotorcycles.com/motorcycles/roadsters/street-triple-765 |
| Triumph | Speed 400 | Speed 400 | Speed 400 / current | 2024 | null | 2024-н.в. / current | US | Roadster / entry modern classic | 398.15cc liquid-cooled single-cylinder DOHC | 398.15 | false | 39.5 | hp | 39.5 | false | 37.5 | false | 6-speed | CHAIN | 17 | 17 | 110/70R17 | 150/60R17 | 13.0 | true | 170 | wet | 790 | EARLY_BETA | official_current_partial | Новая бюджетная платформа Triumph/Bajaj; важна для роста аудитории. | https://www.triumphmotorcycles.com/motorcycles/classic/speed-400/speed-400-2024 |
| Triumph | Scrambler 400 X | Scrambler 400 X | Scrambler 400 X / current | 2024 | null | 2024-н.в. / current | US | Scrambler / entry dual-purpose | 398.15cc liquid-cooled single-cylinder DOHC | 398.15 | false | 39.5 | hp | 39.5 | false | 37.5 | false | 6-speed | CHAIN | 19 | 17 | 100/90-19 | 140/80-17 | 13.0 | true | 178 | wet | 835 | EARLY_BETA | official_current_partial | 400-платформа, но 19/17 и scrambler-геометрия; не объединять со Speed 400. | https://www.triumphmotorcycles.com/motorcycles/classic/scrambler-400-x/specification |

---

## 4. CSV seed для Cursor / Prisma importer

Скопируй этот блок в файл:

```text
prisma/seed-data/triumph-model-technical-master.csv
```

```csv
brand,model_family,variant,generation,year_from,year_to,years_label,market_region,segment,engine,displacement_cc,displacement_is_approx,power_value,power_unit,power_hp_normalized,power_is_approx,torque_nm,torque_is_approx,gearbox,drive,front_wheel_in,rear_wheel_in,front_tire,rear_tire,fuel_l,fuel_is_approx,weight_kg,weight_type,seat_mm,support_level,data_status,mototwin_comment,source_url
Triumph,Tiger 900,Tiger 900 GT Pro,Tiger 900 GT Pro / current,2024,,2024-н.в. / current,US,Middle adventure / road touring,888cc liquid-cooled inline 3-cylinder,888,False,108,PS,106.5,False,90,False,6-speed,CHAIN,19,17,100/90-19,150/70R17,20.0,True,222,wet,820/840,MVP_CORE,official_current_partial,"Дорожная Tiger 900; 19/17, не смешивать с Rally Pro 21/17.",https://www.triumphmotorcycles.com/motorcycles/adventure/tiger-900/specification
Triumph,Tiger 900,Tiger 900 Rally Pro,Tiger 900 Rally Pro / current,2024,,2024-н.в. / current,US,Middle adventure / off-road,888cc liquid-cooled inline 3-cylinder,888,False,108,PS,106.5,False,90,False,6-speed,CHAIN,21,17,90/90-21,150/70R17,20.0,True,228,wet,860/880,MVP_CORE,official_current_partial,Off-road версия Tiger 900; отдельная подвеска/колеса.,https://www.triumphmotorcycles.com/motorcycles/adventure/tiger-900/specification
Triumph,Tiger 1200,Tiger 1200 GT Pro,Tiger 1200 GT Pro / current,2022,,2022-н.в. / current,US,Big adventure / road touring,1160cc liquid-cooled inline 3-cylinder T-plane,1160,False,150,PS,148,False,130,False,6-speed,SHAFT,19,18,120/70R19,150/70R18,20.0,True,245,wet,850/870,COMMUNITY_SUPPORT,official_current_partial,Крупный Tiger с карданом; отличается от BMW GS по узлам и расходникам.,https://www.triumphmotorcycles.com/motorcycles/adventure/tiger-1200/specification
Triumph,Tiger 1200,Tiger 1200 Rally Explorer,Tiger 1200 Rally Explorer / current,2022,,2022-н.в. / current,US,Big adventure / long-range off-road,1160cc liquid-cooled inline 3-cylinder T-plane,1160,False,150,PS,148,False,130,False,6-speed,SHAFT,21,18,90/90-21,150/70R18,30.0,False,261,wet,875/895,COMMUNITY_SUPPORT,official_current_partial,"Rally Explorer: 21/18, 30 л бак, кардан; отдельная конфигурация.",https://www.triumphmotorcycles.com/motorcycles/adventure/tiger-1200/specification
Triumph,Trident 660,Trident 660,Trident 660 / MY2026,2021,,2021-н.в. / MY2026,EU,Naked / middleweight,660cc liquid-cooled inline 3-cylinder,660,False,95,PS,94,True,68,True,6-speed,CHAIN,17,17,120/70R17,180/55R17,14.0,True,190,wet,805,COMMUNITY_SUPPORT,official_current_partial,Массовая 660-платформа Triumph; для entry/middle naked.,https://www.triumphmotorcycles.com/motorcycles/roadsters/trident-660
Triumph,Tiger Sport 660,Tiger Sport 660,Tiger Sport 660 / MY2026,2022,,2022-н.в. / MY2026,EU,Sport touring / light crossover,660cc liquid-cooled inline 3-cylinder,660,False,95,PS,94,True,68,True,6-speed,CHAIN,17,17,120/70R17,180/55R17,17.2,True,207,wet,835,EARLY_BETA,official_current_partial,Crossover на 660-платформе; бак/обвес/посадка отличаются от Trident.,https://www.triumphmotorcycles.com/motorcycles/adventure/tiger-sport-660
Triumph,Street Triple 765,Street Triple 765 RS,Street Triple 765 RS / current,2023,,2023-н.в. / current,EU,Naked / sport roadster,765cc liquid-cooled inline 3-cylinder,765,False,130,PS,128.2,True,80,True,6-speed,CHAIN,17,17,120/70ZR17,180/55ZR17,15.0,True,188,wet,836,EARLY_BETA,needs_manual_verification,Sport-naked Triumph; высокий интерес к тормозам/подвеске/цепи.,https://www.triumphmotorcycles.com/motorcycles/roadsters/street-triple-765
Triumph,Speed 400,Speed 400,Speed 400 / current,2024,,2024-н.в. / current,US,Roadster / entry modern classic,398.15cc liquid-cooled single-cylinder DOHC,398.15,False,39.5,hp,39.5,False,37.5,False,6-speed,CHAIN,17,17,110/70R17,150/60R17,13.0,True,170,wet,790,EARLY_BETA,official_current_partial,Новая бюджетная платформа Triumph/Bajaj; важна для роста аудитории.,https://www.triumphmotorcycles.com/motorcycles/classic/speed-400/speed-400-2024
Triumph,Scrambler 400 X,Scrambler 400 X,Scrambler 400 X / current,2024,,2024-н.в. / current,US,Scrambler / entry dual-purpose,398.15cc liquid-cooled single-cylinder DOHC,398.15,False,39.5,hp,39.5,False,37.5,False,6-speed,CHAIN,19,17,100/90-19,140/80-17,13.0,True,178,wet,835,EARLY_BETA,official_current_partial,"400-платформа, но 19/17 и scrambler-геометрия; не объединять со Speed 400.",https://www.triumphmotorcycles.com/motorcycles/classic/scrambler-400-x/specification
```

---

## 5. Prompt для Cursor

```text
Используй этот файл как Triumph seed для MotoTwin Model Technical Master.

Требования:
1. Импортируй Triumph по общей структуре Brand → ModelFamily → Variant → Generation → TechnicalSpecs.
2. Не создавай отдельную схему под бренд. Все бренды должны импортироваться одним importer-ом и в одну Prisma-модель.
3. Пустые значения из CSV преобразуй в null.
4. Булевы значения `True` / `False` преобразуй в boolean.
5. Каталог запчастей, сервисные интервалы и fitment-правила должны ссылаться на `generation_id`.
6. Поле `drive` означает final drive. Для Harley-Davidson не путай primary chain с final belt.
7. Строки с `data_status=needs_manual_verification` не использовать как production-verified без повторной проверки по мануалам/официальным каталогам.
8. После импорта проверь счетчики:
   - Brand: 1
   - Model families: 7
   - Variants/configurations: 9
   - Generations: 9
```

---

## 6. Source notes

- https://www.triumphmotorcycles.com/motorcycles/adventure/tiger-1200/specification
- https://www.triumphmotorcycles.com/motorcycles/adventure/tiger-900/specification
- https://www.triumphmotorcycles.com/motorcycles/adventure/tiger-sport-660
- https://www.triumphmotorcycles.com/motorcycles/classic/scrambler-400-x/specification
- https://www.triumphmotorcycles.com/motorcycles/classic/speed-400/speed-400-2024
- https://www.triumphmotorcycles.com/motorcycles/roadsters/street-triple-765
- https://www.triumphmotorcycles.com/motorcycles/roadsters/trident-660
