from pathlib import Path
root=Path(__file__).resolve().parents[1]
ui=(root/'routes/route-planning-ui.js').read_text(encoding='utf-8')
css=(root/'assets/app.css').read_text(encoding='utf-8')
checks={
 'blocked state exists':"previewBlocked=previewReady&&!previewCount&&blockers.length>0" in ui,
 'blocked copy correct':'Предварительный план не сформирован.' in ui,
 'does not claim formed when blocked':"previewBlocked?'blocked':previewReady?'ready':'idle'" in ui,
 'blocking issue heading':'Что мешает сформировать план' in ui,
 'settings action':'Открыть настройки маршрута' in ui,
 'no duplicated empty state for blocked':"${previewBlocked?'':`<div class=\"route-planning-preview-list\">" in ui,
 'valid zero-work state':'План сформирован корректно, но ни одно мероприятие не попадает' in ui,
 'commit remains disabled without work':"${!previewReady||!previewCount?'disabled':''}" in ui,
 'blocked visual style':'.route-planning-preview-state.blocked' in css,
 'blocker list layout':'.route-planning-blocker{' in css,
}
bad=[k for k,v in checks.items() if not v]
if bad:
 print('STAGE 9.3.2 PPR PREVIEW STATE FAIL',bad);raise SystemExit(1)
print('STAGE 9.3.2 PPR PREVIEW STATE PASS',checks)
