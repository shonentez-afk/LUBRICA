# LUBRICA — индекс проектной памяти

Новый разработчик или новый чат должен читать документы в таком порядке:

1. `../START_NEW_CHAT_RU.md` — точка входа.
2. `PROJECT_CHARTER_RU.md` — что это за продукт и зачем он существует.
3. `PROJECT_STATE_RU.md` — что является текущей принятой базой.
4. `OPEN_QUESTIONS_RU.md` — что сейчас не закрыто.
5. `ROADMAP_RU.md` — куда двигаться дальше.
6. `DECISIONS_RU.md` — решения, которые нельзя случайно отменить.
7. `ARCHITECTURE_OVERVIEW_RU.md` — как связаны подсистемы.
8. `DATA_MODEL_MAP_RU.md` — основные persistent-сущности и их связи.
9. `UI_UX_PRINCIPLES_RU.md` — утверждённые UI/UX правила.
10. `ENGINEERING_EVIDENCE_POLICY_RU.md` — как работать с OEM и источниками.
11. `OEM_SOURCE_INDEX_RU.md` — какие источники уже используются и где.
12. `EQUIPMENT_COVERAGE_MATRIX_RU.md` — что из реального оборудования покрыто.
13. `TEST_ACCEPTANCE_POLICY_RU.md` — когда изменение можно считать принятым.
14. `TEST_MATRIX_RU.md` — какие тесты защищают какие области.
15. `KNOWN_LIMITATIONS_RU.md` — сознательные ограничения текущей версии.
16. `PROJECT_CHRONICLE_RU.md` — как проект пришёл к текущему состоянию.
17. `RELEASE_HISTORY_RU.md` — история принятых версий.
18. `NEXT_RELEASE_TEMPLATE_RU.md` — обязательный чек-лист нового релиза.
19. `GITHUB_WORKFLOW_RU.md` — как вести изменения и релизы.
20. `MIGRATION_STATUS_RU.md` — статус переноса проекта в GitHub.
21. `DEPRECATED_BASELINES_RU.md` — какие старые сборки запрещено использовать как базу.
22. `SITE_ENGINEERING_RULES_RU.md` — постоянные правила по фактическому оборудованию предприятия.
23. `PROJECT_MEMORY_AUDIT_RU.md` — автоматическая проверка полноты и согласованности проектной памяти.

Подробная карта production-файлов: `../01_СОСТАВ_АРХИВА.md`.
Руководство по коду: `../02_РУКОВОДСТВО_ПО_КОДУ.md`.

## Главное правило

Если короткое резюме в project-документах расходится с кодом, тестами или acceptance конкретной версии, нельзя угадывать. Нужно определить, что является более свежим подтверждённым источником, и затем обновить проектную документацию.

## Правило актуальности

После каждого принятого релиза проверить минимум:
- `PROJECT_STATE_RU.md`;
- `OPEN_QUESTIONS_RU.md`;
- `ROADMAP_RU.md`;
- `EQUIPMENT_COVERAGE_MATRIX_RU.md`;
- `OEM_SOURCE_INDEX_RU.md`;
- `TEST_MATRIX_RU.md`;
- `RELEASE_HISTORY_RU.md`.


## Текущий функциональный план

- [PLANT_POINT_COMPLETION_PLAN_RU.md](PLANT_POINT_COMPLETION_PLAN_RU.md) — реализация 1.0.33.69, Issues #11–#14, инженерные acceptance gates и отказ от виртуальных точек.

- [EQUIPMENT_CONSTRUCTOR_GAP_AUDIT_20261105_RU.md](EQUIPMENT_CONSTRUCTOR_GAP_AUDIT_20261105_RU.md) — Stage 5, фактическая инвентаризация 1188 equipment, имеющиеся и отсутствующие конструкторы, внедрение без виртуальных точек.

- [CONVEYOR_CONSTRUCTORS_GAP_AUDIT_20261105_RU.md](CONVEYOR_CONSTRUCTORS_GAP_AUDIT_20261105_RU.md) — Stage 5B, предметная проверка всех 293 конвейерных записей, действующие мастера, отсутствующие разновидности и воспроизводимые ошибки.
