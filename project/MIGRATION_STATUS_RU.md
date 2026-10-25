# GitHub migration status

## Status: COMPLETE

Полный baseline **LUBRICA 1.0.33.67** перенесён в GitHub и зафиксирован в `main`.

Import commit:
`6f3cb4ad82da15c65bd1774a7b92363c98a8cb9c`
— **Import full LUBRICA 1.0.33.67 baseline**

Tag/release:
`v1.0.33.67`

## Проверено после импорта

Подтверждено наличие в `main`:
- `index.html`;
- `components/gearbox-oem-data-1.0.33.67.js`;
- `components/binding.js`;
- `calculations/gearbox-oil-adapter.js`;
- `machines/izoteh-pp53736-arrangement.js`;
- `test/test_release_1_0_33_67_pp53736_persistence_interval.js`;
- `test/run_all.sh`;
- `START_NEW_CHAT_RU.md`;
- `project/PROJECT_STATE_RU.md`;
- acceptance 1.0.33.67;
- актуальная производственная PP-53736 JSON-база;
- OEM PDF-источники Izoteh;
- `project/FILE_MANIFEST_SHA256.txt`.

SHA-256 manifest содержит **765 записей** и намеренно не включает сам файл манифеста. Полный импортируемый baseline содержит **766 файлов** без внутреннего каталога `.git`.

## Правило дальнейшей работы

GitHub `shonentez-afk/LUBRICA` является главным хранилищем актуального состояния проекта.

Новый чат начинать с:
`START_NEW_CHAT_RU.md`

Новые изменения вести через отдельную рабочую ветку, после тестов и acceptance переносить в `main`.
