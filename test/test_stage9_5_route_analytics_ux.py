from pathlib import Path
r=Path(__file__).resolve().parents[1]
idx=(r/"index.html").read_text(encoding="utf-8")
ui=(r/"routes/routes-ui.js").read_text(encoding="utf-8")
eng=(r/"routes/route-analytics.js").read_text(encoding="utf-8")
css=(r/"assets/app.css").read_text(encoding="utf-8")
checks={
"loaded":'route-analytics.js' in idx,
"global button":'id="routeAnalytics">Аналитика' in ui,
"route button":'id="routeAnalyticsCurrent">Аналитика' in ui,
"dialog":'АНАЛИТИКА И ОПТИМИЗАЦИЯ' in ui,
"recommendations":'Рекомендации' in ui,
"frv":'ФРВ · структура потерь' in ui,
"problem points":'Проблемные точки' in ui,
"materials":'Материалы · отклонение плана от факта' in ui,
"no automatic route mutation":all(x not in eng for x in ['movePoint','updateRoute(','setRouteStatus','taskIds.push']),
"low sample":'LOW_SAMPLE' in eng and 'Недостаточно данных' in eng,
"responsive":'route-analytics-layout' in css and '@media(max-width:850px)' in css,
}
bad=[k for k,v in checks.items() if not v]
if bad: raise SystemExit("STAGE 9.5 UX AUDIT FAIL "+str(bad))
print("STAGE 9.5 UX AUDIT PASS",checks)