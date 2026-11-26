from pathlib import Path
js=Path('routes/routes-ui.js').read_text(encoding='utf-8')
css=Path('assets/app.css').read_text(encoding='utf-8')
checks={
 'transactional wizard present':'До финального подтверждения' in js or 'ничего не добавляет в список маршрутов' in js,
 'wizard explicitly says no persistence':'ничего не добавляет в список маршрутов и не изменяет базу' in js,
 'empty mode no premature create wording':'Создать и перейти к наполнению' not in js,
 'empty and copy modes removed': 'name="fillMode"' not in js and 'data-manual-group' in js,
 'draft selection controls':'data-select-all-draft' in js and 'data-clear-draft' in js and 'data-draft-search' in js,
 'final button explicit':'data-create-submit hidden disabled>Создать маршрут</button>' in js,
 'final button requires checked preview':'!report?.ok||e.submitter!==submit' in js and 'E.previewManualCreation(readInput(),db())' in js,
 'no parallel automatic fill in manual wizard':'name="fillMode" value="automatic"' not in js and 'data.taskIds=[...(E.previewRouteCandidates(data).taskIds||[])]' not in js,
 'explicit selection passed to preview and commit':'taskIds:[...selectedTaskIds]' in js,
 'editor opens after creation':'setTimeout(()=>openRouteEditor(view,r),0)' in js,
 'success renders list after commit':'creationCommitted=true;view.dataset.selectedRoute=res.route.id' in js and 'dlg.close();renderRoutes(view)' in js,
 'footer outside scroll region':'grid-template-rows:auto minmax(0,1fr) auto!important' in css,
 'only create layout scrolls':'#actionDialog.route-create-dialog .route-create-layout' in css and 'overflow:auto!important' in css,
 'footer fixed in modal layout':'#actionDialog.route-create-dialog .route-create-footer' in css and 'position:relative!important' in css,
 'explicit manual group':'<option value="">Выберите участок</option>' in js and 'manualGroupKey:group.key' in js,
}
start=js.index("f.addEventListener('submit'")
func_start=js.index('function openCreateRouteDialog')
prefix=js[func_start:start]
checks['no create or clone before final submit']='E.createRoute(' not in prefix and 'E.cloneRoute(' not in prefix and 'E.commitManualCreation(' not in prefix
submit_end=js.index("dlg.addEventListener('close'", start)
submit=js[start:submit_end]
checks['persistence only in final submit']='E.commitManualCreation(readInput(),report.token,db())' in submit and 'E.cloneRoute(' not in submit
failed=[k for k,v in checks.items() if not v]
if failed: raise SystemExit('FAIL: '+', '.join(failed))
print('STAGE 9.1.14 TRANSACTIONAL CREATE WIZARD PASS', checks)
