# LUBRICA 1.0.27.1 — Unified Auto Interval & Live Recalculation Audit

- Simple mode now recalculates live on input/change/keyup and again after dialog opening.
- Manual base interval is no longer required in simple mode.
- OEM intervals remain first priority: NSK exact tables; NTN/NTN-SNR bearing-unit guide where applicable.
- Added NTN Bearing Units exact relubrication quantity table for UC/UK/UEL codes (e.g. UC320 = 60 g).
- Added LUBRICA Unified Bearing Lubrication Method (LUBM) as clearly-labelled engineering fallback.
- LUBM automatically provides dose/fill/interval only when exact/OEM method is unavailable and never labels the result as OEM.
- Added LUBM source-registry entry and calculation version multi-oem-1.0.27.1.
