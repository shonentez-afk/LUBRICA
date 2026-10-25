# LUBRICA 1.0.32.6 — Point Card Consolidation & Evidence Text Flow

## База
Изменения выполнены поверх 1.0.32.5 без изменения Calculation Core, OEM-методик и Source Registry данных.

## Point Card Consolidation
- Сохранены четыре вкладки: Точка / Мероприятие / Анализ / Расчёт.
- Каждая вкладка получила явную роль и краткое пользовательское пояснение.
- Статус текущего мероприятия перенесён из вкладки «Точка» во вкладку «Мероприятие», чтобы не смешивать состояние физической точки и утверждение операции.
- Вкладка «Расчёт» оформлена как итоговый слой; кнопка называется «Подробнее».
- Нижняя панель действий сокращена до трёх основных элементов: «+ Мероприятие», «Сохранить», «⋯».
- «Дублировать», «Заполнить по аналогу» и «Удалить» перенесены в меню дополнительных действий без удаления существующих обработчиков.

## Обоснование расчёта
- Исправлен контейнер прокрутки: прокручивается единый viewport списка источников, а не отдельные карточки.
- Карточки источников больше не имеют внутреннего clipping/фиксированной высоты.
- Длинные формулы, применимость, примечания и подписи переносятся по строкам и остаются полностью доступными.
- Локальные таблицы и OEM-кнопки сохранены.

## Архитектурное правило
UI не содержит новых расчётных формул. Calculation Core / MethodResolver / CalculationPackage / MaintenancePolicy не изменялись.

## Проверки
- JS syntax: PASS (`js/app.js`, `lubrication/task-editor.js`, `bearings/source-registry.js`).
- UX audit: PASS, duplicate IDs = 0, detail tabs = 4.
- 1.0.32.1 Calculation Result UX: PASS.
- 1.0.32.2 Calculation Evidence UX: PASS.
- 1.0.32.3 evidence runtime hotfix: PASS.
- 1.0.32.4 local dataset visibility: PASS.
- Source Integrity: PASS — 39 sources / 37 datasets / 12 calculators / 34 claims.
- Tröster/Ferrari, Ventapp→Tröster, Tröster auto-tf, REITZ ZLG, REITZ SNL, SKF SNL: PASS.
- Preflight: PASS.
- Full `test/run_all.sh` reaches existing baseline failure `oil change material mode` in `test_candidate_finalization.js`; the same failure reproduces unchanged on 1.0.32.5 and is not introduced by 1.0.32.6.
