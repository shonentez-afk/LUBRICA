# LUBRICA 1.0.33.18 — Conveyor service-location naming

- Conveyor lubrication point names now describe the physical service location, not the installed TMC designation.
- Bearing points: `Приводной вал · левая опора`, `Приводной вал · правая опора`, and equivalent return/tension shaft locations.
- Installed bearing/housing designation remains linked separately through `componentBinding` and `installedComponent`.
- Bearing catalog resolution uses the linked source TMC designation rather than the physical point name.
- Chain service point is named `Цепной привод`; the imported/manual chain designation remains the linked TMC.
- Re-confirming an already generated conveyor arrangement updates legacy generated point names without renaming source components.
- Manual conveyor entry follows the same model: the four fields describe installed bearing/TMC designations, while point names are generated from the four physical locations.
