from pathlib import Path
root=Path(__file__).resolve().parents[1]
ui=(root/"routes/routes-ui.js").read_text(encoding="utf-8")
css=(root/"assets/app.css").read_text(encoding="utf-8")
engine=(root/"routes/route-engine.js").read_text(encoding="utf-8")
checks={
 "current label": '>Текущие</option>' in ui,
 "old working label absent": '>Рабочие</option>' not in ui,
 "archive label": '>Архив</option>' in ui,
 "all routes label": '>Все маршруты</option>' in ui,
 "working filter still means non-archive": "filter==='working'?allRoutes.filter(r=>r.status!=='archived')" in ui,
 "archive loaded into UI": "routeEntries({includeArchived:true})" in ui,
 "restore action": "restoreRoute" in ui and "restoreRoute" in engine,
 "archived route not executable": "selected?.status!=='archived'" in ui,
 "transactional create flag": "creationCommitted=false" in ui,
 "persistence in final submit": "f.addEventListener('submit'" in ui and ("E.createRoute(" in ui or "E.cloneRoute(" in ui),
 "explicit final create button": "Создать маршрут" in ui,
 "cancel create": "Отменить создание" in ui,
 "existing task wording": "существующие мероприятия" in ui,
 "event task ids": "taskIds" in engine,
 "route editor modal width owned by parent": "#actionDialog.route-queue-dialog" in css,
 "route create footer fixed layout": ".route-create-footer" in css,
 "validation parent sized": "#routeExecutionDialog:has(.route-validation-dialog)" in css,
 "horizontal overflow protected": "overflow-x:hidden" in css,
}
bad=[k for k,v in checks.items() if not v]
if bad:
 print("STAGE 9.1.16 FINAL ROUTE AUDIT FAIL",bad)
 raise SystemExit(1)
print("STAGE 9.1.16 FINAL ROUTE AUDIT PASS",checks)
