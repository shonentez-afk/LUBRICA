from pathlib import Path
import re
js=Path('routes/routes-ui.js').read_text(encoding='utf-8')
css=Path('assets/app.css').read_text(encoding='utf-8')
checks={
 'route creation guard present':'Отменить создание' in js and 'Создать маршрут' in js,
 'top text close exists':'route-editor-close-top' in js and '>Закрыть</button>' in js,
 'editor footer explains uncommitted selection':'Неотмеченные и не добавленные мероприятия не изменяют маршрут.' in js,
 'editor footer sticky':'route-editor-footer' in css and 'position:sticky!important' in css,
 'editor modal overflow locked':'#actionDialog.route-queue-dialog{\n  overflow:hidden!important;' in css,
 'candidate lists scroll internally':'scrollbar-gutter:stable' in css and '.route-current-list,.route-available-list' in css,
 'create draft note visible':'ничего не добавляет в список маршрутов' in js,
 'create cancel explicit':'Отменить создание' in js,
 'create footer sticky':'route-create-footer' in css,
 'creation commit flag starts false':'creationCommitted=false' in js,
 'creation commit only after success':'creationCommitted=true;view.dataset.selectedRoute=res.route.id' in js,
 'close cleanup does not create':"if(!creationCommitted){selectedTaskIds.clear();delete dlg.dataset.pendingRouteId}" in js,
 'area selector remains correct':'<option value="">Все участки</option>' in js,
}
# Structural guard: createRoute / cloneRoute must only occur inside submit handler region.
start=js.index("f.addEventListener('submit'")
end=js.index("dlg.addEventListener('close'", start)
prefix=js[js.index('function openCreateRouteDialog'):start]
checks['no route persistence before submit']='E.createRoute(' not in prefix and 'E.cloneRoute(' not in prefix
submit=js[start:end]
checks['route persistence happens in submit']='E.createRoute(data)' in submit and 'E.cloneRoute(' in submit
failed=[k for k,v in checks.items() if not v]
if failed:
    raise SystemExit('FAIL: '+', '.join(failed))
print('STAGE 9.1.13 ROUTE CREATION GUARD UI PASS', checks)
