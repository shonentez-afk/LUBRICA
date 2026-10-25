# LUBRICA 1.0.31.12 — UX/UI & Integration Audit

Дата аудита: 2026-09-10
База: 1.0.31.11 Source Integrity & Completeness Audit

## Область
Проверены изменения 1.0.31.2–1.0.31.11: Source Registry, offline evidence, единый UI калькуляторов, цепи, FRANCIA, редукторы, provenance, локальные таблицы и интеграция с bearing calculator.

## Исправлено по результатам аудита
1. Контекстное окно «Источники»: OEM-фильтр теперь строится только из sourceIds текущего калькулятора, а не из всех 35 источников.
2. Поля `supports` в карточках источников локализованы: вместо технических ключей relubeQuantity/maintenanceProcedure показываются понятные русские названия.
3. Добавлены aria-label для закрытия, поиска и OEM-фильтра реестра.
4. Inline Source Registry (подшипниковый калькулятор): Escape закрывает overlay, фокус при открытии переходит в поиск, после закрытия возвращается на исходную кнопку.
5. Исправлена ошибка provenance в тексте FRANCIA: коэффициенты среды/интенсивности и рассчитанный интервал принадлежат инженерному профилю LUBRICA, а не OEM FRANCIA.
6. Добавлен regression test 1.0.31.12, который контролирует эти UX/integration contracts.

## UX/UI оценка
- Единый shell Simple / Expert / Sources: PASS для chain, screw-jack, gearbox, coupling, grease-point, ball-screw, linear-bearing и bearing flow.
- Источники и локальные таблицы: PASS по размеру/скроллу; таблица скроллится внутри, окно не должно иметь горизонтального viewport overflow.
- Контекстность Source Registry: PASS после исправления 1.0.31.12.
- Терминология provenance: PASS после исправления FRANCIA.
- Mobile CSS: имеется одно-колоночный режим <=760 px и viewport-sized source/offline dialogs.

## Интеграция
Пройдены релевантные regression tests: 1.0.31.8, 1.0.31.10, 1.0.31.11, chain/jack sources, gearbox sources, chain calculator, gearbox oil, coupling, ball screw, linear bearing.

Полный запуск 138 исторических JS-тестов дал 18 failures. Это НЕ 18 новых регрессий 1.0.31.12: часть тестов требует отсутствующие внешние файлы/старые абсолютные пути, часть проверяет старые контракты, которые были изменены более поздними релизами. Однако это отдельный QA debt: перед production RC исторический suite нужно классифицировать на active / superseded / fixture-dependent и добиться зелёного active-suite. Отдельного файла test_release_1_0_31_9_source_registry_modal_ux.js в текущем дереве не было; его контракт теперь покрыт тестом 1.0.31.12.

## Вердикт
UX/UI и интеграция изменений Source Registry/Offline Evidence пригодны как новая рабочая база после исправлений 1.0.31.12. Source Integrity 1.0.31.11 остаётся PASS: 35 sources, 33 datasets, 12 calculator contracts, 29 traced claims. Следующий QA-шаг — очистка/переклассификация полного исторического regression suite перед финальным RC.
