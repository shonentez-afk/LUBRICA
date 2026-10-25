# LUBRICA 1.0.31.13 — Tröster / Ferrari OEM Calculation Completion

## Scope
Completes the previously deferred fan-bearing calculation policies for project Tröster blocks and Ferrari fans without cross-OEM substitution.

## Tröster Blocklager / Ventapp
- Project relation is explicit: Tröster bearing blocks are used on Ventapp fans; Ventapp is fan OEM, Tröster is bearing-block OEM.
- Supports Tröster Blocklager including 31–33 T L family as a dedicated calculation context.
- Periodic grease quantity: `Gperiod = 0.005 × D × B` g for the confirmed internal bearing.
- Base interval `tf` belongs to the Tröster OEM diagram (bearing type + bore d + rpm).
- OEM corrections: ×0.5 for vertical installation; ×0.5 for each +15 °C above 70 °C; >30,000 h not recommended.
- >120 °C recovery flush with 2× initial fill is recorded as corrective action, not scheduled full renewal.
- Two project grease nipples remain two physical lubrication points; internal bearings are never inferred from block marking alone.
- To avoid false precision, the current implementation requires the engineer-confirmed `tf` read from the Tröster diagram rather than approximating/digitizing the curve.

## Ferrari fans
- Ferrari is handled as application-specific OEM above generic housing methods.
- If the fan is supplied complete with transmission, Ferrari manual requires dose/interval from the fan-specific Transmission specifications / CART01.
- For Ferrari own/integrated bearing blocks, LUBRICA blocks automatic numeric output until CART01 values are entered; it does not silently substitute SKF, Tröster or another OEM.
- This priority also applies when a Ferrari fan physically uses an SNL housing: Ferrari CART01 wins when available.
- Ferrari manual Chart 8-2 remains documented for applicable version 1/6 shaft-only fans; it is not applied outside its stated scope.
- Harsh dusty/damp/hot/corrosive conditions are represented as Ferrari's approximately 40% or greater interval reduction; current automatic factor uses 0.6 only when the harsh condition class is explicitly selected.

## Source integrity
Added:
- `TROESTER-BLOCK-BEARING` / `TROESTER-BLOCK-LUBRICATION-V1`
- `FERRARI-FAN-BEARINGS` / `FERRARI-FAN-BEARING-RULES-V1`
- Method Registry: `TROESTER_BLOCK`, `FERRARI_CART01`
- Source Integrity claims for both methods.

Current integrity gate: 37 sources, 35 datasets, 12 calculator families, 31 traced claims — PASS.

## Regression
- New: `test/test_release_1_0_31_13_troester_ferrari.js`
- 1.0.31 architecture baseline: PASS
- 1.0.31.11 Source Integrity: PASS
- 1.0.31.12 UX/UI integration: PASS
- 1.0.31.8 unified calculator UI: PASS
- preflight: PASS
