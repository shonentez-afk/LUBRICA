from pathlib import Path
root=Path(__file__).resolve().parents[1]
ui=(root/'routes/routes-ui.js').read_text(encoding='utf-8')
pui=(root/'routes/route-planning-ui.js').read_text(encoding='utf-8')
eng=(root/'routes/route-planning.js').read_text(encoding='utf-8')
html=(root/'index.html').read_text(encoding='utf-8')
css=(root/'assets/app.css').read_text(encoding='utf-8')
checks={
 'planning button':'id="routePlanning"' in ui and 'План смазочных работ' in ui,
 'anchor field':'planningAnchorDate' in ui and 'Дата первого планового выполнения' in ui,
 'dedicated dialog':'id="routePlanningDialog"' in html,
 'planning scripts':'route-planning.js' in html and 'route-planning-ui.js' in html,
 'explicit no guessing':'Система не назначает эту дату автоматически' in pui,
 'existing events contract':'существующие мероприятия карточек точек' in pui,
 'preview and commit':'Сформировать предварительный план' in pui and 'Зафиксировать план' in pui and 'ничего не записывает' in pui,
 'status calendar':'Просрочено' in pui and 'В работе' in pui and 'Выполнено' in pui,
 'open planned route':'data-open-route' in pui and 'plannedItemId' in ui,
 'run linkage':'planItemId' in ui,
 'revision frozen':'routeRevisionId' in eng and 'taskIds:clone' in eng,
 'responsive dialog':'#routePlanningDialog' in css and '@media(max-width:900px)' in css,
}
bad=[k for k,v in checks.items() if not v]
if bad:
 print('STAGE 9.3 ROUTE PLANNING UI FAIL',bad);raise SystemExit(1)
print('STAGE 9.3 ROUTE PLANNING UI PASS',checks)
