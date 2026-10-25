from pathlib import Path
r=Path(__file__).resolve().parents[1]
idx=(r/'index.html').read_text(encoding='utf-8')
router=(r/'ui/view-router.js').read_text(encoding='utf-8')
ui=(r/'qa/qa-ui.js').read_text(encoding='utf-8')
eng=(r/'qa/qa-engine.js').read_text(encoding='utf-8')
ws=(r/'ui/workspace.js').read_text(encoding='utf-8')
css=(r/'assets/app.css').read_text(encoding='utf-8')
checks={
 'left nav':'data-view="programQA"' in idx and '<small>Контроль</small>' in idx,
 'main view':'id="programQA" class="main-view"' in idx and 'id="programQaView"' in idx,
 'scripts':'qa-engine.js' in idx and 'qa-ui.js' in idx,
 'router':'id==="programQA"' in router and 'renderProgramQA' in router,
 'readiness title':'Готовность программы смазки' in ui,
 'concrete formula':'пройденные проверки / применимые проверки' in ui and 'Процент нельзя редактировать вручную' in ui,
 'categories':all(x in eng for x in ["'structure'","'points'","'materials'","'norms'","'periodicity'","'sources'","'routes'"]),
 'requested checks':all(x in eng for x in ['TASK_MATERIAL_MISSING','TASK_QUANTITY_MISSING','TASK_INTERVAL_MISSING','TASK_MATERIAL_LIBRARY_MISSING','CALCULATION_NOT_APPROVED','QUANTITY_SOURCE_MISSING','COMPONENT_LIBRARY_UNBOUND','PHYSICAL_POINT_ORIGIN_DUPLICATE','TASK_ORPHAN_POINT','ROUTE_TASK_TOOL_MISSING']),
 'severity levels':all(x in eng for x in ['blocker','error','warn','info']),
 'clickable findings':'data-qa-open' in ui and 'openIssue' in ui,
 'exact task navigation':'LubricaWorkspaceNavigation' in ws and 'openTask(id)' in ws and 'openPoint(id)' in ws,
 'qa export':'LUBRICA_Контроль_программы_смазки.csv' in ui,
 'read only engine':all(x not in eng for x in ['setDatabase(','updateRoute(','createRoute(','deleteRoute(','archiveRoute(']),
 'responsive':'qa-readiness-grid' in css and '@media(max-width:800px)' in css,
}
bad=[k for k,v in checks.items() if not v]
if bad: raise SystemExit('PROGRAM QA UI AUDIT FAIL '+str(bad))
print('PROGRAM QA UI AUDIT PASS',checks)