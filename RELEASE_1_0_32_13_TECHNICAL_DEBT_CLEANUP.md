# LUBRICA 1.0.32.13 — Technical Debt Cleanup

## Scope
No production calculation formula, OEM resolver, route lifecycle, or UX workflow was changed. This release closes inherited regression-suite and packaging debt discovered during the 1.0.32.12 Full UX Regression Audit.

## Resolved debts
1. **Candidate finalization / oil change material mode**
   - The old test expected `point_target`.
   - Since Release 1.0.23, new material-requiring events intentionally default to direct `explicit` material selection so users can choose an existing lubricant without first creating TARGET material metadata.
   - Test updated to the accepted 1.0.23 behavior. Production code unchanged.

2. **Bearing-unit warning**
   - The legacy test expected a UCP-specific warning string.
   - Since 1.0.27.5–1.0.27.6, standard housed UC/UK/UEL units use a dedicated `housed_relube_only` maintenance policy and no longer require that obsolete warning wording.
   - Test now verifies the active relube-only policy and the real unknown-manufacturer provenance warning. Production calculation code unchanged.

3. **QA duplicate component binding**
   - The old QA test treated two physical points using the same catalogue/library entry as duplicates.
   - Current QA correctly detects duplicate physical origins by `candidateOriginKey`; reusing the same UCP/UC/bearing library record is legitimate.
   - Stale test expectation removed. Production QA logic unchanged.

4. **Settings guide count**
   - Legacy test expected 14 sections.
   - Current approved embedded guide has 15 sections including the functional/critical-rules overview.
   - Test updated to 15.

5. **Chain expert UX**
   - Old Release 1.0.27.21 test expected the literal label `Подробности и экспертные настройки`.
   - After system-wide Simple/Expert consolidation, the chain calculator retains expert settings under the common `expert-only` mode with the title `Экспертные настройки`.
   - Test updated; chain calculation logic unchanged.

6. **Production documentation filenames**
   - `01_СОСТАВ_АРХИВА.md`, `02_РУКОВОДСТВО_ПО_КОДУ.md`, and `Создать ярлык LUBRICA.bat` had been stored in previous Linux extraction directories under mojibake names.
   - Restored canonical UTF-8 filenames in the release package.
   - This also restores the Release 1.0.2 branding/shortcut and production documentation regression checks.

7. **Version synchronization**
   - Manifest, runtime APP_VERSION, and database schema default synchronized to `1.0.32.13`.

## Verification
- `test_candidate_finalization.js` — PASS
- `test_bearing_calculator.js` — PASS
- `test_stage9_8_program_qa.js` — PASS
- `test_stage9_8_7_settings_symmetric.py` — PASS
- `test_stage9_9_docs.py` — PASS
- `test_release_1_0_2_branding.py` — PASS
- `test_release_1_0_27_21_chain_simple_ux.js` — PASS
- Preflight — PASS
- All remaining commands of the canonical `test/run_all.sh` were rechecked without regression failures. Source XLSX audit remains an intentional SKIP when original source XLSX files are not present.

## Important
This is a **technical-debt cleanup release**, not a methodology change. Existing Tröster/Ventapp, Ferrari, REITZ, SKF, NTN-SNR, NSK, Universal and non-bearing calculation behavior is preserved.
