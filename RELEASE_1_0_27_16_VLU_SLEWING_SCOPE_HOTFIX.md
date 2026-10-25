# LUBRICA 1.0.27.16 — VLU Slewing Scope Hotfix

- Fixed `ReferenceError: isSlewingRing is not defined` in `bearingCalcBaseInput()`.
- Slewing-ring detection is now derived locally from the resolved bearing record / inferred bearing type before VLU-specific temperature and contamination fields are read.
- The VLU20 simple-mode completion logic from 1.0.27.15 remains unchanged: INA/Schaeffler auto-detection, environment/temperature inputs, procedure-based relubrication, optional RPM validation and quick approval.
- Calculation version bumped to `multi-oem-1.0.27.16` so affected saved calculations can be recognized as recalculated by the fixed engine.
