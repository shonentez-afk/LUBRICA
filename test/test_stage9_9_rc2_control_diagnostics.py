from pathlib import Path
r=Path(__file__).resolve().parents[1]
obs=(r/'core/observability.js').read_text(encoding='utf-8')
idx=(r/'index.html').read_text(encoding='utf-8')
router=(r/'ui/view-router.js').read_text(encoding='utf-8')
checks={
 'no stale Checks UI':"['Checks UI',typeof global.renderChecks==='function']" not in obs,
 'control health check':"['Control UI',typeof global.renderProgramQA==='function']" in obs,
 'control nav':'data-view="programQA"' in idx and '<small>Контроль</small>' in idx,
 'control router':'renderProgramQA' in router,
 'old checks absent':'data-view="checks"' not in idx and 'id="checks"' not in idx,
}
bad=[k for k,v in checks.items() if not v]
if bad: raise SystemExit('RC2 CONTROL DIAGNOSTICS FAIL '+str(bad))
print('RC2 CONTROL DIAGNOSTICS PASS',checks)
