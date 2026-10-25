# LUBRICA 1.0.33.2 — ABB Fleet Bearing Mapping

## Цель

Второй этап Motor OEM Calculation Engine: углубить ABB-ветку по фактическому парку предприятия, не подменяя конструкцию двигателя универсальной формулой.

Архитектура не изменена:

`CalculationContext → Motor Method Resolver → CalculationPackage → MaintenancePolicy → Motor UI`

## Фактический ABB-парк

В `test/actual_components.json`: 127 ABB двигателей.

Основные семейства:
- M2AA — 80;
- M2VA — 14;
- M3AA — 11;
- M2CA — 17;
- M2QA — 2;
- M2BA — 2;
- M2BAX — 1.

После этапа 1.0.33.2 для 124 из 127 записей определена подтверждённая OEM-конструкция или OEM-политика семейства. Три записи (M2BA/M2BAX) оставлены в REVIEW, потому что текущих первичных источников недостаточно для безопасного автоматического назначения именно их исполнения.

## Что локализовано

### M2AA

Для фактических рам 80, 90, 100, 112, 132, 160 и 200 локализованы штатные DE/NDE из ABB General Purpose Motors catalogue.

Примеры:
- M2AA 80 → DE 6204-2Z/C3 · NDE 6203-2Z/C3;
- M2AA 90 → DE 6205-2Z/C3 · NDE 6204-2Z/C3;
- M2AA 100 → DE 6306-2Z/C3 · NDE 6205-2Z/C3;
- M2AA 112M4 → DE 6206-2Z/C3 · NDE 6205-2Z/C3;
- M2AA 132M4/S4/SA2 → DE 6208-2Z/C3 · NDE 6206-2Z/C3;
- M2AA 160 → DE 6309-2Z/C3 · NDE 6209-2Z/C3;
- M2AA 200 → DE 6312-2Z/C3 · NDE 6209-2Z/C3.

Стандартная shielded/permanent конструкция не превращается автоматически в точку досмазывания. Для исполнений, где ABB допускает grease nipple option, LUBRICA по-прежнему требует подтверждение фактической пресс-маслёнки.

### M2VA

Для текущего M2VA 63A4 B14:
- DE 6202-2Z/C3;
- NDE 6201-2Z/C3;
- permanent grease lubrication.

Политика: `NO_ROUTINE_RELUBE`.

### M3AA

Для рам 160–250 используются OEM DE/NDE и политика permanently lubricated shielded bearings. Для фактических M3AA 200MLA2 и 225SMB4 плановое досмазывание не создаётся.

Для M3AA 280 сохранён отдельный regreasable-контур и ABB L1; шильдик имеет приоритет для специального варианта подшипника.

### M2CA

Для фактических M2CA 280SA4 / 315SA4 / 315MB4 локализована серия Steel:
- M2CA 280, 4–12 полюсов → DE 6316/C3 · NDE 6316/C3;
- M2CA 315, 4–12 полюсов → DE 6319/C3 · NDE 6316/C3.

ABB указывает штатные regreasing nipples, поэтому дополнительное ручное подтверждение наличия маслёнок для этих базовых исполнений не требуется. После идентификации применяется ABB L1.

Для 1500 об/мин:
- frame 280, ball bearing → 40 г / 9600 ч;
- frame 315, ball bearing → 55 г / 7600 ч.

Эти значения являются строками ABB L1, а не универсальной формулой.

### M2QA

Для M2QA 71–132 официальный marine catalogue задаёт sealed 2RS construction. Поэтому текущие M2QA 132MB6 получают `NO_ROUTINE_RELUBE`. Точное DE/NDE обозначение не выдумывается и остаётся данными шильдика.

## UI

В Motor Calculator добавлена карточка `Штатная конструкция ABB`:
- DE;
- NDE;
- OEM-политика конструкции;
- пояснение о необходимости проверки шильдика/опции.

Пользователь видит конструкцию до применения расчёта и может открыть локализованные таблицы через `Обоснование`.

## ABB L1

Исправлена локализация крупных рам 280/315. Теперь L1 учитывает разные ABB-строки для high-speed и 1500/1000 rpm, а также отдельную M3AA-строку 280 из OEM manual.

## Source Registry

Добавлены:
- `MOTOR-ABB-STEEL-2003` + `MOTOR-ABB-M2CA-BEARINGS-V1`;
- `MOTOR-ABB-M3AA-2022` + `MOTOR-ABB-M3AA-BEARINGS-V1`;
- `MOTOR-ABB-MARINE-2005` + `MOTOR-ABB-M2QA-CONSTRUCTION-V1`.

Итого после этапа:
- 47 источников;
- 45 offline datasets;
- 13 calculator contracts;
- 39 traced claims.

## Cross-OEM guard

Не изменён. ABB-таблицы не применяются к Siemens/Innomotics, EMOD, OLI, SEW и неизвестным OEM. Machine-specific rating plate имеет приоритет над family mapping.

## Проверки

PASS:
- ABB Fleet Bearing Mapping 1.0.33.2;
- Motor OEM Calculation Engine 1.0.33.1 regression;
- Motor Framework Integration;
- Motor Structure Inventory;
- Motor Source Registry + Offline Evidence;
- Source Integrity & Completeness;
- REITZ ZLG priority;
- REITZ SNL context audit;
- Ventapp → Tröster priority;
- Tröster tf offline chart + 2D digitization;
- Preflight.

## Первичные OEM-источники

1. ABB Low Voltage General Purpose Motors, Aluminum GB 12-2004.
2. ABB General Purpose Motors, Steel GB 09-2003.
3. ABB Process performance aluminum motors, 9AKK105944 EN 02-2022.
4. ABB Low Voltage Marine Motors EN 12-2005.
5. ABB Manual for Low Voltage Motors 01-2009 — L1 lubrication table.
