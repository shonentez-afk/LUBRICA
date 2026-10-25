# LUBRICA 1.0.31.14 — Tröster / Ferrari OEM Method Completion

## Evidence gate before code
No numerical rule was added until it was tied to primary OEM documentation. SNR DLG is not used.

### Tröster + Ventapp evidence matrix
| Parameter | OEM value / rule | OEM | Document | Page/table | Applicability / LUBRICA rule |
|---|---|---|---|---|---|
| Entity relation | Bearing block is a separate component from fan | Tröster / project | Tröster Block Bearings maintenance + project configuration | whole document | Ventapp fan → Tröster bearing block; never merge entities |
| 31/33 T xx L construction | Product sheet lists reference bearing pairs, but states all rolling-bearing combinations can be realized | Tröster | Block Bearing 31/33 T xx L product data, 06/2019 | product table | Reference-only; never infer actual installed bearings from block marking |
| Relubrication quantity | Gperiod = 0.005 × D × B g | Tröster | Block Bearings Maintenance, 03/2020 | Maintenance and Lubrication | D/B must belong to confirmed actual internal bearing |
| Base interval | tf from OEM diagram by bearing type, bore d and rpm | Tröster | same | relubrication diagram | No invented interpolation/digitization; engineer enters confirmed tf |
| Temperature correction | halve interval for every +15 °C above 70 °C | Tröster | same | maintenance rule | automatic OEM correction |
| Vertical shaft | halve interval | Tröster | same | maintenance rule | automatic OEM correction |
| Maximum interval | >30,000 h not recommended | Tröster | same | maintenance rule | cap at 30,000 h |
| Grease | lithium-soap grease; normal range -35…+140 °C unless special lubricant; housing label identifies actual grease | Tröster | same | lubricant section | UI explains label is authoritative |
| Bearing temperature | must not exceed 120 °C | Tröster | same | operating limit | warning/maintenance constraint |
| >120 °C action | while rotating, flush with 2× initial fill | Tröster | same | corrective maintenance | corrective action only, not scheduled full renewal |
| Grease points on plant 31–33 T L | 2 physical nipples | plant-confirmed project rule | project configuration | n/a | preserved as two physical points; not evidence of two inferred bearing types |

Primary URLs: https://troester-maschinenbau.de/wp-content/uploads/2020/03/Blocklager_Wartungsanleitung_2020-03_en.pdf ; https://troester-maschinenbau.de/wp-content/uploads/2019/08/PDB-Blocklager-31-33-T-xx-L-engl.pdf

### Ferrari evidence matrix
| Parameter | OEM value / rule | OEM | Document | Page/table | Applicability / LUBRICA rule |
|---|---|---|---|---|---|
| Complete transmission | Use Transmission specifications / CART01 for grease quantity and interval | Ferrari | MVC 02 rev.5 / 2021 Centrifugal Fans Manual | §8.1 | CART01 overrides component values when explicitly available |
| Shaft-only version 1/6 | Published support/bearing/side-specific grease quantities and RPM intervals | Ferrari | same | Chart 8-2, p.70/127 | localized offline; exact support+bearing+side+RPM only; no interpolation |
| Harsh environment | reduce interval by approx. 40% or more depending on severity | Ferrari | same | §8.1 | automatic 0.6 only for explicitly selected heavy/severe class; more severe requires engineer confirmation |
| Ferrari own block | no cross-OEM substitution when exact Ferrari data absent | Ferrari + LUBRICA integrity rule | same + architecture policy | §8.1 | request CART01 or exact Chart 8-2 context |
| Ferrari fan + SKF SNL | Ferrari application data has priority if supplied; otherwise physical SNL remains SKF component method | Ferrari / SKF | Ferrari §8.1 + existing SKF SNL source | context resolver | separate `FERRARI_SNL` context; Ferrari does not erase SKF provenance |

Primary URL: https://www.ferrariventilatoren.de/wp-content/uploads/2023/02/Manuale-ventilatori-centrifughi-EN.pdf

## Gaps kept explicit
- No public Ventapp document found in the researched official/public sources that adds a numerical lubrication rule for the project Tröster blocks. Therefore no Ventapp numerical coefficient is invented.
- Tröster reference bearing combinations are not treated as installed-asset identification.
- Tröster relubrication curve is not approximated; `troesterBaseIntervalHours` remains an engineer-confirmed OEM-diagram input.
- Ferrari Chart 8-2 is not interpolated between RPM columns. Unsupported RPM requires CART01 or confirmed OEM input.
- No scheduled full-grease-renewal interval is invented for Tröster or Ferrari own blocks where OEM evidence does not publish one.

## Architecture
Preserved chain: CalculationContext → MethodResolver → CalculationPackage → MaintenancePolicy → UI Presenter.
Added/clarified contexts/methods: `TROESTER`, `FERRARI_FAN`, `FERRARI_SNL`; `TROESTER_BLOCK`, `FERRARI_CART01`, `FERRARI_CHART82`.

## Offline evidence / Source Registry
- `TROESTER-BLOCK-LUBRICATION-V1` upgraded with lubricant/temperature rules.
- `TROESTER-31-33-TL-REFERENCE-V1` added as reference-only product table.
- `FERRARI-FAN-BEARING-RULES-V1` upgraded.
- `FERRARI-CHART-8-2-V1` added with the complete locally represented Chart 8-2 rows.

## Audit / tests
- 1.0.31.14 Tröster/Ferrari completion: PASS.
- Source Integrity & Completeness: PASS — 38 sources, 37 datasets, 12 calculators, 33 traced claims.
- UX/UI integration audit: PASS.
- Unified calculator UI/UX: PASS.
- Preflight: PASS.
- REITZ ZLG priority: PASS.
- REITZ/SNL context: PASS.
- SKF SNL engine: PASS.
- NSK bearing units: PASS.
- Legacy `test_release_1_0_27_2_universal2.js` is obsolete against the current NSK housed-unit policy and is not used as the current acceptance gate; current NSK 1.0.26.5 and Source Integrity tests pass.
