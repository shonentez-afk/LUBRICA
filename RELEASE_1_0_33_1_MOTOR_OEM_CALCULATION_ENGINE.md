# LUBRICA 1.0.33.1 — Motor OEM Calculation Engine

## Цель этапа

Выполнен отдельный расчётный контур для подшипников электродвигателей без изменения общей архитектуры LUBRICA. Модуль подключён через Calculation Framework с более высоким приоритетом, чем универсальный bearing-калькулятор, только когда точка действительно относится к электродвигателю.

Архитектурная цепочка сохранена:

`CalculationContext → Motor Method Resolver → CalculationPackage → MaintenancePolicy → Motor UI Presenter`

Расчётное ядро расположено отдельно в `motors/` и не зависит от `task-editor.js`, чтобы его можно было позже вынести в отдельный LUBRICA Calculator.

## Что найдено в фактической структуре

По `test/actual_components.json` найдено **240 записей электродвигателей/вибромоторов**, **62 уникальных нормализованных наименования**.

| Семейство | Количество | Текущая политика LUBRICA |
|---|---:|---|
| ABB (M2AA/M3AA/M2CA/M2VA/M2BAX/M2BA/M2QA) | 127 | OEM family guard; досмазывание только после подтверждения конструкции/пресс-маслёнок; для подтверждённых regreasable — ABB L1 |
| OLI MVE | 24 | Greased for life; плановое досмазывание не создаётся |
| QCA / QL / HQL и неидентифицированные | 24+ | Без OEM-идентификации числовая методика не назначается |
| EMOD WK | 16 | Требуется табличка/точная OEM-инструкция; high-speed guard |
| Siemens / Innomotics 1LE/1LA/1LG/1TZ | 13 | Machine-specific lubrication plate / exact instructions |
| SEW-EURODRIVE DRE | 5 | Для текущих DRE100/DRE132 — закрытые 2Z/2RS, плановое досмазывание не предусмотрено |
| ABB Robotics 3HAC | 4 | Не трактуется как обычный IEC motor; только exact OEM |
| Ercole Marelli | 1 | Требуется точная идентификация / OEM-документ |
| Прочие / generic | остальные | Требуется идентификация; cross-OEM запрещён |

Наиболее массовые позиции: ABB M2AA 112M4 B5 (20), M2AA 100LA4 B5 (15), M2VA 63A4 B14 (14), OLI MVE 1700/15 (12), OLI MVE 1400/15 (12), EMOD WK 160/2-215T 9000 rpm (12), ABB M2AA 80B4 B5 (10), ABB M2CA 280SA4 B3 (9).

## OEM-методики

### ABB

Локализованы правила конструкции и L1-таблица из официальных ABB manuals. Для M2AA 63–180 и M2AA 200 в цитируемом General Purpose catalogue штатная конструкция — shielded/permanently lubricated; grease nipples для 90–180 и M2AA 200 являются опцией. Для подтверждённо досмазываемого исполнения LUBRICA использует ABB L1: доза на подшипник + интервал по раме, оборотам, мощности и типу подшипника.

Приоритет: `табличка конкретного двигателя → подтверждённая конструкция ABB → ABB L1`.

### SEW-EURODRIVE

Для DR/DRE рам 71–280 официальная инструкция указывает закрытые 2Z/2RS подшипники, которые не подлежат досмазыванию. Поэтому DRE100M4 и DRE132MC4 из текущей структуры не получают ложное мероприятие досмазывания.

### OLI MVE

OLI Standard Range заявляет `Greased for life = Zero maintenance`; для MVE 1700/15 официальная техническая карточка также указывает `Greased for life: Yes`. Для MVE 1400/15 и 1700/15 плановое досмазывание не назначается.

### Siemens / Innomotics

Для 1LE/1LA/1LG/1TZ LUBRICA не выдумывает дозу/интервал по обозначению. Если двигатель оборудован системой досмазывания, вводятся значения с lubrication plate / точной OEM-инструкции и обязательный источник.

### EMOD WK и неизвестные OEM

Числовой расчёт блокируется до появления подтверждённой инструкции/таблички или фактических данных подшипника. Особенно для WK 6700/9000 rpm запрещён скрытый Universal fallback.

## Изменения в UI

Новый motor bearing calculator показывает:
- производитель, семейство, раму;
- обороты и мощность;
- подтверждение наличия пресс-маслёнок;
- тип подшипника для ABB L1;
- machine-specific дозу/интервал/смазку и обязательный источник;
- итоговую MaintenancePolicy: `NO_ROUTINE_RELUBE`, `RELUBE` или `REVIEW`;
- кнопку «Обоснование и локальные таблицы» с применёнными OEM-источниками.

## Изменения Candidate Finalizer

Для моторов LUBRICA больше не ставит DE/NDE как автоматически выбранные виртуальные точки. Пользователь должен подтвердить фактическую обслуживаемость. Для OEM-профиля `NO_ROUTINE_RELUBE` точки досмазывания автоматически не создаются.

## Source Registry / offline

Добавлены 5 источников и 5 offline datasets:
- MOTOR-ABB-LV-MANUAL / MOTOR-ABB-L1-V1
- MOTOR-ABB-GPM-2004 / MOTOR-ABB-CONSTRUCTION-V1
- MOTOR-SEW-DR / MOTOR-SEW-SEALED-V1
- MOTOR-OLI-MVE / MOTOR-OLI-MVE-V1
- MOTOR-SIEMENS-1LE / MOTOR-SIEMENS-PLATE-V1

Source Integrity теперь: **44 источника · 42 datasets · 13 calculator contracts · 39 traced claims**.

## Проверки

PASS:
- Preflight
- Calculation Framework
- Bearing Source Registry
- Source Integrity & Completeness
- REITZ ZLG priority
- REITZ SNL context audit
- Ventapp → Tröster priority
- Tröster tf offline chart + 2D digitization
- Motor OEM Calculation Engine

Старый `test_bearing_calculator.js` по-прежнему падает на известном legacy assertion `interval adjustments` и воспроизводится без изменений на исходной 1.0.32.16; это не регрессия моторного модуля.

## Первичные OEM-источники

- ABB Low Voltage Motors manual: https://library.e.abb.com/public/70a30c0d0999feacc1257dd90035cf07/LVStdMotorsManual_EN_01_2009.pdf
- ABB General Purpose Motors catalogue: https://library.e.abb.com/public/367c91cdc1dee017c1257b130057111e/Catalogue%20GenPurpMotors_GB_12_2004%20RevA.pdf
- SEW DR.71–315 Operating Instructions: https://download.sew-eurodrive.com/download/pdf/20074549.pdf
- OLI MVE Standard Range: https://www.olivibra.com/products/mve-standard-range/
- OLI MVE 1700/15E technical sheet: https://app.olivibra.com/en/technical-sheets/EE40170060A0JA0000/unit/D

- Siemens/Innomotics 1LE1 operating instructions: https://cache.industry.siemens.com/dl/files/362/32182362/att_1163295/v1/EN_1LE1_1FP1_1FP3_1PC1_1PC3_op_Instr_1123.pdf
