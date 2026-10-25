# LUBRICA 1.0.32.5 — Simple Renewal Visibility & UX Regression Audit

Base: LUBRICA 1.0.32.4. Calculation Core and OEM methods are unchanged.

## Fix
- The second maintenance cycle is now visible immediately in the top recommendation block of Simple mode.
- For CALCULATED renewal: `X g · каждые Y ч`.
- For REITZ SNL partial OEM: `X g · период требует подтверждения (...)` when SKF SNL interval fallback is available.
- For partial OEM without fallback: `X g · период требует уточнения`.
- For condition-based maintenance: `по состоянию / при ТО`.
- For non-applicable renewal: `планово не предусмотрено`.
- Removed the duplicate lower Simple-mode renewal line so there is one canonical summary.

## Additional regression findings fixed
- Release version metadata had remained at 1.0.32.1 in manifest.json, core/database-schema.js and data/demo-data.js after 1.0.32.2–1.0.32.4. Synchronized to 1.0.32.5.
- Updated the old unified-calculator regression expectation from the former button label `Источники` to the intentional 1.0.32.x label `Обоснование`.

## Regression audit
PASS:
- JS syntax / preflight
- Calculation Framework
- Source Registry / Source Integrity: 39 sources, 37 datasets, 12 calculators, 34 traced claims
- REITZ SNL parameter fallback
- SKF SNL lubrication engine
- REITZ ZLG priority
- Tröster + Ferrari
- Ventapp → Tröster priority
- NSK auto-OEM resolver
- bearing UI context regression
- 1.0.31.17 renewalLifecycle TDZ hotfix
- 1.0.31.18 current calculation source trace
- 1.0.32.1 Calculation Result UX
- 1.0.32.2 Calculation Evidence UX
- 1.0.32.3 Evidence Runtime Hotfix
- 1.0.32.4 Local Dataset Button Visibility
- new 1.0.32.5 Simple Renewal Visibility test
- new 1.0.32.5 version synchronization test

## Known inherited test-suite issues, not introduced by 1.0.32.5
`test/run_all.sh` stops at `test_candidate_finalization.js` / `oil change material mode`. The unchanged 1.0.32.4 baseline stops at the same test and assertion.
`test_bearing_calculator.js` also has the inherited `bearing unit warning` assertion failure in the unchanged 1.0.32.4 baseline.
These were not masked or changed in this UX hotfix.
