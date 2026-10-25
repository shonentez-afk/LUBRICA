# LUBRICA 1.0.30.6 — Bearing UI Context Regression

## Цель
Контекстный UI-regression всех подшипниковых сценариев после переработки экспертного калькулятора 1.0.30.5.

## Исправлено
- Семейства ZLG, SNL, Tröster, Ferrari integrated теперь взаимоисключающие в UI. Явно сохранённое `fanLubrication.housingFamily` имеет приоритет над устаревшим текстом имени точки.
- ZLG больше не получает контрол `Способ подачи смазки` SKF SNL, карточку `Корпус SKF` или таблицу SKF SNL.
- ZLG получил свой экспертный контекст `Конструкция и OEM-методика ZLG`; REITZ Table 11 остаётся раскрывающейся внутри ZLG-контекста.
- Для ZLG убрано архитектурное равенство `подшипник = маслёнка`: доза относится к OEM-позиции смазывания, а связь с физической маслёнкой берётся из подтверждённой конструкции.
- SNL сохраняет выбор способа подачи (`side` / `groove`) и собственные SKF/REITZ controls.
- Все fanLubrication-точки теперь получают производителя вентилятора из фактического equipment, а не только ZLG/SNL. Это исправляет контекст Ferrari integrated и Ventapp+Tröster.
- Ferrari integrated отображается как производитель узла Ferrari, если семейство явно задано как FERRARI.
- Для обычных подшипников, NSK housed units и VLU в простой сводке не показывается фиктивный `Подшипниковый узел: Не указан`; вместо этого отображается сам подшипник и его OEM.
- Для ZLG и VLU выбор производителя внутреннего подшипника убран из простого режима и остаётся экспертным параметром.
- Динамическая нумерация шагов сохранена. Generic fan block (Ferrari/Tröster/другая конструкция) участвует в последовательности экспертных шагов.

## Проверенные сценарии
1. REITZ + SNL + две раздельные опоры.
2. REITZ + ZLG combined block.
3. SKF SNL без REITZ.
4. Обычный rolling bearing / Universal fallback.
5. NSK housed bearing unit.
6. INA/Schaeffler VLU20.
7. Ferrari integrated fan bearing block.
8. Ventapp + Tröster combined block.
9. Generic/custom fan bearing arrangement.

## Не менялось
Расчётные таблицы, дозы, интервалы и operation/parameter-level OEM resolver 1.0.30.5 не изменялись. Это UI-context regression.

## Известный технический долг
Старый `test/test_bearing_calculator.js` продолжает падать на наследованной проверке `bearing unit warning`; эта проблема существовала до 1.0.30.6 и не связана с текущими UI-правками. Специализированные NSK/Multi-OEM tests проходят.
