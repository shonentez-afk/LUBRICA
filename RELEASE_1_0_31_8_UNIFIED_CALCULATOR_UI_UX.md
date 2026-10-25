# LUBRICA 1.0.31.8 — Unified Calculator UI/UX

- Unified calculator shell based on the bearing calculator visual language.
- Added Simple / Expert / Sources switch to chain, screw jack, gearbox, coupling, grease point, ball screw and linear-bearing calculators.
- Detailed disclosure blocks are hidden in Simple mode and remain available in Expert mode.
- Source buttons are moved to the common header where applicable; duplicate footer source buttons are hidden.
- Section numbering is normalized to 01..N.
- Sticky footer, consistent result cards and responsive grid applied to all calculator dialogs.
- Calculation mathematics and existing approved numerical baselines are unchanged.

## Scope

Ready interactive calculators covered: bearing, chain, screw jack, gearbox/oil cavity, coupling, grease point, ball screw and linear bearing.

Planned catalog-only calculators (oil systems, open gears, wire ropes, central lubrication) do not yet have independent adapters; the shared shell is an extension point they can use when activated.

## UX rules

1. Same header hierarchy and mode switch as bearing calculator.
2. Simple mode hides disclosure/engineering details.
3. Expert mode exposes details without changing calculated values.
4. Sources live in the header. Context-filtered sources are used where a source resolver already exists.
5. Main result remains visible once; manual/engineering inputs stay secondary.
6. Common sticky footer and responsive grid.
