from pathlib import Path
css=Path('assets/app.css').read_text(encoding='utf-8')
js=Path('routes/routes-ui.js').read_text(encoding='utf-8')
engine=Path('routes/route-engine.js').read_text(encoding='utf-8')
checks={
 'route editor present':'Маршрут и порядок' in js and 'Добавить точки и мероприятия' in js,
 'area selector says all areas':'<option value="">Все участки</option>' in js,
 'route ui no whole-line label':'Вся линия' not in js,
 'engine whole-line display says all areas':"?'Все участки':'Без участка'" in engine,
 'editor has two explicit tabs':'route-editor-tabs' in js and 'Маршрут и порядок' in js and 'Добавить точки и мероприятия' in js,
 'empty route opens add panel':"editorPanel=(window.LubricaRouteEngine?.queueState?.(route.id)?.current?.length?'route':'add')" in js,
 'insert after opens add panel':"if(insertAfterPointId)editorPanel='add'" in js,
 'existing events only':'существующее мероприятие из карточки точки' in js,
 'event selection explicit':'3 · Добавить выбранные в маршрут' in js,
 'queue dialog fixed width':'width:min(960px,calc(100vw - 24px))!important' in css,
 'queue vertical panels':'route-editor-panel' in css and 'route-editor-tabs' in css,
 'host horizontal overflow blocked':'overflow:hidden!important;display:flex!important;flex-direction:column!important' in css,
 'lists no horizontal overflow':'overflow-x:hidden!important' in css,
 'narrow editor one column':'@media(max-width:760px)' in css and '.route-editor-tabs{grid-template-columns:1fr!important}' in css,
 'settings responsive':'grid-template-columns:repeat(3,minmax(0,1fr))!important' in css,
 'create modal one flow':'.route-create-layout{display:grid!important;grid-template-columns:1fr!important}' in css,
 'validation parent sized':'#routeExecutionDialog:has(.route-validation-dialog)' in css,
 'route children min width zero':'.route-validation-dialog,.route-move-dialog,.route-lifecycle-form,.route-history-workspace{min-width:0!important' in css,
}
failed=[k for k,v in checks.items() if not v]
if failed: raise SystemExit('FAIL: '+', '.join(failed))
print('STAGE 9.1.12 ROUTE UI REBUILD AUDIT PASS', checks)
