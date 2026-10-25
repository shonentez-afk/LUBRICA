# LUBRICA 1.0.28.5 — Motor Tree Dedup UX

- Убран визуальный дубль одноимённого узла электродвигателя под импортированным Motor Asset.
- Существующие node/LP/task ID и расчётные данные не мигрируются и не пересоздаются: технический node только схлопывается в дереве.
- DE/NDE, привязанные через `componentBinding.sourceComponentId` к компоненту с `candidateEquipmentType = motor`, отображаются как «Подшипник электродвигателя», даже когда родительская позиция имеет тип `fan`.
- Fan Asset, Fan Bearing Arrangement и direct-drive логика 1.0.28.4 не изменены.
