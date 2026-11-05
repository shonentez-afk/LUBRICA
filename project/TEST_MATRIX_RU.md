# LUBRICA — матрица тестов

Матрица связывает функциональную область с обязательными проверками.

| Область | Минимальные проверки |
|---|---|
| Core DB/schema/migrations | preflight, DB safety, migration tests, full regression |
| Import/classification | import integration, candidate mapping, duplicate protection, full regression |
| Structure/tree | structure interaction tests, delete lifecycle, map/tree consistency |
| Bearings | bearing unit tests, library tests, source/provenance tests, full regression |
| Gearboxes | gearbox recognition, OEM fill/interval tests, apply-to-task sync, persisted migration, real-DB acceptance |
| Motors | motor OEM mapping, task sync, unified cards, provenance |
| Chains | designation normalization, chain calculator, constructor-specific tests |
| Screw jacks | calculator + simple UX + task synchronization |
| Fan arrangements | no-virtual-supports, direct-drive, OEM-context tests |
| Conveyors | constructor, support assignment, manual-add parity, duplicate protection |
| Machine profiles | imported/manual parity, repeated apply idempotency, origin-key uniqueness, real-DB run |
| Routes | existing taskId only, transactional master, archive/history, plan/fact snapshot |
| Checklist/FRV | frozen snapshot, taskResults, completed-history stability |
| Excel export | one row = one task, template integrity, hidden taskId traceability |
| UI/UX | final UI baseline audit, targeted UX tests, Edge file:// manual check |
| Recovery/storage | quota/recovery tests, backup/load safety |

## PP-53736 mandatory set

Для любых изменений PP-53736:
- constructor test 1.0.33.63;
- integration test 1.0.33.63;
- manual parity 1.0.33.64;
- manual UI/integration 1.0.33.64;
- physical bearings 1.0.33.65;
- gearbox data regression 1.0.33.66;
- persistence/interval migration 1.0.33.67;
- full `test/run_all.sh`;
- latest production DB reconciliation.

## Release rule

Новый regression test должен оставаться в репозитории после закрытия дефекта: он становится частью технической памяти проекта.


## Release 1.0.33.68

| Область | Тест | Что защищает |
|---|---|---|
| PP-53736 full-machine | `test/test_release_1_0_33_68_pp53736_full_machine_acceptance.js` | две линии, 262 tasks, физическая топология, idempotency, review hold, routes, runtime planning, export traceability |
| Runtime-hour planning | `test/test_release_1_0_33_68_runtime_hour_planning.js` | explicit first date, no invented recurrence, hours/day forecast, completed-run anchor, provenance, route UI field |

Оба теста входят в `test/run_all.sh` и в GitHub workflow `PP-53736 Full Machine Acceptance`.
