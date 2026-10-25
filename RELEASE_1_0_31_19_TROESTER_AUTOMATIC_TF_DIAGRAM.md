# LUBRICA 1.0.31.19 — Tröster Automatic tf Diagram

## Исправлено
- В простом режиме Tröster больше не требует ручного ввода базового `tf`.
- Для `Ventapp → Tröster` при отсутствии machine-specific интервала Ventapp используется автоматическое чтение локализованной диаграммы Tröster по фактическому подшипнику точки, его типу, `d` и рабочим оборотам.
- Ventapp machine-specific OEM остаётся приоритетом над Tröster.
- `Gperiod = 0,005 × D × B` по-прежнему использует `D/B` только выбранного подшипника текущей точки.
- В UI показаны базовый tf, шкала диаграммы и входные `d/rpm`; ручной ввод tf скрыт из простого режима.
- В Source Registry набор `TROESTER-BLOCK-LUBRICATION-V1` повышен до v3 / FULL_DATASET.

## Прослеживаемость
Первичный источник: Tröster Maschinenbau GmbH, Assembly and Maintenance Instructions for Block Bearings, 2020-03, раздел 3 и диаграмма `Diagram for Determining Relubrication Intervals` (стр. 7 PDF). Диаграмма задаёт шкалы I/II/III для radial ball / cylindrical roller / spherical roller bearings, зависимость от `d` и `n`, а также OEM-поправки ×0,5 для вертикальной установки и каждого полного +15°C выше 70°C.

Оцифрованное чтение графика является локальным представлением опубликованной OEM-диаграммы, а не новой формулой Tröster. В результате показывается допуск оцифровки ±15%.
