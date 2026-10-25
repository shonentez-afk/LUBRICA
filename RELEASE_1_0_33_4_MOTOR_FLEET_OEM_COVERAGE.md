# LUBRICA 1.0.33.4 — Motor Fleet OEM Coverage

## Цель
Продолжение Motor OEM Calculation Engine без изменения архитектуры расчётов. Выполнен аудит электродвигателей из трёх фактических XLSX пользователя и расширено OEM-покрытие для Lammers 1TZ, Siemens/Innomotics 1LE, ABB M2BAX и legacy SEW DR/DT/DV. Для неподтверждённых моделей сохранён строгий guard без выдуманных OEM-значений.

## Фактическая структура
По трём загруженным участкам найдено 163 строки с электродвигателями/мотор-редукторами/вибромоторами, 65 уникальных текстовых обозначений. Текущий resolver даёт подтверждённую политику обслуживания или безопасный construction policy для 141 из 163 строк; остальные 22 строки требуют таблички/точной идентификации и намеренно не получают чужую OEM-методику.

Основной парк: ABB M2AA/M2CA/M2VA/M3AA/M2BAX, SEW DRE/DRS и legacy DR/DV, Siemens/Innomotics 1LE/1LG, а также HQL/QCA/безымянные исполнения.

## Критическое исправление cross-OEM
1TZ в текущем парке больше не трактуется как Siemens/Innomotics. Серия 1TZ9/1TZ5 относится к каталогу Lammers/MEZ и имеет собственную конструкцию и правила обслуживания.

## Доказательная таблица
| Параметр | Значение | OEM | Документ | Раздел / страница | Применимость |
|---|---|---|---|---|---|
| 1TZ9 до рамы 250 | permanent lubrication; 2p до 20 000 ч, 4–8p до 40 000 ч | Lammers | IEC squirrel-cage motors MEZ 1TZ | Bearings / lubrication, p.10 | стандартное исполнение, CT <= 40 °C |
| 1TZ9 frame 315, 2p | 6316 C3 DE + 6316 C3 NDE; 30 г на подшипник; 3000 ч | Lammers | тот же каталог | bearing/relubrication table, p.10 | базовая OEM-таблица; lubrication plate двигателя приоритетна |
| 1TZ9 frame 315, 4–8p | 6319 C3 + 6319 C3; 40 г; 6000 ч | Lammers | тот же каталог | p.10 | базовое исполнение |
| 1TZ5 frame 315/355 | доза и интервал по lubrication plate | Lammers | тот же каталог | p.10 | exact motor plate required |
| 1LE1 frame 160 basic | 6209 2ZC3 DE/NDE; permanent lubrication basic version | Siemens | D 81.1 09/2023 | Bearings and lubrication, 1/58 | planning table; фактическая поставка по rating plate/serial |
| 1LE1 с системой досмазывания | интервал/количество/смазка по lubrication plate конкретного двигателя | Siemens/Innomotics | Operating Instructions | Relubrication | machine-specific priority |
| M2BAX 280 2–6p | 6316/C3 DE/NDE; regreasable; grease nipples | ABB | 9AKK108196 EN 02-2024 | Motors in brief, p.39 | стандартное M2BAX 280 |
| DRE/DRS стандартные малые/средние | закрытые 2Z/2RS, routine relube не назначается | SEW-EURODRIVE | DRS/DRE/DRP Operating Instructions | Lubricant tables | стандартные исполнения без /NS |
| legacy DR63 | gearmotor DE 6303-2Z-J, NDE 6202-2Z-J; закрытая конструкция | SEW-EURODRIVE | Catalog 19290411 EN 10/2014 | Motor bearings used | R77DR63L6, KF37R17DR63S4 без /NS/ERF |
| legacy DV100 | DE 6306 2RS J C3, NDE 6205 2RS J C3; routine relube не назначается | SEW-EURODRIVE | legacy bearing table | Motor bearings used | стандартное исполнение без /NS/ERF |
| EMOD WK special 6700/9000 rpm | автоматическая числовая методика заблокирована | EMOD | Water-cooled three-phase motors WK | product range | точные high-speed fleet variants требуют plate/manual |

## Реализация
- `motors/motor-oem-data.js`: fleet resolver, exact construction guards, Lammers 1TZ9 tables, Siemens 1LE basic construction, M2BAX mapping, legacy SEW standard sealed mappings.
- `motors/motor-method-resolver.js`: отдельные методы Lammers и Siemens basic/plate.
- `motors/motor-calculator.js`: machine plate > exact OEM family table > construction guard > request for evidence.
- `bearings/source-registry.js`: новые первичные OEM-источники.
- `bearings/offline-evidence.js`: локальные offline datasets.
- `calculations/source-integrity-audit.js`: motor source contracts + traced claims.

## Примеры
- `1TZ9501-3AA43-4AB4-Z 315L, 160 кВт, 2982 об/мин` -> **Lammers 1TZ9**, 2-pole, `6316 C3 / 6316 C3`, baseline **30 г на каждую из двух точек / 3000 ч**. Табличка конкретного двигателя имеет приоритет.
- `1LE1001 ... 160M, 11 кВт, 1450 об/мин` -> Siemens 1LE basic: `6209 2ZC3 / 6209 2ZC3`. Если пресс-маслёнок нет — routine relube не создаётся; если есть — требуется lubrication plate, а не универсальная доза.
- `M2BAX 280SMG4, 90 кВт, 1485 об/мин` -> `6316/C3 / 6316/C3`, штатно regreasable; интервал берётся через существующую ABB L1-архитектуру.
- `R77DR63L6` и `K37DV100M4` -> standard sealed legacy SEW; routine relube не назначается.

## Оставшиеся пробелы
Без выдумывания данных оставлены: HQL 160SL/L, QCA 90/112, generic 71B4/100LB4, KA7250M-CB01B-Z, Siemens 1LG exact maintenance, а также 1LE записи без читаемой рамы. Для них нужен шильдик/производитель/точная инструкция.

## Проверки
PASS: Motor Fleet OEM Coverage, Motor UX parity, Motor OEM Calculation Engine, Framework Integration, Motor Source Registry, Source Integrity, REITZ ZLG, REITZ SNL, SKF SNL, NSK resolver, Ventapp→Tröster, Tröster 2D, preflight.

`test/run_all.sh` в текущей среде останавливается на Import Integration, потому что в сессии доступны только 3 исходных XLSX, а legacy test ожидает 11 производственных импорт-файлов. До этой точки syntax/preflight/database/classifier/candidate/material/route/export проверки проходят; это ограничение набора входных файлов, а не выявленная регрессия расчётного модуля.
