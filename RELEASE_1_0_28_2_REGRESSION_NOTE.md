# LUBRICA 1.0.28.2 — Regression note

Проверено после изменения структуры Fan Asset + Motor:

- `node --check` для изменённых JS-модулей — PASS;
- preflight/manifest/version — PASS;
- `test_release_1_0_28_fan_bearing_arrangement_engine.js` — PASS;
- `test_release_1_0_28_2_fan_asset_motor_structure.js` — PASS;
- общий `run_all.sh` доходит до того же наследованного падения `Candidate finalization / oil change material mode`, которое присутствовало до текущего UX-изменения и не относится к Fan Engine.

Новых ошибок в проверяемом контуре Fan Engine / Structure UX не выявлено.
