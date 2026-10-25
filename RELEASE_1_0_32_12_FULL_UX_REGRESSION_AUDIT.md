# LUBRICA 1.0.32.12 — Full UX Regression Audit

Финальный аудит UX-консолидации ветки 1.0.32.x. Новая бизнес-логика и расчётные методики не добавлялись.

Проверено целевыми regression-тестами: карточка точки и workflow, простой/экспертный расчёт, обоснование и локальные datasets, Ventapp/Tröster, Ferrari, REITZ ZLG/SNL, SKF SNL, NSK, цепи, винтовые домкраты, редукторы, маршруты, планирование, выполнение, аналитика, экспорт, file:// preflight и Source Integrity.

Известные legacy/stale проверки отделены от текущей регрессии: старый `test_candidate_finalization.js` останавливает общий `run_all.sh` на `oil change material mode`; старые тесты, закрепляющие предыдущие версии/отключённую автоматизацию Tröster tf, не являются контрактом текущего релиза.

В этом релизе также синхронизирован номер версии в manifest, database schema default и demo data до 1.0.32.12.

Дополнительный stale-тест: `test_release_1_0_27_21_chain_simple_ux.js` ожидает старое состояние `expert collapsed` и одинаково падает на исходной 1.0.32.11; текущими изменениями не внесён.
