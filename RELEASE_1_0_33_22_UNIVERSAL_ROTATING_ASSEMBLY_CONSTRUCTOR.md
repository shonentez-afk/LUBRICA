# LUBRICA 1.0.33.22 — Universal Rotating Assembly Constructor

## Scope
Introduces a shared arrangement constructor for rotating shafts, drums, selected rollers, spindles and rotating axes.

## Principles
- Physical service location and installed TMC are stored separately.
- The constructor does not automatically invent bearings or a fixed number of supports.
- Two supports are only the initial suggestion for a typical shaft; the engineer confirms 1–6 serviceable supports.
- Each support is assigned to an actual imported bearing TMC or a manually entered designation.
- For two supports, service locations are `Левая опора` and `Правая опора`; for larger arrangements they are numbered.
- Existing bearing lookup / LUBRICA Universal calculation logic remains responsible for bearing geometry and lubrication calculation.

## Coverage
`rotating_shaft`, `drum`, `roller`, `spindle`, `axis` now use the common `rotating_arrangement` template.
Legacy `two_support_rotating` records are routed to the new constructor when opened.
Generic structural groups such as `Шпиндели` are excluded from arrangement creation; their concrete child assets remain eligible.

## Manual entry
Manual equipment creation now offers rotating shaft / drum / roller / spindle / axis types and a manual support section. Entered bearing designations become actual support components and then use the same constructor as imported assets.

## UI
Concrete rotating equipment cards in Structure receive `КОНСТРУКЦИЯ ВРАЩАЮЩЕГОСЯ УЗЛА` with an `Открыть конструктор` action.

## Regression
Targeted checks cover classifier routing, manual support creation, housed-unit Universal logic, conveyor four-support assignment, and syntax of modified modules.
