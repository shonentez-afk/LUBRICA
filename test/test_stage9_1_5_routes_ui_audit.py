from pathlib import Path
base=Path(__file__).resolve().parents[1]
ui=(base/'routes/routes-ui.js').read_text(encoding='utf-8')
css=(base/'assets/app.css').read_text(encoding='utf-8')
html=(base/'index.html').read_text(encoding='utf-8')
engine=(base/'checklist/checklist-engine.js').read_text(encoding='utf-8')
errors=[]
required_ui=[
 'openStartRunDialog','НАЧАЛО МАРШРУТА','data-confirm-start',
 'openCompleteRunDialog','ЗАВЕРШЕНИЕ МАРШРУТА','Завершить и зафиксировать',
 'openCancelRunDialog','ОТМЕНА ВЫПОЛНЕНИЯ','data-confirm-cancel',
 'openRunHistory','route-history-layout','data-open-selected',
 'Маршрут уже выполняется','Чек-лист зафиксирован'
]
for token in required_ui:
    if token not in ui: errors.append(f'Lifecycle UX missing: {token}')
if 'window.confirm(' in ui: errors.append('Native confirm is still used for route cancellation')
if 'routeExecutionDialog' not in html: errors.append('Dedicated route execution dialog missing')
for token in ['.route-execution-dialog{width:min(1180px,94vw)', '.route-history-layout{', '.route-history-browser .run-history-list{flex:1', '.stage91-checklist .checklist-execution-bar{position:sticky']:
    if token not in css: errors.append(f'Route UI CSS contract missing: {token}')
for token in ['lifecycleState','cancelReason','canStart','canComplete','canCancel']:
    if token not in engine: errors.append(f'Lifecycle engine contract missing: {token}')
if 'run-history-list{display:grid;gap:7px;max-height:52vh' in css and '#routeExecutionDialog' not in css:
    errors.append('History still relies only on legacy small action dialog styling')

for bad in ['<button class="mini-btn ghost" data-up','<button class="mini-btn ghost" data-down','<button class="mini-btn" data-exclude','<button class="mini-btn ghost" data-restore']:
    if bad in ui: errors.append(f'Route editor action has implicit submit behavior: {bad}')
if 'route-editor-active-warning' not in ui or 'Маршрут сейчас выполняется' not in ui:
    errors.append('Route editor does not warn about frozen active snapshot')
if "(Number(b.executionNo)||0)-(Number(a.executionNo)||0)" not in engine:
    errors.append('Run history ordering does not prioritize execution number')

print('STAGE 9.1.5 ROUTES UX/UI AUDIT', 'PASS' if not errors else 'FAIL')
for e in errors: print('ERROR',e)
raise SystemExit(1 if errors else 0)
