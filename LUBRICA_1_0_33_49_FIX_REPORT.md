# LUBRICA 1.0.33.49 — отчёт об исправлениях после полного интеграционного аудита

## Статус

Все три HIGH и оба MEDIUM дефекта, выявленные в 1.0.33.48, исправлены в рабочей версии 1.0.33.49.

## HIGH-01 — stale point/task после переконфигурации
**Исправлено.** Реализована scoped-синхронизация generated artifacts только для текущего Oscillating root. При переходе соединения из обслуживаемого состояния в `Необслуживаемый`/`Нет соединения` прежние generated point/task удаляются, а task ID убирается из активного маршрута. Чужие точки не затрагиваются.

## HIGH-02 — ложная привязка к единственной системе качания
**Исправлено.** Удалён fallback, который привязывал роль к единственному root в area/line без достаточного структурного доказательства. Сохранились сильные сигналы: explicit root ID, ancestor/parent hierarchy, точный номер линии.

## HIGH-03 — manual SNL не попадал в SKF SNL lifecycle
**Исправлено.** Oscillating point теперь сохраняет generic `bearingHousing` context; Task Editor читает его и возвращает SNL family/raw marking. Импорт и ручной сценарий используют один существующий SKF SNL resolver.

## MEDIUM-01 — объединённые состояния
**Исправлено.** `Необслуживаемый` и `Нет соединения` теперь отдельные значения. Legacy `none` поддерживается для обратной совместимости.

## MEDIUM-02 — удаление сохранённого manual-element
**Исправлено.** Кнопка удаления доступна для сохранённых manual oscillating-elements. Удаление безопасно ограничено собственными элементами мастера.

## Дополнительные исправления релизного gate
- Исправлены UTF-8 имена трёх production-файлов.
- Обновлены developer docs с 1.0.27.5 до 1.0.33.49.
- Добавлена документация нового engine/lifecycle.

## Тестирование
- Новый adversarial hotfix test: PASS.
- Старые Oscillating 1.0.33.48 tests: PASS.
- Classifier: PASS.
- Candidate Finalizer: PASS.
- Bearing Calculator: PASS.
- Stage 9.9 / run_all: 98 PASS / 0 FAIL / 1 SKIP из 99.
- JS standalone: 116 PASS / 36 historical baseline FAIL / 152; новых FAIL нет.
- Python standalone: 67 PASS / 13 historical baseline FAIL / 80; новых FAIL нет.

## Единственный SKIP
`Source XLSX audit` не запускался по существу, потому что исходные производственные XLSX отсутствуют в контейнере. Это не функциональный FAIL сборки.
