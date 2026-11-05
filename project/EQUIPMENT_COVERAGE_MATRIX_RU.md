# LUBRICA — матрица покрытия оборудования

Этот файл показывает, какие типы оборудования и узлов уже покрыты рабочей инженерной логикой, какие покрыты частично и где остаются пробелы.

## Статусы

- **READY** — есть рабочая логика, источники/данные и regression-защита.
- **PARTIAL** — логика есть, но покрытие неполное или зависит от ручного подтверждения.
- **SOURCE_REQUIRED** — структура/узел известны, но недостаточно подтверждённых OEM-данных.
- **PLANNED** — направление определено, но реализация ещё не закончена.

## Подшипники

| Область | Статус | Что уже есть | Что проверить/расширять |
|---|---|---|---|
| Rolling bearings | READY | Multi-OEM library, расчёт досмазывания, периодичности, full renewal | расширять по реальному парку |
| Housed units | READY/PARTIAL | SKF/SNL, NSK housed, fleet additions | сохранять housing context, не подменять корпус по похожему обозначению |
| SNR ZLG | PARTIAL | machine/fan rules, 2 nipples | расширять только по подтверждённым моделям |
| Tröster blocks | PARTIAL | Ventapp-context, 2 nipples, formula support | не применять вне подтверждённого Ventapp-контекста |
| Ferrari combined units | PARTIAL | учтён отдельный OEM-контекст | расширять по фактическим обозначениям |
| Sealed bearings 2RS | READY | защита от автоматической периодической досмазки для подтверждённых sealed cases | контролировать новые sealed designations |

## Редукторы

| Производитель/семейство | Статус | Что уже есть | Что осталось |
|---|---|---|---|
| SEW K37 | READY | OEM fill table M1–M6; пользователь выбирает монтажное положение при конфигурации, объём подставляется автоматически; interval handling | расширять только по новым исполнениям/OEM-источникам |
| SEW R77 standalone | READY | OEM fill table, revision invalidation, PP-53736 drawing hints; M1–M6 выбирается пользователем при конфигурации | сохранять hint как предупреждение, не как автоматическую подмену |
| SEW KF37R17 | READY | две независимые oil cavities; M1–M6 выбирается при конфигурации; объёмы полостей подставляются автоматически; planning total only | сохранять раздельную заливку двух полостей |
| SEW S37 | READY | OEM fill table M1–M6; выбор положения при конфигурации; motor-token protection | расширять только по новым исполнениям/OEM-источникам |
| Bonfiglioli | READY/PARTIAL | recognition, fill/interval fixes | расширять по реальному парку |
| Rossi MRV63 | READY/PARTIAL | fill/interval logic | расширять по установленным моделям |
| Tandler A1/HW A1 | READY/PARTIAL | 0.60 L reference, VG46 machine context | не смешивать A1/EA1/B1 без подтверждения |

## Цепи

| Область | Статус | Что уже есть | Что осталось |
|---|---|---|---|
| B-series roller chain | READY | 08B–28B, designation normalization, universal chain logic | расширять по фактическому парку |
| PP-53736 12B-2 | READY | 8 circuits, lengths, machine profile | field verification if geometry changes |
| Chain scraper conveyor | READY/PARTIAL | constructor and targeted regression | расширять для новых типов |

## Винтовые механизмы

| Область | Статус | Что уже есть | Что осталось |
|---|---|---|---|
| Francia screw jack | READY/PARTIAL | lubrication logic + simple UX | новые OEM only by source |
| PP-53736 lift screws | READY | 4 physical screws, 800 h | full machine acceptance |

## Электродвигатели

| Область | Статус | Что уже есть | Что осталось |
|---|---|---|---|
| Motor OEM engine | READY/PARTIAL | fleet mapping, unified cards, task sync, provenance | расширять по реальному моторному парку |

## Конвейеры и машины

| Объект | Статус | Что уже есть | Что осталось |
|---|---|---|---|
| Generic conveyor | READY/PARTIAL | arrangement engine, 4 supports, manual parity | field-specific extensions |
| Chain scraper conveyor | READY/PARTIAL | dedicated constructor | expand from real equipment |
| Fan arrangements | READY/PARTIAL | no virtual supports, OEM-specific rules | add new manufacturers modularly |
| Izoteh PP-53736 | READY | full machine profile; full-machine acceptance PASS; 102 bearing positions, 8 chains, 4 screws, 13 gearbox-oil points; routes/runtime planning/export verified; 5000/500 h resolved; all SEW M1–M6 handled by configuration workflow | расширять только при изменении реальной машины/документации |

## Правило обновления

При добавлении нового конструктора, OEM-таблицы или расчётного модуля обязательно обновить эту матрицу.

## Пробелы конструкторов по производственной базе 2026-11-05 (Stage 5)

Полный аудит: [EQUIPMENT_CONSTRUCTOR_GAP_AUDIT_20261105_RU.md](EQUIPMENT_CONSTRUCTOR_GAP_AUDIT_20261105_RU.md). Среди 1188 `equipment`: `conveyor` — 293, `fan` — 28, `spindle` — 32, `rotating_shaft` — 12, `other` — 812. `other` включает структурные и несмазываемые объекты, не является числом пропущенных конструкторов.

| Машина/семейство | Статус конструктора | Следующая задача |
|---|---|---|
| Центрифуги и маслораспылители шпинделей | **PLANNED** — сейчас только Rotating / element-level | Centrifuge + spindle lubrication composition, фактическая подача масла, источники |
| Роликовые/ламельные/шнековые конвейеры | **PARTIAL** — не подтверждена применимость двухвальной схемы | Расширить Conveyor Arrangement для разных физических layouts |
| Пилы, гильотины, каретки резки | **PLANNED** — element-level | Saw / Cut & Traverse с каретками, направляющими и опорами |
| Колосниковые и дозирующие питатели | **PLANNED** — элементные расчёты | Feeder Arrangement по фактическим валам и приводам |
| Щеточная очистка / очистка ламелей | **PLANNED** — вращающиеся узлы | Brush/Cleaning Arrangement |
| Штабеллеры / механизмы упаковки и подъёма | **PLANNED** — элементные узлы | Handling/Stacker Composition |
| Измельчители LINDNER VEGA 1500 | **SOURCE_REQUIRED** | Shredder Rotor после OEM/осмотра |
| Насосы / гидростанции | **PARTIAL** — `pump_oem_check` / `oil_system` | Oil System Arrangement без вымышленных полостей |
| Мотор-редукторы / мотор-барабаны | **PARTIAL** — элементные шаблоны | Drive-unit Composition с OEM-подтверждением |

Не расширять `Fan`, `PP53736`, `Conveyor` или OEM через перенос не подтверждённой физической схемы. Сначала `Stage 5A` — read-only gap control; затем приоритетные конструкторы по оборудованию реальных линий.
