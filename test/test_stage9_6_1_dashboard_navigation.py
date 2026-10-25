from pathlib import Path
r=Path(__file__).resolve().parents[1]
idx=(r/"index.html").read_text(encoding="utf-8")
router=(r/"ui/view-router.js").read_text(encoding="utf-8")
ui=(r/"routes/routes-ui.js").read_text(encoding="utf-8")
css=(r/"assets/app.css").read_text(encoding="utf-8")
checks={
"left menu":'data-view="dashboard"' in idx and '<small>Дашборд</small>' in idx,
"main view":'id="dashboard" class="main-view"' in idx and 'id="managementDashboardView"' in idx,
"router":'id==="dashboard"' in router and 'renderManagementDashboard' in router,
"renderer":'function renderManagementDashboard' in ui and 'window.renderManagementDashboard=renderManagementDashboard' in ui,
"no duplicate topbar button":'id="managementDashboard">Дашборд' not in ui,
"route navigation":'switchView(\'routes\')' in ui,
"dashboard analytics navigation":'openRouteAnalyticsDialog(routesView' in ui,
"responsive main view":'.management-dashboard-view' in css,
}
bad=[k for k,v in checks.items() if not v]
if bad: raise SystemExit("STAGE 9.6.1 DASHBOARD NAVIGATION FAIL "+str(bad))
print("STAGE 9.6.1 DASHBOARD NAVIGATION PASS",checks)