# LUBRICA 1.0.31.15 — Tröster Point Bearing Source

## Изменение
Для контекста `Ventapp fan → Tröster bearing block` геометрия подшипника (`d/D/B`) теперь берётся только из подшипника, явно выбранного в текущей точке смазки.

Резервный путь через `fanLubrication.internalBearings` для Tröster отключён. Он сохранён для старых не-Tröster сценариев, где это поведение уже использовалось, чтобы не создавать регрессию существующей архитектуры.

## Правило расчёта
`Tröster bearing block → current lubrication point → selected actual bearing → D/B → Gperiod = 0.005 × D × B`.

Маркировка Tröster определяет OEM-контекст, но не внутренний подшипник. Две пресс-маслёнки остаются двумя физическими точками. Каждая точка рассчитывается по собственному выбранному подшипнику.

Если в точке подшипник не выбран или его D/B неизвестны, числовая доза Tröster блокируется. Автоматический подбор по маркировке блока или по списку `internalBearings` не выполняется.

## Аудитируемость
В сохранённом расчёте добавлены поля:
- `bearingGeometrySource: POINT_BEARING`;
- `pointBearingDesignation` — обозначение подшипника, использованного для геометрии.

Это позволяет проверить происхождение D/B без изменения существующей цепочки `CalculationContext → MethodResolver → CalculationPackage → MaintenancePolicy → UI Presenter`.

## Проверки
PASS:
- новый guard-тест источника подшипника точки;
- Tröster/Ferrari 1.0.31.14 compatibility;
- Tröster/Ferrari completion;
- REITZ ZLG priority;
- REITZ SNL context;
- REITZ SNL parameter fallback;
- SKF SNL lubrication engine;
- NSK housed/unit targeted tests;
- Source Integrity: 38 sources / 37 datasets / 12 calculators / 33 claims;
- preflight.

Два старых legacy-теста (`test_bearing_calculator.js` и `test_release_1_0_27_2_universal2.js`) уже не проходят на исходной 1.0.31.14 из-за более поздних изменений ожидаемой логики/сообщений. Это подтверждено сравнительным запуском исходной базы; текущая правка Tröster их не вызвала.
