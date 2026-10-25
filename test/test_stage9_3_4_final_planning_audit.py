from pathlib import Path
root=Path(__file__).resolve().parents[1]
ui=(root/"routes/route-planning-ui.js").read_text(encoding="utf-8")
eng=(root/"routes/route-planning.js").read_text(encoding="utf-8")
routes=(root/"routes/routes-ui.js").read_text(encoding="utf-8")
css=(root/"assets/app.css").read_text(encoding="utf-8")
checks={
 "canonical title":"План смазочных работ" in ui,
 "period controls":'data-plan-start' in ui and 'data-plan-end' in ui,
 "preview action":"Сформировать предварительный план" in ui,
 "preview nonpersistent explanation":"ничего не сохраняется" in ui or "ничего не записывает" in ui,
 "commit action":"Зафиксировать план" in ui,
 "initial state":"Расчёт ещё не запускался" in ui,
 "blocked state":"Предварительный план не сформирован" in ui and "Что мешает сформировать план" in ui,
 "route settings shortcut":"Открыть настройки маршрута" in ui,
 "valid zero state":"На этот период работ не найдено" in ui,
 "calendar":"Зафиксированный календарь" in ui,
 "active routes only":"status==='active'" in eng,
 "existing task ids":"taskIds" in eng,
 "revision frozen":"routeRevisionId" in eng and "ensureRouteRevision" in eng,
 "anchor explicit":"planningAnchorDate" in eng and "ANCHOR_MISSING" in eng,
 "last completion anchor":"lastCompletedDate" in eng,
 "duplicate guard":"planKey" in eng and "existing" in eng,
 "planned lifecycle":"linkRun" in eng and "syncFromRun" in eng and "in_progress" in eng and "completed" in eng and "cancelled" in eng,
 "run links plan":"plannedItemId" in routes and "planItemId" in routes,
 "outdated revision blocked":"revisionOutdated" in routes,
 "dialog bounded":"#routePlanningDialog{" in css and "overflow:hidden" in css,
 "internal scroll":".route-planning-preview-list,.route-planning-calendar-list{overflow:auto" in css,
 "responsive":"@media(max-width:900px)" in css,
 "no PPR terminology":all("ППР" not in p.read_text(encoding="utf-8",errors="ignore") for p in root.rglob("*") if p.is_file() and p.suffix.lower() in {".js",".html",".css",".json"}),
}
bad=[k for k,v in checks.items() if not v]
if bad:
 print("STAGE 9.3.4 FINAL PLANNING AUDIT FAIL",bad)
 raise SystemExit(1)
print("STAGE 9.3.4 FINAL PLANNING AUDIT PASS",checks)
