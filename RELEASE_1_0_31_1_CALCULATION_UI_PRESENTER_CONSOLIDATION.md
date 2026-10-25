# LUBRICA 1.0.31.1 — Calculation UI Presenter Consolidation

## Цель
Закрепить архитектуру 1.0.31 на уровне интерфейса: расчётная семантика берётся из `CalculationPackage`, `CalculationContext`, `MethodPlan` и `MaintenancePolicy`, а не определяется повторно визуальным слоем.

## Реализовано
- Добавлен `calculations/ui-presenter.js` — единый registry-driven presenter.
- Presenter читает `CalculationPackage.methodPlan`, parameter provenance и lifecycle полного обновления.
- Матрица методик теперь доступна не только SNL, но и другим текущим/будущим расчётным контекстам.
- Состояния `CALCULATED`, `FALLBACK_AVAILABLE`, `PARTIAL_OEM`, `REVIEW_REQUIRED`, `CONDITION_BASED`, `NOT_APPLICABLE` имеют единое представление.
- Для условий эксплуатации presenter явно разделяет параметры, влияющие на активную методику, и параметры, сохраняемые только как контекст.
- Финальный UI-pass выполняется после legacy detail rendering, поэтому центральная семантика экрана принадлежит presenter.

## Задел расширения
Без изменения `task-editor.js` можно регистрировать новые:
- calculation methods / OEM;
- maintenance operations (`inspection`, `cleaning`, `oilChange`, `automaticLubrication` и будущие);
- lifecycle states;
- operating-condition metadata.

Это extension points, а не утверждение, что перечисленные будущие операции уже имеют расчётную реализацию.

## Regression baseline
Числовые формулы 1.0.31 не менялись. Сохранены контрольные результаты REITZ/SNL, REITZ/ZLG и существующие UI-context regression tests.
