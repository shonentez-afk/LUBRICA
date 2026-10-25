from pathlib import Path
root=Path(__file__).resolve().parents[1]
ui=(root/'routes/routes-ui.js').read_text()
eng=(root/'checklist/checklist-engine.js').read_text()
exp=(root/'export/export-ui.js').read_text()
css=(root/'assets/app.css').read_text()
checks={
 'working route sheet title':'РАБОЧИЙ МАРШРУТНЫЙ ЛИСТ' in ui,
 'route step column':'<th>Шаг</th>' in ui and 'routeStep' in eng,
 'existing point-card event wording':'Мероприятие из карточки точки' in ui,
 'point and task counts':'pointCount' in eng and 'taskCount' in eng and 'Физических точек' in ui,
 'route code':'route.code||route.id' in ui,
 'clean sheet does not auto-open last completed run':'run=historyRun||activeRun||null' in ui,
 'excel clean route sheet option':'options.clean?null' in exp and 'buildChecklistSheet91(r,{clean:true})' in exp,
 'excel route sheet event wording':'Мероприятие из карточки точки' in exp,
 'excel step':'x.routeStep' in exp,
 'print label':'Маршрутный лист · Печать / PDF' in ui,
 'route sheet summary css':'.route-sheet-summary' in css,
 'task ids remain source':'taskId' in eng,
}
bad=[k for k,v in checks.items() if not v]
if bad:
 print('STAGE 9.2 WORKING ROUTE SHEET FAIL',bad);raise SystemExit(1)
print('STAGE 9.2 WORKING ROUTE SHEET PASS',checks)
