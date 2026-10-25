# LUBRICA 1.0.27.28 — Universal 3.2 Version Synchronization

Цель релиза: синхронизировать все **текущие** ссылки на подшипниковую методику LUBRICA Universal с канонической версией **3.2**, не переписывая исторические сохранённые расчёты.

Изменено:
- `lubrication/task-editor.js`: в простом и экспертном режиме отображается `LUBRICA Universal 3.2`; предупреждение anti-overgreasing также ссылается на 3.2.
- `bearings/multi-oem-data.js`: текущий источник `LUBRICA_UNIFIED` переименован в `LUBRICA Universal Bearing Maintenance Method 3.2`.
- `bearings/calculator.js`: служебная подпись housed-unit reference синхронизирована с `Universal 3.2`.
- Текущая версия расчётного движка поднята до `multi-oem-1.0.27.28`, чтобы ранее утверждённые результаты 3.0/3.1/предыдущих engine revisions корректно определялись как требующие пересчёта.

Не изменено:
- Исторические сохранённые расчёты пользователя не переименовываются автоматически.
- Значения доз, интервалов и OEM-правила не менялись этим релизом.
- Политики `housed_relube_only`, `standard_serviceable_bearing` и slewing-ring logic сохранены.
