# LUBRICA 1.0.33.49 — Oscillating / Linkage Integration Hotfix

## Назначение

Версия 1.0.33.49 исправляет интеграционные дефекты, найденные полным аудитом 1.0.33.48, без изменения общей архитектуры LUBRICA.

## Исправлено

### 1. Scoped lifecycle для точек и мероприятий
- При повторном подтверждении конструктора удаляются устаревшие точки и мероприятия, созданные именно Oscillating / Linkage Engine.
- Очистка ограничена префиксом `equipment:<rootId>:osc_*` и не затрагивает чужие/ручные точки оборудования.
- Удалённые мероприятия удаляются из активных `routes[].taskIds`.
- Исторические route revisions, checklist history и frozen planning snapshots не переписываются.

### 2. Контекст классификатора
- Удалено слабое правило «единственная система качания в area/line = родитель любого подходящего элемента».
- Привязка выполняется только по подтверждённому контексту: явный `oscillatingContextRootId`, иерархия/ancestor или однозначный номер линии.
- Посторонние тяги, кронштейны и подобные элементы больше не должны попадать в чужую систему качания только из-за нахождения в той же зоне.

### 3. Manual SKF SNL parity
- Ручной сценарий сохраняет `bearingHousing.family = SNL` и фактическую маркировку корпуса.
- Task Editor учитывает generic housing context и передаёт ручной SNL в существующий SKF SNL lifecycle.
- Отдельный Bearing Engine не создавался.

### 4. Семантика соединений
- Разделены состояния `Необслуживаемый` и `Нет соединения`.
- Старое значение `none` продолжает читаться и мигрируется в `non_serviceable`.

### 5. Удаление ручных элементов
- Сохранённый manual oscillating-element можно удалить при повторном открытии мастера.
- Удаление ограничено элементами с `origin=manual`, `componentType=manual_oscillating_element` и `manualOscillatingKey`.
- Компонент не удаляется, если на него всё ещё ссылается существующая точка.

### 6. Packaging / документация
- Восстановлены нормальные UTF-8 имена production-файлов:
  - `01_СОСТАВ_АРХИВА.md`
  - `02_РУКОВОДСТВО_ПО_КОДУ.md`
  - `Создать ярлык LUBRICA.bat`
- Developer docs обновлены до 1.0.33.49 и дополнены описанием Oscillating lifecycle.

## Регрессия

Официальный интеграционный контур: 99 stages — 98 PASS / 0 FAIL / 1 SKIP.
SKIP: Source XLSX audit, поскольку исходные производственные XLSX отсутствуют в тестовой среде.

Standalone JavaScript release tests: 116 PASS / 36 historical baseline FAIL / 152. Новых FAIL нет.
Standalone Python tests: 67 PASS / 13 historical baseline FAIL / 80. Новых FAIL нет; два прежних packaging FAIL исправлены.

## Известные ограничения

- Frozen route revisions и уже созданные planning snapshots не переписываются при удалении generated task; UI существующей архитектуры показывает `revisionOutdated` для устаревшего планового snapshot.
- Полный production Source XLSX audit требует исходных XLSX предприятия.
