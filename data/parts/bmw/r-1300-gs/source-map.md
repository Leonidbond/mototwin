# Source map — BMW R 1300 GS / KA1 / 2024–present

## Target region

- **Primary target region:** EU
- **MotoTwin support level:** MVP staging batch (bootstrap)
- **Notes:** US dealer catalogs used only as bootstrap; rows stay `NEEDS_REVIEW` for EU/RU until cross-checked with EU EPC/dealer sources.

## Primary official sources

| Source | Type | Region | URL | Access | Use |
| --- | --- | --- | --- | --- | --- |
| BMW Motorrad R 1300 GS — Technical data | OFFICIAL_PUBLIC_CATALOG | GLOBAL | https://www.bmwmotorcycles.com/en/models/adventure/r1300gs/technicaldata.html | Public | Tire sizes, drive type, battery type by market |
| BMW Motorrad Repair Manual R 1300 GS (0M21) | OFFICIAL_PUBLIC_CATALOG | GLOBAL | https://manuals.bmw-motorrad.com/manuals/BA-Extern/IN/BA-INTERNET-COM/PDF/R_0M21_RM_0223_01.pdf | Public | Oil/brake-fluid/coolant specs, Telelever, shaft drive |
| BMW AOS / EPC | OFFICIAL_EPC | EU | — | Dealer login not used | Optional live re-verification |
| RealOEM.com — BMW Motorcycle Parts Catalog | OFFICIAL_EPC | GLOBAL | https://www.realoem.com/bmw/enUS/select?product=M&series=KA1 | Secondary fitment cross-check (partxref) |
| BMW Motorrad Parts Catalog (bike-parts-bmw.com) | OFFICIAL_EPC | GLOBAL | https://www.bike-parts-bmw.com/ | KA1/0M21 microfiche — all 12 EPC anchors with diagram_position |

## Public dealer / bootstrap sources

| Source | Type | Region | URL | Use |
| --- | --- | --- | --- | --- |
| BMW Motorcycle eStore (bmwestore.com) | OFFICIAL_DEALER_PUBLIC_CATALOG | US | https://www.bmwestore.com/ | US bootstrap: filters, rear brake pads, OEM part pages |
| BMW of Tri-Valley — CalMoto | AUTHORIZED_DEALER | US | https://bmwparts.calmoto.com/ | US bootstrap: front brake pads |
| Europe-Moto | AUTHORIZED_DEALER | EU | https://bmw.europe-moto.com/ | EU bootstrap: brake discs, battery |
| Hermy's BMW SuperShop | AUTHORIZED_DEALER | EU | https://bmwsupershop.com/ | EU bootstrap: spark plug fitment table |
| bike-parts-bmw.com | OFFICIAL_DEALER_PUBLIC_CATALOG | EU | https://bike-parts-bmw.com/ | EU cross-check: oil filter, air filter, front brake pads (KA1/0M21 diagrams) |
| BMW Motorcycles of Grand Rapids | AUTHORIZED_DEALER | US | https://shop.bmwmcgr.com/ | US cross-check: air filter 13725A72844 |
| Recambios y Accesorios BMW | AUTHORIZED_DEALER | EU | https://www.recambiosyaccesoriosbmw.com/ | EU cross-check: AGM battery 61218389125 |

## Russian / regional sources

| Source | Type | Region | URL | Use |
| --- | --- | --- | --- | --- |
| — | — | RU | — | No RU dealer source in this batch; availability validation pending |

## Reference-only sources

| Source | Type | Region | URL | Why reference only |
| --- | --- | --- | --- | --- |
| Europe-Moto maintenance blog — R 1300 GS | REFERENCE_ONLY | EU | https://bmw.europe-moto.com/en/blog-bmw-motorrad/bmw-r-1300-gs-complete-maintenance-guide-n230 | Cross-check only; not imported as primary evidence |

## Source decisions

- **Primary for this batch:** OFFICIAL_EPC anchors (RealOEM + bike-parts-bmw microfiche) + dealer cross-check rows.
- **Cross-check:** US bmwestore/CalMoto for bootstrap; EU Europe-Moto/Hermy's for regional confirmation.
- **Excluded:** Reference blog as CSV evidence; BMW AOS dealer login pending.

## Model identifiers

| Field | Value |
| --- | --- |
| Model slug | `r-1300-gs` |
| Generation | KA1 |
| Type codes | 0M21, 0M23 |
| Years (MotoTwin scope) | 2024–present |
| Drive | Shaft (cardan) — chain/sprocket nodes N/A |
| Front suspension | BMW Telelever — telescopic fork seal/oil nodes N/A |

## Risks / uncertainties

1. **Front brake disc:** Two staging rows — `34118881343` (cast/cross-spoke) vs `34117105037` (Enduro forged); mutually exclusive per wheel option.
2. **Rear brake pads:** eStore lists `34217108470` for 2022–2026 BMW-Motorrad range; explicit R 1300 GS diagram fitment not verified in EPC.
3. **Battery:** Two staging rows — Li-ion `61215A64DC8` vs AGM `61218389125`; mutually exclusive per factory configuration.
4. **Coolant:** Spec row + EU/US OEM SKU `83515A87B45` (1.5L); US gallon `82141467704` is separate legacy shop SKU — not motorcycle EPC PN.
5. **Brake fluid:** Spec row (DOT 4 LV) + EU/US OEM SKU `83105A87362`; US+EU cross-check complete.
6. **Air filter:** Resolved — correct PN `13725A72844` (US BOM had truncated `13725A7284`); bike-parts-bmw KA1 diagram + US dealer match.
