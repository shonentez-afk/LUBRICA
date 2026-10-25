from pathlib import Path
js=Path('routes/routes-ui.js').read_text(encoding='utf-8')
css=Path('assets/app.css').read_text(encoding='utf-8')
checks={
 'transactional wizard present':'До финального подтверждения' in js or 'ничего не добавляет в список маршрутов' in js,
 'wizard explicitly says no persistence':'ничего не добавляет в список маршрутов и не изменяет базу' in js,
 'empty mode no premature create wording':'Создать и перейти к наполнению' not in js,
 'empty mode keeps optional picker':"['empty','manual'].includes(mode)" in js,
 'draft selection controls':'data-select-all-draft' in js and 'data-clear-draft' in js and 'data-draft-search' in js,
 'final button explicit':'data-create-submit>Создать маршрут</button>' in js,
 'final button label stable':"submit.textContent='Создать маршрут'" in js,
 'automatic composition remains draft':'data.taskIds=[...(E.previewRouteCandidates(data).taskIds||[])]' in js,
 'manual/empty composition passed only at submit':'data.taskIds=[...selectedTaskIds]' in js,
 'no editor auto-open after create':'openRouteEditor(view,routeEntries().find(r=>r.id===res.route.id)||res.route)' not in js,
 'success renders list after commit':'creationCommitted=true;view.dataset.selectedRoute=res.route.id;dlg.close();renderRoutes(view)' in js,
 'footer outside scroll region':'grid-template-rows:auto minmax(0,1fr) auto!important' in css,
 'only create layout scrolls':'#actionDialog.route-create-dialog .route-create-layout' in css and 'overflow:auto!important' in css,
 'footer fixed in modal layout':'#actionDialog.route-create-dialog .route-create-footer' in css and 'position:relative!important' in css,
 'all areas label correct':'<option value="">Все участки</option>' in js,
}
start=js.index("f.addEventListener('submit'")
func_start=js.index('function openCreateRouteDialog')
prefix=js[func_start:start]
checks['no create or clone before final submit']='E.createRoute(' not in prefix and 'E.cloneRoute(' not in prefix
submit_end=js.index("dlg.addEventListener('close'", start)
submit=js[start:submit_end]
checks['persistence only in final submit']='E.createRoute(data)' in submit and 'E.cloneRoute(' in submit
failed=[k for k,v in checks.items() if not v]
if failed: raise SystemExit('FAIL: '+', '.join(failed))
print('STAGE 9.1.14 TRANSACTIONAL CREATE WIZARD PASS', checks)
