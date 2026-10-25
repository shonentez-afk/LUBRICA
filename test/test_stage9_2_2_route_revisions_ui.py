from pathlib import Path
root=Path(__file__).resolve().parents[1]
ui=(root/'routes/routes-ui.js').read_text(); eng=(root/'routes/route-engine.js').read_text(); chk=(root/'checklist/checklist-engine.js').read_text(); css=(root/'assets/app.css').read_text()
checks={'revision api':'commitRouteRevision' in eng and 'compareRouteRevisions' in eng,'revision store':'routeRevisions' in eng,'execution pins revision':'routeRevisionId' in chk and 'ensureRouteRevision' in chk,'revision UI':'РЕВИЗИИ МАРШРУТА' in ui and 'Зафиксировать Rev 1' in ui and 'История ревизий ещё не начата' in ui,'execution shows revision':'routeRevision||route.revision' in ui,'responsive revision css':'.route-revisions-layout' in css}
bad=[k for k,v in checks.items() if not v]
if bad: print('STAGE 9.2.2 UI FAIL',bad);raise SystemExit(1)
print('STAGE 9.2.2 UI PASS',checks)
