# LUBRICA 1.0.32.2 — Calculation Evidence UX

## Цель
Продолжение UX consolidation без изменения Calculation Core. Устранена разница между «Обоснование» и «Источники» и восстановлена функциональность кнопки «Почему такой результат?». 

## Изменения
- Верхняя кнопка расчётного окна теперь единообразно называется **«Обоснование»** в простом и экспертном режимах.
- Кнопка **«Почему такой результат?»** больше не просто переключает режим. Она открывает обоснование текущего CalculationPackage.
- «Обоснование» и «Почему такой результат?» используют один механизм и одну трассировку результата.
- Окно показывает цепочку: объект → узел → подшипник → входные данные → методика → источники → результат.
- В окно попадают только sourceId, фактически связанные с текущим CalculationPackage; полный глобальный Source Registry остаётся отдельной функцией приложения.
- Для Tröster/Ventapp дополнительно отражается наличие или отсутствие machine-specific Ventapp source.
- Для конструкций без планового полного обновления это явно показывается в обосновании.
- В Unified Calculator Presenter термин «Источники» в верхнем переключателе заменён на «Обоснование» для дальнейшей системной унификации.

## Архитектурное ограничение
Расчётные формулы и OEM-методики не переносились в UI. UI только читает текущий результат/CalculationPackage и формирует его визуальную трассировку.

## Проверки
PASS:
- 1.0.32.2 Calculation Evidence UX
- 1.0.32.1 Calculation Result UX
- 1.0.31.18 current calculation source trace regression
- 1.0.31.19 Tröster automatic tf
- 1.0.31.16 Ventapp → Tröster priority
- 1.0.31.14 Tröster/Ferrari completion
- REITZ SNL context audit
- REITZ ZLG priority
- SKF SNL lubrication engine
- NSK auto-OEM resolver
- Source Integrity & Completeness: 39 sources / 37 datasets / 12 calculators / 34 traced claims
- preflight
