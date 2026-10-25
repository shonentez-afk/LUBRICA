# LUBRICA 1.0.33.9 — Task Status Dedup UX

## Исправлено
- Удалён второй жёлтый/зелёный статусный баннер из вкладки «Мероприятие».
- Единственным источником статуса workflow в боковой карточке оставлен верхний `pointWorkflowSummary`.
- `renderWorkflowUX()` больше не обновляет удалённый `detailBanner`.
- Поля мероприятия теперь начинаются сразу после пояснения вкладки, без повторения того же статуса.

## Область изменения
- `index.html`
- `lubrication/task-editor.js`
- `test/test_release_1_0_33_9_task_status_dedup_ux.js`

Расчётная логика, OEM-методики, CalculationPackage и синхронизация мероприятий не изменялись.
