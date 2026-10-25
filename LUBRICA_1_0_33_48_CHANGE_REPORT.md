# Отчёт по LUBRICA 1.0.33.48

## 1. База

Работа выполнена как развитие `LUBRICA_RELEASE_1_0_33_47_CHAIN_SCRAPER_CONVEYOR_CONSTRUCTOR.zip`. Исходный архив не изменялся.

## 2. Архитектурный аудит

Подтверждены и переиспользованы существующие контуры:
- `import/component-classifier.js` — классификация оборудования/ТМЦ;
- `structure/*` — Structure и ручное добавление;
- `import/candidate-finalizer.js` — единый lifecycle создания Node/Point/Task;
- `conveyors/conveyor-arrangement.js` — конвейерный arrangement;
- `rotating/rotating-arrangement.js` — универсальная схема вращающихся опор;
- Bearing Calculator / UC-UK / SKF SNL — существующие расчётные контуры.

Новый модуль реализован как отдельный arrangement-engine `oscillating/oscillating-linkage-arrangement.js`, без создания второго Bearing Engine и без изменения основной архитектуры приложения.

## 3. Реализовано

### Классификация
Добавлены роли `oscillating_mechanism`, `link_rod`, `compensator`, `support_bracket`, `lever`, `rocker`, `eccentric`, `pin`. Существующие `crank`, `connecting_rod`, `axis` сохранены.

Русские границы слов для `левый/правый`, `компенсатор`, `кронштейн`, `палец` сделаны без использования ASCII-only `\\b`, чтобы корректно работать в JavaScript.

### Сборка механизма
Engine использует:
- иерархию parent/child;
- общий parent;
- lineId/areaId;
- номер линии в названии;
- фактические компоненты/ТМЦ;
- ручные overrides роли и стороны.

Механизм не захватывает произвольное оборудование только потому, что в том же участке есть одна система качания: для маршрутизации требуется роль/явный context и совместимая иерархия.

### Точки
Точка создаётся только из подтверждённого соединения. Для `unknown` и `none` точка отсутствует. Bearing/SNL/UC-UK требуют фактического обозначения или ТМЦ.

### Transactional
До `Создать точки` engine работает с draft. Ручные элементы и точки сохраняются только финальным действием. Повторное подтверждение идемпотентно по `candidateOriginKey`.

### Ручное добавление
В `+ Оборудование` добавлен тип `Система качания / рычажный механизм`. После сохранения пользователь открывает тот же universal engine и добавляет реальные элементы/соединения.

### UI/UX
Сохранён текущий визуальный стиль Unified Equipment Constructor Cards. Добавлены Simple/Expert, централизованное `Обоснование`, адаптивные сетки и перенос длинных значений.

## 4. Обязательные сценарии A–P

| Сценарий | Результат |
|---|---|
| A. Линия №1: 2 шатуна, 2 оси, основной + дополнительный КШМ | PASS |
| B. Линия №2: 2 шатуна, 2 тяги, 2 компенсатора, 2 кронштейна | PASS |
| C. Частично заполненный импорт | PASS — создаются только подтверждённые места |
| D. Отсутствующие ТМЦ | PASS — bearing остаётся unresolved |
| E. Неизвестный тип шарнира | PASS — виртуальная точка не создаётся |
| F. Ручное создание | PASS — manual parity entry + общий engine |
| G. Отмена мастера | PASS contract — нет save action на cancel |
| H. Повторное открытие | PASS contract — draft/reopen не создаёт точек |
| I. Повторное подтверждение | PASS — idempotent |
| J. Удаление созданной точки | PASS — lifecycle смоделирован |
| K. Пересоздание после удаления | PASS — 1 point + 1 task |
| L. Расчёт найденного подшипника | PASS — Bearing Calculator regression |
| M. SNL в опоре | PASS — bearing path + SNL context regression |
| N. UC/UK в опоре | PASS — housed-unit regression |
| O. Подшипник без корпуса | PASS |
| P. Необслуживаемое соединение | PASS — point not created |

## 5. Целевая регрессия

`LUBRICA_1_0_33_48_TARGETED_ACCEPTANCE.txt`: **16/16 PASS**.

В набор входят новый engine/UI, classifier, Candidate Finalizer, 1.0.33.47 chain/scraper conveyor, manual conveyor parity, conveyor bearing assignment, unified constructor cards, rotating arrangement + dedup, Bearing Calculator, housed-unit logic, SNL context, preflight и Edge file protocol.

Широкий `test/run_all.sh` был запущен отдельно: среда остановила команду по лимиту времени на 68/99; в пройденной части падений не зарегистрировано.

## 6. Известное baseline-состояние

`test/test_release_1_0_30_skf_snl_lubrication_engine.js` падает на `SNL groove renewal exceptional` и в исходной 1.0.33.47. Это не регрессия 1.0.33.48.

Headless Chromium в текущем контейнере не смог завершить screenshot run из-за системной среды DBus/headless. Поэтому pixel-level screenshot не считается выполненным; UI прошёл статический responsive-contract и preflight/file:// проверки.
