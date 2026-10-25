# LUBRICA 1.0.33.66 — PP-53736 Gearbox OEM Completion

## Scope

Release completes the lubrication/OEM behavior for the gear drives of Izoteh PP-53736-YU1 without changing the global application architecture.

## Corrected PP-53736 gear drives

### SEW KF37R17

`KF37R17DR63S4/TF` is treated as a compound gearbox with two independent oil cavities: KF37 and R17. The user selects actual mounting position M1–M6. The calculator shows both cavity fills and a planning total. The total must never be poured into one cavity.

Machine-era guide values used in the local profile:

| Position | KF37, L | R17, L | Planning total, L |
| --- | ---: | ---: | ---: |
| M1 | 0.50 | 0.25 | 0.75 |
| M2 | 1.10 | 0.55 | 1.65 |
| M3 | 1.10 | 0.35 | 1.45 |
| M4 | 1.50 | 0.55 | 2.05 |
| M5 | 1.00 | 0.35 | 1.35 |
| M6 | 1.00 | 0.35 | 1.35 |

### SEW K37

`K37DRE100M4/TF` no longer misreads motor token `DRE100M4` as gearbox mounting position M4. Available guide fills: M1 0.50 / M2 1.00 / M3 1.00 / M4 1.40 / M5 1.00 / M6 1.00 L.

### SEW R77

PP-53736 uses standalone `R77DRE132S4/TF/ES7C/V`. Old parenthesized larger values intended for the larger unit in compound R..R arrangements are not presented as alternatives for this standalone drive. Guide fills: M1 1.20 / M2 3.80 / M3 3.60 / M4 4.10 / M5 2.50 / M6 3.40 L.

### SEW S37

`S37DRE80M4/TF` from the machine passport is added to the local library. Motor token `DRE80M4` is not a mounting position. Guide fills: M1 0.25 / M2 0.40 / M3 0.50 / M4 0.55 / M5 0.40 / M6 0.40 L.

### Tandler A1 / HW A1

The existing audited A1/HW A1 quantity remains 0.60 L. PP-53736 machine context confirms oil execution and carries the machine lubricant class VG46 from the passport lubricant list.

## Machine interval

For points created by machine profile `IZOTEH-PP53736`, the passport record `5000/500 h` is kept as machine-OEM context. Automatic scheduling uses 5000 h for the working oil-change cycle and 500 h as the first-service field.

## Safety rules

- M1–M6 is never inferred from motor pole/frame tokens such as `DRE100M4`, `DRE80M4`, `DR63S4`.
- Exact installed orientation must be selected from the actual drive/nameplate/installation.
- SEW fill tables are guide quantities; final fill is controlled by the OEM level plug/sight device and exact ordered configuration.
- KF37R17 cavities are filled separately.
