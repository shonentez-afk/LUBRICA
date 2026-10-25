"use strict";
/* Stage 9.3 — PPR/calendar planning built only from persistent routes and their existing taskIds. */
(function(global){
 const clean=v=>String(v??'').trim();
 const clone=x=>JSON.parse(JSON.stringify(x));
 const isoDate=v=>{if(!v)return'';const d=new Date(`${String(v).slice(0,10)}T00:00:00`);return Number.isNaN(d.getTime())?'':d.toISOString().slice(0,10)};
 const today=()=>new Date().toISOString().slice(0,10);
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
 function addInterval(date,spec){const d=new Date(`${isoDate(date)}T00:00:00`);if(!spec||Number.isNaN(d.getTime()))return'';if(spec.kind==='days')d.setDate(d.getDate()+spec.value);else if(spec.kind==='weeks')d.setDate(d.getDate()+spec.value*7);else if(spec.kind==='months')d.setMonth(d.getMonth()+spec.value);else if(spec.kind==='years')d.setFullYear(d.getFullYear()+spec.value);return d.toISOString().slice(0,10)}
 function completedRuns(routeId,d=db()){return(d?.checklistRuns||[]).filter(r=>String(r.routeId)===String(routeId)&&r.status==='completed').sort((a,b)=>String(b.completedAt||b.date||'').localeCompare(String(a.completedAt||a.date||'')))}
 function lastCompletedDate(routeId,d=db()){const r=completedRuns(routeId,d)[0];return isoDate(r?.date||r?.completedAt||'')}
 function currentRevision(routeId,d=db()){return global.LubricaRouteEngine?.routeRevisions?.(routeId,d)?.[0]||null}
 function planStore(d){d.routePlanItems=Array.isArray(d.routePlanItems)?d.routePlanItems:[];return d.routePlanItems}
 function nextPlanId(d){let n=planStore(d).length+1,id='';do{id=`PPR-${String(n++).padStart(6,'0')}`}while(planStore(d).some(x=>x.id===id));return id}
 function anchorForRoute(route,d){const last=lastCompletedDate(route.id,d);if(last)return{date:addInterval(last,parseInterval(route.interval)),source:'last_completed',lastCompleted:last};const anchor=isoDate(route.planningAnchorDate);if(anchor)return{date:anchor,source:'route_anchor',lastCompleted:''};return{date:'',source:'missing',lastCompleted:''}}
 function preview({startDate,endDate,includeDraft=false}={},d=db()){
  if(!d)return{items:[],warnings:[{code:'DATABASE_MISSING',message:'База данных недоступна'}],summary:{routes:0,items:0,minutes:0}};
  const start=isoDate(startDate)||today(),end=isoDate(endDate)||start;if(end<start)return{items:[],warnings:[{code:'INVALID_RANGE',message:'Дата окончания раньше даты начала'}],summary:{routes:0,items:0,minutes:0}};
  const routes=(global.LubricaRouteEngine?.routeEntries?.(d,{includeArchived:false,preview:false})||[]).filter(r=>r.status==='active'||(includeDraft&&r.status==='draft'));
  const items=[],warnings=[];
  for(const route of routes){
   if(route.intervalMode==='mixed'){warnings.push({code:'MIXED_INTERVAL',routeId:route.id,message:`${route.code||route.id}: смешанная периодичность — календарная дата должна задаваться вручную`});continue}
   const spec=parseInterval(route.interval);if(!spec){warnings.push({code:'INTERVAL_UNSUPPORTED',routeId:route.id,message:`${route.code||route.id}: не удалось распознать периодичность «${route.interval||'—'}»`});continue}
   const anchor=anchorForRoute(route,d);if(!anchor.date){warnings.push({code:'ANCHOR_MISSING',routeId:route.id,message:`${route.code||route.id}: укажите дату первого планового выполнения в параметрах маршрута`});continue}
   let due=anchor.date,guard=0;while(due<start&&guard++<1000)due=addInterval(due,spec);
   const revision=currentRevision(route.id,d),taskIds=[...(revision?.snapshot?.taskIds||route.taskIds||[])].map(String);
   guard=0;while(due&&due<=end&&guard++<1000){items.push({planKey:`${route.id}|${due}`,routeId:route.id,routeCode:route.code||route.id,routeName:route.name||route.id,line:route.line,area:route.area,interval:route.interval,plannedDate:due,plannedMinutes:Number(route.estimatedMinutes)||0,routeRevision:Number(revision?.revision)||Number(route.revision)||1,routeRevisionId:revision?.id||'',taskIds:clone(taskIds),anchorSource:anchor.source,lastCompletedDate:anchor.lastCompleted});due=addInterval(due,spec)}
  }
  items.sort((a,b)=>a.plannedDate.localeCompare(b.plannedDate)||a.routeName.localeCompare(b.routeName,'ru'));
  return{items,warnings,summary:{routes:new Set(items.map(x=>x.routeId)).size,items:items.length,minutes:items.reduce((s,x)=>s+(Number(x.plannedMinutes)||0),0),warningCount:warnings.length,startDate:start,endDate:end}}
 }
 function commit(options={},d=db()){
  if(!d)return{ok:false,reason:'База данных недоступна'};const result=preview(options,d);if(result.warnings.some(x=>x.code==='INVALID_RANGE'))return{ok:false,reason:'Некорректный период',preview:result};const store=planStore(d),existing=new Set(store.filter(x=>!['cancelled'].includes(x.status)).map(x=>x.planKey||`${x.routeId}|${x.plannedDate}`));let created=0;
  for(const item of result.items){if(existing.has(item.planKey))continue;const revResult=global.LubricaRouteEngine?.ensureRouteRevision?.(item.routeId,d,{note:'Автофиксация перед планированием смазочных работ',reason:'planning'}),rev=revResult?.revision||currentRevision(item.routeId,d);const frozen={...item,routeRevision:Number(rev?.revision)||item.routeRevision||1,routeRevisionId:rev?.id||item.routeRevisionId||'',taskIds:clone(rev?.snapshot?.taskIds||item.taskIds||[])};store.push({...frozen,id:nextPlanId(d),status:'planned',runId:'',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});existing.add(item.planKey);created++}
  global.LubricaCore?.State?.setDatabase?.(d);global.LubricaApp?.showToast?.(`План смазочных работ обновлён · добавлено ${created}`);return{ok:true,created,preview:result}
 }
 function syncFromRuns(d=db()){
  if(!d)return[];const runs=new Map((d.checklistRuns||[]).map(r=>[String(r.id),r]));for(const item of planStore(d)){if(!item.runId)continue;const run=runs.get(String(item.runId));if(!run)continue;item.status=run.status==='completed'?'completed':run.status==='cancelled'?'cancelled':run.status==='in_progress'?'in_progress':item.status;item.updatedAt=new Date().toISOString();if(run.completedAt)item.completedAt=run.completedAt;if(run.cancelledAt)item.cancelledAt=run.cancelledAt}return planStore(d)
 }
 function items({startDate='',endDate='',status='all'}={},d=db()){if(!d)return[];syncFromRuns(d);const start=isoDate(startDate),end=isoDate(endDate),td=today();return planStore(d).filter(x=>(!start||x.plannedDate>=start)&&(!end||x.plannedDate<=end)&&(status==='all'||status==='overdue'?(status!=='overdue'||(x.status==='planned'&&x.plannedDate<td)):x.status===status)).map(x=>({...x,displayStatus:x.status==='planned'&&x.plannedDate<td?'overdue':x.status,revisionOutdated:(global.LubricaRouteEngine?.routeRevisions?.(x.routeId,d)?.[0]?.id||'')!==clean(x.routeRevisionId)})).sort((a,b)=>a.plannedDate.localeCompare(b.plannedDate)||a.routeName.localeCompare(b.routeName,'ru'))}
 function remove(planId,d=db()){if(!d)return{ok:false,reason:'База данных недоступна'};const x=planStore(d).find(i=>i.id===planId);if(!x)return{ok:false,reason:'Плановое задание не найдено'};if(x.status!=='planned')return{ok:false,reason:'Удалять можно только незапущенное плановое задание'};d.routePlanItems=d.routePlanItems.filter(i=>i.id!==planId);global.LubricaCore?.State?.setDatabase?.(d);return{ok:true}}
 function linkRun(planId,runId,d=db()){const x=planStore(d).find(i=>i.id===planId);if(!x)return null;x.runId=runId;x.status='in_progress';x.startedAt=new Date().toISOString();x.updatedAt=x.startedAt;global.LubricaCore?.State?.setDatabase?.(d);return x}
 function syncFromRun(run,d=db()){if(!d||!run?.plannedItemId)return null;const x=planStore(d).find(i=>i.id===run.plannedItemId);if(!x)return null;x.runId=run.id;x.status=run.status==='completed'?'completed':run.status==='cancelled'?'cancelled':'in_progress';x.updatedAt=new Date().toISOString();if(run.completedAt)x.completedAt=run.completedAt;if(run.cancelledAt)x.cancelledAt=run.cancelledAt;global.LubricaCore?.State?.setDatabase?.(d);return x}
 function summary(options={},d=db()){const rows=items(options,d);return{total:rows.length,planned:rows.filter(x=>x.displayStatus==='planned').length,overdue:rows.filter(x=>x.displayStatus==='overdue').length,inProgress:rows.filter(x=>x.displayStatus==='in_progress').length,completed:rows.filter(x=>x.displayStatus==='completed').length,minutes:rows.reduce((s,x)=>s+(Number(x.plannedMinutes)||0),0)}}
 global.LubricaRoutePlanning=Object.freeze({parseInterval,addInterval,lastCompletedDate,preview,commit,items,summary,remove,linkRun,syncFromRun,syncFromRuns});
 global.LubricaSystem?.registerModule?.('План смазочных работ','ok','Календарное планирование смазочных работ');
})(window);
