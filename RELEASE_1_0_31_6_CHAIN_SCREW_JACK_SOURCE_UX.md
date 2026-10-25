# LUBRICA 1.0.31.6 — Chain & Screw Jack Source UX

## Changes
- Added `Источники` button directly to Chain calculator.
- Chain source view is scoped to three relevant evidence records: iwis lubrication guidance, U.S. Tsubaki lubrication guidance, and ISO 606 / DIN 8187 B-series product dimensions.
- Added local offline method passports for iwis 10B-1 starting-dose reference and U.S. Tsubaki manual/drip/bath lubrication guidance.
- Added `Источники` button directly to FRANCIA screw-jack calculator, scoped to FRANCIA OEM evidence.
- Expanded local FRANCIA evidence table from M42VR-only filter to all currently digitized FRANCIA M-series entries in the local component library.
- Source Registry `openRegistry()` now accepts `sourceIds` to open a focused evidence subset without replacing the active calculator dialog.
- OEM filter list is generated dynamically from registry contents, allowing future manufacturers to appear without hard-coded UI edits.

## Engineering boundaries preserved
- iwis 3 ml/m is stored as an OEM starting reference specifically for 10B-1; scaling to other pitch/strand counts remains LUBRICA engineering logic.
- U.S. Tsubaki manual ~8 h and drip 5–20 drops/min/strand are stored as maintenance guidance, not universal values for every chain application.
- ISO/DIN dimensional data do not own lubrication quantity or interval.
- FRANCIA gearbox cavity and lifting screw remain separate lubrication regimes; no fixed OEM screw interval or gram dose is invented.

## Regression
PASS: 1.0.31.6 source UX test; 1.0.31.4 non-bearing source registry; chain calculator; FRANCIA M42VR; screw-jack simple UX.
