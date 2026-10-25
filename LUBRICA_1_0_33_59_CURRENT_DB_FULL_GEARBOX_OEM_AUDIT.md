# LUBRICA 1.0.33.59 — полный OEM-аудит редукторов по актуальной базе

**База:** `Филиал_завода__Техно__г._Юрга(20260918-095105).json`  
**updatedAt:** `2026-09-18T09:26:51.373Z`  
**Парк:** **363** экземпляра, **202** уникальных связок производитель+обозначение.  
**Изменение к базе 053235:** +27 экземпляров, +16 новых обозначений.

## 1. Итог

- LUBRICA 1.0.33.59 безопасно связывает с библиотекой: **314** экземпляров.
- Не имеет точной library binding: **49** экземпляров.
- Cross-OEM false match в текущем прогоне: **0**.
- Критично: Tandler `STD EА1 1:1 1` сейчас предлагается как `STD B1`; это неверная размерная подмена внутри одного OEM и должна блокироваться.
- Новые OEM-пробелы: UNIMEC XRC54 и несколько семейств SEW (PSF822, FH77/FH87, KHF47/KHF87, SF67, KA87).

### Статусы OEM-аудита

| Статус | Экземпляров |
|---|---:|
| `OEM_GUIDE_SINGLE` | 135 |
| `MOUNTING_REQUIRED` | 55 |
| `OEM_GUIDE_OPTIONS` | 37 |
| `OEM_FACTORY_CHARGE` | 35 |
| `OEM_TECH_SUPPORT_REQUIRED` | 31 |
| `MANUFACTURER_CONFLICT` | 20 |
| `COMPOUND_GEAR_UNIT_CONFIRM` | 10 |
| `OEM_PRODUCT_CARD_SINGLE` | 8 |
| `LEGACY_TYPECODE_MOUNTING_REQUIRED` | 7 |
| `WRONG_DOMAIN` | 6 |
| `CUSTOM_CONFIGURATION_CONFIRM` | 6 |
| `INSUFFICIENT_IDENTIFICATION` | 4 |
| `LUBRICANT_TYPE_CONFIRM` | 3 |
| `LIFETIME_LUBRICATED` | 2 |
| `MOUNTING_SEMANTICS_CONFIRM` | 2 |
| `TYPECODE_CONFIRM` | 2 |

### Парк по фактическому OEM

| OEM | Экземпляров |
|---|---:|
| SEW-EURODRIVE | 211 |
| BONFIGLIOLI | 98 |
| ROSSI | 22 |
| LENZE | 9 |
| TANDLER | 6 |
| BREVINI RIDUTTORI | 6 |
| UNKNOWN | 4 |
| ABB / NABTESCO | 4 |
| ZIMM | 2 |
| UNIMEC | 1 |

## 2. Новые обозначения в актуальной базе

| Кол-во | Обозначение | OEM-аудит | OEM fill / условие | LUBRICA 1.0.33.59 | Действие |
|---:|---|---|---|---|---|
| 1 | Мотор-редуктор FH87/GDRE132M4/TF  i=56,75 N=5,5 кВт | `MOUNTING_REQUIRED` | {"M1": 10.8, "M2": 13.0, "M3": 7.7, "M4": 13.8, "M5": 10.8, "M6": 11.0} | unmatched | Add FH87 recognition; preserve cross-OEM guard; request mounting position. |
| 1 | Редуктор MRIV 63UO2A 1:101,6 B3PAM 80 | `MOUNTING_SEMANTICS_CONFIRM` | — | unmatched | Добавить MRIV63 recognition; подтвердить фактическое положение и type-code. |
| 1 | Редуктор C412/P 1:31,4 B6 PAM 100 | `OEM_TECH_SUPPORT_REQUIRED` | — | unmatched | C41 2/P не заполнять по аналогии; нужна точная product-card/SKU. |
| 1 | Редуктор MRV 50UO3A 1:40 B6 PAM 80 | `MANUFACTURER_CONFLICT` | — | unmatched | Подтвердить шильдик/исправить производителя; cross-OEM guard сохранить. |
| 1 | Мотор-редуктор FH77/G DRE132S4/TF i=58.32 N=4 кВт n=1460 об/мин | `MOUNTING_REQUIRED` | {"M1": 5.9, "M2": 7.3, "M3": 4.3, "M4": 8.0, "M5": 6.0, "M6": 6.3} | unmatched | Add FH77 recognition and mounting resolver. |
| 1 | Мотор-редуктор FH77/GDRE112M4/TF  i=43,58 N=3 кВт | `MOUNTING_REQUIRED` | {"M1": 5.9, "M2": 7.3, "M3": 4.3, "M4": 8.0, "M5": 6.0, "M6": 6.3} | unmatched | Add FH77 recognition and mounting resolver. |
| 2 | Мотор-редуктор FH87/GDRE132M4/TF  i=56,75 N=5,5 кВт | `MOUNTING_REQUIRED` | {"M1": 10.8, "M2": 13.0, "M3": 7.7, "M4": 13.8, "M5": 10.8, "M6": 11.0} | unmatched | Add FH87 recognition and mounting resolver. |
| 1 | Мотор-редуктор KA87/TDRS100M4BE5 i=49,16 N=3 кВт | `MOUNTING_REQUIRED` | {"M1": 3.7, "M2": 8.0, "M3": 8.7, "M4": 10.9, "M5": 8.0, "M6": 8.0} | unmatched | Add KA87 recognition; request/derive mounting position. |
| 3 | Мотор-редуктор KH47/DRE80M4/TF/M1A-180 i=75,20 N=0,75 кВт | `OEM_GUIDE_SINGLE` | 0,8 л | matched KH47 | Resolver already recognizes KH47, but must resolve M1 to 0.80 l. |
| 2 | Мотор-редуктор KHF47DRE100M4/TF/V/M1B  i=16,86 N=2,2 кВт | `OEM_GUIDE_SINGLE` | 0,8 л | unmatched | Add KHF47 parser/dataset; M1=0.80 l. |
| 2 | Мотор-редуктор KHF87DRE132M4/TF  i=49,16 N=5,5 кВт | `MOUNTING_REQUIRED` | — | unmatched | Add KHF87 recognition; request/derive mounting position. |
| 2 | Мотор-редуктор R87DRE132S4/TF/ES7C/V-52-M1 N=4,0 кВт i=27,84 | `OEM_GUIDE_OPTIONS` | [2.3, 6.0] | matched R87 | Keep options until stage/ratio condition is resolved. |
| 2 | Мотор-редуктор SF67DRS71M4/TF/M6A i=217,41 N=0,55 кВт | `OEM_GUIDE_SINGLE` | 2,7 л | unmatched | Add SF67 parser/dataset; M6=2.70 l. |
| 4 | Редуктор планетарный PSF822 EPH07/22/14 i=20,00 | `MOUNTING_REQUIRED` | {"M1_M3_M5_M6": 1.55, "M2": 2.55, "M4": 3.35} | unmatched | Добавить PSF822/EPH adapter recognition и mounting resolver. |
| 2 | Редуктор STD EА1 1:1 1 | `TYPECODE_CONFIRM` | {"A1_if_confirmed": 0.6} | suggested STD B1 | Block B1 suggestion. Confirm that EА1 encodes size A1 before assigning 0.60 l. |
| 1 | Редуктор XRC 54 S1 1:1 | `OEM_GUIDE_SINGLE` | 0,02 л | unmatched | Добавить UNIMEC/XRC54 dataset, parser и resolver. |

## 3. Ключевые OEM-выводы

- **SEW-EURODRIVE:** для F/K/S/PSF серий официальные таблицы зависят от M1–M6; значения являются guide values, конечный уровень/nameplate имеет приоритет. Новые PSF822/FH/KHF/SF/KA требуют расширения parser/dataset.
- **Bonfiglioli:** A50 3 подтверждён; для A20/A41 и части C31/C41 универсальная подстановка запрещена и требуется Technical Assistance / точная product-card. Новый C412/P 1:31,4 B6 остаётся verification-required.
- **Rossi:** MRV/UO3A, ошибочно записанные как Bonfiglioli, остаются manufacturer-conflict. Новый MRIV63 требует semantic type-code/mounting confirmation.
- **Tandler:** A1 i=1:1 ≈0,60 л, B1 i=1:1 ≈0,80 л. Поэтому `EА1 → B1` недопустимо.
- **UNIMEC XRC54:** OEM catalog: synthetic oil Unimec Atir SH150, 0,02 л; отсутствует в LUBRICA.
- **Lenze:** size 03/04 lifetime lubricated; >=05 требует периодической замены по OI/nameplate.
- **Brevini/Dana:** SL3003/SL8504 configuration-dependent; forced/splash lubrication и аксессуары не позволяют безопасно выдавать один объём по текущей строке.
- **ABB/Nabtesco RV:** precision reducer grease domain, VIGOGREASE RE0; не обычный gearbox_oil.
- **ZIMM:** screw-jack gearbox uses synthetic fluid grease; не обычный gearbox_oil.

## 4. Полная построчная матрица (202 записи)

| OEM | Исходный производитель | Обозначение | Кол-во | OEM status | Fill | LUBRICA status | LUBRICA entry | Требуемое действие |
|---|---|---|---:|---|---|---|---|---|
| UNKNOWN | — | Мотор-редуктор | 1 | `INSUFFICIENT_IDENTIFICATION` | — | unmatched | — | Нужны шильдик/производитель/точная модель. Автоподстановка запрещена. |
| SEW-EURODRIVE | — | Мотор-редуктор FH87/GDRE132M4/TF  i=56,75 N=5,5 кВт | 1 | `MOUNTING_REQUIRED` | {"M1": 10.8, "M2": 13.0, "M3": 7.7, "M4": 13.8, "M5": 10.8, "M6": 11.0} | unmatched | — | Add FH87 recognition; preserve cross-OEM guard; request mounting position. |
| LENZE | — | Мотор-редуктор GKS04-3S HAR 09DC41/A | 1 | `LIFETIME_LUBRICATED` | — | matched | GKS04 | Не создавать периодическую замену масла: Lenze frame size 04 permanently lubricated. |
| LENZE | — | Мотор-редуктор GKS06-3S VAR 14HC32/A | 1 | `LEGACY_TYPECODE_MOUNTING_REQUIRED` | — | matched | GKS06 | Для size >=05 нужен legacy manual/material number + монтажное положение; масло только по шильдику. |
| LENZE | — | Мотор-редуктор GKS07-3S HAR 12LC41 MCS 12L41-RS0B0 N=4,7кВт i=31,858 | 1 | `LEGACY_TYPECODE_MOUNTING_REQUIRED` | — | matched | GKS07 | Для size >=05 нужен legacy manual/material number + монтажное положение; масло только по шильдику. |
| LENZE | — | Мотор-редуктор GST05-2M VBR 063C42 i=50,05 | 2 | `LEGACY_TYPECODE_MOUNTING_REQUIRED` | — | matched | GST05 | Для size >=05 нужен legacy manual/material number + монтажное положение; масло только по шильдику. |
| LENZE | — | Мотор-редуктор GST07-2S VBR 14HC32 | 1 | `LEGACY_TYPECODE_MOUNTING_REQUIRED` | — | matched | GST07 | Для size >=05 нужен legacy manual/material number + монтажное положение; масло только по шильдику. |
| SEW-EURODRIVE | — | Мотор-редуктор K57DT90S4/TF/BUR/M1/A+B/0 | 1 | `OEM_GUIDE_SINGLE` | 1,3 л | matched | K57 | Добавить отсутствующую SEW M1…M6 fill table для фактического семейства. |
| SEW-EURODRIVE | — | Мотор-редуктор K57TDRS90L4/TF/M3-B/90° | 1 | `OEM_GUIDE_SINGLE` | 2,7 л | matched | K57 | Добавить отсутствующую SEW M1…M6 fill table для фактического семейства. |
| SEW-EURODRIVE | — | Мотор-редуктор K67DRS100LC4/BM/BUR/TF/M1-A+B | 1 | `OEM_GUIDE_SINGLE` | 1,1 л | matched | K67 | Добавить отсутствующую SEW M1…M6 fill table для фактического семейства. |
| SEW-EURODRIVE | — | Мотор-редуктор KA37DRS71S4/Z/M4-A/180° N=0,37 кВт | 2 | `OEM_GUIDE_SINGLE` | 1,4 л | matched | KA37 | Добавить отсутствующую SEW M1…M6 fill table для фактического семейства. |
| SEW-EURODRIVE | — | Мотор-редуктор KF47DT90L4/BM/BUR/TF/M5/A/180 | 1 | `OEM_GUIDE_SINGLE` | 1,6 л | matched | KF47 | Добавить отсутствующую SEW M1…M6 fill table для фактического семейства. |
| SEW-EURODRIVE | — | Мотор-редуктор R27DT80N4/TF/M1/0° | 1 | `OEM_GUIDE_OPTIONS` | [0.25, 0.4] | matched | R27 | Сохранить OEM-таблицу; если вариантов несколько — не выбирать без ступеней/отношения. Финальный уровень/шильдик приоритетны. |
| SEW-EURODRIVE | — | Мотор-редуктор R37DRE80M4 i=15,6 | 1 | `MOUNTING_REQUIRED` | — | matched | R37 | Сохранить OEM-таблицу; если вариантов несколько — не выбирать без ступеней/отношения. Финальный уровень/шильдик приоритетны. |
| SEW-EURODRIVE | — | Мотор-редуктор R37DT80K4/M1 | 2 | `OEM_GUIDE_OPTIONS` | [0.3, 0.95] | matched | R37 | Сохранить OEM-таблицу; если вариантов несколько — не выбирать без ступеней/отношения. Финальный уровень/шильдик приоритетны. |
| SEW-EURODRIVE | — | Мотор-редуктор R37DT90S4/TF/M1 | 1 | `OEM_GUIDE_OPTIONS` | [0.3, 0.95] | matched | R37 | Сохранить OEM-таблицу; если вариантов несколько — не выбирать без ступеней/отношения. Финальный уровень/шильдик приоритетны. |
| SEW-EURODRIVE | — | Мотор-редуктор R47DT80N4/BMG/ES1T/M1/0° | 2 | `OEM_GUIDE_OPTIONS` | [0.7, 1.5] | matched | R47 | Сохранить OEM-таблицу; если вариантов несколько — не выбирать без ступеней/отношения. Финальный уровень/шильдик приоритетны. |
| SEW-EURODRIVE | — | Мотор-редуктор R47DT90L4/TF/M1 | 6 | `OEM_GUIDE_OPTIONS` | [0.7, 1.5] | matched | R47 | Сохранить OEM-таблицу; если вариантов несколько — не выбирать без ступеней/отношения. Финальный уровень/шильдик приоритетны. |
| SEW-EURODRIVE | — | Мотор-редуктор R47DT90L4/TF/NV21/M1 | 1 | `OEM_GUIDE_OPTIONS` | [0.7, 1.5] | matched | R47 | Сохранить OEM-таблицу; если вариантов несколько — не выбирать без ступеней/отношения. Финальный уровень/шильдик приоритетны. |
| SEW-EURODRIVE | — | Мотор-редуктор R47DT90S4/M1 | 1 | `OEM_GUIDE_OPTIONS` | [0.7, 1.5] | matched | R47 | Сохранить OEM-таблицу; если вариантов несколько — не выбирать без ступеней/отношения. Финальный уровень/шильдик приоритетны. |
| SEW-EURODRIVE | — | Мотор-редуктор R47DT90S4/TF/ES1T/M1 | 1 | `OEM_GUIDE_OPTIONS` | [0.7, 1.5] | matched | R47 | Сохранить OEM-таблицу; если вариантов несколько — не выбирать без ступеней/отношения. Финальный уровень/шильдик приоритетны. |
| SEW-EURODRIVE | — | Мотор-редуктор R47DT90S4/TF/M1 | 3 | `OEM_GUIDE_OPTIONS` | [0.7, 1.5] | matched | R47 | Сохранить OEM-таблицу; если вариантов несколько — не выбирать без ступеней/отношения. Финальный уровень/шильдик приоритетны. |
| SEW-EURODRIVE | — | Мотор-редуктор R47DT90S4/TF/M6/270° | 1 | `OEM_GUIDE_SINGLE` | 1,5 л | matched | R47 | Сохранить OEM-таблицу; если вариантов несколько — не выбирать без ступеней/отношения. Финальный уровень/шильдик приоритетны. |
| SEW-EURODRIVE | — | Мотор-редуктор R57DT90S4/M5/270 | 1 | `OEM_GUIDE_SINGLE` | 1,7 л | matched | R57 | Сохранить OEM-таблицу; если вариантов несколько — не выбирать без ступеней/отношения. Финальный уровень/шильдик приоритетны. |
| SEW-EURODRIVE | — | Мотор-редуктор R57DV100M4/TF/M5/270° | 1 | `OEM_GUIDE_SINGLE` | 1,7 л | matched | R57 | Сохранить OEM-таблицу; если вариантов несколько — не выбирать без ступеней/отношения. Финальный уровень/шильдик приоритетны. |
| SEW-EURODRIVE | — | Мотор-редуктор R57DV112M4/TF/M6/180° | 4 | `OEM_GUIDE_SINGLE` | 1,7 л | matched | R57 | Сохранить OEM-таблицу; если вариантов несколько — не выбирать без ступеней/отношения. Финальный уровень/шильдик приоритетны. |
| SEW-EURODRIVE | — | Мотор-редуктор R67DRS80M4/TF/M3/270° | 1 | `OEM_GUIDE_SINGLE` | 2,8 л | matched | R67 | Сохранить OEM-таблицу; если вариантов несколько — не выбирать без ступеней/отношения. Финальный уровень/шильдик приоритетны. |
| SEW-EURODRIVE | — | Мотор-редуктор R67DRS80M4/TF/M5/180° | 1 | `OEM_GUIDE_SINGLE` | 1,8 л | matched | R67 | Сохранить OEM-таблицу; если вариантов несколько — не выбирать без ступеней/отношения. Финальный уровень/шильдик приоритетны. |
| SEW-EURODRIVE | — | Мотор-редуктор R67DV100M4/TF/M1 | 1 | `OEM_GUIDE_OPTIONS` | [1.1, 2.3] | matched | R67 | Сохранить OEM-таблицу; если вариантов несколько — не выбирать без ступеней/отношения. Финальный уровень/шильдик приоритетны. |
| SEW-EURODRIVE | — | Мотор-редуктор R77DRE160MC4-BE20-BUR/TF/M1 N=11 кВт | 1 | `OEM_GUIDE_OPTIONS` | [1.2, 3] | matched | R77 | Сохранить OEM-таблицу; если вариантов несколько — не выбирать без ступеней/отношения. Финальный уровень/шильдик приоритетны. |
| SEW-EURODRIVE | — | Мотор-редуктор R77DV132M4/TF/BM/M1 | 1 | `OEM_GUIDE_OPTIONS` | [1.2, 3] | matched | R77 | Сохранить OEM-таблицу; если вариантов несколько — не выбирать без ступеней/отношения. Финальный уровень/шильдик приоритетны. |
| SEW-EURODRIVE | — | Мотор-редуктор R87DV160M4/BM/TF/M1 | 1 | `OEM_GUIDE_OPTIONS` | [2.3, 6] | matched | R87 | Сохранить OEM-таблицу; если вариантов несколько — не выбирать без ступеней/отношения. Финальный уровень/шильдик приоритетны. |
| SEW-EURODRIVE | — | Мотор-редуктор R97DV180L4/BM/BUR/HF/TF/M1/270° | 1 | `OEM_GUIDE_OPTIONS` | [4.6, 9.8] | matched | R97 | Сохранить OEM-таблицу; если вариантов несколько — не выбирать без ступеней/отношения. Финальный уровень/шильдик приоритетны. |
| SEW-EURODRIVE | — | Мотор-редуктор RF37DRE90L4 i=10,11 | 1 | `MOUNTING_REQUIRED` | — | matched | RF37 | Сохранить OEM-таблицу; если вариантов несколько — не выбирать без ступеней/отношения. Финальный уровень/шильдик приоритетны. |
| SEW-EURODRIVE | — | Мотор-редуктор RF47DRE90M4 N=1,5кВт, n2=205 мин-1, i=6,96 | 1 | `MOUNTING_REQUIRED` | — | matched | RF47 | Сохранить OEM-таблицу; если вариантов несколько — не выбирать без ступеней/отношения. Финальный уровень/шильдик приоритетны. |
| SEW-EURODRIVE | — | Мотор-редуктор RX87DRS132S4/TF/ES7C/M1 | 2 | `OEM_GUIDE_SINGLE` | 1,7 л | matched | RX87 | Сохранить OEM-таблицу; если вариантов несколько — не выбирать без ступеней/отношения. Финальный уровень/шильдик приоритетны. |
| SEW-EURODRIVE | — | Мотор-редуктор S47DT80N4/TF/M5/B/180 | 1 | `OEM_GUIDE_SINGLE` | 0,8 л | matched | S47 | Добавить отсутствующую SEW M1…M6 fill table для фактического семейства. |
| SEW-EURODRIVE | — | Мотор-редуктор S47DT80N4/TF/M6-A/180° | 1 | `OEM_GUIDE_SINGLE` | 0,8 л | matched | S47 | Добавить отсутствующую SEW M1…M6 fill table для фактического семейства. |
| SEW-EURODRIVE | — | Мотор-редуктор SA37DRS71S4/BE/ES7C/M1/A/180 N=0,37 кВт | 1 | `OEM_GUIDE_SINGLE` | 0,25 л | matched | SA37 | Добавить отсутствующую SEW M1…M6 fill table для фактического семейства. |
| SEW-EURODRIVE | — | Мотор-редуктор SA37DT71D4/BM/ES1T/M1/A/180 | 1 | `OEM_GUIDE_SINGLE` | 0,25 л | matched | SA37 | Добавить отсутствующую SEW M1…M6 fill table для фактического семейства. |
| SEW-EURODRIVE | — | Мотор-редуктор SA47DRE80M2-BE05-BSR-ES7C/M1-A-270/2  N=0,75 кВт | 1 | `OEM_GUIDE_SINGLE` | 0,4 л | matched | SA47 | Добавить отсутствующую SEW M1…M6 fill table для фактического семейства. |
| SEW-EURODRIVE | — | Мотор-редуктор SA47DRE80M4 i=17,62 | 1 | `MOUNTING_REQUIRED` | — | matched | SA47 | Семейство распознано, но из строки не определено M1…M6. Нужен шильдик/положение. |
| SEW-EURODRIVE | — | Мотор-редуктор SA47DRE90M4/TF/M1-A/180° N=1,1 кВт | 3 | `OEM_GUIDE_SINGLE` | 0,4 л | matched | SA47 | Добавить отсутствующую SEW M1…M6 fill table для фактического семейства. |
| SEW-EURODRIVE | — | Мотор-редуктор SA47DRE90M4/TF/M1B i=12,1 | 1 | `MOUNTING_REQUIRED` | — | matched | SA47 | Семейство распознано, но из строки не определено M1…M6. Нужен шильдик/положение. |
| SEW-EURODRIVE | — | Мотор-редуктор SA47DRS80M4/TF/M1-A/270° | 2 | `OEM_GUIDE_SINGLE` | 0,4 л | matched | SA47 | Добавить отсутствующую SEW M1…M6 fill table для фактического семейства. |
| SEW-EURODRIVE | — | Мотор-редуктор SA47DT80K2/BMG/ES1T/M1-A/270° | 1 | `OEM_GUIDE_SINGLE` | 0,4 л | matched | SA47 | Добавить отсутствующую SEW M1…M6 fill table для фактического семейства. |
| SEW-EURODRIVE | — | Мотор-редуктор SA47DT80N4/TF/M1-B/0° | 8 | `OEM_GUIDE_SINGLE` | 0,4 л | matched | SA47 | Добавить отсутствующую SEW M1…M6 fill table для фактического семейства. |
| SEW-EURODRIVE | — | Мотор-редуктор SA47DT80N4/TF/M1/B/0 | 3 | `OEM_GUIDE_SINGLE` | 0,4 л | matched | SA47 | Добавить отсутствующую SEW M1…M6 fill table для фактического семейства. |
| SEW-EURODRIVE | — | Мотор-редуктор SA57DRE90L4  i=14,24 N=1,5 кВт | 1 | `MOUNTING_REQUIRED` | — | matched | SA57 | Семейство распознано, но из строки не определено M1…M6. Нужен шильдик/положение. |
| SEW-EURODRIVE | — | Мотор-редуктор SA57DRE90L4/М1В-0 N=1,5 кВт, n2=118 мин-1, i=12,1 | 1 | `MOUNTING_REQUIRED` | — | matched | SA57 | Семейство распознано, но из строки не определено M1…M6. Нужен шильдик/положение. |
| SEW-EURODRIVE | — | Мотор-редуктор SA57DRS71S4-BE05-Z/M6-A-270 N=0,37кВт | 1 | `OEM_GUIDE_SINGLE` | 1,2 л | matched | SA57 | Добавить отсутствующую SEW M1…M6 fill table для фактического семейства. |
| SEW-EURODRIVE | — | Мотор-редуктор SA57DRS90M4/TF/M1-A/180° | 2 | `OEM_GUIDE_SINGLE` | 0,5 л | matched | SA57 | Добавить отсутствующую SEW M1…M6 fill table для фактического семейства. |
| SEW-EURODRIVE | — | Мотор-редуктор SA57DT71D4/BMZ/M6/A/270 i=184,8 | 1 | `OEM_GUIDE_SINGLE` | 1,2 л | matched | SA57 | Добавить отсутствующую SEW M1…M6 fill table для фактического семейства. |
| SEW-EURODRIVE | — | Мотор-редуктор SA57DT90L4/M1/B | 2 | `OEM_GUIDE_SINGLE` | 0,5 л | matched | SA57 | Добавить отсутствующую SEW M1…M6 fill table для фактического семейства. |
| SEW-EURODRIVE | — | Мотор-редуктор SA57DT90L4/TF/M1/B | 1 | `OEM_GUIDE_SINGLE` | 0,5 л | matched | SA57 | Добавить отсутствующую SEW M1…M6 fill table для фактического семейства. |
| SEW-EURODRIVE | — | Мотор-редуктор SA57DT90L4/TF/NV21/M2-A/180° | 1 | `OEM_GUIDE_SINGLE` | 1,1 л | matched | SA57 | Добавить отсутствующую SEW M1…M6 fill table для фактического семейства. |
| SEW-EURODRIVE | — | Мотор-редуктор SA57DV100M4/TF/M1-B/0° | 2 | `OEM_GUIDE_SINGLE` | 0,5 л | matched | SA57 | Добавить отсутствующую SEW M1…M6 fill table для фактического семейства. |
| SEW-EURODRIVE | — | Мотор-редуктор SA57DV100M4/TF/NV21/M1B i=19,54 | 1 | `MOUNTING_REQUIRED` | — | matched | SA57 | Семейство распознано, но из строки не определено M1…M6. Нужен шильдик/положение. |
| SEW-EURODRIVE | — | Мотор-редуктор SA67DRS90L4/M1-A/180° | 1 | `OEM_GUIDE_SINGLE` | 1,0 л | matched | SA67 | Добавить отсутствующую SEW M1…M6 fill table для фактического семейства. |
| SEW-EURODRIVE | — | Мотор-редуктор SA67DRS90L4/M1-B | 1 | `OEM_GUIDE_SINGLE` | 1,0 л | matched | SA67 | Добавить отсутствующую SEW M1…M6 fill table для фактического семейства. |
| SEW-EURODRIVE | — | Мотор-редуктор SA67DRS90L4/TF/M1-A/180° | 1 | `OEM_GUIDE_SINGLE` | 1,0 л | matched | SA67 | Добавить отсутствующую SEW M1…M6 fill table для фактического семейства. |
| SEW-EURODRIVE | — | Мотор-редуктор SA67DT90L4/BM/M1-B | 1 | `OEM_GUIDE_SINGLE` | 1,0 л | matched | SA67 | Добавить отсутствующую SEW M1…M6 fill table для фактического семейства. |
| SEW-EURODRIVE | — | Мотор-редуктор SA67DV100M4/M1-A/180° | 2 | `OEM_GUIDE_SINGLE` | 1,0 л | matched | SA67 | Добавить отсутствующую SEW M1…M6 fill table для фактического семейства. |
| SEW-EURODRIVE | — | Мотор-редуктор SA67DV100M4/M1-B | 1 | `OEM_GUIDE_SINGLE` | 1,0 л | matched | SA67 | Добавить отсутствующую SEW M1…M6 fill table для фактического семейства. |
| SEW-EURODRIVE | — | Мотор-редуктор SA67DV100M4/TF/M1-A/180° | 1 | `OEM_GUIDE_SINGLE` | 1,0 л | matched | SA67 | Добавить отсутствующую SEW M1…M6 fill table для фактического семейства. |
| SEW-EURODRIVE | — | Мотор-редуктор SA67DV100M4/TF/M1-B | 2 | `OEM_GUIDE_SINGLE` | 1,0 л | matched | SA67 | Добавить отсутствующую SEW M1…M6 fill table для фактического семейства. |
| SEW-EURODRIVE | — | Мотор-редуктор SA67DV100M4/TF/M1-B/0° | 2 | `OEM_GUIDE_SINGLE` | 1,0 л | matched | SA67 | Добавить отсутствующую SEW M1…M6 fill table для фактического семейства. |
| SEW-EURODRIVE | — | Мотор-редуктор SA77DV132S4/BM/TF/M1-B | 1 | `OEM_GUIDE_SINGLE` | 1,8 л | matched | SA77 | Добавить отсутствующую SEW M1…M6 fill table для фактического семейства. |
| BONFIGLIOLI | — | Редуктор C412/P 1:15,8 B7 PAM 100 | 1 | `OEM_TECH_SUPPORT_REQUIRED` | — | matched | C 41 2 P 15.8 P100 B7 | Для C41 2 общий IOM требует OEM-подтверждение; не переносить 2,4 л с UFB B5 на P B3/B7. |
| TANDLER | — | Редуктор HW A1 1:1 III | 3 | `LUBRICANT_TYPE_CONFIRM` | 0,6 л | matched | HW A1 | Добавить распознавание TANDLER HW A1; перед созданием oil_change подтвердить тип заполнения. |
| ROSSI | — | Редуктор MRIV 63UO2A 1:101,6 B3PAM 80 | 1 | `MOUNTING_SEMANTICS_CONFIRM` | — | unmatched | — | Добавить MRIV63 recognition; подтвердить фактическое положение и type-code. |
| BONFIGLIOLI | — | Редуктор MW110/U 1:64 B6PAM 80 | 1 | `OEM_GUIDE_SINGLE` | 1,7 л | matched | MW110/U 64 B6 PAM80 | Добавить W110 ratio+mounting fill table. |
| BONFIGLIOLI | — | Редуктор MW110/U 1:64 B7PAM 80 | 1 | `OEM_GUIDE_SINGLE` | 1,7 л | matched | MW110/U 64 B7 PAM80 | Добавить W110 ratio+mounting fill table. |
| ABB / NABTESCO | — | Редуктор RV 400C-224.26 3HAC 022279-001 | 1 | `WRONG_DOMAIN` | — | unmatched | — | Убрать из gearbox_oil; создать отдельную политику precision reducer grease. Для ABB-узла подтвердить ориентацию и интеграционную полость. |
| ABB / NABTESCO | — | Редуктор RV 40E-81 3HAC 10828-10 | 1 | `WRONG_DOMAIN` | {"horizontal_cc": 195, "vertical_requires_orientation_table": true} | unmatched | — | Убрать из gearbox_oil; создать отдельную политику precision reducer grease. Для ABB-узла подтвердить ориентацию и интеграционную полость. |
| ABB / NABTESCO | — | Редуктор RV-450E 3HAC022644-001 | 2 | `WRONG_DOMAIN` | {"horizontal_cc": 1596, "vertical_requires_orientation_table": true} | unmatched | — | Убрать из gearbox_oil; создать отдельную политику precision reducer grease. Для ABB-узла подтвердить ориентацию и интеграционную полость. |
| UNKNOWN | — | Редуктор Линия №1 | 2 | `INSUFFICIENT_IDENTIFICATION` | — | unmatched | — | Нужны шильдик/производитель/точная модель. Автоподстановка запрещена. |
| UNKNOWN | — | Редуктор Линия №2 | 1 | `INSUFFICIENT_IDENTIFICATION` | — | unmatched | — | Нужны шильдик/производитель/точная модель. Автоподстановка запрещена. |
| ZIMM | — | Редуктор угловой Z-50-SN i=7:1 арт. TR 40x7-RH-L2120-SRO1750-VS-GK-FB1500 ZIMM | 2 | `WRONG_DOMAIN` | — | unmatched | — | Убрать Z-50-SN из обычного gearbox_oil. Использовать существующий screw-jack lubrication domain. |
| SEW-EURODRIVE | - | Мотор-редуктор KA107B/DV180L4 /BMG/HP | 2 | `MOUNTING_REQUIRED` | — | matched | KA107B | Сохранить OEM-таблицу; если вариантов несколько — не выбирать без ступеней/отношения. Финальный уровень/шильдик приоритетны. |
| SEW-EURODRIVE | - | Мотор-редуктор KA57B/DT90L4 | 2 | `MOUNTING_REQUIRED` | — | matched | KA57B | Сохранить OEM-таблицу; если вариантов несколько — не выбирать без ступеней/отношения. Финальный уровень/шильдик приоритетны. |
| SEW-EURODRIVE | - | Мотор-редуктор KA77B/DV112M4 | 2 | `MOUNTING_REQUIRED` | — | matched | KA77B | Сохранить OEM-таблицу; если вариантов несколько — не выбирать без ступеней/отношения. Финальный уровень/шильдик приоритетны. |
| SEW-EURODRIVE | - | Мотор-редуктор KA87B/DV132M4 | 1 | `MOUNTING_REQUIRED` | — | matched | KA87B | Сохранить OEM-таблицу; если вариантов несколько — не выбирать без ступеней/отношения. Финальный уровень/шильдик приоритетны. |
| SEW-EURODRIVE | - | Мотор-редуктор KA87B/DV132S4 | 2 | `MOUNTING_REQUIRED` | — | matched | KA87B | Сохранить OEM-таблицу; если вариантов несколько — не выбирать без ступеней/отношения. Финальный уровень/шильдик приоритетны. |
| BONFIGLIOLI | BONFIGLIOLI | Редуктор 301 L2 1:20,1 HC EPIC. PAM 112 A | 4 | `OEM_GUIDE_SINGLE` | 1,1 л | matched | 301 L2 20.1 P112 | Добавить OEM-таблицу 301 L2, положение A = 1,1 л. |
| BONFIGLIOLI | BONFIGLIOLI | Редуктор A202/UH30 1:29,2 VB PAM 90 | 4 | `OEM_TECH_SUPPORT_REQUIRED` | — | matched | A 20 2 UH30 29.2 P90 VB | Не подставлять по аналогии: IOM для A20/A41 требует Bonfiglioli Technical Assistance или точную product-card/SKU. |
| BONFIGLIOLI | BONFIGLIOLI | Редуктор A412/NH 1:7,1 B3 PAM 132 | 2 | `OEM_TECH_SUPPORT_REQUIRED` | — | matched | A 41 2 NH 7.1 P132 B3 | Не подставлять по аналогии: IOM для A20/A41 требует Bonfiglioli Technical Assistance или точную product-card/SKU. |
| BONFIGLIOLI | BONFIGLIOLI | Редуктор A412/NR 1:28,3 B5 PAM 112 | 2 | `OEM_TECH_SUPPORT_REQUIRED` | — | matched | A 41 2 NR 28.3 P112 B5 | Не подставлять по аналогии: IOM для A20/A41 требует Bonfiglioli Technical Assistance или точную product-card/SKU. |
| BONFIGLIOLI | BONFIGLIOLI | Редуктор A412/UH45 1:11,7 B3 PAM 112 Линия №2 | 1 | `OEM_PRODUCT_CARD_SINGLE` | 4,3 л | matched | A 41 2 UH45 11.7 P112 B3 | Сохранить точную SKU/product-card привязку; не распространять значение на другие A20/A41. |
| BONFIGLIOLI | BONFIGLIOLI | Редуктор A412/UH45 1:45,1 B3 PAM 100 | 1 | `OEM_TECH_SUPPORT_REQUIRED` | — | matched | A 41 2 UH45 45.1 P100 B3 | Не подставлять по аналогии: IOM для A20/A41 требует Bonfiglioli Technical Assistance или точную product-card/SKU. |
| BONFIGLIOLI | BONFIGLIOLI | Редуктор A413/NR 1:92,8 B3 PAM 100 Линия №1 | 1 | `OEM_TECH_SUPPORT_REQUIRED` | — | matched | A 41 3 NR 92.8 P100 B3 | Не подставлять по аналогии: IOM для A20/A41 требует Bonfiglioli Technical Assistance или точную product-card/SKU. |
| BONFIGLIOLI | BONFIGLIOLI | Редуктор A413/NR 1:92,8 B3 PAM 100 Линия №2 | 1 | `OEM_TECH_SUPPORT_REQUIRED` | — | matched | A 41 3 NR 92.8 P100 B3 | Не подставлять по аналогии: IOM для A20/A41 требует Bonfiglioli Technical Assistance или точную product-card/SKU. |
| BONFIGLIOLI | BONFIGLIOLI | Редуктор A503/NR 1:81,5 B3 PAM 100 Линия №1 | 1 | `OEM_GUIDE_SINGLE` | 6,1 л | matched | A 50 3 NR 81.5 P100 B3 | Добавить A50 3 OEM fill table в resolver. |
| BONFIGLIOLI | BONFIGLIOLI | Редуктор A503/NR 1:81,5 B3 PAM 100 Линия №2 | 1 | `OEM_GUIDE_SINGLE` | 6,1 л | matched | A 50 3 NR 81.5 P100 B3 | Добавить A50 3 OEM fill table в resolver. |
| BONFIGLIOLI | BONFIGLIOLI | Редуктор A503/UH50 1:32,4 VA PAM 90 | 4 | `OEM_GUIDE_SINGLE` | 11,0 л | matched | A 50 3 UH50 32.4 P90 VA | Добавить A50 3 OEM fill table в resolver. |
| BONFIGLIOLI | BONFIGLIOLI | Редуктор C312/P 1:15,6 B7 PAM 100 | 1 | `OEM_TECH_SUPPORT_REQUIRED` | — | matched | C 31 2 P 15.6 P100 B7 | IOM для C31/C41 не даёт универсального объёма; нужна точная product-card/SKU. |
| BONFIGLIOLI | BONFIGLIOLI | Редуктор C312/P 1:22,6 B8 PAM 90 | 1 | `OEM_TECH_SUPPORT_REQUIRED` | — | matched | C 31 2 P 22.6 P90 B8 | IOM для C31/C41 не даёт универсального объёма; нужна точная product-card/SKU. |
| BONFIGLIOLI | BONFIGLIOLI | Редуктор C412/P 1:15,8 B7 PAM 100 | 1 | `OEM_TECH_SUPPORT_REQUIRED` | — | matched | C 41 2 P 15.8 P100 B7 | Для C41 2 общий IOM требует OEM-подтверждение; не переносить 2,4 л с UFB B5 на P B3/B7. |
| BONFIGLIOLI | BONFIGLIOLI | Редуктор C412/P 1:25 B3 PAM 100 | 4 | `OEM_TECH_SUPPORT_REQUIRED` | — | matched | C 41 2 P 25 P100 B3 | Для C41 2 общий IOM требует OEM-подтверждение; не переносить 2,4 л с UFB B5 на P B3/B7. |
| BONFIGLIOLI | BONFIGLIOLI | Редуктор C412/P 1:31,4 B6 PAM 100 | 1 | `OEM_TECH_SUPPORT_REQUIRED` | — | unmatched | — | C41 2/P не заполнять по аналогии; нужна точная product-card/SKU. |
| BONFIGLIOLI | BONFIGLIOLI | Редуктор C412/P 1:9,6 B7 PAM 100 | 4 | `OEM_TECH_SUPPORT_REQUIRED` | — | matched | C 41 2 P 9.6 P100 B7 | Для C41 2 общий IOM требует OEM-подтверждение; не переносить 2,4 л с UFB B5 на P B3/B7. |
| BONFIGLIOLI | BONFIGLIOLI | Редуктор C412/UFB 1:11,2 B5 PAM 112 Линия №2 | 2 | `OEM_PRODUCT_CARD_SINGLE` | 2,4 л | matched | C 41 2 UFB 11.2 P112 B5 | Сохранить точную SKU/product-card привязку. |
| BONFIGLIOLI | BONFIGLIOLI | Редуктор C412/UFB 1:9,6 B5 PAM 100 Линия №1 | 1 | `OEM_PRODUCT_CARD_SINGLE` | 2,4 л | matched | C 41 2 UFB 9.6 P100 B5 | Сохранить точную SKU/product-card привязку. |
| BONFIGLIOLI | BONFIGLIOLI | Редуктор C412/UFB 1:9,6 B5 PAM 100 Линия №2 | 2 | `OEM_PRODUCT_CARD_SINGLE` | 2,4 л | matched | C 41 2 UFB 9.6 P100 B5 | Сохранить точную SKU/product-card привязку. |
| BONFIGLIOLI | BONFIGLIOLI | Редуктор C413/P 1:31,2 B6 PAM 100 | 7 | `OEM_TECH_SUPPORT_REQUIRED` | — | matched | C 41 3 P 31.2 P100 B6 | IOM для C31/C41 не даёт универсального объёма; нужна точная product-card/SKU. |
| BONFIGLIOLI | BONFIGLIOLI | Редуктор C512/P 1:23,4 B6 PAM 132 | 2 | `OEM_GUIDE_SINGLE` | 2,9 л | matched | C 51 2 P 23.4 P132 B6 | Добавить C51 2 B6=2,9 л. |
| BONFIGLIOLI | BONFIGLIOLI | Редуктор C513/P 1:93,0 B3 PAM 90 | 2 | `OEM_GUIDE_SINGLE` | 2,9 л | matched | C 51 3 P 93 P90 B3 | Добавить C51 3 B3=2,9 л. |
| BONFIGLIOLI | BONFIGLIOLI | Редуктор C612/P 1:10,9 B3 PAM 132 | 4 | `OEM_GUIDE_SINGLE` | 4,1 л | matched | C 61 2 P 10.9 P132 B3 | Добавить C61 2 B3=4,1 л. |
| BONFIGLIOLI | BONFIGLIOLI | Редуктор F603 H60 1:32,1 H1 PAM 132 Линия №1 | 1 | `OEM_PRODUCT_CARD_SINGLE` | 14,0 л | matched | F 60 3 H60 32.1 P132 H1 | Текущая запись 14 л соответствует OEM; сохранить. |
| BONFIGLIOLI | BONFIGLIOLI | Редуктор F603 H60 1:32,1 H1 PAM 132 Линия №2 | 1 | `OEM_PRODUCT_CARD_SINGLE` | 14,0 л | matched | F 60 3 H60 32.1 P132 H1 | Текущая запись 14 л соответствует OEM; сохранить. |
| ROSSI | BONFIGLIOLI | Редуктор MRV 50UO3A 1:15 V6 PAM 80 Линия №2 | 1 | `MANUFACTURER_CONFLICT` | — | unmatched | — | Исправить производителя/подтвердить шильдик Rossi; затем разрешать OEM-таблицу по точной конструкции и положению. |
| ROSSI | BONFIGLIOLI | Редуктор MRV 50UO3A 1:25 B3 PAM 80 Линия №1 | 1 | `MANUFACTURER_CONFLICT` | — | unmatched | — | Исправить производителя/подтвердить шильдик Rossi; затем разрешать OEM-таблицу по точной конструкции и положению. |
| ROSSI | BONFIGLIOLI | Редуктор MRV 50UO3A 1:25 B3 PAM 80 Линия №2 | 1 | `MANUFACTURER_CONFLICT` | — | unmatched | — | Исправить производителя/подтвердить шильдик Rossi; затем разрешать OEM-таблицу по точной конструкции и положению. |
| ROSSI | BONFIGLIOLI | Редуктор MRV 50UO3A 1:40 B6 PAM 80 | 1 | `MANUFACTURER_CONFLICT` | — | unmatched | — | Подтвердить шильдик/исправить производителя; cross-OEM guard сохранить. |
| ROSSI | BONFIGLIOLI | Редуктор MRV 63UO3A 1:16 Линия №2 | 2 | `MANUFACTURER_CONFLICT` | — | unmatched | — | Исправить производителя/подтвердить шильдик Rossi; затем разрешать OEM-таблицу по точной конструкции и положению. |
| ROSSI | BONFIGLIOLI | Редуктор MRV 80UO3A 1:20 B3 PAM 100 Линия №1 | 1 | `MANUFACTURER_CONFLICT` | — | unmatched | — | Исправить производителя/подтвердить шильдик Rossi; затем разрешать OEM-таблицу по точной конструкции и положению. |
| ROSSI | BONFIGLIOLI | Редуктор MRV 80UO3A 1:20 B3 PAM 100 Линия №2 | 1 | `MANUFACTURER_CONFLICT` | — | unmatched | — | Исправить производителя/подтвердить шильдик Rossi; затем разрешать OEM-таблицу по точной конструкции и положению. |
| ROSSI | BONFIGLIOLI | Редуктор MRV 81UO3A 1:50 B6 PAM 100 | 12 | `MANUFACTURER_CONFLICT` | — | unmatched | — | Исправить производителя/подтвердить шильдик Rossi; затем разрешать OEM-таблицу по точной конструкции и положению. |
| BONFIGLIOLI | BONFIGLIOLI | Редуктор MVF 30/F1 1:60 B14 B8 PAM 63 | 14 | `OEM_FACTORY_CHARGE` | 0,045 л | matched | MVF30/F1 60 B8 PAM63 | Добавить VF/MVF fill + исправить parser и политику обслуживания. |
| BONFIGLIOLI | BONFIGLIOLI | Редуктор MVF 44/F1 1:60 B5 B6 PAM 63 | 14 | `OEM_FACTORY_CHARGE` | 0,075 л | matched | MVF44/F1 60 B6 PAM63 | Добавить VF/MVF fill + исправить parser и политику обслуживания. |
| BONFIGLIOLI | BONFIGLIOLI | Редуктор MVF 49/F1 1:60 B3 PAM 71 | 2 | `OEM_FACTORY_CHARGE` | 0,12 л | matched | MVF49/F1 60 B3 PAM71 | Добавить VF/MVF fill + исправить parser и политику обслуживания. |
| BONFIGLIOLI | BONFIGLIOLI | Редуктор MVF 86/FC 1:46 B5 B3 PAM 90 | 1 | `OEM_FACTORY_CHARGE` | 0,87 л | matched | MVF86/FC 46 B3 PAM90 | Добавить VF/MVF fill + исправить parser и политику обслуживания. |
| BONFIGLIOLI | BONFIGLIOLI | Редуктор MW75/U 1:80 B5PAM 80 | 2 | `OEM_FACTORY_CHARGE` | 0,56 л | matched | MW75/U 1:80 B5 PAM 80 | Добавить W75 ratio-based fill; положение на объём W75 не влияет в OEM-таблице. |
| BONFIGLIOLI | BONFIGLIOLI | Редуктор RAN38 DA 1:2 B3 | 2 | `OEM_GUIDE_SINGLE` | 3,0 л | matched | RAN38 DA 2 B3 | Добавить RAN38 B3=3,0 л; финальный уровень по стеклу/щупу. |
| BONFIGLIOLI | BONFIGLIOLI | Редуктор RAN38 DC 1:2 B3 | 2 | `OEM_GUIDE_SINGLE` | 3,0 л | matched | RAN38 DC 2 B3 | Добавить RAN38 B3=3,0 л; финальный уровень по стеклу/щупу. |
| BONFIGLIOLI | BONFIGLIOLI | Редуктор W 75/U 1:10 PAM 90 | 2 | `OEM_FACTORY_CHARGE` | 0,48 л | matched | W75/U 10 PAM90 | Добавить W75 ratio-based fill; положение на объём W75 не влияет в OEM-таблице. |
| BREVINI RIDUTTORI | BREVINI RIDUTTORI | Редуктор SL3003/FS/62.5/61141201980 Линия №1 | 1 | `CUSTOM_CONFIGURATION_CONFIRM` | — | matched | SL3003/FS/62.5 | Не автозаполнять: S-Series допускает FS/FAR и специальные системы; нужен exact datasheet/nameplate/mounting position. |
| BREVINI RIDUTTORI | BREVINI RIDUTTORI | Редуктор SL3003/FS/62.5/61141201980 Линия №2 | 1 | `CUSTOM_CONFIGURATION_CONFIRM` | — | matched | SL3003/FS/62.5 | Не автозаполнять: S-Series допускает FS/FAR и специальные системы; нужен exact datasheet/nameplate/mounting position. |
| BREVINI RIDUTTORI | BREVINI RIDUTTORI | Редуктор SL8504FAR 1:233,5 EPIC. PAM 200 | 4 | `CUSTOM_CONFIGURATION_CONFIRM` | — | matched | SL8504 | Не автозаполнять: S-Series допускает FS/FAR и специальные системы; нужен exact datasheet/nameplate/mounting position. |
| LENZE | LENZE | Мотор-редуктор GKS04-3S HAR 09DC41/A | 1 | `LIFETIME_LUBRICATED` | — | matched | GKS04 | Не создавать периодическую замену масла: Lenze frame size 04 permanently lubricated. |
| LENZE | LENZE | Мотор-редуктор GKS06-3S VAR 14HC32/A | 1 | `LEGACY_TYPECODE_MOUNTING_REQUIRED` | — | matched | GKS06 | Для size >=05 нужен legacy manual/material number + монтажное положение; масло только по шильдику. |
| LENZE | LENZE | Мотор-редуктор GST05-2M VBR 063C42 i=50,05 | 1 | `LEGACY_TYPECODE_MOUNTING_REQUIRED` | — | matched | GST05 | Для size >=05 нужен legacy manual/material number + монтажное положение; масло только по шильдику. |
| ROSSI | ROSSI MOTORIDUTTORI | Редуктор MRIV 80UO3A 1:11,2 B5 | 1 | `MOUNTING_SEMANTICS_CONFIRM` | — | matched | MRIV80 | Подтвердить реальное монтажное положение Rossi MRIV80 и применять таблицу Rossi A Series. |
| SEW-EURODRIVE | SEW EURODRIVE | Мотор-редуктор FH67/GDRE90M4/TF i=36,3 Линия №1 | 1 | `MOUNTING_REQUIRED` | — | matched | FH67 | Сохранить OEM-таблицу; если вариантов несколько — не выбирать без ступеней/отношения. Финальный уровень/шильдик приоритетны. |
| SEW-EURODRIVE | SEW EURODRIVE | Мотор-редуктор FH67/GDRE90M4/TF i=36,3 Линия №2 | 1 | `MOUNTING_REQUIRED` | — | matched | FH67 | Сохранить OEM-таблицу; если вариантов несколько — не выбирать без ступеней/отношения. Финальный уровень/шильдик приоритетны. |
| SEW-EURODRIVE | SEW EURODRIVE | Мотор-редуктор FH77/G DRE132S4/TF i=58.32 N=4 кВт n=1460 об/мин | 1 | `MOUNTING_REQUIRED` | {"M1": 5.9, "M2": 7.3, "M3": 4.3, "M4": 8.0, "M5": 6.0, "M6": 6.3} | unmatched | — | Add FH77 recognition and mounting resolver. |
| SEW-EURODRIVE | SEW EURODRIVE | Мотор-редуктор FH77/GDRE112M4/TF  i=43,58 N=3 кВт | 1 | `MOUNTING_REQUIRED` | {"M1": 5.9, "M2": 7.3, "M3": 4.3, "M4": 8.0, "M5": 6.0, "M6": 6.3} | unmatched | — | Add FH77 recognition and mounting resolver. |
| SEW-EURODRIVE | SEW EURODRIVE | Мотор-редуктор FH87/GDRE132M4/TF  i=56,75 N=5,5 кВт | 2 | `MOUNTING_REQUIRED` | {"M1": 10.8, "M2": 13.0, "M3": 7.7, "M4": 13.8, "M5": 10.8, "M6": 11.0} | unmatched | — | Add FH87 recognition and mounting resolver. |
| SEW-EURODRIVE | SEW EURODRIVE | Мотор-редуктор FT127DRE180L4/TF/EG7C/V  N=18,5 кВт n=1470 об/мин Линия №1 | 1 | `MOUNTING_REQUIRED` | — | matched | FT127 | Сохранить OEM-таблицу; если вариантов несколько — не выбирать без ступеней/отношения. Финальный уровень/шильдик приоритетны. |
| SEW-EURODRIVE | SEW EURODRIVE | Мотор-редуктор FT127DRE180L4/TF/EG7C/V N=18,5 кВт n=1470 об/мин Линия №1 | 1 | `MOUNTING_REQUIRED` | — | matched | FT127 | Сохранить OEM-таблицу; если вариантов несколько — не выбирать без ступеней/отношения. Финальный уровень/шильдик приоритетны. |
| SEW-EURODRIVE | SEW EURODRIVE | Мотор-редуктор K37DRE100M4/TF | 2 | `MOUNTING_REQUIRED` | — | matched | K37 | Семейство распознано, но из строки не определено M1…M6. Нужен шильдик/положение. |
| SEW-EURODRIVE | SEW EURODRIVE | Мотор-редуктор K37DV100M4/M1/A+B i=5,36 | 2 | `OEM_GUIDE_SINGLE` | 0,5 л | matched | K37 | Добавить отсутствующую SEW M1…M6 fill table для фактического семейства. |
| SEW-EURODRIVE | SEW EURODRIVE | Мотор-редуктор K67DV112M4/BM/BUR/TF/M1/A+B | 1 | `OEM_GUIDE_SINGLE` | 1,1 л | matched | K67 | Добавить отсутствующую SEW M1…M6 fill table для фактического семейства. |
| SEW-EURODRIVE | SEW EURODRIVE | Мотор-редуктор KA37 AQA100/2/M3-A i=24,99 | 1 | `OEM_GUIDE_SINGLE` | 1,0 л | matched | KA37 | Добавить отсутствующую SEW M1…M6 fill table для фактического семейства. |
| SEW-EURODRIVE | SEW EURODRIVE | Мотор-редуктор KA37DRS71S4/Z/M4-A/180° | 2 | `OEM_GUIDE_SINGLE` | 1,4 л | matched | KA37 | Добавить отсутствующую SEW M1…M6 fill table для фактического семейства. |
| SEW-EURODRIVE | SEW EURODRIVE | Мотор-редуктор KA87/TDRS100M4BE5 i=49,16 N=3 кВт | 1 | `MOUNTING_REQUIRED` | {"M1": 3.7, "M2": 8.0, "M3": 8.7, "M4": 10.9, "M5": 8.0, "M6": 8.0} | unmatched | — | Add KA87 recognition; request/derive mounting position. |
| SEW-EURODRIVE | SEW EURODRIVE | Мотор-редуктор KF37R17DR63S4/TF | 10 | `COMPOUND_GEAR_UNIT_CONFIRM` | — | matched | KF37R17 | Составной редуктор: не использовать только таблицу K37; требуется точная компоновка/объём секций. |
| SEW-EURODRIVE | SEW EURODRIVE | Мотор-редуктор KH47/DRE80M4/TF/M1A-180 i=75,20 N=0,75 кВт | 3 | `OEM_GUIDE_SINGLE` | 0,8 л | matched | KH47 | Resolver already recognizes KH47, but must resolve M1 to 0.80 l. |
| SEW-EURODRIVE | SEW EURODRIVE | Мотор-редуктор KH47/T DRE80M4/TF/ES7C  i=75,20 N=0,75 кВт | 2 | `MOUNTING_REQUIRED` | — | matched | KH47 | Семейство распознано, но из строки не определено M1…M6. Нужен шильдик/положение. |
| SEW-EURODRIVE | SEW EURODRIVE | Мотор-редуктор KH77/TDRE10M4/TF i=29.27 Линия №1 | 1 | `MOUNTING_REQUIRED` | — | matched | KH77 | Сохранить OEM-таблицу; если вариантов несколько — не выбирать без ступеней/отношения. Финальный уровень/шильдик приоритетны. |
| SEW-EURODRIVE | SEW EURODRIVE | Мотор-редуктор KH77/TDRE10M4/TF i=29.27 Линия №2 | 1 | `MOUNTING_REQUIRED` | — | matched | KH77 | Сохранить OEM-таблицу; если вариантов несколько — не выбирать без ступеней/отношения. Финальный уровень/шильдик приоритетны. |
| SEW-EURODRIVE | SEW EURODRIVE | Мотор-редуктор KH87BDV112M4/TF/EV1T/VS i=49,16 | 1 | `MOUNTING_REQUIRED` | — | matched | KH87B | Семейство распознано, но из строки не определено M1…M6. Нужен шильдик/положение. |
| SEW-EURODRIVE | SEW EURODRIVE | Мотор-редуктор KHF47DRE100M4/TF/V/M1B  i=16,86 N=2,2 кВт | 2 | `OEM_GUIDE_SINGLE` | 0,8 л | unmatched | — | Add KHF47 parser/dataset; M1=0.80 l. |
| SEW-EURODRIVE | SEW EURODRIVE | Мотор-редуктор KHF87DRE132M4/TF  i=49,16 N=5,5 кВт | 2 | `MOUNTING_REQUIRED` | — | unmatched | — | Add KHF87 recognition; request/derive mounting position. |
| SEW-EURODRIVE | SEW EURODRIVE | Мотор-редуктор R37DT80N4/TF N=0,75кВт i=18,05 | 1 | `MOUNTING_REQUIRED` | — | matched | R37 | Сохранить OEM-таблицу; если вариантов несколько — не выбирать без ступеней/отношения. Финальный уровень/шильдик приоритетны. |
| SEW-EURODRIVE | SEW EURODRIVE | Мотор-редуктор R37DT90S4/M1 i=9,47 | 1 | `OEM_GUIDE_OPTIONS` | [0.3, 0.95] | matched | R37 | Сохранить OEM-таблицу; если вариантов несколько — не выбирать без ступеней/отношения. Финальный уровень/шильдик приоритетны. |
| SEW-EURODRIVE | SEW EURODRIVE | Мотор-редуктор R47DRS90M4/TF/M1 | 1 | `OEM_GUIDE_OPTIONS` | [0.7, 1.5] | matched | R47 | Сохранить OEM-таблицу; если вариантов несколько — не выбирать без ступеней/отношения. Финальный уровень/шильдик приоритетны. |
| SEW-EURODRIVE | SEW EURODRIVE | Мотор-редуктор R57DRS100LC4/TF/M6/180° | 2 | `OEM_GUIDE_SINGLE` | 1,7 л | matched | R57 | Сохранить OEM-таблицу; если вариантов несколько — не выбирать без ступеней/отношения. Финальный уровень/шильдик приоритетны. |
| SEW-EURODRIVE | SEW EURODRIVE | Мотор-редуктор R57DRS90L4/TF/M5/270° | 1 | `OEM_GUIDE_SINGLE` | 1,7 л | matched | R57 | Сохранить OEM-таблицу; если вариантов несколько — не выбирать без ступеней/отношения. Финальный уровень/шильдик приоритетны. |
| SEW-EURODRIVE | SEW EURODRIVE | Мотор-редуктор R67DRE132S4/TF i=8,7 Линия №1 | 3 | `MOUNTING_REQUIRED` | — | matched | R67 | Сохранить OEM-таблицу; если вариантов несколько — не выбирать без ступеней/отношения. Финальный уровень/шильдик приоритетны. |
| SEW-EURODRIVE | SEW EURODRIVE | Мотор-редуктор R67DRS90L4/TF/M1 | 1 | `OEM_GUIDE_OPTIONS` | [1.1, 2.3] | matched | R67 | Сохранить OEM-таблицу; если вариантов несколько — не выбирать без ступеней/отношения. Финальный уровень/шильдик приоритетны. |
| SEW-EURODRIVE | SEW EURODRIVE | Мотор-редуктор R67DT90S4/TF/ES1T/M5/180° | 1 | `OEM_GUIDE_SINGLE` | 1,8 л | matched | R67 | Сохранить OEM-таблицу; если вариантов несколько — не выбирать без ступеней/отношения. Финальный уровень/шильдик приоритетны. |
| SEW-EURODRIVE | SEW EURODRIVE | Мотор-редуктор R67DT90S4/TF/M3/270° | 1 | `OEM_GUIDE_SINGLE` | 2,8 л | matched | R67 | Сохранить OEM-таблицу; если вариантов несколько — не выбирать без ступеней/отношения. Финальный уровень/шильдик приоритетны. |
| SEW-EURODRIVE | SEW EURODRIVE | Мотор-редуктор R67DV100M4/TF/M3 | 1 | `OEM_GUIDE_SINGLE` | 2,8 л | matched | R67 | Сохранить OEM-таблицу; если вариантов несколько — не выбирать без ступеней/отношения. Финальный уровень/шильдик приоритетны. |
| SEW-EURODRIVE | SEW EURODRIVE | Мотор-редуктор R77DR63L6/M1 Линия №1 | 2 | `OEM_GUIDE_OPTIONS` | [1.2, 3] | matched | R77 | Сохранить OEM-таблицу; если вариантов несколько — не выбирать без ступеней/отношения. Финальный уровень/шильдик приоритетны. |
| SEW-EURODRIVE | SEW EURODRIVE | Мотор-редуктор R77DR63L6/M1 Линия №2 | 2 | `OEM_GUIDE_OPTIONS` | [1.2, 3] | matched | R77 | Сохранить OEM-таблицу; если вариантов несколько — не выбирать без ступеней/отношения. Финальный уровень/шильдик приоритетны. |
| SEW-EURODRIVE | SEW EURODRIVE | Мотор-редуктор R77DRE100LC4/TF/ES7C/V  i=23,37 N=3кВт | 2 | `MOUNTING_REQUIRED` | — | matched | R77 | Сохранить OEM-таблицу; если вариантов несколько — не выбирать без ступеней/отношения. Финальный уровень/шильдик приоритетны. |
| SEW-EURODRIVE | SEW EURODRIVE | Мотор-редуктор R77DRE132S4/TF/ES7C/V  i=23,37 N=4кВт | 2 | `MOUNTING_REQUIRED` | — | matched | R77 | Сохранить OEM-таблицу; если вариантов несколько — не выбирать без ступеней/отношения. Финальный уровень/шильдик приоритетны. |
| SEW-EURODRIVE | SEW EURODRIVE | Мотор-редуктор R77DV100L4/TF/VS/EV1T N=3 кВт, n2=60 мин-1, М=480 Нм, i=23,37 | 1 | `MOUNTING_REQUIRED` | — | matched | R77 | Сохранить OEM-таблицу; если вариантов несколько — не выбирать без ступеней/отношения. Финальный уровень/шильдик приоритетны. |
| SEW-EURODRIVE | SEW EURODRIVE | Мотор-редуктор R77DV100M4/M2/0 | 2 | `OEM_GUIDE_OPTIONS` | [3.8, 4.1] | matched | R77 | Сохранить OEM-таблицу; если вариантов несколько — не выбирать без ступеней/отношения. Финальный уровень/шильдик приоритетны. |
| SEW-EURODRIVE | SEW EURODRIVE | Мотор-редуктор R87DRE132S4/TF/ES7C/V-52-M1 N=4,0 кВт i=27,84 | 2 | `OEM_GUIDE_OPTIONS` | [2.3, 6.0] | matched | R87 | Keep options until stage/ratio condition is resolved. |
| SEW-EURODRIVE | SEW EURODRIVE | Мотор-редуктор R87DRS160M4/BM/TF/M1 | 1 | `OEM_GUIDE_OPTIONS` | [2.3, 6] | matched | R87 | Сохранить OEM-таблицу; если вариантов несколько — не выбирать без ступеней/отношения. Финальный уровень/шильдик приоритетны. |
| SEW-EURODRIVE | SEW EURODRIVE | Мотор-редуктор R97 DRE132M4/TF/ES7C/V i=25,03 | 1 | `MOUNTING_REQUIRED` | — | matched | R97 | Сохранить OEM-таблицу; если вариантов несколько — не выбирать без ступеней/отношения. Финальный уровень/шильдик приоритетны. |
| SEW-EURODRIVE | SEW EURODRIVE | Мотор-редуктор RF47DRE90L4/A/F/M1-A/180° N=1,5кВт | 1 | `OEM_GUIDE_OPTIONS` | [0.65, 1.5] | matched | RF47 | Сохранить OEM-таблицу; если вариантов несколько — не выбирать без ступеней/отношения. Финальный уровень/шильдик приоритетны. |
| SEW-EURODRIVE | SEW EURODRIVE | Мотор-редуктор RF47DRE90L4/F/M1 N=1,5кВт, n2=88 мин-1, i=16,22 | 1 | `OEM_GUIDE_OPTIONS` | [0.65, 1.5] | matched | RF47 | Сохранить OEM-таблицу; если вариантов несколько — не выбирать без ступеней/отношения. Финальный уровень/шильдик приоритетны. |
| SEW-EURODRIVE | SEW EURODRIVE | Мотор-редуктор RX87DV132S4/TF/BMG/ES2T/M1 | 2 | `OEM_GUIDE_SINGLE` | 1,7 л | matched | RX87 | Сохранить OEM-таблицу; если вариантов несколько — не выбирать без ступеней/отношения. Финальный уровень/шильдик приоритетны. |
| SEW-EURODRIVE | SEW EURODRIVE | Мотор-редуктор S47DRE90L4/A/F/M6-A/90° | 1 | `OEM_GUIDE_SINGLE` | 0,8 л | matched | S47 | Добавить отсутствующую SEW M1…M6 fill table для фактического семейства. |
| SEW-EURODRIVE | SEW EURODRIVE | Мотор-редуктор S47DRS80S4/TF/M6-A/180° | 2 | `OEM_GUIDE_SINGLE` | 0,8 л | matched | S47 | Добавить отсутствующую SEW M1…M6 fill table для фактического семейства. |
| SEW-EURODRIVE | SEW EURODRIVE | Мотор-редуктор S77DRE90M4 | 4 | `MOUNTING_REQUIRED` | — | matched | S77 | Сохранить OEM-таблицу; если вариантов несколько — не выбирать без ступеней/отношения. Финальный уровень/шильдик приоритетны. |
| SEW-EURODRIVE | SEW EURODRIVE | Мотор-редуктор SA37DT71D4/BM/ES1T/M1/A/180 | 1 | `OEM_GUIDE_SINGLE` | 0,25 л | matched | SA37 | Добавить отсутствующую SEW M1…M6 fill table для фактического семейства. |
| SEW-EURODRIVE | SEW EURODRIVE | Мотор-редуктор SA47DRS80M4/F/M1-B/0° N=0,75 кВт, n2=49 мин-1, i=29 | 1 | `OEM_GUIDE_SINGLE` | 0,4 л | matched | SA47 | Добавить отсутствующую SEW M1…M6 fill table для фактического семейства. |
| SEW-EURODRIVE | SEW EURODRIVE | Мотор-редуктор SA47DRS80M4/TF/M1-A/270° | 2 | `OEM_GUIDE_SINGLE` | 0,4 л | matched | SA47 | Добавить отсутствующую SEW M1…M6 fill table для фактического семейства. |
| SEW-EURODRIVE | SEW EURODRIVE | Мотор-редуктор SA47DRS80M4/TF/M1-B | 1 | `OEM_GUIDE_SINGLE` | 0,4 л | matched | SA47 | Добавить отсутствующую SEW M1…M6 fill table для фактического семейства. |
| SEW-EURODRIVE | SEW EURODRIVE | Мотор-редуктор SA47DRS80S2/BMG/ES7C/M1-A/270° | 1 | `OEM_GUIDE_SINGLE` | 0,4 л | matched | SA47 | Добавить отсутствующую SEW M1…M6 fill table для фактического семейства. |
| SEW-EURODRIVE | SEW EURODRIVE | Мотор-редуктор SA47DRS80S4/TF/M1-B/0° | 2 | `OEM_GUIDE_SINGLE` | 0,4 л | matched | SA47 | Добавить отсутствующую SEW M1…M6 fill table для фактического семейства. |
| SEW-EURODRIVE | SEW EURODRIVE | Мотор-редуктор SA47DT80N4/TF/M1-B/0° | 1 | `OEM_GUIDE_SINGLE` | 0,4 л | matched | SA47 | Добавить отсутствующую SEW M1…M6 fill table для фактического семейства. |
| SEW-EURODRIVE | SEW EURODRIVE | Мотор-редуктор SA57DRS71S4/X/BUR/F/M6-A/270° N=0,37 кВт | 1 | `OEM_GUIDE_SINGLE` | 1,2 л | matched | SA57 | Добавить отсутствующую SEW M1…M6 fill table для фактического семейства. |
| SEW-EURODRIVE | SEW EURODRIVE | Мотор-редуктор SA57DRS90L4/TF/EI71 N=2,2 кВт, n=1400 мин-1, i=19,54 | 1 | `MOUNTING_REQUIRED` | — | matched | SA57 | Семейство распознано, но из строки не определено M1…M6. Нужен шильдик/положение. |
| SEW-EURODRIVE | SEW EURODRIVE | Мотор-редуктор SA57DRS90M4/F/M1-A N=1,1 кВт, n2=61 мин-1, i=23,2 | 3 | `OEM_GUIDE_SINGLE` | 0,5 л | matched | SA57 | Добавить отсутствующую SEW M1…M6 fill table для фактического семейства. |
| SEW-EURODRIVE | SEW EURODRIVE | Мотор-редуктор SA57DT90L4/TF/M1/A/180 | 1 | `OEM_GUIDE_SINGLE` | 0,5 л | matched | SA57 | Добавить отсутствующую SEW M1…M6 fill table для фактического семейства. |
| SEW-EURODRIVE | SEW EURODRIVE | Мотор-редуктор SA57DT90L4/TF/VS/M1-A/180° | 1 | `OEM_GUIDE_SINGLE` | 0,5 л | matched | SA57 | Добавить отсутствующую SEW M1…M6 fill table для фактического семейства. |
| SEW-EURODRIVE | SEW EURODRIVE | Мотор-редуктор SA67DRE90L4-BM/BSR/M1-A/180° N=1,5 кВт N=1,1 кВт | 2 | `OEM_GUIDE_SINGLE` | 1,0 л | matched | SA67 | Добавить отсутствующую SEW M1…M6 fill table для фактического семейства. |
| SEW-EURODRIVE | SEW EURODRIVE | Мотор-редуктор SA67DRE90L4/F/M1-A/180° N=1,5 кВт, n2=82 мин-1, i=17,28 | 1 | `OEM_GUIDE_SINGLE` | 1,0 л | matched | SA67 | Добавить отсутствующую SEW M1…M6 fill table для фактического семейства. |
| SEW-EURODRIVE | SEW EURODRIVE | Мотор-редуктор SA67DRS90L4/TF/M1-B/0° | 1 | `OEM_GUIDE_SINGLE` | 1,0 л | matched | SA67 | Добавить отсутствующую SEW M1…M6 fill table для фактического семейства. |
| SEW-EURODRIVE | SEW EURODRIVE | Мотор-редуктор SA67DV100M4/M1-B | 2 | `OEM_GUIDE_SINGLE` | 1,0 л | matched | SA67 | Добавить отсутствующую SEW M1…M6 fill table для фактического семейства. |
| SEW-EURODRIVE | SEW EURODRIVE | Мотор-редуктор SA67DV100M4/TF/M1-A/180° | 1 | `OEM_GUIDE_SINGLE` | 1,0 л | matched | SA67 | Добавить отсутствующую SEW M1…M6 fill table для фактического семейства. |
| SEW-EURODRIVE | SEW EURODRIVE | Мотор-редуктор SA67DV100M4/TF/M1-B | 1 | `OEM_GUIDE_SINGLE` | 1,0 л | matched | SA67 | Добавить отсутствующую SEW M1…M6 fill table для фактического семейства. |
| SEW-EURODRIVE | SEW EURODRIVE | Мотор-редуктор SF67DRS71M4/TF/M6A i=217,41 N=0,55 кВт | 2 | `OEM_GUIDE_SINGLE` | 2,7 л | unmatched | — | Add SF67 parser/dataset; M6=2.70 l. |
| SEW-EURODRIVE | SEW EURODRIVE | Редуктор планетарный PSF822 EPH07/22/14 i=20,00 | 4 | `MOUNTING_REQUIRED` | {"M1_M3_M5_M6": 1.55, "M2": 2.55, "M4": 3.35} | unmatched | — | Добавить PSF822/EPH adapter recognition и mounting resolver. |
| TANDLER | TANDLER | Редуктор STD B1 1:1 I | 1 | `OEM_GUIDE_SINGLE` | 0,8 л | matched | STD B1 | Добавить Tandler STD B1 i=1:1 = 0,80 л (approx.). |
| TANDLER | TANDLER | Редуктор STD EА1 1:1 1 | 2 | `TYPECODE_CONFIRM` | {"A1_if_confirmed": 0.6} | suggested | STD B1 | Block B1 suggestion. Confirm that EА1 encodes size A1 before assigning 0.60 l. |
| UNIMEC | UNIMEC | Редуктор XRC 54 S1 1:1 | 1 | `OEM_GUIDE_SINGLE` | 0,02 л | unmatched | — | Добавить UNIMEC/XRC54 dataset, parser и resolver. |

## 5. OEM-источники

- SEW R/F/K/S/SA/SF: https://download.sew-eurodrive.com/download/pdf/11225319_G08.pdf
- SEW PSF: https://download.sew-eurodrive.com/download/pdf/11249013_G05.pdf
- Bonfiglioli C/A/F/S IOM Rev 05_5_1: https://www.bonfiglioli.com/_default_upload_bucket/BR_IOM_CAFS_ATX_ENG_R05_5_1.pdf
- Bonfiglioli VF/W: https://www.bonfiglioli.com/_default_upload_bucket/BR_CAT_VF-W_ATX_ENG_R01_1_1.pdf
- Bonfiglioli RAN: https://www.bonfiglioli.com/_default_upload_bucket/BR_CAT_RAN_STD_I-UK-DE-F_R01_1_2.pdf
- Rossi download center / A Series OI: https://www.rossi.com/en/Downloads
- Tandler bevel gearbox OI: https://www.tandler.de/downloads/betriebsanleitungen?cid=4305&file=files%2Ftandler%2Fdokumente%2FBetriebsanleitungen%2Fbetriebsanleitungen_spiralkegelgetriebe_instructions+_manual_bevel_gearboxes.pdf
- Lenze oil-change policy: https://www.lenze.com/en-de/application-knowledge-base/article/275769/1
- Dana/Brevini S-Series: https://ohsolutions.dana.com/upload/products/160/26317615S-Series_Big-Sizes_MPF012003-19_Web.pdf
- Nabtesco RV: https://www.nabtesco.de/fileadmin/04_Service/05_Downloads/01_Produktkataloge/RV_Katalog_EN.pdf
- ZIMM: https://zimm.com/
- UNIMEC size 54 catalog: https://www.unimecusa.com/pdf/Catal-gen-Unimec-18-ENG.pdf

## 6. Вывод для следующего исправления LUBRICA

P0: блокировать Tandler EА1→B1; сохранить cross-OEM guard; не переводить ABB RV/ZIMM в gearbox_oil.
P1: добавить UNIMEC XRC54; SEW PSF822/FH77/FH87/KHF47/KHF87/SF67/KA87; KH47 M1 fill; обновить parser/resolver.
P2: добавить Rossi MRIV63 recognition и semantic mounting/type-code guard; оставить MRV manufacturer conflict до подтверждения.
P3: новый Bonfiglioli C412/P B6 оставить OEM_TECH_SUPPORT_REQUIRED, без выдуманного объёма.