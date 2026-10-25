# LUBRICA 1.0.28 — Regression audit

Base archive: LUBRICA_RELEASE_1_0_27_31_FAN_NO_VIRTUAL_SUPPORTS_UX.zip

## Targeted checks

- PASS: Fan Bearing Arrangement Engine unit test.
- PASS: 1.0.27.31 no-virtual-supports regression test.
- PASS: fan finalizer actual-name regression test.

## Full JS test comparison

Clean 1.0.27.31 baseline:
- PASS: 85
- FAIL: 17
- SKIP: 2 tests requiring external /mnt/data fixtures

1.0.28 after implementation:
- PASS: 86
- FAIL: 17
- SKIP: 2 tests requiring external /mnt/data fixtures

The 17 failing tests are the same inherited failures present in the clean 1.0.27.31 archive. No new failing JS regression test was introduced by Fan Bearing Arrangement Engine.
