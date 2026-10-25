# LUBRICA 1.0.31.14 — Tröster + Ferrari OEM Method Completion Audit

Дата проверки: 2026-09-10
База: LUBRICA_RELEASE_1_0_31_13_TROESTER_FERRARI_OEM_CALCULATION.zip

## 1. Правило доказательности

Изменения выполнены без изменения принятой архитектуры `CalculationContext → MethodResolver → CalculationPackage → MaintenancePolicy → UI Presenter`. Числовые OEM-значения вводятся в код только там, где они опубликованы OEM. Если параметр не опубликован, LUBRICA либо требует его ввода/подтверждения, либо сохраняет явно маркированный инженерный fallback. Cross-OEM подмена запрещена.

## 2. Tröster + Ventapp — доказательная таблица

| Параметр | Значение / правило | OEM / уровень | Документ | Страница / таблица | Применимость |
|---|---|---|---|---|---|
| Связь оборудования | `Ventapp fan → Tröster bearing block` | Правило предприятия | Подтверждено заказчиком проекта | — | Только фактическая конфигурация предприятия; не выдаётся за публичное OEM-утверждение |
| Количество пресс-маслёнок | 2 для фактически используемых 31–33 T L | Правило предприятия | Подтверждено заказчиком проекта | — | Физические точки обслуживания; не используется для вывода числа внутренних подшипников |
| Конструкция 31/33 T xx L | Конструкция подбирается под нагрузку; возможны разные комбинации подшипников качения | Tröster, OEM product data | `PDB-Blocklager-31-33-T-xx-L-engl.pdf` | p.1, таблица типоразмеров и примечание о design according to specific load | Справочная идентификация; нельзя определять фактические внутренние подшипники только по маркировке блока |
| Заводская смазка | Подшипники поставляются предварительно смазанными; стандартно литиевая мыльная смазка, специальная — по соглашению; фактический тип на наклейке корпуса | Tröster OEM | `Blocklager_Wartungsanleitung_2020-03_en.pdf` | p.1 | Для идентификации смазки при обслуживании |
| Рабочий температурный диапазон стандартной смазки | -35…+140 °C | Tröster OEM | тот же | раздел Lubrication | Только если не задан специальный lubricant |
| Максимальная температура подшипника | 120 °C, измеренная на rolling bearing | Tröster OEM | тот же | раздел Lubrication | Ограничение эксплуатации |
| Доза досмазывания | `Gperiod = 0.005 × D × B` [г] | Tröster OEM | тот же | формула в разделе Relubrication | Только по D и B фактически подтверждённого внутреннего подшипника |
| Базовый интервал | `tf` определяется диаграммой по типу подшипника, bore d и rpm | Tröster OEM | тот же | Diagram for Determining Relubrication Intervals | LUBRICA не интерполирует кривые и требует подтверждённый tf |
| Горизонтальное положение / температура диаграммы | Диаграмма относится к горизонтальной установке при max 70 °C | Tröster OEM | тот же | примечание к диаграмме | Базовая область диаграммы |
| Температурная поправка | ×0.5 за каждый полный шаг +15 °C выше 70 °C | Tröster OEM | тот же | примечание к диаграмме | Без придумывания дробной интерполяции между шагами |
| Вертикальная установка | ×0.5 к интервалу | Tröster OEM | тот же | примечание к диаграмме | Только vertical installation |
| Максимальный интервал | >30 000 h не рекомендуется | Tröster OEM | тот же | примечание к диаграмме | LUBRICA ограничивает результат 30 000 h |
| Перегрев >120 °C | Немедленно восстановить смазывание, промыть свежей смазкой и ввести двойное initial fill при вращении | Tröster OEM | тот же | раздел Lubrication | Корректирующая аварийная операция, не плановая полная замена |
| Плановая полная замена | Конкретный период/масса не опубликованы в найденной инструкции | GAP | — | — | LUBRICA не создаёт фиктивный цикл полной замены |

Официальные URL:
- https://troester-maschinenbau.de/en/downloads/
- https://troester-maschinenbau.de/wp-content/uploads/2020/03/Blocklager_Wartungsanleitung_2020-03_en.pdf
- https://troester-maschinenbau.de/wp-content/uploads/2019/08/PDB-Blocklager-31-33-T-xx-L-engl.pdf

### Tröster — найденные пробелы

1. Публичная Tröster-инструкция не подтверждает число пресс-маслёнок именно для каждой фактической модификации предприятия. Значение 2 хранится как подтверждённое правило предприятия для используемых 31–33 T L, а не как OEM-таблица.
2. Диаграмма `tf` опубликована графически. Чтобы не создавать ложную точность, кривые не оцифрованы формулой; пользователь вводит значение `tf`, снятое с OEM-диаграммы для фактического типа подшипника, d и rpm.
3. Периодическая полная замена смазки с фиксированным интервалом OEM в найденном документе не задана.
4. Точная внутренняя комбинация подшипников конкретного блока должна подтверждаться шильдиком, документацией агрегата или разборкой/осмотром; справочная таблица 31/33 T xx L не используется как факт установки.

## 3. Ferrari — доказательная таблица

| Параметр | Значение / правило | OEM / уровень | Документ | Страница / таблица | Применимость |
|---|---|---|---|---|---|
| SN/ST support factory fill | Опоры SN/ST, собранные Ferrari, поставляются с правильным количеством lubricant согласно Chart 8-1 | Ferrari OEM | `Manuale-ventilatori-centrifughi-EN.pdf`, MVC 02 rev.5 | section 8.1, Chart 8-1 | Ferrari SN/ST supports |
| Комплектный вентилятор с transmission | Интервал и количество брать из transmission specifications, приложенных к вентилятору (CART01) | Ferrari application OEM | тот же | section 8.1 | CART01 имеет приоритет для конкретного вентилятора |
| Version 1 / 6 shaft-only without transmission | Использовать Chart 8-2 | Ferrari application OEM | тот же | Chart 8-2 | Только точное совпадение support + side + bearing + опубликованный rpm |
| Chart 8-2 | Локализованы опубликованные строки доз и интервалов | Ferrari application OEM exact table | тот же | Chart 8-2 | Интерполяция rpm запрещена; при отсутствии точной колонки требуется CART01/подтверждённое значение |
| Неблагоприятная среда | Dusty/damp/hot/corrosive: уменьшить интервал примерно на 40% или больше в зависимости от тяжести | Ferrari OEM | тот же | section 8.1 | 40% — опубликованная приблизительная нижняя поправка; дополнительное сокращение не выдумывается |
| Стандартная смазка | SHELL GADUS S3 V100 2 | Ferrari OEM | тот же | section 8.1 | Если конкретная документация не задаёт иное |
| Низкая температура < -20 °C | Bechem Berutox или equivalent | Ferrari OEM | тот же | section 8.1 | Специальный температурный режим |
| Fluid temperature >300 °C | Gadus S2 U 460 L2; всегда сверяться с CART01 | Ferrari OEM | тот же | section 8.1 | Высокотемпературное исполнение |
| Ferrari + SKF SNL | Ferrari-specific CART01 переопределяет только заданные application-level параметры; при отсутствии Ferrari-specific значения физический корпус остаётся в SKF SNL methodology | Архитектурное правило LUBRICA, основанное на разделении application OEM и component OEM | Ferrari manual + существующий SKF SNL registry | operation-level resolver | Не смешивает источник: каждый результат хранит собственный sourceManufacturer |
| Собственный Ferrari integrated block | Не подменять SKF/SNL/Tröster; без CART01 или точной применимой Chart 8-2 числовой результат блокируется | Cross-OEM safety rule | Ferrari manual + правила проекта | — | Для Ferrari own/integrated bearing blocks |

Официальный URL:
- https://www.ferrariventilatoren.de/wp-content/uploads/2023/02/Manuale-ventilatori-centrifughi-EN.pdf

### Ferrari — найденные пробелы

1. Не все собственные Ferrari bearing blocks сводятся к опубликованным строкам SN/ST Chart 8-2. Для неизвестной собственной маркировки расчёт блокируется до CART01/точной OEM-документации.
2. Один корпус не трактуется автоматически как один подшипник или одна точка смазывания.
3. Для Ferrari+SKF SNL Ferrari считается application OEM, SKF — component/housing OEM. Источник сохраняется отдельно на уровне каждой операции.

## 4. Реализованные изменения

- Сохранена архитектура `CalculationContext → MethodResolver → CalculationPackage → MaintenancePolicy → UI Presenter`.
- Добавлена локальная Tröster 31/33 reference-таблица как `REFERENCE_ONLY`; она отделена от maintenance-method source.
- Tröster dose: `0.005×D×B`; interval: подтверждённый `tf` + OEM temperature/orientation corrections + 30 000 h cap.
- Tröster full-renewal policy не выдумывается; >120 °C хранится как corrective procedure.
- Добавлен cross-OEM guard: в конфигурации предприятия Tröster допускается только при fanManufacturer=Ventapp.
- Локализована Ferrari Chart 8-2; lookup exact-only, без interpolation.
- Ferrari own block: `CART01` или точная `Chart 8-2`; иначе blocked.
- Ferrari+SKF SNL: operation-level override — CART01 Ferrari имеет приоритет только там, где значение реально задано; незаданные SNL операции продолжают использовать SKF с provenance SKF.
- UI простого/экспертного режима поясняет различие application OEM и component OEM и не предлагает молчаливую подмену.
- Source Registry разделяет `TROESTER-BLOCK-BEARING` и `TROESTER-31-33-TL-DATASHEET`; Ferrari source содержит CART01 rule + локальную Chart 8-2.

## 5. Аудит и тесты

### Technical methodology audit
PASS — формулы/таблицы применяются только в подтверждённой области; отсутствующие OEM-параметры не синтезируются.

### Cross-OEM isolation audit
PASS — Tröster/Ventapp guard; Ferrari own block не падает в SKF; Ferrari+SNL использует operation-level provenance.

### UX/UI audit
PASS — простая форма показывает только необходимые сценарные поля; экспертный выбор Ferrari разделяет CART01 и Chart 8-2; Tröster явно просит OEM `tf`.

### Source Integrity Audit
PASS — 38 registry sources, 37 offline datasets, 12 calculator contracts, 33 traced claims.

### Regression
PASS на актуальных тестах: REITZ ZLG, REITZ SNL, SKF SNL, NTN-SNR ZLG, NSK, calculation architecture/Universal, offline localization, UX/UI integration.

Примечание по legacy test `1.0.27.2 Universal`: он уже падает на исходном ZIP 1.0.31.13 из-за более позднего сознательного изменения NSK housed behavior; это не регрессия данной версии. Дополнительно выполнено прямое сравнение текущего Universal standard-bearing результата с нетронутой 1.0.31.13: dose=20.15 g, interval=995 h, policy и method plan идентичны.

## 6. Запреты и границы

- SNR DLG не используется в Tröster/Ferrari методиках.
- Tröster не считается производителем вентилятора.
- Ferrari own block не считается SNL без фактического подтверждения корпуса SNL.
- Reference-таблица Tröster не превращается в automatic bearing inference.
- Ferrari Chart 8-2 не интерполируется.
- Неопубликованный OEM full-renewal cycle не создаётся.
