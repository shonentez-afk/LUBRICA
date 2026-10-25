# LUBRICA 1.0.31.3 — Multi-OEM Offline Dataset Expansion

## Scope
First implementation stage after the full Source Registry inventory. No calculation formulas or validated numerical results are changed.

## Added offline evidence
- SKF relubrication procedure rules: side and outer-ring feed kept separate.
- NSK Electric Motor Handbook exact local tables: 6200 and N/NJ/NU 200 families.
- NSK housed-unit locally digitized product data, explicitly marked PARTIAL_DATASET.
- INA/Schaeffler slewing-ring/VLU procedure evidence, quantityMode=PROCEDURE_BASED.
- Schaeffler TPI 228 method passport; maintenance regime remains explicit user input.
- Timken Grease Lubrication Tool method passport; no static cross-OEM numerical substitute.

## Traceability
Datasets carry sourceId, datasetId, version, evidenceType, localAvailability and verifiedAt. Source Registry links each source to its local datasets.

## Safety / method isolation
- No new OEM numerical values were invented.
- Timken remains OEM-tool/data driven.
- VLU remains procedure-based; D×B is not introduced as a VLU gram dose.
- Product-data sources remain distinct from calculation-method sources.
- Fixed stale Timken sourceRef: TIMKEN-GREASE -> TIMKEN-HELP so provenance resolves to an actual registry entry.

## Extension point
The same dataset schema can be extended to NTN general, SEW gearboxes, chain standards/OEM tables, FRANCIA screw jacks, THK linear bearings and later calculation families without redesigning the Source Registry UI.
