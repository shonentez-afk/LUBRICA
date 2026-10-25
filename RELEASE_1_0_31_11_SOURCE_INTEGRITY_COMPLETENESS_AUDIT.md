# LUBRICA 1.0.31.11 — Source Integrity & Completeness Audit

## Цель
Закрыть Source Registry Audit по критерию: каждый реально используемый расчётный метод, коэффициент, табличное значение или диагностический порог должен иметь явное происхождение либо быть явно классифицирован как пользовательский/измеренный ввод без скрытого OEM-происхождения.

## Что добавлено
- Новый runtime-аудит `calculations/source-integrity-audit.js`.
- Матрица 12 активных расчётных семейств и их допустимых источников.
- 29 прослеживаемых расчётных утверждений (`claim`) с цепочкой `calculator/method → sourceId → datasetId → parameter ownership`.
- Проверка отсутствующих sourceId, datasetId, необъяснимых активных записей реестра и конфликтов `supports`.
- Существующий offline coverage gate включён в общий итоговый Source Integrity gate.

## Закрытые пробелы
### Linear bearings
- Добавлен `THK-LINEAR-LUBRICATION` и локальный паспорт `THK-LINEAR-LUBRICATION-V1` для reference 100 km / 3–6 months.
- Добавлен `HIWIN-LINEAR-GUIDE` и `HIWIN-LINEAR-GUIDE-RULES-V1` для +50% quantity rule при vertical / side / rail-up.
- В расчётный результат добавляется sourceId только когда соответствующее правило реально выбрано.

### Chains
- Добавлен `LUBRICA-CHAIN-ENGINEERING` и dataset `LUBRICA-CHAIN-ENGINEERING-V1`.
- Зафиксировано, что масштабирование 3 ml/m от 10B-1 и поправки условий — инженерная ветка LUBRICA, а не OEM-таблица.
- Результаты цепного калькулятора теперь возвращают sourceId для Tsubaki и инженерной ветки LUBRICA.

### Screw jacks
- Добавлен `LUBRICA-SCREW-JACK-PROFILE` и dataset `LUBRICA-SCREW-JACK-PROFILE-V1`.
- Локализованы база 500 циклов, коэффициенты среды/интенсивности и нижний guard 50 циклов.
- Интервал винтовой пары теперь хранит sourceId/datasetId инженерного профиля, отдельно от OEM FRANCIA.

### Central lubrication
- Диагностический порог ±10% вынесен в `LUBRICA-DIAGNOSTIC-THRESHOLDS` / `LUBRICA-DIAGNOSTIC-THRESHOLDS-V1`.
- Явно отмечено: это UI diagnostic rule, а не OEM tolerance.

## Source UI completeness
- Chain Sources: iwis + Tsubaki + ISO/Renold + LUBRICA engineering.
- Screw Jack Sources: FRANCIA + LUBRICA screw-jack profile.
- Ball Screw Sources: THK product data + THK lubrication guidance.
- Linear Bearing Sources: THK product data + THK lubrication guidance + HIWIN orientation rule.
- Coupling Sources: Falk/Rexnord.
- Grease Point, Oil System, Open Gear, Wire Rope: Source Registry не открывается без зарегистрированного расчётного источника; значения остаются user/measurement-confirmed.
- Central Lubrication Sources: только диагностический LUBRICA threshold; фактическая подача остаётся измеренным/подтверждённым вводом.

## Классификация записей, не являющихся активной числовой веткой
Следующие записи сохранены намеренно и больше не считаются orphan:
- `SKF-HOUSED` — product reference;
- `FAG-HOUSED` — product reference;
- `TIMKEN-HOUSED` — product reference;
- `FAG-WL81115` — legacy reference;
- `ENG-FALLBACK` — explicit engineering fallback;
- `LUBRICA-SOURCE-INVENTORY` — internal audit.

## Итог автоматического аудита
- Source Registry entries: 35
- Offline datasets: 33
- Calculation contracts: 12
- Traced calculation claims: 29
- Starter table rows under offline control: 99
- Missing sourceId: 0
- Missing datasetId: 0
- Empty FULL_DATASET: 0
- Unexplained active registry sources: 0
- Parameter support conflicts: 0
- Result: PASS

## Ограничение
Полнота означает полноту текущей реализованной расчётной кодовой базы LUBRICA. Это не означает, что в программу скопированы все каталоги всех OEM. Если новая модель, OEM-таблица или метод добавляется позже, integrity gate должен потребовать отдельную регистрацию источника и dataset/provenance до включения автоматического результата.

## Regression baseline
Расчётные формулы и ранее утверждённые числовые baseline REITZ/SKF/NSK/NTN-SNR/Schaeffler/SEW/UNIT DRIVE не изменялись этим этапом. Изменения затрагивают provenance, полноту реестра и явную классификацию скрытых инженерных коэффициентов.
