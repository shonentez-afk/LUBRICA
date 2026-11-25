"use strict";
/* R3B: task-level next due, explicit initial basis, actual meter vs forecast.
   No speculative recurring commitments before a successful actual operation. */
(function(global){
 const arr=x=>Array.isArray(x)?x:[],str=x=>String(x??'').trim(),copy=x=>JSON.parse(JSON.stringify(x));
 const num=x=>str(x)===''?null:(Number.isFinite(Number(str(x).replace(',','.')))?Number(str(x).replace(',','.')):null);
 const day=x=>{const s=str(x);if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return'';const d=new Date(s+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===s?s:''};
 const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
 const advance=(date,n)=>{const d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
 const fail=(code,message)=>({ok:false,code,message});
 const typed=r=>r?.groupingMode==='area_service_interval_v1';
 const db=()=>global.LubricaCore?.State?.getDatabase?.();
 const engine=()=>global.LubricaRouteEngine;
 function context(t,d,index){return index?.get(String(t.id))||engine()?.taskContext(d,t)}
 function signature(t,d,index){const c=context(t,d,index),g=global.LubricaRouteAutoGrouping?.describe(c);return g?.ok?JSON.stringify([String(t.lubricationPointId),g.serviceKey,g.scheduleKey]):''}
 function spec(t){return global.LubricaRouteAutoGrouping?.scheduleFor(t)}
 function parseBasis(t,d,index){
  const s=spec(t),key=signature(t,d,index),b=t.routeDue||{};
  if(!s?.ok||!key||b.key!==key)return fail('TASK_DUE_MISSING','Укажите основание следующего срока для актуального мероприятия');
  if(s.kind==='runtime_hours'){
   const due=num(b.nextHours),reading=num(b.readingHours),rate=num(b.hoursPerDay),date=day(b.readingDate);
   if(due==null||due<0||reading==null||reading<0||!date||date>today()||(rate!=null&&(rate<0||rate>24)))return fail('TASK_METER_MISSING','Укажите действительные показания, дату и следующий порог моточасов');
   return{ok:true,key,kind:s.kind,interval:s.value,nextHours:due,readingHours:reading,readingDate:date,hoursPerDay:rate||0};
  }
  const date=day(b.nextDate);
  return date?{ok:true,key,kind:s.kind,interval:s.value,nextDate:date}:fail('TASK_DUE_MISSING','Укажите дату следующего обслуживания');
 }
 function rows(route,d=db()){
  const ix=engine()?.contextIndex(d)||new Map();
  return arr(route?.taskIds).map(id=>{const c=ix.get(String(id)),t=c?.task;
   return{id:String(id),pointId:c?.lp?.legacyId||c?.lp?.id||'',pointName:c?.lp?.name||'',equipment:c?.eq?.name||'',equipmentCode:c?.eq?.externalCode||'',operation:t?.operation||'',spec:t?spec(t):null,basis:t?parseBasis(t,d,ix):fail('TASK_MISSING','Мероприятие не найдено'),raw:t?.routeDue||{},locked:reserved(d,id),running:runningTask(d,id)};
  });
 }
 function reserved(d,id){return arr(d?.routePlanItems).some(x=>['planned','in_progress'].includes(x.status)&&arr(x.taskIds).map(String).includes(String(id)))||runningTask(d,id)}
 function runningTask(d,id){return arr(d?.checklistRuns).some(x=>x.status==='in_progress'&&arr(x.routeTaskIds).map(String).includes(String(id)))}
 function validateRouteBasis(route,d){return rows(route,d).filter(x=>!x.basis.ok).map(x=>({code:x.basis.code,taskId:x.id,message:x.id+': '+x.basis.message}))}
 // A single explicit transaction. Existing pending jobs freeze the due basis;
 // meter readings may be refreshed until actual execution starts.
 function configure(routeId,changes,d=db()){
  if(!d)return fail('DATABASE_MISSING','База недоступна');
  const r=arr(d.routes).find(x=>String(x.id)===String(routeId));
  if(!typed(r)||r.status==='archived')return fail('ROUTE_NOT_AVAILABLE','Выберите текущий автомаршрут');
  if(!Array.isArray(changes)||!changes.length)return fail('EMPTY_CHANGES','Нет изменений');
  const work=copy(d),ix=engine().contextIndex(work),allowed=new Set(arr(r.taskIds).map(String)),seen=new Set();
  for(const row of changes){
   const id=str(row.id),t=ix.get(id)?.task;
   if(!allowed.has(id)||!t||seen.has(id))return fail('TASK_NOT_IN_ROUTE','Некорректное мероприятие: '+id);
   seen.add(id);
   const key=signature(t,work,ix),s=spec(t),old=parseBasis(t,work,ix);
   if(!key||!s?.ok||row.key!==key)return fail('STALE_BASIS','Изменилось мероприятие '+id+'; откройте настройки повторно');
   if(runningTask(work,id))return fail('RUNNING','Мероприятие '+id+' уже выполняется');
   let b={key};
   if(s.kind==='runtime_hours'){
    b={...b,nextHours:num(row.nextHours),readingHours:num(row.readingHours),readingDate:day(row.readingDate),hoursPerDay:num(row.hoursPerDay)||0};
    if(old.ok&&(b.readingHours<old.readingHours||b.readingDate<old.readingDate))return fail('METER_ROLLBACK',id+': сброс/замена счётчика требуют отдельного согласования');
    if(reserved(work,id)&&(!old.ok||b.nextHours!==old.nextHours))return fail('BASIS_RESERVED',id+': сначала снимите незапущенное задание, порог уже зафиксирован');
   }else{
    b.nextDate=day(row.nextDate);
    if(reserved(work,id)&&(!old.ok||b.nextDate!==old.nextDate))return fail('BASIS_RESERVED',id+': сначала снимите незапущенное задание, срок уже зафиксирован');
   }
   const before=t.routeDue;t.routeDue=b;
   const result=parseBasis(t,work,ix);
   if(!result.ok){t.routeDue=before;return fail(result.code,id+': '+result.message)}
  }
  global.LubricaCore.State.setDatabase(work);
  global.LubricaApp?.refreshFromCore?.();
  return{ok:true,updated:seen.size,database:work};
 }
 function dueFor(t,d,index){
  const b=parseBasis(t,d,index);if(!b.ok)return b;
  if(b.kind!=='runtime_hours')return{...b,dueDate:b.nextDate,basis:'task_calendar'};
  const left=b.nextHours-b.readingHours;
  if(left<=0)return{...b,dueDate:b.readingDate,basis:'meter_confirmed'};
  if(!b.hoursPerDay)return{...b,dueDate:'',basis:'meter_waiting',remainingHours:left};
  return{...b,dueDate:advance(b.readingDate,Math.ceil(left/b.hoursPerDay)),basis:'meter_forecast',remainingHours:left};
 }
 // Exactly one next open obligation per task. Overdue items enter the selected
 // range at its first day, retaining their ORIGINAL due date.
 function preview(route,d,start,end){
  const ix=engine().contextIndex(d),group=new Map(),warnings=[];
  for(const id of arr(route.taskIds).map(String)){
   const t=ix.get(id)?.task;
   if(!t){warnings.push({code:'TASK_DUE_MISSING',taskId:id,routeId:route.id,message:id+': мероприятие отсутствует'});continue}
   const due=dueFor(t,d,ix);
   if(!due.ok){warnings.push({code:due.code,taskId:id,routeId:route.id,message:id+': '+due.message});continue}
   if(reserved(d,id))continue;
   if(!due.dueDate){warnings.push({code:'TASK_METER_WAITING',taskId:id,routeId:route.id,message:id+': ещё '+due.remainingHours+' ч; нет прогноза, ожидаются показания счётчика'});continue}
   if(due.dueDate>end)continue;
   const date=due.dueDate<start?start:due.dueDate;
   if(!group.has(date))group.set(date,[]);
   group.get(date).push({taskId:id,key:due.key,kind:due.kind,basis:due.basis,dueDate:due.dueDate,nextHours:due.nextHours??null,interval:due.interval,forecast:due.basis==='meter_forecast'});
  }
  return{groups:[...group].sort((a,b)=>a[0].localeCompare(b[0])).map(([date,entries])=>({date,entries,taskIds:entries.map(x=>x.taskId)})),warnings};
 }
 function selectRoute(route,item){
  const ids=arr(item?.taskIds).map(String),pts=new Map(arr(route?.points).map(p=>[String(p.taskId||p.id),p]));
  if(!ids.length||new Set(ids).size!==ids.length||ids.some(id=>!pts.has(id)))return null;
  const points=ids.map(id=>pts.get(id));
  return{...route,taskIds:ids,points,estimatedMinutes:(Number(route.fixedMinutes)||0)+ids.length*(Number(route.estimatedMinutesPerTask)||5),physicalPointCount:new Set(points.map(p=>p.lubricationPointId||p.pointDisplayId||p.id)).size,plannedItemId:item.id||''};
 }
 function snapshot(route,item,d){
  const selected=selectRoute(route,item),model=selected&&global.LubricaChecklistEngine?.model?.(selected,d);
  if(!model||model.taskCount!==item.taskIds.length)return null;
  return model;
 }
 function planItem(routeId,id,d=db()){return arr(d?.routePlanItems).find(x=>String(x.id)===String(id)&&String(x.routeId)===String(routeId)&&x.planningBasis==='task_due')||null}
 function checkStart(route,item,d,date,{checkDate=true}={}){
  if(!typed(route)||route.status!=='active'||!item||item.status!=='planned'||item.runId)return fail('PLAN_REQUIRED','Откройте незапущенное задание из плана смазочных работ');
  if(String(item.routeId)!==String(route.id))return fail('PLAN_ROUTE_MISMATCH','Задание относится к другому маршруту');
  const E=engine(),validation=E.validateRoute(route.id,d);
  if(!validation.valid)return fail('ROUTE_NOT_READY','Маршрут изменился или не готов');
  const selected=selectRoute(route,item),model=snapshot(route,item,d);
  if(!selected||!model||!item.checklistSnapshot||JSON.stringify(model)!==JSON.stringify(item.checklistSnapshot))return fail('PLAN_CHANGED','Состав, нормы или параметры задания изменились. Снимите незапущенное задание и сформируйте повторно');
  if(checkDate&&(!day(date)||date>today()||date<item.plannedDate))return fail('PLAN_DATE','Дата выполнения должна быть фактической и не раньше плановой');
  const ix=E.contextIndex(d),entries=arr(item.dueEntries),byId=new Map(entries.map(e=>[String(e.taskId),e]));
  if(entries.length!==selected.taskIds.length||byId.size!==entries.length)return fail('PLAN_INVALID','Не подтверждены основания сроков задания');
  const startEntries=[];
  for(const id of selected.taskIds){
   const e=byId.get(id),t=ix.get(id)?.task,b=t&&parseBasis(t,d,ix);
   if(!e||!b?.ok||e.key!==b.key)return fail('TASK_BASIS_CHANGED',id+': основание срока изменилось');
   if(b.kind==='runtime_hours'){
    if(e.nextHours!==b.nextHours)return fail('TASK_BASIS_CHANGED',id+': изменился порог наработки');
    if(checkDate&&(b.readingDate!==date||b.readingHours<b.nextHours))return fail('METER_NOT_DUE',id+': подтвердите показание счётчика на дату выполнения (не менее '+b.nextHours+' ч)');
    startEntries.push({...e,readingHours:b.readingHours,readingDate:b.readingDate});
   }else{
    if(e.dueDate!==b.nextDate)return fail('TASK_BASIS_CHANGED',id+': изменился следующий срок');
    if(checkDate&&date<b.nextDate)return fail('TASK_NOT_DUE',id+': срок ещё не наступил');
    startEntries.push({...e});
   }
  }
  return{ok:true,route:selected,snapshot:model,dueEntries:startEntries};
 }
 function completionErrors(run,d=db()){
  if(!run?.dueEntries?.length)return[];
  const ix=engine().contextIndex(d),missing=[];
  for(const e of run.dueEntries){
   const id=String(e.taskId),r=run.taskResults?.[id];
   if(!r?.done||r.resultStatus!=='completed')continue;
   const t=ix.get(id)?.task,b=t&&parseBasis(t,d,ix);
   if(!b?.ok||b.key!==e.key){missing.push(id+': основание изменилось во время выполнения');continue}
   if(e.kind==='runtime_hours'){
    const h=num(r.runtimeMeterHours);
    if(h==null||h<e.nextHours||h<e.readingHours||h<b.readingHours)missing.push(id+': укажите фактические моточасы на момент обслуживания (не менее '+Math.max(e.nextHours,e.readingHours,b.readingHours)+' ч)');
   }else if(!day(run.date)||run.date<e.dueDate||run.date>today())missing.push(id+': некорректная фактическая дата');
  }
  return missing;
 }
 function advanceCompleted(run,d){
  if(!run?.dueEntries?.length)return;
  const ix=engine().contextIndex(d);
  for(const e of run.dueEntries){
   const id=String(e.taskId),r=run.taskResults?.[id],t=ix.get(id)?.task;
   if(!t||!r?.done||r.resultStatus!=='completed')continue;
   const b=t.routeDue;
   if(e.kind==='runtime_hours'){const h=num(r.runtimeMeterHours);b.nextHours=h+e.interval;b.readingHours=h;b.readingDate=run.date}
   else b.nextDate=global.LubricaRoutePlanning.addInterval(run.date,{kind:e.kind,value:e.interval});
   b.lastRunId=run.id;b.lastServiceDate=run.date;
  }
 }
 global.LubricaRouteDue=Object.freeze({typed,day,today,signature,rows,parseBasis,validateRouteBasis,configure,dueFor,preview,selectRoute,snapshot,planItem,checkStart,completionErrors,advanceCompleted});
})(window);
