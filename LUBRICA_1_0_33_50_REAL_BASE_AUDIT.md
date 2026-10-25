# LUBRICA 1.0.33.50 — аудит фактической базы и Real Base Safety Hotfix

## Исходная база

Проверена рабочая JSON-база предприятия от 18.09.2026. Исходный файл не изменялся.

- schemaVersion: 2.0
- сохранённый appVersion базы: 1.0.5
- проект: «Филиал завода \"Техно\" г. Юрга»
- 2 линии, 16 участков
- 1096 equipment
- 5183 components
- 175 nodes
- 227 lubricationPoints
- 235 tasks
- 3 materials
- 0 routes

## Структурная целостность

- duplicate IDs: 0
- dangling references: 0
- duplicate candidateOriginKey в nodes: 0
- duplicate candidateOriginKey в lubricationPoints: 0
- duplicate candidateOriginKey в tasks: 0

## Фактические системы качания

### Линия №1

Root: `EQ-000415 — Система качания Линия №1`, AREA-0009.

Связанных элементов: 6:
- Шатун правый;
- Шатун левый;
- Ось вращения левая;
- Ось вращения правая;
- КШМ основной;
- КШМ дополнительный.

Фактические ТМЦ, важные для конструктора:
- `6316-2RS1` — закрытый подшипник, автоматическое рутинное досмазывание блокируется;
- `SNH 522 TC` — корпусная опора;
- `22222 EK` — внутренний подшипник;
- `H 322` — закрепительная монтажная втулка, не самостоятельная точка смазки.

Проверено: `SNH 522 TC + 22222 EK` формирует корректный контекст, где расчётным объектом остаётся `22222 EK`, а SNH хранится отдельно как housing-context.

### Линия №2

Root: `EQ-000467 — Система качания Линия №2`, AREA-0010.

Связанных элементов: 8:
- Шатун правый;
- Шатун левый;
- Тяга левая;
- Тяга правая;
- Компенсатор левый;
- Компенсатор правый;
- Кронштейн левый;
- Кронштейн правый.

Фактические ТМЦ, важные для конструктора:
- `22228 CCK/W33` — внутренний подшипник;
- `SNL 528` — корпусная опора;
- `H 3128` — закрепительная монтажная втулка, не самостоятельная точка смазки;
- `TOLLOK TLK 400` — зажимное/стяжное устройство вала, не самостоятельная точка смазки.

Проверено: `SNL 528 + 22228 CCK/W33` формирует корректный SNL-context.

## Состояние до применения нового мастера

Для обоих roots найдено:
- generated Oscillating lubricationPoints: 0;
- generated Oscillating tasks: 0.

Это означает, что 1.0.33.50 начинает работу с системами качания с чистого состояния и не должен мигрировать ранее созданные generated Oscillating-точки.

## Исправления 1.0.33.50 по фактической базе

1. `isServiceComponent()` исключает `candidateState=excluded/rejected` до вывода ТМЦ пользователю.
2. TOLLOK TLK 400 исключён из смазочного домена отдельным правилом classifier и дополнительным runtime guard в Oscillating Engine.
3. Закрытые подшипники `2RS/2RS1/2RSH/2Z/ZZ/DDU/VV` не могут автоматически создать мероприятие «Досмазывание» без отдельного OEM-подтверждения. Guard работает и для импортированного ТМЦ, и для ручной маркировки.
4. Добавлен отдельный connection type SKF SNH.
5. В SNH/SNL точке `sourceRef` остаётся внутренним подшипником; housing хранится отдельно в `bearingHousing`.
6. Корпус SNL/SNH нельзя ошибочно сохранить как обычный `bearing`.
7. Для SNH Task Editor показывает отдельный housing context и не утверждает полный запас смазки корпуса без отдельной SNH-методики.
8. Сохранены hotfix 1.0.33.49: scoped cleanup, strong context, manual SNL parity, distinct non-service/no-connection states, manual element delete.

## Фактическая acceptance-проверка

15/15 PASS на реальном JSON:
- оба roots обнаружены;
- все 6/8 элементов разрешаются в правильный root;
- excluded H-series не попадают в service evidence;
- TLK400 не попадает в service evidence и переклассифицируется в excluded;
- SNH522 + 22222EK проходит с разделением housing/inner bearing;
- 6316-2RS1 блокирует автоматическое плановое досмазывание;
- SNL528 + 22228 CCK/W33 проходит с разделением housing/inner bearing.

## Release gate

Основной интеграционный набор: **98 PASS / 0 FAIL / 1 SKIP из 99**.

SKIP: Source XLSX audit — исходные производственные XLSX не были переданы в тестовую среду. Это не ошибка runtime и не ошибка JSON-базы.

Дополнительно PASS:
- 1.0.33.50 real-base safety;
- 1.0.33.49 oscillating integration hotfix;
- 1.0.33.47 chain/scraper conveyor;
- 1.0.33.22 rotating arrangement;
- Bearing Calculator;
- preflight;
- Stage 9.9 database safety;
- recovery corruption;
- repeat import;
- large database performance;
- Edge file:// protocol;
- final documentation;
- branding and internal guide.

## Вывод

1.0.33.50 является кандидатом на рабочую базу для загрузки указанного production JSON. Перед массовым утверждением точек систем качания требуется только инженерное подтверждение фактических соединений в мастере; программа не должна автоматически превращать названия элементов или монтажные детали в точки смазки.
