from pathlib import Path
base=Path(__file__).resolve().parents[1]
ui=(base/'routes/routes-ui.js').read_text(encoding='utf-8')
engine=(base/'checklist/checklist-engine.js').read_text(encoding='utf-8')
export=(base/'export/export-ui.js').read_text(encoding='utf-8')
html=(base/'index.html').read_text(encoding='utf-8')
css=(base/'assets/app.css').read_text(encoding='utf-8')
errors=[]
for token in ['ID точки смазки','Наименование точки смазки','Код смазки','Код смазочного оборудования','Наблюдения, коррекции','№ оборудования','Наименование оборудования','Узел']:
    if token not in ui: errors.append(f'UI checklist column/group missing: {token}')
for token in ['Начать выполнение','Завершить маршрут','data-task-done','data-task-observation','data-run-comments']:
    if token not in ui: errors.append(f'Execution control missing: {token}')
for token in ['bearing_regrease','gearbox_oil_change','chain_lubricant_apply','ball_screw_regrease','linear_bearing_regrease']:
    if token not in engine: errors.append(f'Checklist template missing: {token}')
if 'checklistRuns' not in (base/'core/database-normalizer.js').read_text(encoding='utf-8'): errors.append('checklistRuns not normalized')
if './checklist/checklist-engine.js' not in html: errors.append('Checklist engine not connected')
if 'buildChecklistSheet91' not in export or 'Код смазки' not in export or 'Код смазочного оборудования' not in export: errors.append('Stage 9.1 Excel checklist export missing')
if '.checklist-task-table-wrap{overflow-x:auto}' not in css: errors.append('Checklist task table lacks local horizontal scroll')
if 'textarea::placeholder{color:transparent' not in css: errors.append('Print stylesheet does not suppress textarea placeholders')
if 'checklist-code-cell b' not in css: errors.append('Checklist code cells do not have explicit readable styling')

for token in ['type=\"button\" class=\"btn primary\" data-complete-run','persistVisibleFields','E.completeRun(fresh.id,route)','refreshFromCore','Маршрут не завершён','data-open-run-history','Отменить выполнение','Начать новое выполнение']:
    if token not in ui: errors.append(f'Route completion robustness contract missing: {token}')
for token in ["status==='in_progress'","normalizeActiveRuns","superseded","validateCompletion","routeSnapshot","cancelRun","modelForRun"]:
    if token not in engine: errors.append(f'Checklist completion state guard missing: {token}')
print('STAGE 9.1 UX CONTRACT', 'PASS' if not errors else 'FAIL')
for e in errors: print('ERROR',e)
raise SystemExit(1 if errors else 0)
