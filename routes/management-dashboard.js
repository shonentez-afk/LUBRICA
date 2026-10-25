(function(global){
'use strict';
function db(){return global.LubricaCore?.State?.getDatabase?.()||null}
function round(v,d=1){const p=10**d;return Math.round((Number(v)||0)*p)/p}
function pct(a,b){return b?round(a/b*100,1):0}
function inRange(date,start,end){return date&&(!start||date>=start)&&(!end||date<=end)}
function routes(d=db()){return global.LubricaRouteEngine?.routeEntries?.(d,{preview:false,includeArchived:true})||[]}
function build({startDate='',endDate=''}={},d=db()){
 if(!d)return null;
 const rs=routes(d),current=rs.filter(r=>r.status!=='archived'),archived=rs.filter(r=>r.status==='archived');
 const plan=global.LubricaRoutePlanning?.items?.({startDate,endDate,status:'all'},d)||[];
 const runs=(d.checklistRuns||[]).filter(r=>r.status==='completed'&&inRange(r.date||String(r.completedAt||'').slice(0,10),startDate,endDate));
 const analytics=global.LubricaRouteAnalytics?.analyzeAll?.(current,d)||[];
 const planned=plan.filter(x=>!['cancelled'].includes(x.status)),completedPlan=plan.filter(x=>x.status==='completed'),overdue=plan.filter(x=>x.displayStatus==='overdue'),inProgress=plan.filter(x=>x.status==='in_progress');
 const planCompletion=pct(completedPlan.length,planned.length);
 const timeRows=analytics.filter(x=>x.executions&&x.avgActualMinutes!=null),avgTimeDelta=timeRows.length?round(timeRows.reduce((s,x)=>s+(Number(x.avgTimeDeltaPercent)||0),0)/timeRows.length,1):null;
 const frvObserved=analytics.reduce((s,x)=>s+(Number(x.frv?.observedMinutes)||0),0),frvProductive=analytics.reduce((s,x)=>s+(Number(x.frv?.productiveMinutes)||0),0);
 const problemRoutes=analytics.filter(x=>x.recommendations?.some(r=>r.severity==='warn'));
 const routeById=Object.fromEntries(rs.map(r=>[r.id,r]));
 const groups=new Map();
 for(const r of current){
  const key=`${r.line||'—'}|${r.area||'—'}`;if(!groups.has(key))groups.set(key,{line:r.line||'—',area:r.area||'—',routes:0,executions:0,planned:0,completed:0,overdue:0,warnings:0});
  groups.get(key).routes++;
 }
 for(const x of plan){const r=routeById[x.routeId],key=`${r?.line||x.routeLine||'—'}|${r?.area||x.routeArea||'—'}`;if(!groups.has(key))groups.set(key,{line:r?.line||'—',area:r?.area||'—',routes:0,executions:0,planned:0,completed:0,overdue:0,warnings:0});const g=groups.get(key);if(x.status!=='cancelled')g.planned++;if(x.status==='completed')g.completed++;if(x.displayStatus==='overdue')g.overdue++}
 for(const run of runs){const r=routeById[run.routeId],key=`${r?.line||'—'}|${r?.area||'—'}`;if(groups.has(key))groups.get(key).executions++}
 for(const a of problemRoutes){const key=`${a.line||'—'}|${a.area||'—'}`;if(groups.has(key))groups.get(key).warnings++}
 const areas=[...groups.values()].map(g=>({...g,completionPercent:pct(g.completed,g.planned)})).sort((a,b)=>b.overdue-a.overdue||a.line.localeCompare(b.line,'ru')||a.area.localeCompare(b.area,'ru'));
 const alerts=[];
 if(overdue.length)alerts.push({severity:'bad',title:`Просрочено работ: ${overdue.length}`,message:'Есть плановые работы с датой выполнения раньше текущей даты.'});
 if(problemRoutes.length)alerts.push({severity:'warn',title:`Маршрутов с аналитическими предупреждениями: ${problemRoutes.length}`,message:'Требуется разбор рекомендаций аналитики маршрутов.'});
 if(analytics.some(x=>x.executions<2))alerts.push({severity:'info',title:'По части маршрутов недостаточно истории',message:'Для устойчивых выводов аналитики требуется минимум 2–3 завершённых выполнения.'});
 if(!alerts.length)alerts.push({severity:'good',title:'Критических сигналов по текущим данным нет',message:'Продолжайте выполнение плана и накопление факта.'});
 return{period:{startDate,endDate},routes:{current:current.length,archived:archived.length,total:rs.length},plan:{total:planned.length,completed:completedPlan.length,overdue:overdue.length,inProgress:inProgress.length,completionPercent:planCompletion},executions:runs.length,avgTimeDeltaPercent:avgTimeDelta,frv:{observedMinutes:round(frvObserved,1),productivePercent:pct(frvProductive,frvObserved)},problemRoutes:problemRoutes.length,areas,alerts,analytics};
}
global.LubricaManagementDashboard=Object.freeze({build});
})(window);