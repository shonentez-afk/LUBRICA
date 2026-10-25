# LUBRICA 1.0.33.5 — Remaining Motor Fleet Coverage

## Цель
Продолжение Motor OEM Calculation Engine без изменения CalculationContext → MethodResolver → CalculationPackage → MaintenancePolicy → UI Presenter. Выполнен дополнительный аудит трёх загруженных XLSX и закрыты ещё две фактически встречающиеся группы: OEMER HQL 160 и Interroll 138i.

## Фактический аудит трёх XLSX
Для расширенного фильтра, включающего строки «электродвигатель», «мотор-редуктор», «мотор-барабан» и «вибромотор», найдено 173 строки и 72 уникальных сочетания «производитель + нормализованное обозначение».

Текущий motor resolver распределяет эти строки так:
- 81 — `NO_ROUTINE_RELUBE`;
- 57 — `CONFIRM_NIPPLE`;
- 16 — `ABB_L1_STANDARD`;
- 4 — `MACHINE_PLATE`;
- 15 — `REQUIRE_IDENTIFICATION`.

Таким образом, 154 из 173 строк уже имеют автоматическую конструктивную/OEM-политику без необходимости придумывать числовые значения. Ещё 4 строки идентифицированы по OEM, но требуют табличку конкретной машины. 15 строк намеренно остаются без автоматической методики до точной идентификации.

## OEMER HQL 160
Официальный каталог OEMER GC012024 для HQL 160 публикует штатные подшипники:
- DE: `6312ZZC3`;
- NDE: `6311ZZC3`.

В exploded view HQL 80–160 grease valves не показаны; для HQL/HQLa 180–280 они показаны явно. Поэтому LUBRICA применяет к стандартной HQL160 конструкции construction-policy `NO_ROUTINE_RELUBE`. Это помечено как инженерная трактовка LUBRICA по подтверждённой OEM-конструкции, а не как отдельное числовое OEM-предписание. Исполнения TBH/roller/special требуют точных данных конкретного мотора.

## Interroll 138i
Официальный каталог Interroll прямо определяет 138i как:
- maintenance-free;
- lifetime lubricated.

Поэтому для фактических 138i в загруженных таблицах routine bearing relubrication не создаётся. Неизвестный motor-drum `165E` не приравнивается к Interroll по внешнему сходству обозначения.

## Что уже закрыто предыдущим моторным этапом и сохранено
- ABB M2AA / M2CA / M2VA / M3AA / M2BAX — серия/рама/конструкция и ABB L1 там, где применимо;
- SEW DRE/DRS и legacy DR/DV — закрытые стандартные подшипники без ложных точек досмазывания;
- Lammers/MEZ 1TZ — отдельная OEM-ветка, без смешивания с Siemens;
- Siemens/Innomotics 1LE — basic sealed construction либо lubrication plate для regreasable варианта;
- Siemens 1LG — machine-specific guard до подтверждения точной инструкции/таблички;
- EMOD WK 6700/9000 об/мин — строгий high-speed guard;
- OLI MVE — lifetime lubricated / zero routine maintenance.

## Намеренно оставленные пробелы
Автоматическая OEM-методика не назначается для:
- QCA 90 / QCA 112;
- generic 71B4 / 100LB4;
- KA7250M-CB01B-Z;
- motor-drum 165E;
- полностью безымянных «Электродвигатель».

Причина: недостаточная первичная OEM-идентификация. Cross-OEM подстановка запрещена.

## Source Registry / Offline Evidence
Добавлены:
- `MOTOR-OEMER-HQL-2024` → `MOTOR-OEMER-HQL160-BEARINGS-V1`;
- `MOTOR-INTERROLL-138I` → `MOTOR-INTERROLL-138I-V1`.

Итог Source Integrity: 54 источника, 52 offline datasets, 13 калькуляторов, 46 трассируемых утверждений.

## Проверки
PASS:
- Remaining Motor Fleet Coverage 1.0.33.5;
- Motor Fleet OEM Coverage 1.0.33.4;
- Motor UX Parity;
- Motor OEM Calculation Engine;
- Motor Framework Integration;
- Motor Source Registry;
- Source Integrity & Completeness;
- REITZ ZLG;
- REITZ SNL;
- SKF SNL;
- Ventapp → Tröster;
- Tröster 2D;
- preflight.
