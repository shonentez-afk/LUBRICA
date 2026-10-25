from pathlib import Path
r=Path(__file__).resolve().parents[1]
runtime=(r/'js/runtime.js').read_text(encoding='utf-8')
qa=(r/'qa/qa-engine.js').read_text(encoding='utf-8')
checks={
 'map natural comparator':'function compareMapRows' in runtime,
 'map sorts visible rows':'.sort(compareMapRows)' in runtime,
 'physical point primary':'a.lubricationPointId||pointDisplayId(a)||a.id' in runtime,
 'qa no destructive cleanup call':'cleanupStaleDeletedCandidatePoints' not in qa,
 'qa still reports empty points':"POINT_WITHOUT_TASKS" in qa,
}
bad=[k for k,v in checks.items() if not v]
if bad: raise SystemExit('FAIL '+str(bad))
print('RELEASE 1.0.20 CONTRACT PASS',checks)
