# PP-53736 Full-Machine Acceptance — working result after 1.0.33.67

## Result

**PASS_WITH_BLOCKERS**

Acceptance executed against:

`project/sources/pp53736/Филиал_завода__Техно__г._Юрга(20260923-051134).json`

## Verified on production data

Entity totals remain stable after apply → reconcile → repeated apply → reconcile:

- equipment: **1188**
- components: **5659**
- lubrication points: **501**
- tasks: **517**

PP-53736 machine-profile scope:

- Line 1: **131 points / 131 tasks**
- Line 2: **131 points / 131 tasks**
- total machine tasks: **262**
- per line: 13 gearbox-oil, 8 chain, 4 screw, 2 open-gear, 104 bearing
- 102 physical roller-bearing positions per machine
- 8 physical 12B-2 chain circuits per machine
- 4 lift screws per machine
- 6015-2RS1 remains excluded from automatic periodic relubrication

Repeated apply/reconcile is idempotent. No duplicate machine origin keys were found.

## Field-confirmation hold

Exactly four Line 1 R77 tasks (#5–#8) remain held in `review` because persisted M1 conflicts with machine drawing hint M3.

They are deliberately excluded from automatically approved routes until physical mounting position is confirmed.

Line 2 does not invent a persisted M1/M3 conflict.

## Routes

All machine-profile tasks except the four field-review R77 tasks can be routed.

Acceptance result:

- machine tasks: 262
- held for field confirmation: 4
- approved/routable: 258
- auto routes containing PP-53736 tasks: 6
- route structural validation: PASS
- approved machine task belongs to exactly one route: PASS
- held review task does not enter approved route: PASS

## Planning blocker

Current calendar planning parses days/weeks/months/years, but PP-53736 maintenance is specified by runtime:

- bearings/chains/open gears: 200 h
- lift screws: 800 h
- gearboxes: 5000 h

LUBRICA correctly refuses to invent calendar dates from these intervals.

A runtime-hours planning model is required (Issue #7). It must use an explicit operating-hours basis or manual next-date fallback.

## Excel traceability

Export projection preserves one row per task:

- PP-53736 export trace rows: **262**
- unique taskId: **262**
- one-task/one-row precondition: PASS

## Regression

Targeted full-machine acceptance: **PASS_WITH_BLOCKERS**.

Full regression was executed in continuation blocks due environment timeout:

- checkpoints 1–47: PASS
- checkpoints 48–70: PASS
- checkpoints 71–99: PASS
- expected source-XLSX tests: SKIP where source XLSX is absent
- no functional FAIL

## Remaining blockers before final machine acceptance

1. Issue #1 — R77 #5–#8 Line 1 physical mounting position.
2. Issue #2 — meaning of 500 in `5000/500 h`.
3. Issue #3 — actual M1–M6 for K37/KF37R17/S37.
4. Issue #7 — runtime-hour planning model.

Until these are resolved, PP-53736 is considered **programmatically integrated but not fully field-closed**.
