from pathlib import Path
r=Path(__file__).resolve().parents[1]
css=(r/'assets/app.css').read_text(encoding='utf-8')
js=(r/'import/candidate-finalizer.js').read_text(encoding='utf-8')
checks={
 'dialog scoped':'#structureDialog.candidate-finalize-dialog' in css,
 'no horizontal scroll':'overflow-x:hidden!important' in css,
 'container query':'container-name:candidateFinalize' in css and '@container candidateFinalize (max-width:850px)' in css,
 'two-column compact':'grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important' in css,
 'single-column narrow':'@container candidateFinalize (max-width:560px)' in css,
 'activity wrap':'white-space:normal!important' in css,
 'logic untouched':'ИНЖЕНЕРНОЕ ПОДТВЕРЖДЕНИЕ' in js and 'Подтвердить и создать' in js,
}
bad=[k for k,v in checks.items() if not v]
if bad: raise SystemExit('CANDIDATE MODAL RESPONSIVE FAIL '+str(bad))
print('CANDIDATE MODAL RESPONSIVE PASS',checks)
