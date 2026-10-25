# LUBRICA 1.0.31.16 — Ventapp machine-specific OEM priority

## Что исправлено

Для цепочки `Ventapp fan → Tröster bearing block → lubrication point → фактический подшипник` введён параметрический приоритет OEM конкретного вентилятора Ventapp.

- Если для конкретной машины зафиксированы доза и источник Ventapp, доза берётся из Ventapp.
- Если для конкретной машины зафиксированы интервал и источник Ventapp, интервал берётся из Ventapp.
- Если один из параметров Ventapp отсутствует, только этот параметр возвращается к подтверждённой методике Tröster.
- Числа Ventapp без заполненного поля источника не получают OEM-приоритет и игнорируются расчётным resolver.
- Смазочный материал Ventapp сохраняется как machine-specific OEM context.
- Отсутствие производителя внутреннего подшипника больше не переводит Tröster/Ventapp в инженерный LUBRICA, если OEM-контекст блока/машины подтверждён.
- Подшипник Tröster по-прежнему берётся только из текущей точки; список внутренних подшипников блока не используется как автоматическая подмена.
- В шапке калькулятора производитель вентилятора теперь синхронизируется после выбора в форме.

## Приоритет

`Ventapp machine-specific OEM parameter → Tröster OEM parameter → explicit engineering fallback only when required`

Приоритет применяется отдельно к дозе и интервалу. Это исключает ситуацию, когда наличие только одного значения Ventapp блокирует использование Tröster для другого параметра.

## Source Registry

Добавлен источник `VENTAPP-MACHINE-LUBRICATION`. Он не содержит универсальной числовой таблицы Ventapp. Числовые значения допустимы только как данные конкретной машины с зафиксированным идентификатором таблички, Lubrication Instructions или другого OEM-документа конкретного вентилятора.

Официальная публичная точка производителя: https://www.ventapp.de/

## Проверки

- Ventapp full override dose + interval: PASS
- Ventapp partial override / Tröster per-parameter fallback: PASS
- Ventapp numeric values without source ignored: PASS
- Unknown internal bearing manufacturer does not downgrade Tröster/Ventapp OEM context: PASS
- Tröster 1.0.31.15 point-bearing guard: PASS
- Tröster/Ferrari 1.0.31.14 regression: PASS
- REITZ ZLG regression: PASS
- REITZ SNL regression: PASS
- SKF SNL regression: PASS
- NSK auto-OEM regression: PASS
- Bearing UI context regression: PASS
- Source Registry: 39 sources: PASS
- Source Integrity: 39 sources / 37 datasets / 12 calculators / 34 traced claims: PASS

Legacy `test_release_1_0_27_2_universal2.js` remains an already-existing stale test and fails identically on the 1.0.31.14/1.0.31.15 baseline because later housed-bearing behavior intentionally changed its historical expectation.
