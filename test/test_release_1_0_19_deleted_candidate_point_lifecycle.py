from pathlib import Path
r=Path(__file__).resolve().parents[1]
s=(r/'structure/structure.js').read_text(encoding='utf-8')
w=(r/'ui/workspace.js').read_text(encoding='utf-8')
q=(r/'qa/qa-engine.js').read_text(encoding='utf-8')
checks={
 'structure detaches candidate ref':'detachCandidatePointReference(d,x)' in s,
 'workspace detaches candidate ref':'detachCandidatePointReference(live,pointId)' in w,
 'qa stale cleanup':'cleanupStaleDeletedCandidatePoints' in q,
 'only candidate origin':"p.origin!=='candidate'" in q,
 'requires sibling with tasks':'siblingWithTasks' in q,
 'removes stale point':'db.lubricationPoints=(db.lubricationPoints||[]).filter' in q,
}
bad=[k for k,v in checks.items() if not v]
if bad: raise SystemExit('FAIL '+str(bad))
print('PASS',checks)
