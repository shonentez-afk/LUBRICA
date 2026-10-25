# LUBRICA 1.0.32.3 — Calculation Evidence Runtime Hotfix

База: 1.0.32.2 Calculation Evidence UX.

Исправлен runtime-дефект кнопок «Обоснование» и «Почему такой результат?». В обработчике `openCalculationEvidence()` использовалась необъявленная переменная `point`, из-за чего при клике возникал ReferenceError до вызова Source Registry. Теперь имя текущего объекта/точки берётся из доступного контекста `lp`.

Расчётное ядро, OEM-методики, CalculationPackage, MethodResolver и MaintenancePolicy не изменялись.

Проверки:
- JavaScript syntax — PASS;
- 1.0.32.3 runtime guard — PASS;
- 1.0.32.2 Calculation Evidence UX — PASS;
- 1.0.32.1 Calculation Result UX — PASS;
- 1.0.31.18 current calculation source trace — PASS;
- Bearing Source Registry — PASS (39 sources);
- Source Integrity & Completeness — PASS: 39 sources, 37 datasets, 12 calculators, 34 traced claims.

Старый regression `test_release_1_0_26_9_bearing_calculator_full_ux_logic.js` по-прежнему падает на историческом ожидании `ntn_snr_standard` против текущего `ntn_unit_exact`; этот тест не связан с данным hotfix и расчётная NTN-SNR логика в релизе не менялась.
