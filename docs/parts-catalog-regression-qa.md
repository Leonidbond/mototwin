# Parts Catalog Regression QA

Дата: 2026-04-19  
Область: Parts Catalog MVP, node-based recommendations, wishlist + SKU, tire nodes under Wheels, INSTALLED -> Add Service Event.

## Scope

Этот прогон проверяет, что после фикса с узлами шин не сломались:

- поиск SKU;
- рекомендации по узлу;
- дерево узлов Wheels/Tires;
- обязательный `nodeId` в wishlist;
- флоу `SKU -> Wishlist -> INSTALLED -> Service Event`;
- отображение записи в журнале и влияние на расходы.

## Test data / target vehicles

Проверяем 4 засеянные модификации:

- BMW F 850 GS 2022
- BMW R 1250 GS 2023
- KTM 690 Enduro R 2022
- KTM 890 Adventure 2023

## API checks (executed)

### SKU search

- `GET /api/parts/skus?search=Motul` -> `200`, `4` SKU
- `GET /api/parts/skus?search=HF155` -> `200`, `2` SKU
- `GET /api/parts/skus?search=DID` -> `200`, `4` SKU

### Recommendations for tire nodes (executed)

Для каждой из 4 модификаций:

- `GET /api/vehicles/:id/node-tree` -> `200`
- `TIRES.FRONT` найден как leaf и находится под `WHEELS.FRONT`
- `TIRES.REAR` найден как leaf и находится под `WHEELS.REAR`
- `GET /api/parts/recommended-skus?vehicleId=:id&nodeId=:tiresFrontId` -> `200`, `4` рекомендации
- `GET /api/parts/recommended-skus?vehicleId=:id&nodeId=:tiresRearId` -> `200`, `4` рекомендации

## DB checks (executed)

- duplicate `PartSku` by (`brandName`,`canonicalName`,`partType`) -> `0`
- duplicate `PartNumber` by (`skuId`,`normalizedNumber`,`numberType`) -> `0`
- duplicate `PartSkuNodeLink` by (`skuId`,`nodeId`,`relationType`) -> `0`
- `TIRES.FRONT` leaf -> `true`
- `TIRES.REAR` leaf -> `true`

## Web QA checklist (manual)

1. Открыть wishlist modal на странице мотоцикла.
2. Проверить ручной SKU-поиск (Motul / HF155 / DID).
3. Для узла `WHEELS.FRONT > TIRES.FRONT` проверить:
   - рекомендации показываются;
   - есть front tire позиции;
   - CTA «Добавить в список покупок» работает.
4. Для узла `WHEELS.REAR > TIRES.REAR` проверить rear tire рекомендации.
5. Проверить node required:
   - попытка сохранить без узла блокируется;
   - ошибка: `Выберите узел мотоцикла`.
6. Создать wishlist item из рекомендации (проверить `skuId`, title/cost/currency/node заполнены).
7. Перевести позицию в `INSTALLED`:
   - открывается Add Service Event;
   - узел, дата, пробег/моточасы, `serviceType`, стоимость/валюта, комментарий предзаполнены.
8. Сохранить событие:
   - запись есть в Service Log;
   - стоимость видна в журнале;
   - блок расходов обновлён;
   - позиция не возвращается в active wishlist.

## Expo QA checklist (manual)

1. Открыть `vehicles/[id]/wishlist/new` или edit-экран.
2. Проверить SKU-поиск и рекомендации для `TIRES.FRONT` / `TIRES.REAR`.
3. Проверить node required и текст ошибки `Выберите узел мотоцикла`.
4. Добавить позицию из рекомендации -> убедиться, что заполнились `skuId`/узел/стоимость.
5. Перевести позицию в `INSTALLED` -> открыть prefilled Add Service Event.
6. Сохранить событие -> проверить журнал/расходы/отсутствие позиции в active wishlist.
7. Проверить, что клавиатура не перекрывает поля/кнопку сохранения (keyboard-aware поведение).

## Result table

| Scenario | Web result | Expo result | Pass/Fail | Notes |
|---|---|---|---|---|
| API: `search=Motul` returns SKU list | N/A | N/A | PASS | `200`, count `4` |
| API: `search=HF155` returns SKU list | N/A | N/A | PASS | `200`, count `2` |
| API: `search=DID` returns SKU list | N/A | N/A | PASS | `200`, count `4` |
| DB: no duplicate `PartSku` | N/A | N/A | PASS | duplicate groups `0` |
| DB: no duplicate `PartNumber` | N/A | N/A | PASS | duplicate groups `0` |
| DB: no duplicate `PartSkuNodeLink` | N/A | N/A | PASS | duplicate groups `0` |
| DB: `TIRES.FRONT` is leaf | N/A | N/A | PASS | `childrenCount=0` |
| DB: `TIRES.REAR` is leaf | N/A | N/A | PASS | `childrenCount=0` |
| BMW F 850 GS 2022: `TIRES.FRONT` under Wheels + recs | NOT RUN | NOT RUN | PASS (API) / TODO (UI) | API tree+recs OK (`4`) |
| BMW F 850 GS 2022: `TIRES.REAR` under Wheels + recs | NOT RUN | NOT RUN | PASS (API) / TODO (UI) | API tree+recs OK (`4`) |
| BMW R 1250 GS 2023: `TIRES.FRONT` under Wheels + recs | NOT RUN | NOT RUN | PASS (API) / TODO (UI) | API tree+recs OK (`4`) |
| BMW R 1250 GS 2023: `TIRES.REAR` under Wheels + recs | NOT RUN | NOT RUN | PASS (API) / TODO (UI) | API tree+recs OK (`4`) |
| KTM 690 Enduro R 2022: `TIRES.FRONT` under Wheels + recs | NOT RUN | NOT RUN | PASS (API) / TODO (UI) | API tree+recs OK (`4`) |
| KTM 690 Enduro R 2022: `TIRES.REAR` under Wheels + recs | NOT RUN | NOT RUN | PASS (API) / TODO (UI) | API tree+recs OK (`4`) |
| KTM 890 Adventure 2023: `TIRES.FRONT` under Wheels + recs | NOT RUN | NOT RUN | PASS (API) / TODO (UI) | API tree+recs OK (`4`) |
| KTM 890 Adventure 2023: `TIRES.REAR` under Wheels + recs | NOT RUN | NOT RUN | PASS (API) / TODO (UI) | API tree+recs OK (`4`) |
| Wishlist node required validation | NOT RUN | NOT RUN | PASS (API) / TODO (UI) | API: no node -> `400`, non-leaf -> `400`, clear node on PATCH -> `400` (all 4 variants) |
| SKU -> wishlist autofill (`skuId`, title, cost, currency, node) | NOT RUN | NOT RUN | PASS (API) / TODO (UI) | API create from tire recommendation returned filled `skuId`/`title`/`costAmount`/`currency`/`nodeId` (all 4 variants) |
| Wishlist -> INSTALLED -> prefilled Add Service Event | NOT RUN | NOT RUN | PASS (API-domain) / TODO (UI) | `createInitialAddServiceEventFromWishlistItem` prefill checks passed for all 4 variants |
| Service Log entry creation after save | NOT RUN | NOT RUN | PASS (API) / TODO (UI) | `POST /service-events` succeeded and event present in `GET /service-events` (all 4 variants) |
| Expense Summary update after save | NOT RUN | NOT RUN | PASS (API proxy) / TODO (UI) | В журнале у созданных событий `costAmount` совпадает; визуальный блок расходов требует ручной проверки UI |

## Notes

- Этот регресс-прогон покрывает выполненные автоматические проверки API/DB (в т.ч. `SKU -> wishlist -> INSTALLED -> service-event` на всех 4 модификациях) и фиксирует manual чеклист для web+Expo.
- В текущем прогоне изменений кода не вносилось; обновлена только QA-документация.
