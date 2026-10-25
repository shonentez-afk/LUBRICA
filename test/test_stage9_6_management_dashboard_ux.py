from pathlib import Path
r=Path(__file__).resolve().parents[1]
idx=(r/"index.html").read_text(encoding="utf-8");ui=(r/"routes/routes-ui.js").read_text(encoding="utf-8");eng=(r/"routes/management-dashboard.js").read_text(encoding="utf-8");css=(r/"assets/app.css").read_text(encoding="utf-8")
checks={
"module":'management-dashboard.js' in idx,
"button":('id="managementDashboard">Дашборд' in ui) or ('data-view="dashboard"' in idx),
"title":'УПРАВЛЕНЧЕСКИЙ ДАШБОРД' in (idx+ui),
"plan":'План смазочных работ по линии / участку' in ui,
"signals":'Сигналы для руководителя' in ui,
"ranking":'Рейтинг маршрутов по отклонению времени' in ui,
"period":'data-dashboard-start' in ui and 'data-dashboard-end' in ui,
"print":'data-dashboard-print' in ui,
"read only":all(x not in eng for x in ['setDatabase','createRun','updateRoute','taskIds.push','routePlanItems.push']),
"responsive":'management-dashboard-kpis' in css and '@media(max-width:800px)' in css
}
bad=[k for k,v in checks.items() if not v]
if bad: raise SystemExit("STAGE 9.6 UX AUDIT FAIL "+str(bad))
print("STAGE 9.6 UX AUDIT PASS",checks)