from pathlib import Path
css=Path('assets/app.css').read_text(encoding='utf-8')
js=Path('routes/routes-ui.js').read_text(encoding='utf-8')
checks={
 'validation parent sized':'#routeExecutionDialog:has(.route-validation-dialog)' in css,
 'move parent sized':'#routeExecutionDialog:has(.route-move-dialog)' in css,
 'history parent sized':'#routeExecutionDialog:has(.route-history-workspace)' in css,
 'validation shell':'route-validation-dialog route-modal-shell' in js,
 'validation summary':'route-validation-summary' in js,
 'explicit add flow':'Добавить выбранные в маршрут' in js,
 'existing card events':'мероприятий, уже настроенных в карточках точек' in js,
}
failed=[k for k,v in checks.items() if not v]
if failed: raise SystemExit('FAIL: '+', '.join(failed))
print('STAGE 9.1.11 ROUTE MODAL UI COMPATIBILITY PASS',checks)
