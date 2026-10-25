from pathlib import Path
import re, collections
root=Path(__file__).resolve().parents[1]
html=(root/"index.html").read_text(encoding="utf-8")
ui=(root/"routes/routes-ui.js").read_text(encoding="utf-8")
pui=(root/"routes/route-planning-ui.js").read_text(encoding="utf-8")
css=(root/"assets/app.css").read_text(encoding="utf-8")
planning=(root/"routes/route-planning.js").read_text(encoding="utf-8")
dashboard=(root/"routes/management-dashboard.js").read_text(encoding="utf-8")
ids=re.findall(r'\bid="([^"]+)"',html)
checks={
 "clean document title":"LUBRICA — Конструктор карты смазки" in html and "Stage 9.1.6 Route Point Queue" not in html,
 "no visible stage eyebrow":not re.search(r'<span class="eyebrow">[^<]*STAGE\s*9',html+ui+pui,re.I),
 "no visible PPR wording":"ППР" not in html+ui+pui and "PPR Calendar Planning" not in planning,
 "dashboard single navigation":'data-view="dashboard"' in html and 'id="managementDashboard">Дашборд' not in ui,
 "dashboard main view":'id="managementDashboardView"' in html and "renderManagementDashboard" in ui,
 "no duplicate static ids":all(v==1 for v in collections.Counter(ids).values()),
 "route editor canonical width":"width:min(960px,calc(100vw - 24px))!important" in css,
 "route create canonical width":"width:min(820px,calc(100vw - 24px))!important" in css,
 "planning canonical width":"#routePlanningDialog{" in css and "width:min(1040px,calc(100vw - 24px))!important" in css,
 "history canonical width":"#routeExecutionDialog:has(.route-history-workspace)" in css and "max-width:960px!important" in css,
 "preparation canonical width":"#routeExecutionDialog:has(.route-preparation-dialog)" in css and "max-width:1040px!important" in css,
 "revisions canonical width":"#routeExecutionDialog:has(.route-revisions-dialog)" in css and "max-width:900px!important" in css,
 "plan fact canonical width":"#routeExecutionDialog:has(.route-plan-fact-dialog)" in css and "max-width:1040px!important" in css,
 "frv canonical width":"#routeExecutionDialog:has(.route-frv-dialog)" in css and "max-width:760px!important" in css,
 "analytics canonical width":"#routeExecutionDialog:has(.route-analytics-dialog)" in css and "max-width:1120px!important" in css,
 "import canonical width":"#importDialog{" in css and "max-width:720px!important" in css,
 "checklist ten column contract":all(f"nth-child({i})" in css for i in range(1,11)),
 "checklist fixed layout":".stage91-checklist .checklist-task-table{" in css and "table-layout:fixed!important" in css,
 "checklist print reset":"width:auto!important" in css and "font-size:7.2pt!important" in css,
 "action groups wrap":".route-preview-actions,.route-actions,.route-editor-head-actions" in css and "flex-wrap:wrap!important" in css,
 "planning terminology":"План смазочных работ" in pui and "Зафиксируйте план" in pui,
 "existing task source":"существующие мероприятия карточек точек" in pui,
 "dashboard read only":"setDatabase" not in dashboard and "createRun" not in dashboard and "updateRoute" not in dashboard,
}
bad=[k for k,v in checks.items() if not v]
if bad:
 print("FINAL BASELINE AUDIT FAIL",bad)
 raise SystemExit(1)
print("FINAL BASELINE AUDIT PASS",checks)
