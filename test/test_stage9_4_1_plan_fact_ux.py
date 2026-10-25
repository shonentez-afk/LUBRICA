from pathlib import Path
r=Path(__file__).resolve().parents[1]
ui=(r/"routes/routes-ui.js").read_text(encoding="utf-8")
eng=(r/"routes/route-plan-fact.js").read_text(encoding="utf-8")
idx=(r/"index.html").read_text(encoding="utf-8")
css=(r/"assets/app.css").read_text(encoding="utf-8")
checks={
 "module loaded":'route-plan-fact.js' in idx,
 "button":'id="routePlanFact">План / факт' in ui,
 "dialog":'ПЛАН / ФАКТ' in ui,
 "time plan fact":'Плановое время' in ui and 'Фактическое время' in ui and 'Отклонение времени' in ui,
 "task result metrics":'Мероприятий выполнено' in ui and 'Пропущено' in ui and 'Не требуется' in ui,
 "materials":'Материалы · план / факт' in ui,
 "deviations":'Отклонения по мероприятиям' in ui,
 "historical snapshot":'modelForRun' in eng and 'routeSnapshot' in eng,
 "actual duration":'actualDurationMinutes' in eng,
 "actual quantity":'actualQuantity' in eng,
 "responsive css":'route-plan-fact-layout' in css and '@media(max-width:900px)' in css,
}
bad=[k for k,v in checks.items() if not v]
if bad: raise SystemExit("STAGE 9.4.1 UX AUDIT FAIL "+str(bad))
print("STAGE 9.4.1 UX AUDIT PASS",checks)