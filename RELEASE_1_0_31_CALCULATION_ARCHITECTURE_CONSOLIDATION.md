# LUBRICA 1.0.31 — Calculation Architecture Consolidation

## Goal
Consolidate bearing-calculation orchestration without changing validated OEM formulae/tables or the accepted 1.0.30.x numerical baselines.

## Architecture
`CalculationContext -> MethodResolver -> existing numerical method -> CalculationPackage -> MaintenancePolicy/UI`

### CalculationContext
Normalizes the physical calculation family (SNL, ZLG, housed unit, slewing ring, standard bearing), manufacturers, housing marking, rpm, temperature and active service modes.

### Method registry / resolver
A central registry declares application/component/engineering methods and the operations they are allowed to own. The resolver produces an explicit parameter-level plan for:
- relubrication quantity;
- relubrication interval;
- full-renewal quantity;
- full-renewal interval;
- explicit approved fallbacks.

Current registered families include REITZ KXE single SNL, REITZ KXE ZLG, SKF SNL side/groove, NTN-SNR ZLG 2024, NSK housed guidance, INA VLU20 and LUBRICA Universal 3.2 fallback.

### CalculationPackage
Every calculation now exports a normalized package with context, method plan, per-parameter provenance, maintenance lifecycle, confidence, assumptions, warnings and method-isolation audit.

### Isolation guard
Application-specific OEM methods cannot silently return a different manufacturer's result. Cross-OEM fallback is valid only when declared by the resolver and explicitly applied (e.g. REITZ SNL renewal interval -> SKF SNL fallback).

### Warning isolation
Generic load/contamination/vibration/P-C warnings are not presented as if they modify an application-specific REITZ result.

## Regression baseline retained
- REITZ SNL 522-619 / 22222K at 1450 rpm, 70 C: 100 g / 460 h; new fill 1100 g; SKF renewal fallback remains opt-in.
- Explicit SKF fallback: 5 x 460 h = 2300 h.
- REITZ ZLG remains relubrication-only in the working maintenance map; no invented full-renewal cycle.
- SKF SNL, NSK housed-unit, VLU20 and fan-bearing arrangement tests retained.

The existing calculation approval version in task-editor is intentionally not bumped because numerical methods and validated results were not changed; 1.0.31 adds orchestration/provenance architecture.

## Known inherited test
`test/test_bearing_calculator.js` still fails the pre-existing `bearing unit warning` assertion. This failure predates 1.0.31 and is not introduced by this release.
