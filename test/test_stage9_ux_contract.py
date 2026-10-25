from pathlib import Path
root=Path(__file__).resolve().parents[1]
css=(root/'assets/app.css').read_text(encoding='utf-8')
obs=(root/'core/observability.js').read_text(encoding='utf-8')
ui=(root/'routes/routes-ui.js').read_text(encoding='utf-8')
eng=(root/'routes/route-engine.js').read_text(encoding='utf-8')
checks={
 'module scroll wrapper':'system-module-scroll' in obs,
 'module scroll only':'system-module-scroll{flex:1;min-height:0;overflow-y:auto' in css,
 'dialog fixed':'system-dialog{max-height:86vh;overflow:hidden}' in css,
 'route sync action':'syncRoutes' in ui,
 'route editor':'openRouteEditor' in ui,
 'point reorder':'movePoint' in eng and 'data-point-up' in ui and 'data-point-down' in ui,
 'point removal':'removePointFromRoute' in eng and 'data-point-remove' in ui,
 'point/task add':'addTasksToRoute' in eng and 'data-add-selected-point' in ui,
 'approved-only rule':"approvalStatus==='approved'" in eng,
 'persistent task ids':'taskIds' in eng,
}
bad=[k for k,v in checks.items() if not v]
if bad: raise SystemExit('STAGE 9 UX CONTRACT FAIL: '+', '.join(bad))
print('STAGE 9.0 UX CONTRACT PASS', checks)
