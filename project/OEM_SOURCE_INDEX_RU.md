# LUBRICA — индекс OEM и технических источников

Цель файла — связать технический источник с тем, какую логику LUBRICA он подтверждает.

## Правила

Для каждого нового критичного источника фиксировать:
- производитель;
- модель/семейство;
- тип документа;
- где хранится локальная копия;
- какая логика LUBRICA от него зависит;
- статус проверки;
- есть ли unresolved-фрагменты.

## Izoteh PP-53736

| Производитель | Объект | Документ | Локальное хранение | Использование | Статус |
|---|---|---|---|---|---|
| Izoteh d.o.o. | PP-53736-YU1 | руководство | `assets/oem/izoteh/53736_Predpresa_RUS.pdf` | machine intervals, machine context, lubricant context | VERIFIED/PARTIAL |
| Izoteh d.o.o. | PP-53736 | drawing sheets | `assets/oem/izoteh/53736_predpresa_*.pdf` | machine topology, R77 group position hint 4×M1 + 4×M3 | VERIFIED AS HINT |
| SEW-EURODRIVE | K37/R77/KF37R17/S37 | OEM fill tables/local dataset | `components/gearbox-oem-data-*.js` + related evidence docs | oil quantity by mounting position | VERIFIED DATASET |
| Tandler | A1/HW A1 | machine/OEM reference | local evidence in project docs/dataset | 0.60 L reference, VG46 machine context | VERIFIED/PARTIAL |

Unresolved:
- raw запись `5000/500 h`: значение 500 не имеет доказанной трактовки;
- фактическое mounting position некоторых SEW узлов определяется по установленному узлу.

## Bearings / housed units

Подробные источники распределены по:
- `bearings/SOURCES_STAGE8.txt`
- `bearings/SOURCES_STAGE8_1.txt`
- `components/STARTER_CATALOG_SOURCES.txt`
- `calculations/SOURCES_LINEAR_BEARINGS.txt`
- release/evidence documents соответствующих версий.

Ключевое правило: данные не считаются универсальными только потому, что находятся в локальной таблице. Нужна проверка applicability к конкретному узлу.

## Fan OEM context

Зафиксированные проектные правила:
- Ferrari: собственные combined units и SNL возможны;
- Ventapp: Tröster confirmed context;
- SNR ZLG: фактическая конфигурация 2 nipples;
- Tröster 31–33 T L: 2 nipples;
- no virtual supports;
- direct drive не должен создавать отдельный ложный fan shaft/support.

## Поддержание индекса

Когда добавляется новый OEM-источник:
1. сохранить локальную копию или устойчивую ссылку;
2. занести источник сюда;
3. указать конкретный модуль/таблицу/расчёт, который на него опирается;
4. добавить тест или acceptance, если источник влияет на runtime.
