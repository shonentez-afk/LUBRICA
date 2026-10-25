from pathlib import Path
base=Path(__file__).resolve().parents[1]
ui=(base/'routes/routes-ui.js').read_text(encoding='utf-8')
css=(base/'assets/app.css').read_text(encoding='utf-8')
engine=(base/'routes/route-engine.js').read_text(encoding='utf-8')
errors=[]
for token in ['Очередь физических точек','Точки и мероприятия','data-route-point','draggable="true"','data-point-top','data-point-bottom','data-candidate-task','data-add-selected-point','data-point-search','Перетащить точку в конец очереди']:
    if token not in ui: errors.append(f'Queue UX missing: {token}')
for token in ['pointGroupsForRoute','pointTaskCandidates','addTasksToRoute','removeTaskFromRoute','movePointToIndex','movePointBefore','removePointFromRoute','queueState']:
    if token not in engine: errors.append(f'Queue engine missing: {token}')
for token in ['#actionDialog.route-queue-dialog','route-queue-workspace','route-current-list','route-available-list','route-candidate-task','route-point-task-row']:
    if token not in css: errors.append(f'Queue CSS missing: {token}')
if 'Маршрут формируется из мероприятий, уже настроенных в карточках точек' not in ui: errors.append('Event-centric behavior is not explained to user')
if 'существующее мероприятие из карточки точки' not in ui: errors.append('Existing point-card activity source is not explained')
if 'Посещение:' in ui: errors.append('Artificial visit terminology remains')
if '<button class="mini-btn ghost" data-up' in ui: errors.append('Legacy per-task queue controls remain')
print('STAGE 9.1.9 ROUTE QUEUE UX/UI AUDIT', 'PASS' if not errors else 'FAIL')
for e in errors: print('ERROR',e)
raise SystemExit(1 if errors else 0)
