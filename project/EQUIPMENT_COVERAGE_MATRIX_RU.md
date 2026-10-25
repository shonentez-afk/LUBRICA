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
| SEW K37 | READY/PARTIAL | OEM fill table M1–M6, interval handling | фактическое mounting position подтверждать по узлу |
| SEW R77 standalone | READY/PARTIAL | OEM fill table, revision invalidation, PP-53736 hints | Line 1 R77 #5–#8 подтвердить физически |
| SEW KF37R17 | READY/PARTIAL | две независимые oil cavities, planning total only | подтверждать фактическое M1–M6 |
| SEW S37 | READY/PARTIAL | OEM fill table, motor-token protection | подтверждать фактическое M1–M6 |
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
| Izoteh PP-53736 | READY/PARTIAL | full machine profile, 102 bearing positions, 8 chains, 4 screws, 13 gearbox-oil points | close open mounting-position items and full-machine acceptance |

## Правило обновления

При добавлении нового конструктора, OEM-таблицы или расчётного модуля обязательно обновить эту матрицу.
