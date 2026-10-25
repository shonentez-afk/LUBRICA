# LUBRICA 1.0.33.21 — Housed Unit Fleet / Universal Coverage

## Цель
Закрыть фактические корпусные подшипниковые узлы из рабочей базы предприятия и провести их через уже принятую логику **LUBRICA Universal Bearing Maintenance Method**, без создания отдельного расчётного движка.

## Что исправлено
- Добавлены встроенные reference-записи для фактически встречающихся в базе: `UKF 212`, `UKF 216`, `UKFC 211`, `UKFC 215`, `UKFL 205`, `FY 50 TF`, `FY 50 TR`, `FYTB 20 TF`.
- Сохранены ранее добавленные `UCPA 210` и `UKHA 212`.
- `UKFC 211D` / `UKFC 215D` нормализуются к базовому узлу `UKFC211` / `UKFC215`; суффикс `D` сохраняется как исполнение с закрытой торцевой крышкой и не создаёт отдельный тип подшипника.
- SKF-семейства `FY` / `FYTB` распознаются как `bearing_unit`.
- `housedUnitCode()` расширен на `UCPA`, `UKHA`, `FY`, `FYTB`, поэтому для них работает тот же anti-overgreasing reference LUBRICA Universal, что и для UCP/UKF/UKFC/UKFL.
- Политика обслуживания остаётся `housed_relube_only`: рабочий результат — досмазывание; полная замена не создаётся автоматически.
- Reference-геометрия не используется как доказательство производителя установленного узла. Для generic UK-серий источник хранится как family reference.

## Фактическая проверка базы
По JSON `Филиал_завода__Техно__г._Юрга(20260914-091326).json` найдено 26 уникальных наименований `Узел подшипниковый ...`; после изменения все 26 распознаются встроенной библиотекой, unmatched = 0.

## Проверка Universal
- `UCPA210` -> 4.6 г, `housed_construction_reference`, `housed_relube_only`.
- `UKHA212` -> 8.5 г, `housed_construction_reference`, `housed_relube_only`.
- `UKF216` -> 15.5 г, `housed_construction_reference`, `housed_relube_only`.
- `FY50TF` -> 4.6 г, `housed_construction_reference`, `housed_relube_only`.
- `FYTB20TF` -> 1.1 г, `housed_construction_reference`, `housed_relube_only`.

## Источники геометрии/reference
- SKF Y-bearings and Y-bearing units: FY / FYTB, YAR insert mapping.
- LFD Bearing Units Product Catalog: UKF / UKFL family rows.
- FYH / Koyo family catalog data: UKFC rows and cover suffix semantics.

Важно: эти источники подтверждают типоразмер/семейство. Они не должны автоматически присваивать производителю установленного на предприятии узла чужой OEM-статус.
