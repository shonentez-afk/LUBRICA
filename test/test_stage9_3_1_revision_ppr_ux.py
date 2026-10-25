from pathlib import Path
root=Path(__file__).resolve().parents[1]
ui=(root/'routes/routes-ui.js').read_text(encoding='utf-8')
pui=(root/'routes/route-planning-ui.js').read_text(encoding='utf-8')
css=(root/'assets/app.css').read_text(encoding='utf-8')
checks={
 'revision empty state truthful':'История ревизий ещё не начата' in ui and 'Текущий маршрут станет Rev 1' in ui,
 'revision first commit explicit':'Зафиксировать Rev 1' in ui,
 'revision changed state explicit':'есть незакреплённые изменения' in ui and 'Зафиксировать Rev ${Number(latest.revision)+1}' in ui,
 'revision parent owns size':'#routeExecutionDialog:has(.route-revisions-dialog)' in css and 'width:min(900px' in css,
 'revision no forced tall empty layout':'.route-revisions-layout' in css and 'min-height:0!important' in css,
 'three step explanation':'route-planning-steps' in pui and 'Выберите период' in pui and 'Сформируйте предварительный план' in pui and 'Зафиксируйте план' in pui,
 'preview explicitly nonpersistent':'Предварительный план ничего не записывает в базу' in pui and 'Предварительный план · не сохранён' in pui,
 'commit disabled until preview':'data-commit ${!previewReady||!previewCount?\'disabled\':\'\'}' in pui,
 'date change invalidates preview':"preview=null;previewKey=''" in pui,
 'no implicit preview on open':'let startDate=initial.startDate,endDate=initial.endDate,preview=null' in pui,
 'planning responsive steps':'.route-planning-steps' in css and '@media(max-width:900px)' in css,
}
bad=[k for k,v in checks.items() if not v]
if bad:
 print('STAGE 9.3.1 UX FAIL',bad);raise SystemExit(1)
print('STAGE 9.3.1 UX PASS',checks)
