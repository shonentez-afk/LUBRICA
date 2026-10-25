from pathlib import Path
r=Path(__file__).resolve().parents[1]
js=(r/'import/candidates.js').read_text(encoding='utf-8')
classifier=(r/'import/component-classifier.js').read_text(encoding='utf-8')
checks={
 'classifier 2.3': "classificationVersion:'2.3'" in classifier and "classificationVersion!=='2.3'" in js,
 'typo normalization': "бабаран" in classifier and "барабан" in classifier,
 'default queue hides terminal decisions': "stateFilter==='all'?!['confirmed','rejected','excluded'].includes(r.state)" in js,
 'queue label': '<span>Очередь</span>' in js,
 'rejected tab retained': 'data-state="rejected"' in js,
 'rejected count retained': 'candRejected' in js,
 'terminal actions locked': "['confirmed','rejected'].includes(r.state)" in js,
}
bad=[k for k,v in checks.items() if not v]
if bad: raise SystemExit('CANDIDATE REJECT LIFECYCLE FAIL '+str(bad))
print('CANDIDATE REJECT LIFECYCLE PASS',checks)
