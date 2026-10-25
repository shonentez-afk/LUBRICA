# LUBRICA 1.0.33.58 — полный OEM-аудит парка редукторов

**Источник парка:** `Филиал_завода__Техно__г._Юрга(20260918-053235).json`  
**Объект аудита:** все фактические редукторы и мотор-редукторы рабочей базы + текущее поведение справочника/gearbox resolver LUBRICA 1.0.33.58.  
**Принцип:** OEM-данные и первичные руководства имеют приоритет; если конкретный объём зависит от исполнения, ступеней, положения, шильдика или интеграционной полости, значение не выбирается автоматически.

## 1. Резюме

- Уникальных фактических обозначений: **186**.
- Фактических экземпляров в парке: **335**.
- Критических по домену смазки: **6** экземпляров.
- Конфликт производителя в исходных данных: **19** экземпляров.
- Строк с обнаруженным parser-дефектом/неоднозначностью: **32** экземпляров.
- Главный вывод: cross-OEM guard в 1.0.33.58 нужен и должен остаться, но библиотека количественных OEM-данных неполна; часть редукторов вообще относится не к обычному `gearbox_oil`.

### Распределение по результату OEM-аудита

| Статус | Экземпляров | Смысл |
|---|---:|---|
| `OEM_GUIDE_SINGLE` | 127 | OEM-таблица даёт одно применимое ориентировочное значение при известных исходных данных. |
| `MOUNTING_REQUIRED` | 42 | Нужно фактическое монтажное положение. |
| `OEM_FACTORY_CHARGE` | 35 | OEM задаёт заводскую/long-life заправку. |
| `OEM_GUIDE_OPTIONS` | 35 | OEM даёт несколько значений; автоматический выбор запрещён без дополнительного признака. |
| `OEM_TECH_SUPPORT_REQUIRED` | 30 | OEM прямо не публикует универсальный объём для этого размера/исполнения. |
| `MANUFACTURER_CONFLICT` | 19 | Исходный производитель конфликтует с обозначением. |
| `COMPOUND_GEAR_UNIT_CONFIRM` | 10 | Составной редуктор; нельзя брать объём одного корпуса. |
| `OEM_PRODUCT_CARD_SINGLE` | 8 | Есть точная product-card/SKU привязка. |
| `LEGACY_TYPECODE_MOUNTING_REQUIRED` | 7 | Нужен legacy type-code/material number и положение. |
| `CUSTOM_CONFIGURATION_CONFIRM` | 6 | Кастомная конфигурация; нужен exact datasheet/nameplate. |
| `WRONG_DOMAIN` | 6 | Это не обычная масляная ванна gearbox_oil. |
| `INSUFFICIENT_IDENTIFICATION` | 4 | Недостаточная идентификация. |
| `LUBRICANT_TYPE_CONFIRM` | 3 | Сначала подтвердить oil/grease execution. |
| `LIFETIME_LUBRICATED` | 2 | Заводская пожизненная смазка; периодическая замена масла не должна создаваться. |
| `MOUNTING_SEMANTICS_CONFIRM` | 1 | Код в обозначении нельзя без проверки трактовать как монтажное положение. |

## 2. Критические исправления архитектуры

1. **ABB/Nabtesco RV40E/RV450E/RV400C:** убрать из обычного `gearbox_oil`; это precision cycloidal reducer с grease-политикой. Объём зависит от ориентации и присоединённой полости.
2. **ZIMM Z-50-SN:** убрать из обычного `gearbox_oil`; это винтовой домкрат/редуктор с synthetic fluid grease, а смазка винта — отдельная операция.
3. **Lenze GKS04:** frame size 04 пожизненно смазан; не создавать периодическую замену масла.
4. **Bonfiglioli MVF:** исправить parser: в `B14 B8`, `B5 B6`, `B5 B3` первый B-код может быть моторным фланцем; фактическое монтажное положение — последующий монтажный код.
5. **Rossi MRV:** 19 экземпляров в исходной структуре помечены как Bonfiglioli, хотя обозначение `MR V ... UO3A` соответствует Rossi. Не исправлять молча в исходной структуре, но блокировать Bonfiglioli-методику до подтверждения.
6. **UI:** если положение уже распознано, но количественной OEM-таблицы нет, сообщение должно быть «OEM-объём для этой конфигурации не внесён / требуется подтверждение», а не «выберите монтажное положение».

## 3. Bonfiglioli — полный результат по фактическому парку

| Фактическое обозначение | Кол-во | OEM-результат | Объём | Что должно делать LUBRICA |
|---|---:|---|---:|---|
| Редуктор 301 L2 1:20,1 HC EPIC. PAM 112 A | 4 | `OEM_GUIDE_SINGLE` | 1,1 л | Добавить OEM-таблицу 301 L2, положение A = 1,1 л. |
| Редуктор A202/UH30 1:29,2 VB PAM 90 | 4 | `OEM_TECH_SUPPORT_REQUIRED` | — | Не подставлять по аналогии: IOM для A20/A41 требует Bonfiglioli Technical Assistance или точную product-card/SKU. |
| Редуктор A412/NH 1:7,1 B3 PAM 132 | 2 | `OEM_TECH_SUPPORT_REQUIRED` | — | Не подставлять по аналогии: IOM для A20/A41 требует Bonfiglioli Technical Assistance или точную product-card/SKU. |
| Редуктор A412/NR 1:28,3 B5 PAM 112 | 2 | `OEM_TECH_SUPPORT_REQUIRED` | — | Не подставлять по аналогии: IOM для A20/A41 требует Bonfiglioli Technical Assistance или точную product-card/SKU. |
| Редуктор A412/UH45 1:11,7 B3 PAM 112 Линия №2 | 1 | `OEM_PRODUCT_CARD_SINGLE` | 4,3 л | Сохранить точную SKU/product-card привязку; не распространять значение на другие A20/A41. |
| Редуктор A412/UH45 1:45,1 B3 PAM 100 | 1 | `OEM_TECH_SUPPORT_REQUIRED` | — | Не подставлять по аналогии: IOM для A20/A41 требует Bonfiglioli Technical Assistance или точную product-card/SKU. |
| Редуктор A413/NR 1:92,8 B3 PAM 100 Линия №1 | 1 | `OEM_TECH_SUPPORT_REQUIRED` | — | Не подставлять по аналогии: IOM для A20/A41 требует Bonfiglioli Technical Assistance или точную product-card/SKU. |
| Редуктор A413/NR 1:92,8 B3 PAM 100 Линия №2 | 1 | `OEM_TECH_SUPPORT_REQUIRED` | — | Не подставлять по аналогии: IOM для A20/A41 требует Bonfiglioli Technical Assistance или точную product-card/SKU. |
| Редуктор A503/NR 1:81,5 B3 PAM 100 Линия №1 | 1 | `OEM_GUIDE_SINGLE` | 6,1 л | Добавить A50 3 OEM fill table в resolver. |
| Редуктор A503/NR 1:81,5 B3 PAM 100 Линия №2 | 1 | `OEM_GUIDE_SINGLE` | 6,1 л | Добавить A50 3 OEM fill table в resolver. |
| Редуктор A503/UH50 1:32,4 VA PAM 90 | 4 | `OEM_GUIDE_SINGLE` | 11,0 л | Добавить A50 3 OEM fill table в resolver. |
| Редуктор C312/P 1:15,6 B7 PAM 100 | 1 | `OEM_TECH_SUPPORT_REQUIRED` | — | IOM для C31/C41 не даёт универсального объёма; нужна точная product-card/SKU. |
| Редуктор C312/P 1:22,6 B8 PAM 90 | 1 | `OEM_TECH_SUPPORT_REQUIRED` | — | IOM для C31/C41 не даёт универсального объёма; нужна точная product-card/SKU. |
| Редуктор C412/P 1:15,8 B7 PAM 100 | 1 | `OEM_TECH_SUPPORT_REQUIRED` | — | Для C41 2 общий IOM требует OEM-подтверждение; не переносить 2,4 л с UFB B5 на P B3/B7. |
| Редуктор C412/P 1:15,8 B7 PAM 100 | 1 | `OEM_TECH_SUPPORT_REQUIRED` | — | Для C41 2 общий IOM требует OEM-подтверждение; не переносить 2,4 л с UFB B5 на P B3/B7. |
| Редуктор C412/P 1:25 B3 PAM 100 | 4 | `OEM_TECH_SUPPORT_REQUIRED` | — | Для C41 2 общий IOM требует OEM-подтверждение; не переносить 2,4 л с UFB B5 на P B3/B7. |
| Редуктор C412/P 1:9,6 B7 PAM 100 | 4 | `OEM_TECH_SUPPORT_REQUIRED` | — | Для C41 2 общий IOM требует OEM-подтверждение; не переносить 2,4 л с UFB B5 на P B3/B7. |
| Редуктор C412/UFB 1:11,2 B5 PAM 112 Линия №2 | 2 | `OEM_PRODUCT_CARD_SINGLE` | 2,4 л | Сохранить точную SKU/product-card привязку. |
| Редуктор C412/UFB 1:9,6 B5 PAM 100 Линия №1 | 1 | `OEM_PRODUCT_CARD_SINGLE` | 2,4 л | Сохранить точную SKU/product-card привязку. |
| Редуктор C412/UFB 1:9,6 B5 PAM 100 Линия №2 | 2 | `OEM_PRODUCT_CARD_SINGLE` | 2,4 л | Сохранить точную SKU/product-card привязку. |
| Редуктор C413/P 1:31,2 B6 PAM 100 | 7 | `OEM_TECH_SUPPORT_REQUIRED` | — | IOM для C31/C41 не даёт универсального объёма; нужна точная product-card/SKU. |
| Редуктор C512/P 1:23,4 B6 PAM 132 | 2 | `OEM_GUIDE_SINGLE` | 2,9 л | Добавить C51 2 B6=2,9 л. |
| Редуктор C513/P 1:93,0 B3 PAM 90 | 2 | `OEM_GUIDE_SINGLE` | 2,9 л | Добавить C51 3 B3=2,9 л. |
| Редуктор C612/P 1:10,9 B3 PAM 132 | 4 | `OEM_GUIDE_SINGLE` | 4,1 л | Добавить C61 2 B3=4,1 л. |
| Редуктор F603 H60 1:32,1 H1 PAM 132 Линия №1 | 1 | `OEM_PRODUCT_CARD_SINGLE` | 14,0 л | Текущая запись 14 л соответствует OEM; сохранить. |
| Редуктор F603 H60 1:32,1 H1 PAM 132 Линия №2 | 1 | `OEM_PRODUCT_CARD_SINGLE` | 14,0 л | Текущая запись 14 л соответствует OEM; сохранить. |
| Редуктор MVF 30/F1 1:60 B14 B8 PAM 63 | 14 | `OEM_FACTORY_CHARGE` | 0,045 л | Добавить VF/MVF fill + исправить parser и политику обслуживания. |
| Редуктор MVF 44/F1 1:60 B5 B6 PAM 63 | 14 | `OEM_FACTORY_CHARGE` | 0,075 л | Добавить VF/MVF fill + исправить parser и политику обслуживания. |
| Редуктор MVF 49/F1 1:60 B3 PAM 71 | 2 | `OEM_FACTORY_CHARGE` | 0,12 л | Добавить VF/MVF fill + исправить parser и политику обслуживания. |
| Редуктор MVF 86/FC 1:46 B5 B3 PAM 90 | 1 | `OEM_FACTORY_CHARGE` | 0,87 л | Добавить VF/MVF fill + исправить parser и политику обслуживания. |
| Редуктор MW110/U 1:64 B6PAM 80 | 1 | `OEM_GUIDE_SINGLE` | 1,7 л | Добавить W110 ratio+mounting fill table. |
| Редуктор MW110/U 1:64 B7PAM 80 | 1 | `OEM_GUIDE_SINGLE` | 1,7 л | Добавить W110 ratio+mounting fill table. |
| Редуктор MW75/U 1:80 B5PAM 80 | 2 | `OEM_FACTORY_CHARGE` | 0,56 л | Добавить W75 ratio-based fill; положение на объём W75 не влияет в OEM-таблице. |
| Редуктор RAN38 DA 1:2 B3 | 2 | `OEM_GUIDE_SINGLE` | 3,0 л | Добавить RAN38 B3=3,0 л; финальный уровень по стеклу/щупу. |
| Редуктор RAN38 DC 1:2 B3 | 2 | `OEM_GUIDE_SINGLE` | 3,0 л | Добавить RAN38 B3=3,0 л; финальный уровень по стеклу/щупу. |
| Редуктор W 75/U 1:10 PAM 90 | 2 | `OEM_FACTORY_CHARGE` | 0,48 л | Добавить W75 ratio-based fill; положение на объём W75 не влияет в OEM-таблице. |

### Bonfiglioli — ключевые подтверждённые OEM-таблицы

- **A 50 3:** B3 6,1 л; B6 10 л; B7 6,2 л; B8 10 л; VA 11 л; VB 12 л. Это закрывает A503/NR B3 и A503/UH50 VA.
- **C 51 2:** B6 2,9 л; **C 51 3:** B3 2,9 л; **C 61 2:** B3 4,1 л.
- **C 31/C 41 и A 20/A 41:** общий IOM требует Technical Assistance — универсальный объём по одному размеру не подставлять. Точные Shop/SKU записи (например C412/UFB и отдельный A412/UH45) можно сохранять как исключения.
- **VF/MVF30/44/49:** 0,045 / 0,075 / 0,12 л; **MVF86:** legacy OEM 0,87 л. Эти малые worm units относятся к long-life/factory charge, поэтому событие «периодическая замена масла» требует отдельного OEM-основания.
- **W75:** i=7/10/15 → 0,48 л; i=30/40 → 0,52 л; i=20/25/50/60/80/100 → 0,56 л.
- **W110:** для i=20…100: B3 2,2; B6/B7 1,7; B8/V5 1,9; V6 1,8 л.
- **RAN38 B3:** 3,0 л, но конечный уровень — по смотровому стеклу/щупу.
- **301 L2, mounting A:** 1,1 л; OEM прямо называет табличные количества ориентировочными.

## 4. SEW-EURODRIVE

В LUBRICA уже есть большой блок R/F/K данных, но часть K/S/SA оставлена `recognitionOnly` без необходимости. OEM SEW публикует M1…M6 таблицы, при этом значение остаётся ориентировочным, а шильдик/пробка/стекло имеют приоритет. Тип и вязкость масла также order-specific и берутся с шильдика.

### Проблемные/неполные семейства в вашем парке

| Семейство | Экземпляров | Состояние после OEM-аудита |
|---|---:|---|
| FH67 | 2 | MOUNTING_REQUIRED:2 |
| FT127 | 2 | MOUNTING_REQUIRED:2 |
| K37 | 4 | MOUNTING_REQUIRED:2, OEM_GUIDE_SINGLE:2 |
| K57 | 2 | OEM_GUIDE_SINGLE:2 |
| K67 | 2 | OEM_GUIDE_SINGLE:2 |
| KA107B | 2 | MOUNTING_REQUIRED:2 |
| KA37 | 5 | OEM_GUIDE_SINGLE:5 |
| KA57B | 2 | MOUNTING_REQUIRED:2 |
| KA77B | 2 | MOUNTING_REQUIRED:2 |
| KA87B | 3 | MOUNTING_REQUIRED:3 |
| KF37R17 | 10 | COMPOUND_GEAR_UNIT_CONFIRM:10 |
| KF47 | 1 | OEM_GUIDE_SINGLE:1 |
| KH47 | 1 | MOUNTING_REQUIRED:1 |
| KH77 | 2 | MOUNTING_REQUIRED:2 |
| KH87B | 1 | MOUNTING_REQUIRED:1 |
| R27 | 1 | OEM_GUIDE_OPTIONS:1 |
| R37 | 6 | MOUNTING_REQUIRED:2, OEM_GUIDE_OPTIONS:4 |
| R47 | 16 | OEM_GUIDE_OPTIONS:15, OEM_GUIDE_SINGLE:1 |
| R57 | 9 | OEM_GUIDE_SINGLE:9 |
| R67 | 10 | MOUNTING_REQUIRED:3, OEM_GUIDE_SINGLE:5, OEM_GUIDE_OPTIONS:2 |
| R77 | 13 | OEM_GUIDE_OPTIONS:8, MOUNTING_REQUIRED:5 |
| R87 | 2 | OEM_GUIDE_OPTIONS:2 |
| R97 | 2 | MOUNTING_REQUIRED:1, OEM_GUIDE_OPTIONS:1 |
| RF37 | 1 | MOUNTING_REQUIRED:1 |
| RF47 | 3 | OEM_GUIDE_OPTIONS:2, MOUNTING_REQUIRED:1 |
| RX87 | 4 | OEM_GUIDE_SINGLE:4 |
| S47 | 5 | OEM_GUIDE_SINGLE:5 |
| S77 | 4 | MOUNTING_REQUIRED:4 |
| SA37 | 3 | OEM_GUIDE_SINGLE:3 |
| SA47 | 28 | OEM_GUIDE_SINGLE:26, MOUNTING_REQUIRED:2 |
| SA57 | 20 | MOUNTING_REQUIRED:4, OEM_GUIDE_SINGLE:16 |
| SA67 | 20 | OEM_GUIDE_SINGLE:20 |
| SA77 | 1 | OEM_GUIDE_SINGLE:1 |

Особенно: SA37/47/57/67/77 и S47 имеют прямые OEM-таблицы; варианты M3 в части S/SA имеют два допустимых значения и должны оставаться вариантами до разрешения ступенчатости. `KF37R17` — составной узел, его нельзя сводить к объёму K37.

## 5. Rossi / конфликт MRV

В базе **19 экземпляров** `MRV 50/63/80/81 UO3A` импортированы с производителем BONFIGLIOLI, но обозначение соответствует Rossi A Series. Cross-OEM guard должен продолжать блокировать автоматическое применение до подтверждения/коррекции производителя. Rossi публикует отдельные таблицы объёмов и интервалы замены по температуре; их нельзя заменять Bonfiglioli-методикой.

Корректно импортированный `MRIV80 UO3A ... B5` тоже требует уточнения семантики B5: это может быть моторный фланец/исполнение, а не монтажное положение масляной ванны.

## 6. Lenze

- GKS04 (2 экземпляра): frame size 04 — lifetime lubricated; обычный oil_change не нужен.
- GKS06/GKS07/GST05/GST07: OEM подтверждает необходимость регулярной замены для size >=05, но сорт масла берётся с шильдика. Для точного объёма нужны legacy material number/type-code и монтажное положение; текущая 1.0.33.58 правильно не должна угадывать число.

## 7. Brevini / Dana

`SL3003/FS` и `SL8504FAR` распознаются по семье, но S-Series имеет конфигурационно-зависимые исполнения, splash/forced lubrication и аксессуары. По текущим строкам парка отсутствует достаточная информация для безопасного автоматического объёма. Оставлять `verification required` до exact datasheet/nameplate.

## 8. Tandler

- `STD B1 1:1 I`: OEM quantity **0,80 л** (ориентировочно) для oil-filled исполнения.
- `HW A1 1:1 III`: это Tandler; A1 i=1:1 имеет справочный oil fill **0,60 л**, но перед созданием oil-change надо подтвердить, что конкретное исполнение масляное, а не grease-filled/lifetime policy.

## 9. ZIMM

Два `Z-50-SN` должны выйти из обычного gearbox-oil. ZIMM для screw-jack gearbox указывает synthetic fluid grease; смазка винта/гайки — отдельный сервисный контур.

## 10. ABB / Nabtesco RV

Четыре роботных редуктора ABB (`RV400C`, `RV40E`, `RV450E`) относятся к precision RV reducer grease domain. Для RV40E/RV450E Nabtesco публикует reference quantity по ориентации, но дополнительно требует учитывать полость со стороны двигателя/интеграции. Поэтому reducer-only quantity нельзя автоматически переносить в мероприятие ABB-робота. Стандартный lubricant — VIGOGREASE RE0; типовой срок замены grease — 20 000 ч при нормальных условиях, раньше при повышенной температуре.

## 11. Неидентифицированные записи

`Мотор-редуктор`, `Редуктор Линия №1`, `Редуктор Линия №2` не содержат достаточной информации. Для них fuzzy/аналоговая OEM-подстановка должна оставаться запрещённой.

## 12. Приоритет исправлений LUBRICA

**P0 — безопасность методики:** ABB RV и ZIMM → правильный grease-domain; оставить global cross-OEM guard; очистка любых старых чужих OEM-расчётов.
**P1 — прямые OEM-данные:** Bonfiglioli A503/C512/C513/C612/VF-MVF/W-MW/RAN38/301L2; SEW S/SA/K-family tables; Tandler B1/HW A1 recognition.
**P1 — parser:** Bonfiglioli MVF multiple-B tokens; `B5PAM`/`B7PAM`; Rossi B5 semantics; SEW composite KF37R17.
**P2 — подтверждение:** Lenze legacy quantities, Brevini exact configurations, Rossi MRV source-manufacturer correction.
**P3 — UX:** различать «нет монтажного положения», «OEM требует подтверждения», «доступно несколько OEM-вариантов», «не тот домен смазки».

## 13. Источники OEM

- **BONF_CAFS** — https://www.bonfiglioli.com/_default_upload_bucket/BR_IOM_CAFS_ATX_ENG_R05_4.pdf
- **BONF_VFW** — https://www.bonfiglioli.com/_default_upload_bucket/BR_CAT_VF-W_ATX_ENG_R01_2_1.pdf
- **BONF_RAN** — https://www.bonfiglioli.com/_default_upload_bucket/BR_CAT_RAN_STD_I-UK-DE-F_R01_1_2.pdf
- **BONF_300** — https://www.bonfiglioli.com/international/usefulDocuments/BR_IOM_300_ATX-INC_ENG_R06_0.pdf
- **SEW_FILL** — https://download.sew-eurodrive.com/download/pdf/11225319_G08.pdf
- **SEW_LUBE** — https://download.sew-eurodrive.com/download/html/33346739/en-EN/4528064500360983609099.html
- **ROSSI_A** — https://www.rossi.com/-/media/Feature/Download-Files/Indian-documents/UTD04511-202300__EN_Operating-instructions.pdf
- **TANDLER** — https://www.tandler.de/downloads/betriebsanleitungen?cid=4305&file=files%2Ftandler%2Fdokumente%2FBetriebsanleitungen%2Fbetriebsanleitungen_spiralkegelgetriebe_instructions+_manual_bevel_gearboxes.pdf
- **ZIMM** — https://zimm.com/download-cat/instruction-manuals-screw-jacks/
- **NABTESCO** — https://www.nabtesco.de/fileadmin/04_Service/05_Downloads/01_Produktkataloge/RV_Katalog_EN.pdf
- **LENZE** — https://www.lenze.com/en-de/application-knowledge-base/article/275769/1
- **BREVINI** — https://ohsolutions.dana.com/upload/products/160/26317615S-Series_Big-Sizes_MPF012003-19_Web.pdf

## 14. Полная построчная выборка

Полная таблица по всем 186 уникальным обозначениям вынесена в CSV и JSON рядом с этим отчётом. В ней для каждой строки указаны текущая привязка 1.0.33.58, OEM-результат, объём/варианты, уровень риска, parser/manufacturer issues и требуемое действие.
