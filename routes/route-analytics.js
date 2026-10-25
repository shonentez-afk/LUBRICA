(function(global){
'use strict';
function db(){return global.LubricaCore?.State?.getDatabase?.()||null}
function round(v,d=1){const p=10**d;return Math.round((Number(v)||0)*p)/p}
function pct(a,b){return b?round(a/b*100,1):0}
function completedRuns(routeId,d=db()){return (d?.checklistRuns||[]).filter(r=>r.routeId===routeId&&r.status==='completed').sort((a,b)=>String(b.completedAt||b.date||'').localeCompare(String(a.completedAt||a.date||'')))}
function snapshotTasks(run){
 const m=run?.routeSnapshot;return (m?.groups||[]).flatMap(g=>g.tasks||[]);
}
function frvSummary(run){return run?.executionFact?.frv||run?.frvFact||null}
function pointTaskStats(runs){
 const map=new Map();
 for(const run of runs){
  const tasks=snapshotTasks(run),results=run.taskResults||run.executionFact?.tasks||{};
  for(const t of tasks){
   const r=results[t.taskId]||{},key=String(t.pointId||t.pointKey||t.taskId);
   if(!map.has(key))map.set(key,{pointId:t.pointId||'',pointName:t.pointName||'',equipment:t.equipment||'',node:t.node||'',events:0,completed:0,skipped:0,notApplicable:0,pending:0,remarks:0,reasons:new Map(),taskIds:new Set()});
   const x=map.get(key);x.events++;x.taskIds.add(t.taskId);
   if(r.done)x.completed++;else if(r.resultStatus==='skipped')x.skipped++;else if(r.resultStatus==='not_applicable')x.notApplicable++;else x.pending++;
   const note=String(r.deviationReason||r.observations||'').trim();if(note){x.remarks++;x.reasons.set(note,(x.reasons.get(note)||0)+1)}
  }
 }
 return [...map.values()].map(x=>({...x,taskIds:[...x.taskIds],skipRate:pct(x.skipped,x.events),issueRate:pct(x.skipped+x.notApplicable+x.remarks,x.events),topReasons:[...x.reasons.entries()].sort((a,b)=>b[1]-a[1]).slice(0,3).map(([reason,count])=>({reason,count}))})).sort((a,b)=>b.issueRate-a.issueRate||b.events-a.events);
}
function frvAggregate(runs){
 const by=new Map();let observed=0,productive=0,withFrv=0;
 for(const run of runs){
  const f=frvSummary(run);if(!f||!Number(f.observedMinutes))continue;withFrv++;observed+=Number(f.observedMinutes)||0;productive+=Number(f.productiveMinutes)||0;
  for(const c of f.byCategory||[]){const id=c.id||c.categoryId||c.label;if(!by.has(id))by.set(id,{id,label:c.label||c.categoryLabel||id,productive:!!c.productive,minutes:0,count:0});const x=by.get(id);x.minutes+=Number(c.minutes)||0;x.count+=Number(c.count)||0}
 }
 const rows=[...by.values()].map(x=>({...x,minutes:round(x.minutes,1),share:pct(x.minutes,observed)})).sort((a,b)=>b.minutes-a.minutes);
 return{runsWithFrv:withFrv,observedMinutes:round(observed,1),productiveMinutes:round(productive,1),lossMinutes:round(observed-productive,1),productivePercent:pct(productive,observed),categories:rows};
}
function materialAggregate(planFactRuns){
 const map=new Map();
 for(const r of planFactRuns){
  for(const m of r.materials||[]){
   const key=m.key||`${m.code||m.name}|${m.dimension}|${m.unit}`;
   if(!map.has(key))map.set(key,{key,code:m.code||'',name:m.name||'',unit:m.unit||'',planned:0,actual:0,validRuns:0,totalRuns:0});
   const x=map.get(key);x.totalRuns++;
   if(m.actualComplete&&m.plannedKnown){x.planned+=Number(m.planned)||0;x.actual+=Number(m.actual)||0;x.validRuns++}
  }
 }
 return [...map.values()].map(x=>({...x,planned:round(x.planned,2),actual:round(x.actual,2),delta:round(x.actual-x.planned,2),deltaPercent:x.validRuns&&x.planned?pct(x.actual-x.planned,x.planned):null})).filter(x=>x.validRuns).sort((a,b)=>Math.abs(b.deltaPercent||0)-Math.abs(a.deltaPercent||0));
}
function recommendations(a){
 const out=[],n=a.executions;
 if(n<2)out.push({code:'LOW_SAMPLE',severity:'info',title:'Недостаточно данных для устойчивой оптимизации',message:`Завершённых выполнений: ${n}. Для выводов по тренду рекомендуется минимум 2–3 выполнения.`});
 if(n>=2&&a.avgTimeDeltaPercent!=null&&a.avgTimeDeltaPercent>20)out.push({code:'TIME_OVER',severity:'warn',title:'Маршрут стабильно дольше плана',message:`Среднее превышение планового времени: +${a.avgTimeDeltaPercent}%. Проверьте норматив времени, состав и последовательность маршрута.`});
 const cats=Object.fromEntries((a.frv.categories||[]).map(x=>[x.id,x]));
 if(a.frv.runsWithFrv>=2){
  if((cats.movement?.share||0)>15)out.push({code:'MOVEMENT',severity:'warn',title:'Высокая доля перемещений',message:`Перемещение занимает ${cats.movement.share}% наблюдаемого времени. Рассмотрите изменение порядка физических точек.`});
  if((cats.search?.share||0)>5)out.push({code:'SEARCH',severity:'warn',title:'Потери на поиск инструмента или материала',message:`Поиск занимает ${cats.search.share}% времени. Проверьте подготовку комплекта до выхода на маршрут.`});
  if((cats.access?.share||0)>5)out.push({code:'ACCESS',severity:'warn',title:'Потери на получение доступа',message:`Получение доступа занимает ${cats.access.share}% времени. Проверьте организацию допуска и готовность оборудования.`});
  if((cats.waiting?.share||0)>10)out.push({code:'WAITING',severity:'warn',title:'Высокая доля ожидания',message:`Ожидание занимает ${cats.waiting.share}% времени. Требуется разбор причин ожиданий.`});
 }
 for(const p of a.problemPoints.filter(x=>x.events>=2&&(x.skipRate>=25||x.remarks>=2)).slice(0,5)){
  out.push({code:'POINT_ISSUE',severity:'warn',pointId:p.pointId,title:`Проблемная точка ${p.pointId||p.pointName}`,message:`Отклонения встречаются в ${p.issueRate}% наблюдений по мероприятиям этой точки. Проверьте доступность, инструкцию и условия выполнения.`});
 }
 for(const m of a.materials.filter(x=>x.validRuns>=2&&Math.abs(x.deltaPercent||0)>15).slice(0,3)){
  out.push({code:'MATERIAL_DELTA',severity:'info',title:`Отклонение расхода: ${m.code||m.name}`,message:`Фактический расход отличается от плана на ${m.deltaPercent>0?'+':''}${m.deltaPercent}%. Проверьте норму и качество фактического ввода.`});
 }
 if(!out.length)out.push({code:'NO_SIGNIFICANT',severity:'good',title:'Выраженных проблем по текущим данным не найдено',message:'Продолжайте накопление фактических выполнений и ФРВ для более надёжных выводов.'});
 return out;
}
function analyzeRoute(route,d=db()){
 const PF=global.LubricaRoutePlanFact,runs=completedRuns(route.id,d),pf=PF?.routeAnalysis?.(route.id,route,d)||{runs:[],summary:null};
 const timeRuns=pf.runs.filter(x=>x.actualMinutes!=null),avgPlan=pf.summary?.avgPlannedMinutes??null,avgActual=pf.summary?.avgActualMinutes??null;
 const a={routeId:route.id,routeCode:route.code||route.id,name:route.name||route.id,line:route.line||'',area:route.area||'',interval:route.interval||'',executions:runs.length,
  avgPlannedMinutes:avgPlan,avgActualMinutes:avgActual,avgTimeDeltaPercent:pf.summary?.avgTimeDeltaPercent??null,
  frv:frvAggregate(runs),problemPoints:pointTaskStats(runs),materials:materialAggregate(pf.runs),
  completedTasks:pf.summary?.completedTasks||0,skippedTasks:pf.summary?.skippedTasks||0,notApplicableTasks:pf.summary?.notApplicableTasks||0};
 a.dataQuality={enoughExecutions:a.executions>=2,enoughFrv:a.frv.runsWithFrv>=2,materialFactRuns:a.materials.reduce((m,x)=>Math.max(m,x.validRuns||0),0)};
 a.recommendations=recommendations(a);return a;
}
function analyzeAll(routes,d=db()){
 const rows=(routes||[]).filter(r=>r.status!=='archived').map(r=>analyzeRoute(r,d));
 return rows.sort((a,b)=>(b.avgTimeDeltaPercent||-999)-(a.avgTimeDeltaPercent||-999)||b.executions-a.executions);
}
global.LubricaRouteAnalytics=Object.freeze({analyzeRoute,analyzeAll});
})(window);