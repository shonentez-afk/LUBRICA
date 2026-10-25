# LUBRICA 1.0.32.1 — Calculation Result UX

База: LUBRICA 1.0.31.19.

## Цель
Упростить обычный сценарий расчёта без изменения Calculation Core и OEM-методик.

## Изменения
- Простой режим получил отдельный верхний уровень «Рекомендация»: рабочая доза + периодичность.
- Второй уровень показывает краткое человеческое объяснение: изготовитель/методика, подшипник, обороты, узел.
- Технические формулы, коэффициенты, OEM-матрица, provenance и ручные переопределения остаются в экспертном режиме.
- Для полной замены в простом режиме используется компактная строка. Если операция не применяется, отображается «планово не предусмотрена» вместо большой карточки.
- Кнопка «Источники» в простом режиме подписана как «Обоснование», чтобы не смешивать пользовательский сценарий с глобальным Source Registry.
- Расчётная архитектура и порядок OEM/fallback не изменены.

## Архитектурное правило
UI не выполняет расчётные формулы. Он отображает уже рассчитанный результат из существующего CalculationPackage/result. Это сохраняет возможность последующего извлечения Calculation Core в отдельное приложение.

## Проверки
- JavaScript syntax check: PASS.
- New 1.0.32.1 Calculation Result UX contract: PASS.
- Tröster automatic tf regression: PASS.
- renewalLifecycle TDZ regression: PASS.
- Ventapp UI integration: PASS.
- Current calculation source trace UX: PASS.
- Expert result simplification UX: PASS.
- UX/UI integration audit regression: PASS.
- Source Integrity & Completeness: PASS — 39 sources, 37 datasets, 12 calculator contracts, 34 traced claims.
- SKF SNL engine: PASS.
- REITZ ZLG priority: PASS.
- REITZ SNL context/fallback: PASS.
- NSK auto-OEM resolver: PASS.
- Application preflight: PASS.

Старый тест `test_release_1_0_30_3_calculation_ui_ux.py` содержит устаревшее ожидание строки версии `multi-oem-1.0.30.5-expert-context-operation-resolver`; текущая база 1.0.31.19 уже использует более новую calculationVersion, поэтому этот конкретный assert не является регрессией 1.0.32.1.
