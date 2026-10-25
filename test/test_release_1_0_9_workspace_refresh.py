from pathlib import Path
r=Path(__file__).resolve().parents[1]
router=(r/'ui/view-router.js').read_text(encoding='utf-8')
ctx=(r/'structure/context.js').read_text(encoding='utf-8')
checks={
 'workspace explicitly refreshes core':'if(id==="workspace"){window.LubricaApp?.refreshFromCore?.();window.LubricaApp?.renderAll?.();return}' in router,
 'structure save refreshes core':'global.LubricaApp?.refreshFromCore();' in ctx,
 'workspace is not routed as secondary':'if(id!=="workspace")renderSecondary(id)' not in router,
}
bad=[k for k,v in checks.items() if not v]
if bad: raise SystemExit('WORKSPACE REFRESH CONTRACT FAIL '+str(bad))
print('WORKSPACE REFRESH CONTRACT PASS',checks)
