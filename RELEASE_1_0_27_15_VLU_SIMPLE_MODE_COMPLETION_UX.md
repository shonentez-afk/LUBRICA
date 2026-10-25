# LUBRICA 1.0.27.15 — VLU Simple Mode Completion UX

- VLU20 exact OEM record now preselects INA/Schaeffler method instead of showing Auto / not specified.
- Simple mode exposes the fields that actually determine the Schaeffler/INA guide interval: contamination/environment and operating temperature.
- RPM remains optional and is used only to validate the <0.5 m/s applicability limit.
- VLU relubrication is treated as a procedure-based cycle: no invented gram dose is required.
- Quick approval can approve the OEM procedure plus its interval without requiring a numeric dose.
- Readiness explicitly shows `OEM procedure / N h` instead of `needs data` when the procedure and interval are valid.
- Saved task quantity is marked as `procedure` with the OEM procedure text; interval remains a runtime-hours schedule.
