# LUBRICA 1.0.31.17 — Bearing renewalLifecycle TDZ hotfix

## Исправленная ошибка
При открытии расчётного модуля подшипника браузер мог выбрасывать:

`ReferenceError: Cannot access 'renewalLifecycle' before initialization`

Причина: в `lubrication/task-editor.js` переменная `renewalLifecycle` использовалась при формировании блока «Готовность рабочих циклов» до её объявления через `const`. Это попадание в JavaScript temporal dead zone (TDZ) останавливало `recalc()` и не давало открыть калькулятор.

## Исправление
- вычисление `renewalLifecycle` перенесено до первого использования;
- логика MaintenancePolicy, полного обновления, Ventapp/Tröster, Ferrari и других OEM не изменялась;
- добавлен regression-тест `test_release_1_0_31_17_renewal_lifecycle_tdz_hotfix.js`;
- подтверждено, что Tröster/Ferrari и Ventapp → Tröster priority проходят после исправления.

## Проверки
PASS:
- JS syntax (`node --check lubrication/task-editor.js`)
- 1.0.31.17 renewalLifecycle TDZ regression
- 1.0.31.16 Ventapp → Tröster priority
- 1.0.31.16 Ventapp UI integration
- 1.0.31.14 Tröster/Ferrari completion
- Calculation UI result/lifecycle fix
- Calculation Framework
- Source Integrity & Completeness: 39 sources / 37 datasets / 12 calculators / 34 traced claims
- Tröster + Ferrari compatibility
- Preflight

## Full run note
`test/run_all.sh` starts normally but stops at the pre-existing `test_candidate_finalization.js` assertion `oil change material mode`. The same assertion fails identically in the untouched 1.0.31.16 ZIP, so it is not introduced by this hotfix.
