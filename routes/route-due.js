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
 // R8.1 — planning basis is independent of the approved OEM interval.
 function calendarRule(hours,maxHoursPerDay,ppr=false){
  const h=num(hours),rate=num(maxHoursPerDay);
  if(!(h>0)||!(rate>0&&rate<=24))return fail('RUNTIME_RATE','Подтвердите максимальную наработку от 0 до 24 ч/сут');
  const maxDays=Math.floor(h/rate),days=ppr?Math.floor(maxDays/14)*14:maxDays>=7?Math.floor(maxDays/7)*7:maxDays;
  if(!Number.isSafeInteger(days)||days>36500)return fail('RUNTIME_CYCLE','Некорректно большой календарный интервал');
  if(days<1)return fail('RUNTIME_CYCLE','Технический интервал слишком короткий для '+(ppr?'ППР раз в 14 дней':'суточного календаря')+'; используйте фактический счётчик');
  return {ok:true,days,maxDays,maxHoursPerDay:rate,technicalHours:h,plannedHours:days*rate,weeks:days%7===0?days/7:0};
 }
 function makeCalendarBasis(t,d,index,{date,mode='next',maxHoursPerDay,confirmCalendar=false,ppr=false}={}){
  const s=spec(t),key=signature(t,d,index),first=day(date);
  if(!s?.ok||s.kind!=='runtime_hours'||!key)return fail('RUNTIME_MODE','Нужен подтверждённый интервал по наработке');
  const rule=calendarRule(s.value,maxHoursPerDay,ppr);if(!rule.ok)return rule;
  if(confirmCalendar!==true)return fail('RUNTIME_CONFIRM','Подтвердите максимальную наработку и допустимость досрочной смазки');
  if(!first||!['next','last'].includes(mode)||mode==='last'&&first>today())return fail('INITIAL_DATE','Укажите первый срок или фактическую дату последнего обслуживания');
  let next=mode==='last'?advance(first,rule.days):first;
  if(ppr){const c=context(t,d,index),W=global.LubricaRouteWorkload,phase=W?.nextPpr(c?.lineId,next,d);
   if(!phase)return fail('PPR_ANCHOR_REQUIRED','Сначала настройте ППР линии');
   if(mode==='last'){if(phase>next)next=advance(phase,-14);if(next<=first)return fail('PPR_CYCLE','Нет ППР между последним обслуживанием и допустимым сроком')}
   else if(phase!==next)return fail('PPR_CYCLE','Первый срок должен совпадать с ППР линии');
  }
  return{ok:true,basis:{key,planningMode:'calendar_runtime',calendarConfirmed:true,maxHoursPerDay:rule.maxHoursPerDay,cycleDays:rule.days,nextDate:next,...(mode==='last'?{lastServiceDate:first}:{})}};
 }
 // R8.2: one explicitly confirmed physical source, separate service thresholds.
 function meterKey(equipmentId,meterId='main'){return JSON.stringify([String(equipmentId),String(meterId||'main')])}
 function meterRecord(d,key){return arr(d?.routeMeters).find(x=>x.key===key)}
 function writeMeter(d,key,reading,date,rate,{fact=false}={}){
  const old=meterRecord(d,key);
  if(!key||reading==null||reading<0||!day(date)||date>today()||rate!=null&&(rate<0||rate>24))return fail('METER_INITIAL','Некорректное показание общего счётчика');
  if(old&&(date<old.readingDate||reading<old.readingHours)){
   if(fact&&date<=old.readingDate&&reading<=old.readingHours)return{ok:true};
   return fail('METER_ROLLBACK','Сброс/замена общего счётчика требуют отдельного согласования');
  }
  const next={key,readingHours:reading,readingDate:date,hoursPerDay:rate??old?.hoursPerDay??0};
  if(!fact&&JSON.stringify(old)!==JSON.stringify(next)&&arr(d.tasks).some(t=>t.routeDue?.meterKey===key&&runningTask(d,t.id)))return fail('RUNNING','Счётчик используется в открытом выполнении');
  d.routeMeters=arr(d.routeMeters).filter(x=>x.key!==key).concat(next);
  // Preserve per-task threshold and basis identity. Mirror only for presentation/export.
  for(const t of arr(d.tasks))if(t.routeDue?.meterKey===key&&!runningTask(d,t.id))Object.assign(t.routeDue,{readingHours:next.readingHours,readingDate:next.readingDate,hoursPerDay:next.hoursPerDay});
  return{ok:true};
 }
 function parseBasis(t,d,index){
  const s=spec(t),key=signature(t,d,index),b=t.routeDue||{};
  if(!s?.ok||!key||b.key!==key)return fail('TASK_DUE_MISSING','Укажите основание следующего срока для актуального мероприятия');
  if(s.kind==='runtime_hours'&&b.planningMode==='calendar_runtime'){
   const date=day(b.nextDate),rate=num(b.maxHoursPerDay),days=num(b.cycleDays);
   if(b.calendarConfirmed!==true||!date||!(rate>0&&rate<=24)||!Number.isSafeInteger(days)||days<1||days>36500||days*rate>s.value+1e-9)return fail('TASK_CALENDAR_RUNTIME_INVALID','Уточните календарный цикл и максимальную наработку');
   return {ok:true,key,kind:'days',interval:days,nextDate:date,planningMode:'calendar_runtime',technicalHours:s.value,maxHoursPerDay:rate};
  }
  if(s.kind==='runtime_hours'){
   const meter=b.meterKey?meterRecord(d,b.meterKey):null;if(b.meterKey&&(!meter||!String(b.meterKey).startsWith(JSON.stringify([String(context(t,d,index)?.eq?.id)]).slice(0,-1)+',')))return fail('TASK_METER_MISSING','Не найден подтверждённый общий счётчик этого оборудования');const due=num(b.nextHours),reading=num(meter?.readingHours??b.readingHours),rate=num(meter?.hoursPerDay??b.hoursPerDay),date=day(meter?.readingDate??b.readingDate);
   if(due==null||due<0||reading==null||reading<0||!date||date>today()||(rate!=null&&(rate<0||rate>24)))return fail('TASK_METER_MISSING','Укажите действительные показания, дату и следующий порог моточасов');
   return{ok:true,key,kind:s.kind,interval:s.value,nextHours:due,readingHours:reading,readingDate:date,hoursPerDay:rate||0,...(b.meterKey?{meterKey:b.meterKey}:{})};
  }
  const date=day(b.nextDate);
  return date?{ok:true,key,kind:s.kind,interval:s.value,nextDate:date}:fail('TASK_DUE_MISSING','Укажите дату следующего обслуживания');
 }
 function rows(route,d=db()){
  const ix=engine()?.contextIndex(d)||new Map();
  return arr(route?.taskIds).map(id=>{const c=ix.get(String(id)),t=c?.task;
   return{id:String(id),key:t?signature(t,d,ix):'',pointId:c?.lp?.legacyId||c?.lp?.id||'',pointName:c?.lp?.name||'',equipment:c?.eq?.name||'',equipmentCode:c?.eq?.externalCode||'',operation:t?.operation||'',spec:t?spec(t):null,basis:t?parseBasis(t,d,ix):fail('TASK_MISSING','Мероприятие не найдено'),raw:t?.routeDue||{},locked:reserved(d,id),running:runningTask(d,id)};
  });
 }
 function reserved(d,id){return global.LubricaRouteAutoGrouping.taskReserved(d,id)}
 function runningTask(d,id){return global.LubricaRouteAutoGrouping.runningTask(d,id)}
 function writeBasis(t,b,d,index,{initialOnly=false,replaceSource=false}={}){
  const id=str(t?.id),key=t&&signature(t,d,index),old=t&&parseBasis(t,d,index),s=t&&spec(t);
  if(!key||!s?.ok||b?.key!==key)return fail('STALE_BASIS','Изменилось мероприятие '+id+'; откройте настройки повторно');
  if(initialOnly&&old.ok)return{ok:true,changed:false};
  if(runningTask(d,id))return fail('RUNNING','Мероприятие '+id+' уже выполняется');
  if(s.kind==='runtime_hours'&&old.ok&&old.kind==='runtime_hours'&&b.planningMode!=='calendar_runtime'&&!(replaceSource&&b.meterKey&&b.meterKey!==old.meterKey)&&(b.readingHours<old.readingHours||b.readingDate<old.readingDate))return fail('METER_ROLLBACK',id+': сброс/замена счётчика требуют отдельного согласования');
  if(reserved(d,id)&&(!old.ok||(old.kind==='runtime_hours'?b.planningMode==='calendar_runtime'||b.nextHours!==old.nextHours||b.meterKey!==old.meterKey:b.planningMode!==t.routeDue?.planningMode||b.nextDate!==old.nextDate||b.cycleDays!==t.routeDue?.cycleDays||b.maxHoursPerDay!==t.routeDue?.maxHoursPerDay)))return fail('BASIS_RESERVED',id+': сначала снимите незапущенное задание, срок уже зафиксирован');
  const before=t.routeDue;t.routeDue=b;const result=parseBasis(t,d,index);
  if(!result.ok){if(before===undefined)delete t.routeDue;else t.routeDue=before;return fail(result.code,id+': '+result.message)}
  return{ok:true,changed:JSON.stringify(before)!==JSON.stringify(b)};
 }
 function validateRouteBasis(route,d,index=null){const ix=index||engine()?.contextIndex(d)||new Map(),out=[];for(const id of arr(route?.taskIds)){const t=ix.get(String(id))?.task,b=t?parseBasis(t,d,ix):fail('TASK_MISSING','Мероприятие не найдено');if(!b.ok)out.push({code:b.code,taskId:String(id),message:id+': '+b.message})}return out}
 // A single explicit transaction. Existing pending jobs freeze the due basis;
 // meter readings may be refreshed until actual execution starts.
 function configure(routeId,changes,d=db(),{persist=true}={}){
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
   
   let b={...(old.ok?{lastRunId:t.routeDue?.lastRunId||'',lastServiceDate:t.routeDue?.lastServiceDate||''}:{}),key};
   if(s.kind==='runtime_hours'&&old.ok&&old.planningMode==='calendar_runtime'&&row.nextDate!==undefined){
    b={...t.routeDue,nextDate:day(row.nextDate)};if(row.nextDate!==old.nextDate){b.cycleAnchor=b.nextDate;b.cycleTarget=b.nextDate}
   }else if(s.kind==='runtime_hours'){
    if(str(row.hoursPerDay)&&num(row.hoursPerDay)==null)return fail('INVALID_RATE',id+': некорректная плановая наработка');
    b={...b,nextHours:num(row.nextHours),readingHours:num(row.readingHours),readingDate:day(row.readingDate),hoursPerDay:num(row.hoursPerDay)||0,...(old.meterKey?{meterKey:old.meterKey}:{})};
    if(b.meterKey){const meter=writeMeter(work,b.meterKey,b.readingHours,b.readingDate,b.hoursPerDay);if(!meter.ok)return meter;}
    
    
   }else{
    b.nextDate=day(row.nextDate);if(r.cycleMode==='fixed_weekly'){b.cycleAnchor=b.nextDate===old.nextDate?day(t.routeDue?.cycleAnchor)||b.nextDate:b.nextDate;b.cycleTarget=b.nextDate===old.nextDate?day(t.routeDue?.cycleTarget)||b.nextDate:b.nextDate;}
    
   }
   const result=writeBasis(t,b,work,ix);if(!result.ok)return result;
  }
  const issues=activationIssues({...r,taskIds:[...seen]},work,ix).filter(x=>['PPR_CYCLE','PPR_ANCHOR_REQUIRED'].includes(x.code));if(issues.length)return{...fail(issues[0].code,issues[0].message),issues};
  if(persist){global.LubricaCore.State.setDatabase(work);global.LubricaApp?.refreshFromCore?.()}
  return{ok:true,updated:seen.size,database:work};
 }
 // Shared setup for a manual or automatic route. No fake counter or history.
 function configureRoute(routeId,input={},d=db(),{persist=true,activate=true}={}){
  if(!d)return fail('DATABASE_MISSING','База недоступна');
  const work=copy(d),r=arr(work.routes).find(x=>String(x.id)===String(routeId)),ix=engine().contextIndex(work),W=global.LubricaRouteWorkload;
  if(!typed(r)||r.status==='archived')return fail('ROUTE_NOT_AVAILABLE','Выберите текущий маршрут');
  if(global.LubricaRouteAutoGrouping.routeLocked(work,r))return fail('ROUTE_LOCKED','Сначала завершите или снимите открытые задания');
  const date=day(input.date),mode=input.mode||'next',runtime=r.scheduleKey.startsWith('runtime_hours:'),calendar=runtime&&input.planningMode==='calendar_runtime',ppr=input.pprMode?input.pprMode==='ppr':W?.requiresPpr(r.id,work);
  if(!date||!['next','last'].includes(mode)||mode==='last'&&date>today())return fail('INITIAL_DATE','Укажите допустимую исходную дату');
  let updated=0;
  for(const id of arr(r.taskIds)){
   const t=ix.get(String(id))?.task;if(!t)return fail('TASK_MISSING','Нет мероприятия '+id);
   const old=parseBasis(t,work,ix),s=spec(t);
   if(old.ok&&!input.replaceExisting){
    if(calendar&&(old.planningMode!=='calendar_runtime'||old.maxHoursPerDay!==Number(input.maxHoursPerDay)))return fail('MODE_CHANGE_CONFIRM','Для изменения способа или наработки подтвердите замену исходных сроков');
    continue;
   }
   if(!s?.ok)return fail('INTERVAL_INVALID','Уточните технический интервал '+id);
   if(runtime&&!calendar)return fail('METER_REQUIRED','Настройте общий счётчик оборудования или индивидуальные показания');
   let b;
   if(calendar){const made=makeCalendarBasis(t,work,ix,{...input,date,mode,ppr});if(!made.ok)return made;b=made.basis}
   else b={key:signature(t,work,ix),nextDate:mode==='last'?global.LubricaRoutePlanning.addInterval(date,s):date,...(mode==='last'?{lastServiceDate:date}:{})};
   if(r.cycleMode==='fixed_weekly'){b.cycleAnchor=b.nextDate;b.cycleTarget=b.nextDate}
   const changed=writeBasis(t,b,work,ix);if(!changed.ok)return changed;if(changed.changed)updated++;
  }
  if(input.pprMode){const result=W.saveRoutePpr(r.id,input.pprMode,'',work,{persist:false});if(!result.ok)return result;work.routeWorkload=result.database.routeWorkload}
  if(calendar)r.scheduleDefaults={planningMode:'calendar_runtime',maxHoursPerDay:Number(input.maxHoursPerDay),confirmCalendar:true};
  const issues=activationIssues(r,work,ix);
  if((activate||r.status==='active')&&issues.length||issues.some(x=>['PPR_CYCLE','PPR_ANCHOR_REQUIRED'].includes(x.code)))return{...fail('ROUTE_SCHEDULE_BLOCKED',issues[0].message),issues};
  if(activate){const gate=engine().transitionCheck(r,'active',work);if(!gate.ok)return{...fail('ROUTE_NOT_READY',gate.reason),...gate};r.status='active'}
  engine().ensureRouteRevision(r.id,work,{note:'Общие сроки маршрута',reason:'schedule'});
  if(persist){global.LubricaCore.State.setDatabase(work);global.LubricaApp?.refreshFromCore?.()}
  return {ok:true,updated,database:work,route:r};
 }
 // The same equipment meter can update all of its tasks; distinct service
 // thresholds are retained when refreshing readings.
 function initialMeterBasis(t,d,index,input={}){
  const c=context(t,d,index),s=spec(t),date=day(input.readingDate),reading=num(input.readingHours),last=num(input.lastHours),rate=num(input.hoursPerDay),key=meterKey(c?.eq?.id,input.meterId||'main');
  if(!c?.eq?.id||s?.kind!=='runtime_hours'||input.confirmMeter!==true||!date||date>today()||reading==null||last==null||last<0||last>reading||str(input.hoursPerDay)&&rate==null||rate!=null&&(rate<0||rate>24))return fail('METER_INITIAL','Подтвердите общий счётчик, последнее обслуживание, показание и дату');
  const result=writeMeter(d,key,reading,date,rate);if(!result.ok)return result;const meter=meterRecord(d,key);
  return{ok:true,basis:{key:signature(t,d,index),meterKey:key,nextHours:last+s.value,readingHours:meter.readingHours,readingDate:meter.readingDate,hoursPerDay:meter.hoursPerDay}};
 }
 function configureMeter(routeId,equipmentId,input={},d=db(),{persist=true,activate=false}={}){
  if(!d)return fail('DATABASE_MISSING','База недоступна');const work=copy(d),r=arr(work.routes).find(x=>String(x.id)===String(routeId)),ix=engine().contextIndex(work);
  if(!typed(r)||r.status==='archived'||!equipmentId)return fail('METER_SCOPE','Выберите маршрут и оборудование');
  const date=day(input.readingDate),reading=num(input.readingHours),last=num(input.lastHours),rate=num(input.hoursPerDay),source=str(input.meterId)||'main',key=meterKey(equipmentId,source),explicit=!!str(input.meterId);
  if(input.confirmMeter!==true||!date||date>today()||reading==null||reading<0||str(input.hoursPerDay)&&rate==null||rate!=null&&(rate<0||rate>24))return fail('METER_INITIAL','Подтвердите общий счётчик, показание и дату');
  const selected=new Set(arr(input.taskIds).map(String)),linked=[];
  if(selected.size&&[...selected].some(id=>!arr(r.taskIds).map(String).includes(id)||String(ix.get(id)?.eq?.id)!==String(equipmentId)))return fail('METER_SCOPE','Выбранное мероприятие не относится к оборудованию маршрута');
  for(const id of arr(r.taskIds)){
   const c=ix.get(String(id));if(String(c?.eq?.id)!==String(equipmentId)||selected.size&&!selected.has(String(id)))continue;
   const t=c.task,s=spec(t),old=parseBasis(t,work,ix);if(s?.kind!=='runtime_hours')continue;
   if(old.ok&&(old.kind!=='runtime_hours'||old.meterKey&&old.meterKey!==key)&&!input.replaceExisting)return fail('MODE_CHANGE_CONFIRM','Подтвердите смену источника или способа планирования');
   let b;
   if(old.ok&&old.kind==='runtime_hours'&&!input.replaceExisting)b={...t.routeDue,readingHours:reading,readingDate:date,hoursPerDay:rate??old.hoursPerDay};
   else {if(last==null||last<0||last>reading)return fail('METER_INITIAL','Укажите подтверждённую наработку при последнем обслуживании');b={key:signature(t,work,ix),nextHours:last+s.value,readingHours:reading,readingDate:date,hoursPerDay:rate||0}}
   if(old.ok&&old.kind==='runtime_hours'&&!(input.replaceExisting&&old.meterKey!==key)&&(reading<old.readingHours||date<old.readingDate))return fail('METER_ROLLBACK','Показание меньше подтверждённого');
   if(runningTask(work,t.id)||reserved(work,t.id)&&old.meterKey!==key)return fail('BASIS_RESERVED','Сначала завершите или снимите задание перед изменением источника');
   linked.push({t,b:{...b,meterKey:key}});
  }
  if(!linked.length)return fail('METER_SCOPE','Нет мероприятий выбранного оборудования');
  // Confirmation of the default common equipment counter covers other already configured
  // unbound runtime tasks; explicit alternative sources require explicit binding.
  if(!explicit&&!selected.size)for(const c of ix.values()){
   const t=c.task;if(String(c.eq?.id)!==String(equipmentId)||linked.some(x=>x.t===t))continue;
   const old=parseBasis(t,work,ix);if(!old.ok||old.kind!=='runtime_hours'||old.meterKey)continue;
   if(reading<old.readingHours||date<old.readingDate)return fail('METER_ROLLBACK','Показание противоречит другому маршруту этого счётчика');
   if(reserved(work,t.id))return fail('BASIS_RESERVED','Сначала снимите задание другого маршрута перед привязкой общего счётчика');
   linked.push({t,b:{...t.routeDue,meterKey:key,readingHours:reading,readingDate:date,hoursPerDay:rate??old.hoursPerDay}});
  }
  const existing=meterRecord(work,key),meter=writeMeter(work,key,reading,date,rate??existing?.hoursPerDay??linked[0].b.hoursPerDay);if(!meter.ok)return meter;
  const actual=meterRecord(work,key);
  for(const {t,b} of linked){const result=writeBasis(t,{...b,readingHours:actual.readingHours,readingDate:actual.readingDate,hoursPerDay:actual.hoursPerDay},work,ix,{replaceSource:input.replaceExisting===true});if(!result.ok)return result;}
  if(arr(r.taskIds).every(id=>parseBasis(ix.get(String(id))?.task||{},work,ix).kind==='runtime_hours'))delete r.scheduleDefaults;
  const issues=activationIssues(r,work,ix);
  if(activate){if(issues.length)return {...fail('ROUTE_SCHEDULE_BLOCKED',issues[0].message),issues};const gate=engine().transitionCheck(r,'active',work);if(!gate.ok)return{...fail('ROUTE_NOT_READY',gate.reason),...gate};r.status='active'}
  engine().ensureRouteRevision(r.id,work,{reason:'meter'});
  if(persist){global.LubricaCore.State.setDatabase(work);global.LubricaApp?.refreshFromCore?.()}
  return{ok:true,updated:linked.length,database:work,route:r,issues};
 }
 function activationIssues(route,d,index=null){
  const ix=index||engine().contextIndex(d),issues=validateRouteBasis(route,d,ix),W=global.LubricaRouteWorkload,M=global.LubricaRouteAutomation;
  if(!arr(route.taskIds).length)return [{code:'ROUTE_EMPTY',message:'В маршруте нет мероприятий'}];
  for(const id of arr(route.taskIds)){
   const t=ix.get(String(id))?.task,b=t&&parseBasis(t,d,ix);
   if(!(W?.requiresPpr(route.id,d)||M?.taskPpr?.(id,d)))continue;
   const technical=t&&spec(t);if(technical?.kind==='days'&&technical.value<14){issues.push({code:'PPR_CYCLE',taskId:id,message:'Интервал '+technical.value+' дн. несовместим с ППР каждые 14 дней'});continue}
   if(!b?.ok)continue;
   const phase=W?.nextPpr(route.lineId,today(),d);if(!phase){issues.push({code:'PPR_ANCHOR_REQUIRED',taskId:id,message:'Не задан ППР линии'});continue}
   if(b.kind==='runtime_hours')continue;
   if(b.kind==='days'&&b.interval<14){issues.push({code:'PPR_CYCLE',taskId:id,message:'Интервал '+b.interval+' дн. несовместим с ППР каждые 14 дней'});continue}
   let due=b.nextDate,phaseBasis={cycleAnchor:t.routeDue?.cycleAnchor||due,cycleTarget:t.routeDue?.cycleTarget||due};
   for(let n=0;n<(b.kind==='days'?14:24);n++){
    const earliest=M?.earlyDate(t,d,due,ix)||due,next=W.nextPpr(route.lineId,earliest,d);
    if(!next||next>due){issues.push({code:'PPR_CYCLE',taskId:id,message:'Нет ППР в допустимом окне срока '+due});break}
    const step=calendarStep(next,{kind:b.kind,interval:b.interval,dueDate:due},route,phaseBasis);
    due=step.nextDate;phaseBasis={...phaseBasis,...step};if(!due)break;
   }
  }
  return issues;
 }
 function dueFor(t,d,index){
  const b=parseBasis(t,d,index);if(!b.ok)return b;
  if(b.kind!=='runtime_hours')return{...b,dueDate:b.nextDate,basis:b.planningMode==='calendar_runtime'?'runtime_calendar':'task_calendar'};
  const left=b.nextHours-b.readingHours;
  if(left<=0)return{...b,dueDate:b.readingDate,basis:'meter_confirmed'};
  if(!b.hoursPerDay)return{...b,dueDate:'',basis:'meter_waiting',remainingHours:left};
  return{...b,dueDate:advance(b.readingDate,Math.ceil(left/b.hoursPerDay)),basis:'meter_forecast',remainingHours:left};
 }
 // Exactly one next open obligation per task. Overdue items enter the selected
 // range at its first day, retaining their ORIGINAL due date.
 function preview(route,d,start,end,index=null){
  const ix=index||engine().contextIndex(d),group=new Map(),warnings=[];
  for(const id of arr(route.taskIds).map(String)){
   const t=ix.get(id)?.task;
   if(!t){warnings.push({code:'TASK_DUE_MISSING',taskId:id,routeId:route.id,message:id+': мероприятие отсутствует'});continue}
   const due=dueFor(t,d,ix);
   if(!due.ok){warnings.push({code:due.code,taskId:id,routeId:route.id,message:id+': '+due.message});continue}
   if(reserved(d,id))continue;
   if(!due.dueDate){warnings.push({code:'TASK_METER_WAITING',taskId:id,routeId:route.id,message:id+': ещё '+due.remainingHours+' ч; нет прогноза, ожидаются показания счётчика'});continue}
   const earliest=global.LubricaRouteAutomation?.earlyDate(t,d,due.dueDate,ix)||due.dueDate;
   if(due.dueDate>end&&earliest>end)continue;
   const date=due.dueDate<start?start:due.dueDate;
   if(!group.has(date))group.set(date,[]);
   group.get(date).push({taskId:id,key:due.key,kind:due.kind,basis:due.basis,dueDate:due.dueDate,...(earliest<due.dueDate?{earliestDate:earliest}:{}),nextHours:due.nextHours??null,interval:due.interval,...(due.meterKey?{meterKey:due.meterKey}:{}),...(due.planningMode?{planningMode:due.planningMode,technicalHours:due.technicalHours,maxHoursPerDay:due.maxHoursPerDay}:{}),forecast:due.basis==='meter_forecast'});
  }
  const groups=[...group].sort((a,b)=>a[0].localeCompare(b[0])).map(([date,entries])=>({date,entries,taskIds:entries.map(x=>x.taskId)}));return{groups:global.LubricaRouteAutomation?.partition(route,groups,d,ix)||groups,warnings};
 }
 function selectRoute(route,item,d=db()){
  const ids=arr(item?.taskIds).map(String),pts=new Map(arr(route?.points).map(p=>[String(p.taskId||p.id),p]));
  if(!ids.length||new Set(ids).size!==ids.length||ids.some(id=>!pts.has(id)))return null;
  const points=ids.map(id=>pts.get(id));
  return{...route,taskIds:ids,points,estimatedMinutes:global.LubricaRouteAutomation?.duration(route,ids,d)??((Number(route.fixedMinutes)||0)+ids.length*(Number(route.estimatedMinutesPerTask)||5)),physicalPointCount:new Set(points.map(p=>p.lubricationPointId||p.pointDisplayId||p.id)).size,plannedItemId:item.id||''};
 }
 function snapshot(route,item,d){
  const selected=selectRoute(route,item,d),model=selected&&global.LubricaChecklistEngine?.model?.(selected,d);
  if(!model||model.taskCount!==item.taskIds.length)return null;
  return model;
 }
 function planItem(routeId,id,d=db()){return arr(d?.routePlanItems).find(x=>String(x.id)===String(id)&&String(x.routeId)===String(routeId)&&x.planningBasis==='task_due')||null}
 function checkStart(route,item,d,date,{checkDate=true,shift}={}){
  const raw=arr(d?.routes).find(r=>String(r.id)===String(route?.id));
  if(!raw||raw.status!=='active')return fail('PLAN_REQUIRED','Маршрут не активен');
  const submitted=item;item=item&&planItem(route.id,item.id,d);
  if(submitted&&item&&JSON.stringify(submitted.workAssignment||null)!==JSON.stringify(item.workAssignment||null))return fail('PLAN_CHANGED','Назначение задания изменилось');
  if(arr(d.checklistRuns).some(r=>String(r.routeId)===String(route.id)&&r.status==='in_progress'))return fail('RUN_ACTIVE','Сначала завершите текущее задание маршрута');
  if(!typed(route)||route.status!=='active'||!item||item.status!=='planned'||item.runId)return fail('PLAN_REQUIRED','Откройте незапущенное задание из плана смазочных работ');
  if(String(item.routeId)!==String(route.id))return fail('PLAN_ROUTE_MISMATCH','Задание относится к другому маршруту');
  const E=engine();
  const selected=selectRoute(route,item,d),model=snapshot(route,item,d);
  if(!selected||!model||!item.checklistSnapshot||JSON.stringify(model)!==JSON.stringify(item.checklistSnapshot))return fail('PLAN_CHANGED','Состав, нормы или параметры задания изменились. Снимите незапущенное задание и сформируйте повторно');
  const early=!!(global.LubricaRouteAutomation&&item.workAssignment?.date===date&&date>=global.LubricaRouteAutomation.allowedEarliest(item,d));
  const meterDue=arr(item.dueEntries).length>0&&arr(item.dueEntries).every(e=>e.kind==='runtime_hours');
  if(checkDate&&(!day(date)||date>today()||date<item.plannedDate&&!early&&!meterDue))return fail('PLAN_DATE','Дата должна быть фактической и не раньше плановой или согласованного окна');
  const prep=global.LubricaRoutePreparation?.build?.(selected,d),validation=prep?null:E.validateRoute(route.id,d,null,item.taskIds);if(prep&&!prep.ready||validation&&!validation.valid)return fail('PREPARATION_BLOCKED',prep?.errors[0]?.message||validation?.errors[0]?.message||'Задание не готово');
  const ix=E.contextIndex(d),entries=arr(item.dueEntries),byId=new Map(entries.map(e=>[String(e.taskId),e]));
  if(entries.length!==selected.taskIds.length||byId.size!==entries.length)return fail('PLAN_INVALID','Не подтверждены основания сроков задания');
  const startEntries=[];
  for(const id of selected.taskIds){
   const e=byId.get(id),t=ix.get(id)?.task,b=t&&parseBasis(t,d,ix);
   if(!e||!b?.ok||e.key!==b.key||e.kind!==b.kind||e.interval!==b.interval||e.planningMode!==b.planningMode||e.maxHoursPerDay!==b.maxHoursPerDay||e.meterKey!==b.meterKey)return fail('TASK_BASIS_CHANGED',id+': основание срока изменилось');
   if(b.kind==='runtime_hours'){
    if(e.nextHours!==b.nextHours)return fail('TASK_BASIS_CHANGED',id+': изменился порог наработки');
    if(checkDate&&(b.readingDate!==date||b.readingHours<b.nextHours))return fail('METER_NOT_DUE',id+': подтвердите показание счётчика на дату выполнения (не менее '+b.nextHours+' ч)');
    startEntries.push({...e,readingHours:b.readingHours,readingDate:b.readingDate});
   }else{
    if(e.dueDate!==b.nextDate)return fail('TASK_BASIS_CHANGED',id+': изменился следующий срок');
    const allowed=global.LubricaRouteAutomation?.earlyDate(t,d,b.nextDate)||b.nextDate;if(e.earliestDate&&e.earliestDate!==allowed)return fail('TASK_BASIS_CHANGED',id+': согласованное окно изменилось');
    if(checkDate&&date<b.nextDate&&(!early||!e.earliestDate||date<e.earliestDate))return fail('TASK_NOT_DUE',id+': срок ещё не наступил');
    startEntries.push({...e,cycleMode:raw.cycleMode||'actual',cycleAnchor:t.routeDue?.cycleAnchor||b.nextDate,cycleTarget:t.routeDue?.cycleTarget||b.nextDate});
   }
  }
  const W=global.LubricaRouteWorkload;let work={ok:true};if(checkDate&&W){work=W.startPolicy(route.id,item.id,date,shift,d);if(!work.ok)return work;}
  return{ok:true,route:selected,snapshot:model,dueEntries:startEntries,preparation:prep,work};
 }
 function completionErrors(run,d=db()){
  if(!run?.dueEntries?.length)return[];
  const ix=engine().contextIndex(d),missing=[];
  if(!day(run.date)||run.date!==run.serviceDate||run.date>today())missing.push('Дата выполнения изменена; требуется фактическая дата запуска задания');
  for(const e of run.dueEntries){
   const id=String(e.taskId),r=run.taskResults?.[id];
   if(!r?.done||r.resultStatus!=='completed')continue;
   const t=ix.get(id)?.task,b=t&&parseBasis(t,d,ix);
   if(!b?.ok||b.key!==e.key||b.kind!==e.kind||b.interval!==e.interval||b.planningMode!==e.planningMode||b.maxHoursPerDay!==e.maxHoursPerDay||b.meterKey!==e.meterKey||(e.kind==='runtime_hours'?b.nextHours!==e.nextHours:b.nextDate!==e.dueDate)){missing.push(id+': основание изменилось во время выполнения');continue}
   if(e.kind==='runtime_hours'){
    const h=num(r.runtimeMeterHours);
    const minimum=Math.max(e.nextHours,e.readingHours,!b.meterKey||b.readingDate<run.date?b.readingHours:0);if(h==null||h<minimum||b.meterKey&&b.readingDate>run.date&&h>b.readingHours)missing.push(id+': укажите согласованные фактические моточасы при обслуживании (не менее '+minimum+' ч)');
   }else if(!day(run.date)||run.date<(e.earliestDate&&run.workAssignment?.date===run.date?e.earliestDate:e.dueDate)||run.date>today())missing.push(id+': некорректная фактическая дата');
  }
  return missing;
 }
 // A fixed week phase never extends the technical maximum from actual work.
 function calendarStep(actual,entry,route,basis={}){
  const cap=global.LubricaRoutePlanning.addInterval(actual,{kind:entry.kind,value:entry.interval});
  const anchor=day(basis.cycleAnchor)||day(entry.dueDate);
  if(route?.cycleMode!=='fixed_weekly'||entry.kind!=='days'||!Number.isInteger(entry.interval)||entry.interval<7||entry.interval%7||!anchor||!day(actual)||!cap)return {nextDate:cap};
  const reference=[actual,day(basis.cycleTarget)||day(entry.dueDate)].sort().at(-1);
  const delta=Math.round((Date.parse(reference+'T00:00:00Z')-Date.parse(anchor+'T00:00:00Z'))/86400000);
  const next=advance(anchor,(Math.floor(delta/entry.interval)+1)*entry.interval);
  return {nextDate:next<cap?next:cap,cycleAnchor:anchor,cycleTarget:next};
 }
 function nextCalendarDate(actual,entry,route,basis={}){return calendarStep(actual,entry,route,basis).nextDate}
 // The next basis is part of immutable execution fact, not recalculated by history consumers.
 function nextBasisFromFact(run,e,result,current={},route=null){
  const base={...current,key:e.key,lastRunId:run.id,lastServiceDate:run.date};
  if(e.kind==='runtime_hours'){
   const h=num(result.runtimeMeterHours);if(h==null||h<0)return null;
   return {...base,nextHours:h+e.interval,readingHours:h,readingDate:run.date,hoursPerDay:current.hoursPerDay??0,...(e.meterKey?{meterKey:e.meterKey}:{})};
  }
  if(e.planningMode==='calendar_runtime')Object.assign(base,{planningMode:'calendar_runtime',calendarConfirmed:true,maxHoursPerDay:e.maxHoursPerDay,cycleDays:e.interval});
  const phase={...base,cycleAnchor:e.cycleAnchor||base.cycleAnchor,cycleTarget:e.cycleTarget||base.cycleTarget};
  return {...base,...calendarStep(run.date,e,{cycleMode:e.cycleMode||route?.cycleMode||'actual'},phase)};
 }
 function historyBasis(t,d,index){
  const id=String(t.id),key=signature(t,d,index);
  if(!key)return null;
  const runs=arr(d.checklistRuns).filter(r=>['completed','partial'].includes(r.status)&&day(r.date)&&r.date<=today()&&arr(r.dueEntries).some(e=>String(e.taskId)===id&&e.key===key)).sort((a,b)=>b.date.localeCompare(a.date)||str(b.completedAt).localeCompare(str(a.completedAt)));
  for(const r of runs){const result=r.executionFact?.tasks?.[id]||r.taskResults?.[id],e=arr(r.dueEntries).find(e=>String(e.taskId)===id&&e.key===key);if(!result?.done||result.resultStatus!=='completed')continue;
   const saved=r.executionFact?.nextBasisByTask?.[id],b=saved?.key===key?copy(saved):nextBasisFromFact(r,e,result,{},arr(d.routes).find(x=>x.id===r.routeId));if(!b)continue;
   if(b.meterKey){const m=meterRecord(d,b.meterKey);if(!m)continue;Object.assign(b,{readingHours:m.readingHours,readingDate:m.readingDate,hoursPerDay:m.hoursPerDay})}
   return b;
  }return null;
 }
 function advanceCompleted(run,d){
  if(!run?.dueEntries?.length)return;
  const ix=engine().contextIndex(d),route=arr(d.routes).find(r=>String(r.id)===String(run.routeId));
  for(const e of run.dueEntries){
   const id=String(e.taskId),r=run.taskResults?.[id],t=ix.get(id)?.task;
   if(!t||!r?.done||r.resultStatus!=='completed'||t.routeDue?.lastRunId===run.id)continue;
   const b=nextBasisFromFact(run,e,r,t.routeDue,route);if(!b)continue;
   t.routeDue=b;
   if(e.kind==='runtime_hours'&&b.meterKey)writeMeter(d,b.meterKey,b.readingHours,run.date,null,{fact:true});
   if(run.executionFact){run.executionFact.nextBasisByTask=run.executionFact.nextBasisByTask||{};run.executionFact.nextBasisByTask[id]=copy(t.routeDue)}
  }
 }
 global.LubricaRouteDue=Object.freeze({typed,day,today,signature,rows,parseBasis,writeBasis,validateRouteBasis,activationIssues,calendarRule,makeCalendarBasis,configure,configureRoute,configureMeter,dueFor,preview,selectRoute,snapshot,planItem,checkStart,completionErrors,calendarStep,nextCalendarDate,advanceCompleted,meterKey,meterRecord,initialMeterBasis,historyBasis});
})(window);
