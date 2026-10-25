# LUBRICA 1.0.33.55 — Gearbox Oil tc Scope Hotfix

## Причина
В `calculations/gearbox-oil-adapter.js` функция `applyAutoInterval()` объявляла `tc` только внутри отдельных веток Rossi/Bonfiglioli, но затем обращалась к `tc` после выхода из этих блоков. В runtime это приводило к `ReferenceError: tc is not defined` при открытии/пересчёте модуля `gearbox-oil`.

## Исправление
- `temperatureClass` теперь считывается один раз в общей области видимости `applyAutoInterval()`.
- Удалены локальные дублирующие объявления `tc` в ветках Rossi и Bonfiglioli.
- Сохранена существующая OEM-логика интервалов Rossi, Bonfiglioli, SEW и generic gearbox.
- Добавлен runtime regression test `test/test_release_1_0_33_55_gearbox_tc_scope.js`, который воспроизводит Bonfiglioli 95–110 °C и generic auto interval.

## Не относится к дефекту
Предупреждение «Для этого мероприятия необходимо выбрать смазочный материал из справочника» остаётся штатной валидацией при сохранении мероприятия, которому требуется материал. Оно не является причиной падения расчётного модуля.
