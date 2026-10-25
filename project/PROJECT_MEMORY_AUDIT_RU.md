# LUBRICA — автоматический аудит проектной памяти

## Назначение

`test/project_memory_audit.py` защищает проект не от функционального бага, а от потери контекста между релизами и чатами.

Аудит проверяет:

- наличие обязательных документов проектной памяти;
- текущую версию из `manifest.json`;
- присутствие этой версии в ключевых project-документах;
- наличие release note текущей версии;
- наличие regression acceptance текущей версии;
- наличие `PASS` в regression acceptance;
- соответствие GitHub Release tag текущей версии;
- полноту ссылок в `PROJECT_INDEX_RU.md`;
- сохранение списка запрещённых baseline;
- сохранение ключевых site-specific инженерных правил.

## Когда запускается

GitHub Action `.github/workflows/project-memory-audit.yml` запускается:

1. при изменениях в `main`, затрагивающих project memory/release/acceptance;
2. на pull request в `main`;
3. при публикации GitHub Release.

При публикации Release дополнительно проверяется:

```text
release tag == manifest.appVersion
```

Например:

```text
v1.0.33.68 ↔ 1.0.33.68
```

## Локальный запуск

```bash
python3 test/project_memory_audit.py
```

Проверка будущего release tag:

```bash
python3 test/project_memory_audit.py --release-tag v1.0.33.68
```

## Что означает красный Action

Красный Project Memory Audit не обязательно означает ошибку runtime LUBRICA.

Он означает, что релиз нельзя считать полностью зафиксированным для будущего сопровождения: отсутствует обязательная часть памяти проекта или возникла несогласованность версии.

Нужно исправить документацию/acceptance/version synchronization, а не отключать проверку.
