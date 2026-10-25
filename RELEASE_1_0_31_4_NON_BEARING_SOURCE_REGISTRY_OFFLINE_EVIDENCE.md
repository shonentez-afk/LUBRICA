# LUBRICA 1.0.31.4 — Non-Bearing Source Registry & Offline Evidence

Расширяет Source Registry за пределы подшипников без изменения расчётных формул.

## Добавлено
- SEW-EURODRIVE: локальный dataset объёмов масла по монтажным положениям из уже оцифрованных starter data.
- Roller chain B-series: локальный размерный dataset, отделённый от методики/дозы смазывания.
- FRANCIA M42VR: локальные данные отдельных смазочных режимов редукторной части и винт/гайка.
- UNIT DRIVE: локальный dataset оцифрованных объёмов из стр. 62, табл. 31–32, где данные присутствуют в проекте.
- Новые записи доступны в общем Source Registry и через Offline Evidence.

## Архитектурное правило
Product data не считается calculation method. Локальная таблица хранит provenance и не превращает отсутствующий OEM-интервал в выдуманный.
