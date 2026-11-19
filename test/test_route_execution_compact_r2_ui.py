from pathlib import Path
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text(encoding='utf-8')
ui=(root/'routes/routes-ui.js').read_text(encoding='utf-8')
compact=(root/'routes/route-compact-ui.js').read_text(encoding='utf-8')
css=(root/'assets/route-compact.css').read_text(encoding='utf-8')
source=(root/'checklist/checklist-engine.js').read_text(encoding='utf-8')
checks={
 'new module before existing route UI':html.index('./routes/route-compact-ui.js')<html.index('./routes/routes-ui.js'),
 'separate responsive CSS linked':'./assets/route-compact.css' in html,
 'compact uses canonical pointKey':'task.pointKey||task.pointId' in compact,
 'physical visits group multiple task IDs':'last.tasks.push(task)' in compact,
 'all input state from existing checklist results':'resultFor(run,task.taskId)' in compact,
 'no duplicate field IDs':'data-task-result' in compact and 'data-task-actual-quantity' in compact and 'data-task-observation' in compact,
 'single mode in DOM':'displayMode===\'table\'' in ui and 'LubricaRouteCompactUI.render(model,{run,editable,filter:visitFilter})' in ui,
 'print switches to original table':"view.dataset.routeSheetMode='table';renderRoutes(view)" in ui and "window.addEventListener('afterprint',restore" in ui,
 'snapshot engine remains used':'modelForRun' in ui and 'routeSnapshot' in source,
 'reason captured on typing':"if(deviation)patch.deviationReason=el.value.trim()" in ui,
 'reason input focused after marking skipped':"note?.focus({preventScroll:false})" in ui,
 'remaining work navigation':'data-route-find-pending' in compact and "scrollIntoView({behavior:'smooth',block:'center'})" in ui,
 'status change re-renders progress':'E.updateTask(run.id,id,{resultStatus:state,done:state===\'completed\'});' in ui and 'renderRoutes(view)' in ui,
 'detail table still present':'checklist-task-table' in ui and 'Маршрут · точки и мероприятия' in ui,
 'route sheet old print untouched':'Маршрутный лист · Печать / PDF' in ui,
 'responsive grid for narrow windows':'@media(max-width:620px)' in css and 'grid-template-columns:1fr' in css,
 'print hides compact controls':'@media print' in css,
}
fail=[name for name,ok in checks.items() if not ok]
if fail:raise AssertionError(f'R2 UI contract failure: {fail}')
print('ROUTE COMPACT R2 UI CONTRACT PASS',checks)
