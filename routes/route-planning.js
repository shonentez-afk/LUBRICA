"use strict";
/* Stage 9.3 — PPR/calendar planning built only from persistent routes and their existing taskIds. */
(function(global){
 const clean=v=>String(v??'').trim();
 const clone=x=>JSON.parse(JSON.stringify(x));
 const isoDate=v=>{if(!v)return'';const s=String(v).slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return'';const d=new Date(s+'T00:00:00Z');return Number.isNaN(d.getTime())||d.toISOString().slice(0,10)!==s?'':s};
 const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
 function db(){return global.LubricaCore?.State?.getDatabase?.()||null}
 function parseInterval(text){
  const raw=clean(text).toLowerCase().replace(/ё/g,'е').replace(/,/g,'.');if(!raw||/без период|по состояни|по событ|по требован/.test(raw))return null;
  if(/ежеднев|кажд(ый|ые)?\s*день/.test(raw))return{kind:'days',value:1,label:clean(text)};
  if(/еженедел|кажд(ую|ые)?\s*недел/.test(raw))return{kind:'weeks',value:1,label:clean(text)};
  if(/ежемесяч|кажд(ый|ые)?\s*месяц/.test(raw))return{kind:'months',value:1,label:clean(text)};
  if(/ежегод|ежегодн|кажд(ый|ые)?\s*год/.test(raw))return{kind:'years',value:1,label:clean(text)};
  const m=raw.match(/(\d+(?:\.\d+)?)\s*(дн(?:я|ей)?|день|дней|сут(?:ки|ок)?|недел(?:я|и|ь)?|нед\.?|месяц(?:а|ев)?|мес\.?|год(?:а|ов)?|лет)/i);if(!m)return null;
  const n=Number(m[1]);if(!(n>0))return null;const u=m[2];
  if(/дн|день|сут/.test(u))return{kind:'days',value:n,label:clean(text)};
  if(/нед/.test(u))return{kind:'weeks',value:n,label:clean(text)};
  if(/мес/.test(u))return{kind:'months',value:n,label:clean(text)};
  if(/год|лет/.test(u))return{kind:'years',value:n,label:clean(text)};
  return null
 }
 function addInterval(date,spec){
  const iso=isoDate(date);if(!iso||!spec)return'';
  const [y,m,day]=iso.split('-').map(Number),d=new Date(Date.UTC(y,m-1,day));
  if(spec.kind==='days')d.setUTCDate(d.getUTCDate()+spec.value);
  else if(spec.kind==='weeks')d.setUTCDate(d.getUTCDate()+spec.value*7);
  else if(spec.kind==='months'||spec.kind==='years'){
   const months=spec.kind==='years'?spec.value*12:spec.value;
   if(!Number.isInteger(months))return'';
   const lastOfSource=new Date(Date.UTC(y,m,0)).getUTCDate()===day;
   const first=new Date(Date.UTC(y,m-1+months,1));
   const targetLast=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+1,0)).getUTCDate();
   first.setUTCDate(lastOfSource?targetLast:Math.min(day,targetLast));
   return first.toISOString().slice(0,10);
  }else return'';
  return d.toISOString().slice(0,10)
 }
 function parseRuntimeInterval(text){const raw=clean(text).toLowerCase().replace(/,/g,'.');const m=raw.match(/(\d+(?:\.\d+)?)\s*(?:ч|час(?:а|ов)?|моточас(?:а|ов)?)/i);if(!m)return null;const n=Number(m[1]);return n>0?{kind:'runtime_hours',value:n,label:clean(text)}:null}
 function runtimeStepDays(route,spec){const hpd=Number(route?.runtimePlanningHoursPerDay)||0;return hpd>0?Math.max(1,Math.ceil(spec.value/hpd)):0}
 function runtimeAnchorForRoute(route,spec,d){const last=lastCompletedDate(route.id,d),step=runtimeStepDays(route,spec);if(last&&step)return{date:addInterval(last,{kind:'days',value:step}),source:'last_completed_runtime_forecast',lastCompleted:last};const anchor=isoDate(route.planningAnchorDate);if(anchor)return{date:anchor,source:'route_runtime_anchor',lastCompleted:last||''};return{date:'',source:'missing',lastCompleted:last||''}}
 function completedRuns(routeId,d=db()){return(d?.checklistRuns||[]).filter(r=>String(r.routeId)===String(routeId)&&r.status==='completed').sort((a,b)=>String(b.completedAt||b.date||'').localeCompare(String(a.completedAt||a.date||'')))}
 function lastCompletedDate(routeId,d=db()){const r=completedRuns(routeId,d)[0];return isoDate(r?.date||r?.completedAt||'')}
 function currentRevision(routeId,d=db()){return global.LubricaRouteEngine?.routeRevisions?.(routeId,d)?.[0]||null}
 function planStore(d){d.routePlanItems=Array.isArray(d.routePlanItems)?d.routePlanItems:[];return d.routePlanItems}
 function nextPlanId(d){let n=planStore(d).length+1,id='';do{id=`PPR-${String(n++).padStart(6,'0')}`}while(planStore(d).some(x=>x.id===id));return id}
 function anchorForRoute(route,d){const last=lastCompletedDate(route.id,d);if(last)return{date:addInterval(last,parseInterval(route.interval)),source:'last_completed',lastCompleted:last};const anchor=isoDate(route.planningAnchorDate);if(anchor)return{date:anchor,source:'route_anchor',lastCompleted:''};return{date:'',source:'missing',lastCompleted:''}}
 function preview({startDate,endDate,includeDraft=false,routeIds=null}={},d=db()){
  if(!d)return{items:[],warnings:[{code:'DATABASE_MISSING',message:'База данных недоступна'}],summary:{routes:0,items:0,minutes:0}};
  const start=isoDate(startDate)||today(),end=isoDate(endDate)||start;if(end<start)return{items:[],warnings:[{code:'INVALID_RANGE',message:'Дата окончания раньше даты начала'}],summary:{routes:0,items:0,minutes:0}};
  const routes=(global.LubricaRouteEngine?.routeEntries?.(d,{includeArchived:false,preview:false})||[]).filter(r=>(r.status==='active'||(includeDraft&&r.status==='draft'))&&(!Array.isArray(routeIds)||routeIds.includes(r.id)));const rejected=new Set();
  const items=[],warnings=[];
  const pushItem=(route,due,revision,taskIds,extra={})=>items.push({planKey:`${route.id}|${due}`,routeId:route.id,routeCode:route.code||route.id,routeName:route.name||route.id,lineId:route.lineId||'',areaId:route.areaId||'',line:route.line,area:route.area,interval:route.interval,plannedDate:due,plannedMinutes:Number(route.estimatedMinutes)||0,routeRevision:Number(revision?.revision)||Number(route.revision)||1,routeRevisionId:revision?.id||'',taskIds:clone(taskIds),anchorSource:extra.anchorSource||'',lastCompletedDate:extra.lastCompletedDate||'',planningBasis:extra.planningBasis||'calendar',runtimeIntervalHours:extra.runtimeIntervalHours||null,runtimePlanningHoursPerDay:extra.runtimePlanningHoursPerDay||null,runtimeForecast:extra.runtimeForecast===true});
  for(const route of routes){
   const check=global.LubricaRouteEngine?.validateRoute?.(route.id,d);
   if(check&&!check.valid){rejected.add(route.id);warnings.push({code:'ROUTE_NOT_READY',routeId:route.id,message:`${route.code||route.id}: маршрут не готов (${check.errors.length} ошибок)`});continue}
   if(global.LubricaRouteDue?.typed(route)){
    if(route.status!=='active')continue;
    const D=global.LubricaRouteDue,report=D.preview(route,d,start,end),revision=currentRevision(route.id,d);
    warnings.push(...report.warnings);
    for(const g of report.groups){const selected=D.selectRoute(route,g,d);if(!selected){warnings.push({code:'TASK_DUE_MISSING',routeId:route.id,message:'Не удалось получить физические точки планового задания'});continue}pushItem(selected,g.date,revision,g.taskIds,{planningBasis:'task_due',runtimeForecast:g.entries.some(x=>x.forecast)});const item=items[items.length-1];item.dueEntries=clone(g.entries);if(g.access)item.access=g.access;const earliest=g.entries.map(x=>x.earliestDate||g.date).sort().at(-1);if(earliest<g.date)item.earliestDate=earliest;item.serviceKey=route.serviceKey;item.planKey=route.id+'|'+g.date+'|task_due|'+JSON.stringify(g.entries.map(x=>[x.taskId,x.dueDate,x.nextHours]));}
    continue;
   }
   if(route.intervalMode==='mixed'){warnings.push({code:'MIXED_INTERVAL',routeId:route.id,message:`${route.code||route.id}: смешанная периодичность — календарная дата должна задаваться вручную`});continue}
   const runtimeSpec=parseRuntimeInterval(route.interval);
   if(runtimeSpec){
    const anchor=runtimeAnchorForRoute(route,runtimeSpec,d);if(!anchor.date){warnings.push({code:'RUNTIME_ANCHOR_MISSING',routeId:route.id,message:`${route.code||route.id}: для интервала «${route.interval}» укажите дату первого планового выполнения`});continue}
    const revision=currentRevision(route.id,d),taskIds=[...(revision?.snapshot?.taskIds||route.taskIds||[])].map(String),step=runtimeStepDays(route,runtimeSpec),hpd=Number(route.runtimePlanningHoursPerDay)||0;
    if(!step){
      if(anchor.date>=start&&anchor.date<=end)pushItem(route,anchor.date,revision,taskIds,{anchorSource:anchor.source,lastCompletedDate:anchor.lastCompleted,planningBasis:'runtime_explicit_anchor',runtimeIntervalHours:runtimeSpec.value,runtimePlanningHoursPerDay:null,runtimeForecast:false});
      warnings.push({code:'RUNTIME_FORECAST_MISSING',routeId:route.id,message:`${route.code||route.id}: первая дата задана явно; для прогноза повторений ${route.interval} укажите плановую наработку, ч/сутки`});
      continue;
    }
    let due=anchor.date,guard=0;while(due<start&&guard++<1000)due=addInterval(due,{kind:'days',value:step});
    guard=0;while(due&&due<=end&&guard++<1000){pushItem(route,due,revision,taskIds,{anchorSource:anchor.source,lastCompletedDate:anchor.lastCompleted,planningBasis:'runtime_forecast',runtimeIntervalHours:runtimeSpec.value,runtimePlanningHoursPerDay:hpd,runtimeForecast:true});due=addInterval(due,{kind:'days',value:step})}
    continue;
   }
   const spec=parseInterval(route.interval);if(!spec){warnings.push({code:'INTERVAL_UNSUPPORTED',routeId:route.id,message:`${route.code||route.id}: не удалось распознать периодичность «${route.interval||'—'}»`});continue}
   const anchor=anchorForRoute(route,d);if(!anchor.date){warnings.push({code:'ANCHOR_MISSING',routeId:route.id,message:`${route.code||route.id}: укажите дату первого планового выполнения в параметрах маршрута`});continue}
   // Generate every recurrence from its original anchor to avoid month-end drift
   // (30 Jan -> 28 Feb -> 30 Mar, rather than incorrectly moving to 31 Mar).
   let cycle=0,guard=0;
   const dueAt=n=>n===0?anchor.date:addInterval(anchor.date,{...spec,value:spec.value*n});
   let due=dueAt(cycle);while(due&&due<start&&guard++<1000)due=dueAt(++cycle);
   const revision=currentRevision(route.id,d),taskIds=[...(revision?.snapshot?.taskIds||route.taskIds||[])].map(String);
   guard=0;while(due&&due<=end&&guard++<1000){pushItem(route,due,revision,taskIds,{anchorSource:anchor.source,lastCompletedDate:anchor.lastCompleted,planningBasis:'calendar'});due=dueAt(++cycle)}
  }
  items.sort((a,b)=>a.plannedDate.localeCompare(b.plannedDate)||a.routeName.localeCompare(b.routeName,'ru'));
  return{items,warnings,summary:{skippedRoutes:rejected.size,skippedRouteIds:[...rejected],routes:new Set(items.map(x=>x.routeId)).size,items:items.length,minutes:items.reduce((s,x)=>s+(Number(x.plannedMinutes)||0),0),warningCount:warnings.length,startDate:start,endDate:end}}
 }
 function commit(options={},d=db(),{persist=true}={}){
  if(!d)return{ok:false,reason:'База данных недоступна'};const result=preview({...options,includeDraft:false},d);if(result.warnings.some(x=>['INVALID_RANGE','ROUTE_NOT_READY','MIXED_INTERVAL','ANCHOR_MISSING','INTERVAL_UNSUPPORTED','RUNTIME_ANCHOR_MISSING','TASK_DUE_MISSING','TASK_METER_MISSING'].includes(x.code)))return{ok:false,reason:'Сначала исправьте настройки и ошибки маршрутов',preview:result};const hasTyped=result.items.some(x=>x.planningBasis==='task_due');const work=hasTyped||!persist?clone(d):d,store=planStore(work),existing=new Set(store.filter(x=>x.planningBasis==='task_due'?['planned','in_progress'].includes(x.status):x.status!=='cancelled').map(x=>x.planKey||`${x.routeId}|${x.plannedDate}`));let created=0;const routes=hasTyped?new Map((global.LubricaRouteEngine?.routeEntries?.(work,{preview:false})||[]).map(r=>[r.id,r])):null;
  for(const item of result.items){if(existing.has(item.planKey))continue;
   const revResult=global.LubricaRouteEngine?.ensureRouteRevision?.(item.routeId,work,{note:'Автофиксация перед планированием смазочных работ',reason:'planning'}),rev=revResult?.revision||currentRevision(item.routeId,work);
   const frozen={...item,routeRevision:Number(rev?.revision)||item.routeRevision||1,routeRevisionId:rev?.id||item.routeRevisionId||'',taskIds:clone(item.planningBasis==='task_due'?item.taskIds:(rev?.snapshot?.taskIds||item.taskIds||[]))};
   if(item.planningBasis==='task_due'){
    const snapshot=global.LubricaRouteDue?.snapshot(routes.get(item.routeId),frozen,work);
    if(!snapshot)return{ok:false,reason:'Не удалось зафиксировать состав индивидуального задания',preview:result};
    frozen.checklistSnapshot=clone(snapshot);
   }
   store.push({...frozen,id:nextPlanId(work),status:'planned',runId:'',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});existing.add(item.planKey);created++
  }
  if(persist&&(created||!hasTyped)){global.LubricaCore?.State?.setDatabase?.(work);global.LubricaApp?.showToast?.(`План смазочных работ обновлён · добавлено ${created}`)}return{ok:true,created,preview:result,database:work}
 }
 function syncFromRuns(d=db()){
  if(!d)return[];const runs=new Map((d.checklistRuns||[]).map(r=>[String(r.id),r]));for(const item of planStore(d)){if(!item.runId)continue;const run=runs.get(String(item.runId));if(!run)continue;item.status=run.status==='completed'?'completed':run.status==='cancelled'?'cancelled':run.status==='in_progress'?'in_progress':item.status;item.updatedAt=new Date().toISOString();if(run.completedAt)item.completedAt=run.completedAt;if(run.cancelledAt)item.cancelledAt=run.cancelledAt}return planStore(d)
 }
 function items({startDate='',endDate='',status='all'}={},d=db()){
  if(!d)return[];syncFromRuns(d);
  const start=isoDate(startDate),end=isoDate(endDate),td=today(),W=global.LubricaRouteWorkload;
  return planStore(d).map(x=>{
   const workDate=W?.effectiveDate(x)||x.plannedDate,technicalDueDate=W?.technicalDate(x)||x.plannedDate;
   return {...x,workDate,technicalDueDate,displayStatus:x.status==='planned'&&technicalDueDate<td?'overdue':x.status,revisionOutdated:(global.LubricaRouteEngine?.routeRevisions?.(x.routeId,d)?.[0]?.id||'')!==clean(x.routeRevisionId)};
  }).filter(x=>(!start||x.workDate>=start)&&(!end||x.workDate<=end||x.status==='planned'&&!x.workAssignment&&x.planningBasis==='task_due'&&W?.earliestDate?.(x,d)<=end)&&(status==='all'||status==='overdue'?(status!=='overdue'||x.displayStatus==='overdue'):x.status===status)).sort((a,b)=>a.workDate.localeCompare(b.workDate)||a.routeName.localeCompare(b.routeName,'ru'))
 }
 function remove(planId,d=db()){if(!d)return{ok:false,reason:'База данных недоступна'};const x=planStore(d).find(i=>i.id===planId);if(!x)return{ok:false,reason:'Плановое задание не найдено'};if(x.status!=='planned'||x.runId||(d.checklistRuns||[]).some(r=>String(r.plannedItemId)===String(planId)))return{ok:false,reason:'Удалять можно только незапущенное плановое задание'};d.routePlanItems=d.routePlanItems.filter(i=>i.id!==planId);global.LubricaCore?.State?.setDatabase?.(d);return{ok:true}}
 function linkRun(planId,runId,d=db()){const x=planStore(d).find(i=>i.id===planId);if(!x)return null;x.runId=runId;x.status='in_progress';x.startedAt=new Date().toISOString();x.updatedAt=x.startedAt;global.LubricaCore?.State?.setDatabase?.(d);return x}
 function syncFromRun(run,d=db(),{persist=true}={}){if(!d||!run?.plannedItemId)return null;const x=planStore(d).find(i=>i.id===run.plannedItemId);if(!x)return null;x.runId=run.id;x.status=run.status==='completed'?'completed':run.status==='cancelled'?'cancelled':'in_progress';x.updatedAt=new Date().toISOString();if(run.completedAt)x.completedAt=run.completedAt;if(run.cancelledAt)x.cancelledAt=run.cancelledAt;if(persist)global.LubricaCore?.State?.setDatabase?.(d);return x}
 function summary(options={},d=db()){const rows=items(options,d);return{total:rows.length,planned:rows.filter(x=>x.displayStatus==='planned').length,overdue:rows.filter(x=>x.displayStatus==='overdue').length,inProgress:rows.filter(x=>x.displayStatus==='in_progress').length,completed:rows.filter(x=>x.displayStatus==='completed').length,minutes:rows.reduce((s,x)=>s+(Number(x.plannedMinutes)||0),0)}}
 global.LubricaRoutePlanning=Object.freeze({parseInterval,parseRuntimeInterval,addInterval,runtimeStepDays,lastCompletedDate,preview,commit,items,summary,remove,linkRun,syncFromRun,syncFromRuns});
 global.LubricaSystem?.registerModule?.('План смазочных работ','ok','Календарное планирование смазочных работ');
})(window);
