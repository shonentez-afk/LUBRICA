# LUBRICA — шаблон подготовки следующего релиза

## Release
Версия:
Название:
Дата:
Рабочая ветка:

## 1. Цель
Что исправляется/добавляется и почему.

## 2. Область изменения
Затронутые:
- модули;
- сущности БД;
- расчёты;
- OEM/source data;
- UI;
- constructors;
- migrations.

## 3. Инженерные основания
Для каждого нового значения/правила:
- источник;
- applicability;
- raw source;
- локальная копия;
- unresolved items.

## 4. Persistent-data impact
- schema changed: yes/no;
- migration required: yes/no;
- old auto-approved values invalidated: yes/no;
- production DB reconciliation required: yes/no.

## 5. Targeted tests
Перечень новых/обновлённых тестов.

## 6. Regression
- preflight:
- targeted:
- integration:
- full run_all:
- real DB:
- manual Edge/file://:

## 7. Acceptance
Подтверждено:
- no duplicates;
- manual/import parity;
- reload/reconcile stability;
- source/provenance;
- task synchronization;
- UI lifecycle.

## 8. Project memory update
Обязательно проверить:
- `PROJECT_STATE_RU.md`;
- `OPEN_QUESTIONS_RU.md`;
- `ROADMAP_RU.md`;
- `EQUIPMENT_COVERAGE_MATRIX_RU.md`;
- `OEM_SOURCE_INDEX_RU.md`;
- `TEST_MATRIX_RU.md`;
- `RELEASE_HISTORY_RU.md`.

## 9. Release package
- release note;
- regression acceptance;
- engineering acceptance if needed;
- Git tag;
- ZIP artifact if required;
- SHA-256.

## 10. Final decision
PASS / PASS WITH ENGINEERING ITEMS / FAIL
