# LUBRICA 1.0.27.2 — Universal Bearing Lubrication Method 2.0

## Purpose
Make one default calculation path usable for all supported bearing families without forcing the user to choose an OEM formula manually.

## Core rule
LUBRICA Universal 2.0 is an evidence hierarchy, not a single averaged formula:
1. OEM exact value for the exact designation, if available.
2. Official OEM method for the selected manufacturer, if applicable.
3. LUBRICA universal engineering branch only for the missing operation/result.

Each output keeps its own source and confidence. A universal calculation never upgrades an engineering fallback to OEM status.

## OEM synthesis
- SKF: 0.005*D*B side relubrication and 0.002*D*B groove/ring-hole method remain explicit OEM rules.
- NSK: exact local dose/interval tables have priority; NSK temperature and P/C corrections remain available; housed-unit fixed-dose gaps fall back to LUBRICA with D confidence rather than blocking.
- FAG/Schaeffler: D*B*X is used with cadence inferred from the calculated interval; automatic inference is marked mixed/C, not exact OEM.
- NTN/NTN-SNR: housed-unit exact gram tables have priority. Values are density-corrected from the published 0.9 g/cm3 basis when the selected grease density differs; density-corrected results are B rather than A. The published housed-unit interval bands remain OEM method inputs.
- Timken: exact/tool output remains preferred; when it is unavailable, Universal 2.0 returns a clearly-labelled LUBRICA engineering result instead of blocking or pretending it is Timken OEM.

## Universal coverage
Supported type-aware fallback remains available for deep-groove ball, angular-contact ball, self-aligning ball, cylindrical roller, needle roller, tapered roller, spherical roller, thrust ball, thrust roller and housed bearing units.

Initial fill uses OEM free space when available; otherwise verified bearing mass + geometric free-space estimation. Fill ratio is selected from OEM guidance when available and from the unified type/speed branch otherwise.

Interval selection uses OEM exact tables first, then OEM published ranges/guidance, then the unified type + n*dm baseline with temperature, load, shaft orientation, contamination and vibration corrections.

## Default UX
- Simple mode always uses `lubrica_unified`.
- Expert mode opens with `LUBRICA Universal 2.0 — по умолчанию`.
- Manual OEM methods remain available only as expert overrides.
- Legacy Auto OEM stays supported internally for old saved calculations but is removed from the UI.

## Validation
- NTN-SNR UCP320 => exact 60 g at rho=0.9, OEM guide interval 1500 h in the test condition.
- NTN-SNR UCP320 at rho=1.0 => 66.67 g, B confidence because density correction is applied.
- NSK 6212 => exact local OEM dose/interval retain priority.
- NSK UCP320 => numeric LUBRICA fallback is available but remains D/non-OEM.
- SKF UCP320 => official 0.005*D*B method, B.
- Timken without OEM-tool result => LUBRICA numeric fallback, D/non-OEM.
