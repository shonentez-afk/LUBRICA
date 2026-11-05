# LUBRICA 1.0.33.68 — PP-53736 Full-Machine Acceptance

**Результат:** PASS_WITH_FIELD_CONFIRMATION_ITEMS

## Production DB

Источник:
`project/sources/pp53736/Филиал_завода__Техно__г._Юрга(20260923-051134).json`

После apply → reconcile → repeated apply → reconcile:

| Сущность | Количество |
|---|---:|
| Equipment | 1188 |
| Components | 5659 |
| Lubrication points | 501 |
| Tasks | 517 |

Количество не меняется при повторном применении.

## PP-53736 на одну линию

| Категория | Количество |
|---|---:|
| gearbox_oil | 13 |
| chain | 8 |
| screw | 4 |
| open_gear | 2 |
| bearing | 104 |
| **Всего** | **131** |

На две линии: **262 points/tasks**.

Из 104 bearing points:
- 102 — физические позиции валков;
- 6015-2RS1 не создаёт routine relubrication point.

## Downstream

- approved machine tasks попадают ровно в один auto route;
- четыре спорных R77 Line 1 не попадают в approved route;
- routes with machine tasks: 6;
- route structural validation: PASS;
- export traceability: 262/262 unique task rows.

## Runtime planning

Для 200/800/5000 ч:

- первая дата задаётся явно;
- повторный прогноз требует явной плановой наработки ч/сутки;
- без неё система не создаёт вымышленные повторные даты;
- completed fact используется как следующий anchor;
- provenance прогноза хранится вместе с plan item.

## Не закрытые фактические данные

### Issue #1
R77 №5–№8 Line 1: persisted M1 расходится с drawing hint M3.

### Issue #2
Значение 500 в `5000/500 h` не имеет доказанной трактовки.

### Issue #3
K37/KF37R17/S37: окончательные M1–M6 требуют подтверждения по установленному оборудованию.

Эти пункты не должны автоматически заполняться программой.
