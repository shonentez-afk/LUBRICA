"use strict";
/* R5: explicit, transactional route preparation. No equipment-family grouping,
   no fabricated history, no silent changes to engineering norms or open work. */
(function(global){
 const arr=x=>Array.isArray(x)?x:[],str=x=>String(x??'').trim(),ids=x=>arr(x).map(String),uniq=x=>[...new Set(ids(x))],copy=x=>JSON.parse(JSON.stringify(x));
 const E=()=>global.LubricaRouteEngine,A=()=>global.LubricaRouteAutoGrouping,D=()=>global.LubricaRouteDue,W=()=>global.LubricaRouteWorkload,P=()=>global.LubricaRoutePlanning;
 const db=()=>global.LubricaCore?.State?.getDatabase?.(),fail=(code,message)=>({ok:false,code,message,reason:message});
 const scope=(x,o={})=>(!o.lineId||String(x?.lineId)===String(o.lineId))&&(!o.areaId||String(x?.areaId)===String(o.areaId));
 const groupScope=(x,o={})=>scope(x,o)&&(!o.groupKey||A().routeKey(x)===o.groupKey)&&(!Array.isArray(o.groupKeys)||o.groupKeys.includes(A().routeKey(x)));
 const integer=(v,min,max)=>str(v)!==''&&Number.isInteger(Number(v))&&Number(v)>=min&&Number(v)<=max;
 const number=(v,min,max)=>str(v)!==''&&Number.isFinite(Number(v))&&Number(v)>=min&&Number(v)<=max;
 const add=(date,n)=>P().addInterval(date,{kind:'days',value:n});
 const locked=(d,r)=>A().routeLocked(d,r),reserved=(d,id)=>A().taskReserved(d,id);
 function setupAllowed(d,id,o={},ownership=A().ownership(d),group=null){
  const key=String(id),rs=ownership.owners.get(key)||[],target=group?ownership.byGroup.get(group.key)||[]:[];
  const editable=r=>r.source==='auto'&&D().typed(r)&&!ownership.locked.has(String(r.id))&&groupScope(r,o);
  return !ownership.reserved.has(key)&&!ownership.excluded.has(key)&&rs.length<=1&&rs.every(editable)&&target.length<=1&&target.every(editable);
 }
 function eligible(d){
  const ix=E().contextIndex(d),ready=E().readinessIndex(d),valid=new Map(),issues=[];
  if(!ready)return{ok:false,ix,valid,issues:[{code:'QA_MISSING',message:'Инженерный контроль недоступен'}]};
  for(const [id,c] of ix){
   const g=ready.has(id)?E().routeEligibility(c.task,d,ready,c):fail('QA_MISSING','Отсутствует запись инженерного контроля');
   const desc=g.ok?A().describe(c):g;
   if(desc.ok)valid.set(id,desc);else issues.push({taskId:id,code:desc.code,message:desc.message});
  }
  return{ok:true,ix,valid,issues};
 }
 function config(d){const c=d?.routeAutomation||{};return{walkOrder:c.walkOrder||{},serviceMinutes:c.serviceMinutes||{},transitionMinutes:Number(c.transitionMinutes)||0,splitLargeJobs:c.splitLargeJobs===true,balance:c.balance===true}}
 function equipmentOrder(d,areaId){
  const actual=arr(d?.equipment).filter(x=>String(x.areaId)===String(areaId)),byId=new Map(actual.map(x=>[String(x.id),x]));
  const saved=uniq(config(d).walkOrder[String(areaId)]).filter(id=>byId.has(id)),seen=new Set(saved);
  const rest=actual.filter(x=>!seen.has(String(x.id))).sort((a,b)=>(str(a.externalCode)+' '+str(a.name)+' '+a.id).localeCompare(str(b.externalCode)+' '+str(b.name)+' '+b.id,'ru',{numeric:true}));
  return [...saved,...rest.map(x=>String(x.id))].map(id=>byId.get(id));
 }
 function compare(d,ix,areaId){
  const order=new Map(equipmentOrder(d,areaId).map((e,i)=>[String(e.id),i]));
  return(a,b)=>{const x=ix.get(String(a)),y=ix.get(String(b)),i=order.get(String(x?.eq?.id))??Infinity,j=order.get(String(y?.eq?.id))??Infinity;return (i===j?0:i<j?-1:1)||(str(x?.lp?.name)+' '+a).localeCompare(str(y?.lp?.name)+' '+b,'ru',{numeric:true})};
 }
 function policy(t,d,index){
  const p=t?.routePolicy||{},valid=p.key&&p.key===D().signature(t,d,index);
  return valid?{access:p.access==='ppr'?'ppr':'normal',earlyDays:Number(p.earlyDays)||0,earlyReason:str(p.earlyReason),minutes:Number(p.minutes)||0,key:p.key}:{access:p.access==='ppr'?'ppr':'normal',earlyDays:0,earlyReason:'',minutes:0,key:''};
 }
 function rawPolicy(t){return t?.routePolicy||{}}
 function taskPpr(id,d){const t=arr(d?.tasks).find(x=>String(x.id)===String(id));return t?.routePolicy?.access==='ppr'}
 function taskMinutes(t,d,route,index){const p=t?.routePolicy?.minutes>0?policy(t,d,index):null,c=config(d),base=Number(route?.estimatedMinutesPerTask)||5,n=Number(c.serviceMinutes[route?.serviceKey]);return p?.minutes>0?p.minutes:n>0?n:base}
 function duration(route,taskIds,d,index=null){
  const ts=ids(taskIds),settings=config(d),tasks=index?null:new Map(arr(d?.tasks).map(x=>[String(x.id),x]));if(!index&&(settings.transitionMinutes>0||ts.some(id=>tasks.get(id)?.routePolicy?.minutes>0)))index=E().contextIndex(d);const points=new Map(arr(route?.points).map(p=>[String(p.taskId||p.id),p]));
  let total=Number(route?.fixedMinutes)||0,last='',transitions=0;
  for(const id of ts){const t=index?.get(id)?.task||tasks?.get(id),p=points.get(id);total+=taskMinutes(t,d,route,index);
   if(settings.transitionMinutes>0){const eq=String(index?.get(id)?.eq?.id||p?.equipmentId||p?.position||p?.equipment||'');if(last&&eq&&eq!==last)transitions++;last=eq||last}
  }
  return Math.ceil(total+transitions*settings.transitionMinutes);
 }
 function earlyDate(t,d,due){
  const technical=A().scheduleFor(t),b=D().parseBasis(t,d),s=b.ok&&b.planningMode==='calendar_runtime'?{ok:true,kind:'days',value:b.interval}:technical,p=policy(t,d);
  if(!s?.ok||s.kind==='runtime_hours'||!p.earlyReason||!integer(p.earlyDays,1,90))return due;
  const limit=s.kind==='days'?s.value-1:28*s.value-1;
  return p.earlyDays<=limit?add(due,-p.earlyDays):due;
 }
 function allowedEarliest(item,d){
  const base=D().day(item?.plannedDate),entries=arr(item?.dueEntries);
  if(!base||item.planningBasis!=='task_due'||!entries.length)return base;
  const ts=new Map(arr(d?.tasks).map(t=>[String(t.id),t]));
  const allowed=entries.map(e=>{
   const t=ts.get(String(e.taskId)),recorded=D().day(e.earliestDate);
   if(!t||!recorded||e.kind==='runtime_hours'||e.key!==D().signature(t,d))return base;
   const due=D().day(e.dueDate),current=earlyDate(t,d,due);
   return due&&recorded===current&&recorded<due?recorded:base;
  }).sort().at(-1);
  return allowed&&allowed<base?allowed:base;
 }
 // Reconcile only explicitly selected automatic routes without open assignments.
 // Block propagation prevents a move from detaching a task whose destination
 // cannot accept it. Manual routes and exclusions are never modified.
 function reconcile(d,o={},engine=E()){
  const info=eligible(d);if(!info.ok)return fail('QA_MISSING','Инженерный контроль недоступен');
  const {ix,valid}=info,issues=info.issues.filter(x=>scope(ix.get(x.taskId),o)),own=A().ownership(d),working=own.routes,owners=own.owners,groups=new Map(),routeByKey=own.byGroup,excluded=own.excluded,ownershipReserved=own.reserved;
  const key=r=>A().routeKey(r),editable=r=>r&&r.source==='auto'&&D().typed(r)&&['active','draft'].includes(r.status)&&groupScope(r,o)&&!own.locked.has(String(r.id));
  const issue=(id,code,message,routeId='')=>issues.push({taskId:id,code,message,routeId});
  for(const [id,g] of valid){if(!groupScope(g,o))continue;if(!groups.has(g.key))groups.set(g.key,{...g,ids:[]});groups.get(g.key).ids.push(id)}
  for(const r of working){if(!D().typed(r)||!groupScope(r,o))continue;const k=key(r);if(!groups.has(k))groups.set(k,{key:k,lineId:r.lineId,areaId:r.areaId,name:r.name||r.code||r.id,groupingMode:r.groupingMode,serviceKey:r.serviceKey,serviceLabel:r.serviceLabel,scheduleKey:r.scheduleKey,interval:r.interval,ids:[]})}
  const blocked=new Map();
  for(const [k,rs] of routeByKey){
   if(rs.length>1)blocked.set(k,'Несколько маршрутов одной группы');
   else if(!editable(rs[0]))blocked.set(k,'Ручной маршрут, другой охват или незавершённое задание');
   else if(uniq(rs[0].taskIds).length!==arr(rs[0].taskIds).length||uniq(rs[0].taskIds).some(id=>(owners.get(id)||[]).length>1||excluded.has(id)||own.reserved.has(id)))blocked.set(k,'Дубли или противоречивые ручные исключения');
  }
  let changed=true;
  while(changed){changed=false;for(const [k,rs] of routeByKey){
   if(blocked.has(k)||!editable(rs[0]))continue;
   for(const id of uniq(rs[0].taskIds)){
    const target=valid.get(id);if(target&&target.key!==k&&(!groupScope(target,o)||blocked.has(target.key))){blocked.set(k,'Перенос '+id+' требует доступного маршрута назначения в выбранном охвате');changed=true;break}
   }
  }}
  const out=[];
  for(const g of groups.values()){
   const rs=routeByKey.get(g.key)||[],r=rs.length===1?rs[0]:null,old=uniq(r?.taskIds),reason=blocked.get(g.key)||'';
   const desired=[];
   for(const id of g.ids){
    const own=owners.get(id)||[];
    if(excluded.has(id)){issue(id,'MANUALLY_EXCLUDED','Исключено вручную');continue}
    if(own.length>1||own.length===1&&own[0].id!==r?.id&&(!editable(own[0])||blocked.has(key(own[0])))){issue(id,'ALREADY_ASSIGNED','Назначено в защищённом маршруте '+own.map(x=>x.code||x.id).join(', '),own[0]?.id);continue}
    if(ownershipReserved.has(id)&&!old.includes(id)){issue(id,'TASK_RESERVED','Есть открытое задание',own[0]?.id);continue}
    desired.push(id);
   }
   const ds=new Set(desired),removed=old.filter(id=>!ds.has(id)),adds=desired.filter(id=>!old.includes(id)).sort(compare(d,ix,g.areaId));
   const deferred=r?.status==='active'?adds.filter(id=>!D().parseBasis(ix.get(id).task,d,ix).ok):[];
   for(const id of deferred)issue(id,'NEW_TASK_DUE_REQUIRED','Новое мероприятие требует исходного срока; действующий маршрут сохранён',r.id);
   const acceptedAdds=adds.filter(id=>!deferred.includes(id));
   let next=[...old.filter(id=>ds.has(id)),...acceptedAdds];
   if(!r||o.applyOrder===true)next.sort(compare(d,ix,g.areaId));
   const basisMissing=next.filter(id=>!D().parseBasis(ix.get(id).task,d,ix).ok);
   const nextStatus=r?.status==='active'?'active':o.activateReady===true&&next.length&&!basisMissing.length?'active':'draft';
   const contentSig=JSON.stringify(next.map(id=>{const c=ix.get(id),t=c?.task;return [id,t?.materialId,t?.materialName,t?.materialMode,t?.quantity,t?.toolId,c?.lp?.targetMaterialId,rawPolicy(t),taskMinutes(t,d,r||g,ix),config(d).transitionMinutes]}));
   const different=JSON.stringify(old)!==JSON.stringify(next),metadataChanged=!!r&&r.automationContent!==contentSig;
   let action='none',why='';
   if(reason){if(adds.length||removed.length||rs.length>1||metadataChanged||o.applyOrder===true&&different){action='blocked';why=reason}}
   else if(!next.length&&r){action='archive';why='В группе не осталось готовых мероприятий; история сохранится'}
   else if(!r&&next.length)action='create';
   else if(r&&next.length&&(different||metadataChanged||r.status!==nextStatus)){action='update';if(nextStatus==='draft'&&r.status==='active')why='Новые/изменённые мероприятия требуют исходных сроков; маршрут станет черновиком';else if(metadataChanged&&!different)why='Сверены материал, нормы, условия и трудоёмкость; будет зафиксирована новая ревизия'}
   if(action==='blocked'){next=old;for(const id of adds)issue(id,'GROUP_BLOCKED',why,r?.id||'')}
   if(action!=='none'||r||next.length)out.push({...g,ids:undefined,action,reason:why,routeId:r?.id||'',currentTaskIds:old,taskIds:action==='archive'?old:next,deferredTaskIds:deferred,addTaskIds:action==='blocked'?[]:acceptedAdds,removeTaskIds:action==='blocked'?[]:removed,invalidTaskIds:removed,basisMissing,contentSig,nextStatus,pointCount:new Set(next.map(id=>ix.get(id)?.lp?.id).filter(Boolean)).size,ownedCount:old.length});
  }
  out.sort((a,b)=>a.name.localeCompare(b.name,'ru',{numeric:true}));
  const actions=out.filter(x=>['create','update','archive'].includes(x.action));
  const token=JSON.stringify(actions.map(g=>[g.key,g.action,g.routeId,g.currentTaskIds,g.taskIds,g.nextStatus,g.contentSig,g.basisMissing,g.removeTaskIds]));
  return{ok:true,groups:out,issues,token,summary:{create:actions.filter(g=>g.action==='create').length,update:actions.filter(g=>g.action==='update').length,archive:actions.filter(g=>g.action==='archive').length,blocked:out.filter(g=>g.action==='blocked').length,add:actions.reduce((n,g)=>n+g.addTaskIds.length,0),remove:actions.reduce((n,g)=>n+g.removeTaskIds.length,0),issues:issues.length}};
 }
 function historyFor(t,d,ix){
  const id=String(t.id),key=D().signature(t,d,ix),s=A().scheduleFor(t);
  if(!key||!s.ok)return null;
  const runs=arr(d.checklistRuns).filter(r=>r.status==='completed'&&D().day(r.date)&&r.date<=D().today()&&arr(r.dueEntries).some(e=>String(e.taskId)===id&&e.key===key)).sort((a,b)=>b.date.localeCompare(a.date)||str(b.completedAt).localeCompare(str(a.completedAt)));
  for(const r of runs){
   const x=r.executionFact?.tasks?.[id]||r.taskResults?.[id];if(!x?.done||x.resultStatus!=='completed')continue;
   if(s.kind==='runtime_hours'){const entry=arr(r.dueEntries).find(e=>String(e.taskId)===id&&e.key===key);if(entry?.planningMode==='calendar_runtime'){const days=Number(entry.interval),rate=Number(entry.maxHoursPerDay);if(Number.isInteger(days)&&days>0&&rate>0&&rate<=24&&days*rate<=s.value)return{key,planningMode:'calendar_runtime',calendarConfirmed:true,cycleDays:days,maxHoursPerDay:rate,nextDate:add(r.date,days),lastRunId:r.id,lastServiceDate:r.date}}if(!number(x.runtimeMeterHours,0,1e12))continue;const h=Number(x.runtimeMeterHours);return{key,nextHours:h+s.value,readingHours:h,readingDate:r.date,hoursPerDay:0,lastRunId:r.id,lastServiceDate:r.date}}
   return{key,nextDate:P().addInterval(r.date,s),lastRunId:r.id,lastServiceDate:r.date};
  }
  return null;
 }
 function setup(d,o,info){
  const {ix,valid}=info,allScopeIds=[...valid].filter(([id,g])=>groupScope(g,o)).map(([id])=>id),scopeIds=allScopeIds.filter(id=>!o.serviceKey||valid.get(id).serviceKey===o.serviceKey);
  const ownership=A().ownership(d),usable=id=>setupAllowed(d,id,o,ownership,valid.get(id));
   const settings=config(d),changes=[],issues=[];
  if(o.walkOrder){
   const areaId=str(o.areaId),actual=equipmentOrder(d,areaId).map(e=>String(e.id)),order=ids(o.walkOrder);
   if(!areaId||order.length!==actual.length||new Set(order).size!==order.length||order.some(id=>!actual.includes(id)))return fail('ORDER_INVALID','Порядок должен содержать все оборудование выбранного участка ровно один раз');
   settings.walkOrder={...settings.walkOrder,[areaId]:order};
  }
  if(o.timing){
   const n=o.timing,old=JSON.stringify([settings.serviceMinutes,settings.transitionMinutes]);
   if(str(n.minutes)!==''){
    if(!o.serviceKey||!number(n.minutes,0.1,1440))return fail('TIME_INVALID','Выберите вид обслуживания и укажите норматив минут от 0,1 до 1440');
    settings.serviceMinutes={...settings.serviceMinutes,[o.serviceKey]:Number(n.minutes)};
   }
   if(str(n.transitionMinutes)!==''){if(!number(n.transitionMinutes,0,120))return fail('TIME_INVALID','Время перехода 0–120 мин');settings.transitionMinutes=Number(n.transitionMinutes)}
   if(old!==JSON.stringify([settings.serviceMinutes,settings.transitionMinutes])&&arr(d.routes).some(r=>D().typed(r)&&locked(d,r)))return fail('TIME_LOCKED','Сначала завершите или снимите открытые задания перед изменением общих норм времени');
   settings.splitLargeJobs=n.splitLargeJobs===true;settings.balance=n.balance===true;
  }
  if(o.walkOrder||o.timing)d.routeAutomation=settings;
  if(o.policy){
   const p=o.policy,chosen=uniq(p.taskIds);
   if(!chosen.length||chosen.some(id=>!scopeIds.includes(id)||!usable(id)))return fail('POLICY_SCOPE','Выберите доступные мероприятия без открытого задания');
   for(const id of chosen){
    const t=ix.get(id).task,s=A().scheduleFor(t),old=policy(t,d),next={...old,key:D().signature(t,d,ix)};
    if(p.access==='normal'||p.access==='ppr')next.access=p.access;
    if(str(p.earlyDays)!==''){
     const limit=s.kind==='runtime_hours'?0:Math.min(90,s.kind==='days'?s.value-1:28*s.value-1);
     if(!integer(p.earlyDays,0,limit)||Number(p.earlyDays)>0&&!str(p.earlyReason)){const c=ix.get(id),name=[c?.eq?.name,c?.lp?.name].filter(Boolean).join(' · ')||id;return {...fail('EARLY_INVALID',Number(p.earlyDays)>0&&!str(p.earlyReason)?'Укажите основание досрочного допуска или оставьте поле дней пустым.':s.kind==='runtime_hours'?'Для обслуживания по моточасам нельзя задать досрочный допуск. Выберите подходящие календарные мероприятия.':'Досрочный допуск превышает допустимый для интервала. Уменьшите число дней или выберите подходящие мероприятия.'),details:[{taskId:id,message:name+' · '+(s.label||s.key)+' · максимально '+limit+' дн.'}]}}
     next.earlyDays=Number(p.earlyDays);next.earlyReason=next.earlyDays?str(p.earlyReason):'';
    }
    if(str(p.minutes)!==''){if(!number(p.minutes,0,1440))return fail('TIME_INVALID',id+': время 0–1440 мин');next.minutes=Number(p.minutes)}
    t.routePolicy=next;changes.push({taskId:id,action:'policy',detail:'Условия, окно и время'});
   }
  }
  for(const id of allScopeIds){
   const t=ix.get(id).task,existingBasis=D().parseBasis(t,d,ix),requested=o.batchByKey?.get(valid.get(id)?.key)?.initial;if(existingBasis.ok){if(requested?.planningMode==='calendar_runtime'&&requested.date&&requested.confirmCalendar===true&&(existingBasis.planningMode!=='calendar_runtime'||existingBasis.maxHoursPerDay!==Number(requested.maxHoursPerDay)))return fail('MODE_CHANGE_CONFIRM','Измените существующий способ планирования в общих настройках срока маршрута');continue}
   if(!usable(id)){issues.push({taskId:id,message:'Срок защищён назначением или ручным маршрутом'});continue}
   let b=o.recoverHistory?historyFor(t,d,ix):null,source=b?'Подтверждённый факт '+b.lastRunId:'';
   const s=A().scheduleFor(t),key=D().signature(t,d,ix),initial=o.batchByKey?.get(valid.get(id)?.key)?.initial||o.initial||{};
   if(s.kind==='runtime_hours'&&initial.planningMode==='calendar_runtime'&&initial.date){b=null;source=''}
   if(!b&&s.kind==='runtime_hours'&&initial.planningMode==='calendar_runtime'&&str(initial.date)){
    const row=o.batchByKey?.get(valid.get(id)?.key),made=D().makeCalendarBasis(t,d,ix,{...initial,ppr:row?row.mode==='ppr':W().requiresPpr(row?.routeId,d)});if(!made.ok)return made;b=made.basis;source='Подтверждённый календарный цикл по наработке';
   }
   if(!b&&s.kind!=='runtime_hours'&&str(initial.date)){
    const date=D().day(initial.date);if(!date||initial.mode==='last'&&date>D().today())return fail('INITIAL_DATE','Некорректная исходная дата');
    b={key,nextDate:initial.mode==='last'?P().addInterval(date,s):date};source=initial.mode==='last'?'Введённая дата последнего обслуживания':'Введённый следующий срок';
   }
   if(!b&&s.kind==='runtime_hours'&&str(initial.equipmentId)&&String(ix.get(id)?.eq?.id)===str(initial.equipmentId)){
    const date=D().day(initial.readingDate),rate=str(initial.hoursPerDay)===''?0:Number(initial.hoursPerDay);
    if(!date||date>D().today()||!number(initial.lastHours,0,1e12)||!number(initial.readingHours,Number(initial.lastHours),1e12)||!number(rate,0,24)||initial.confirmMeter!==true)return fail('METER_INITIAL','Подтвердите общий счётчик выбранного оборудования, последнее обслуживание, текущее показание и дату');
    b={key,nextHours:Number(initial.lastHours)+s.value,readingHours:Number(initial.readingHours),readingDate:date,hoursPerDay:rate};source='Явно введённые показания общего счётчика';
   }
   if(b){const written=D().writeBasis(t,b,d,ix,{initialOnly:true});if(!written.ok)return {...written,reason:written.message};if(written.changed)changes.push({taskId:id,action:'basis',detail:source,value:b.nextDate||b.nextHours})}
  }
  return{ok:true,changes,issues};
 }
 // Split only proposed jobs, not the permanent route or existing plans.
 // Keep all tasks of a physical point together within an access class.
 function partition(route,groups,d,index=null){
  const c=config(d),max=c.splitLargeJobs?Math.max(0,...arr(W()?.settings(d)?.shifts).filter(s=>!s.legacyAggregate).map(s=>s.minutesPerWorker)):0;
  const ix=index||E().contextIndex(d),out=[];
  for(const g of groups){
   const buckets=new Map();
   for(const e of g.entries){
    const ppr=ix.get(String(e.taskId))?.task?.routePolicy?.access==='ppr'||W()?.requiresPpr(route.id,d),k=ppr?'ppr':'normal';
    if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(e);
   }
   for(const [access,entries] of buckets){
    const units=new Map();for(const e of entries){const k=String(ix.get(e.taskId)?.lp?.id||e.taskId);if(!units.has(k))units.set(k,[]);units.get(k).push(e)}
    let chunk=[];
    const emit=()=>{if(chunk.length)out.push({...g,access,entries:chunk,taskIds:chunk.map(x=>x.taskId)});chunk=[]};
    for(const unit of units.values()){if(max&&chunk.length&&duration(route,[...chunk,...unit].map(x=>x.taskId),d,ix)>max)emit();chunk.push(...unit)}
    emit();
   }
  }
  return out;
 }
 // Forecast only. A projection repeats the current obligation on an assumed
 // successful future cadence; it NEVER creates plan items or facts.
 // Shared read-only daily projection for the calendar and weekly workload.
 // Pending obligations are displayed by the plan, never counted a second time.
 function projectRange({startDate,endDate,lineId='',areaId='',groupKey='',groupKeys=null,includeReserved=false}={},d=db()){
  if(!d||!D().day(startDate)||!D().day(endDate)||startDate>endDate)return fail('FORECAST_RANGE','Некорректный период прогноза');
  const start=[startDate,D().today()].sort().at(-1),end=endDate,shared=E().validationContext?.(d),ix=shared?.contexts||E().contextIndex(d),unknown=[],seen=new Set(),jobs=new Map(),cfg=W().settings(d);
  const pending=new Map();for(const item of arr(d.routePlanItems).filter(x=>['planned','in_progress'].includes(x.status)))for(const id of arr(item.taskIds))pending.set(String(id),item);
  const pprRoutes=new Set(W().pprSettings(d).pprRouteIds),pprPhases=new Map(W().pprSettings(d).ppr.map(p=>[p.lineId,p.anchorDate]));
  const routes=E().routeEntries(d,{preview:false}).filter(r=>r.status!=='archived'&&D().typed(r)&&groupScope(r,{lineId,areaId,groupKey,groupKeys}));
  for(const r of routes){
   const report=E().validateRoute(r.id,d,shared),bad=new Map(report.errors.filter(x=>x.taskId).map(x=>[String(x.taskId),x]));
   if(r.status!=='active'||report.errors.some(x=>!x.taskId)){unknown.push({routeId:r.id,name:r.name,message:r.status==='draft'?'Черновик: настройте сроки и активируйте маршрут':'Маршрут не готов'});continue}
   for(const id of ids(r.taskIds)){
    if(bad.has(id)){unknown.push({taskId:id,routeId:r.id,message:bad.get(id).message});continue}
    if(seen.has(id)){unknown.push({taskId:id,routeId:r.id,message:'Дублирующее назначение'});continue}seen.add(id);
    const t=ix.get(id)?.task,b=t&&D().dueFor(t,d,ix);
    if(!b?.ok||!b.dueDate){unknown.push({taskId:id,routeId:r.id,message:b?.message||'Нет прогноза наработки'});continue}
    const runtime=b.kind==='runtime_hours',ppr=t?.routePolicy?.access==='ppr'||pprRoutes.has(String(r.id)),anchor=pprPhases.get(String(r.lineId)),p=policy(t,d,ix);
    const earlyDays=!runtime&&p.earlyReason&&integer(p.earlyDays,1,Math.min(90,b.kind==='days'?b.interval-1:28*b.interval-1))?p.earlyDays:0;
    const existing=pending.get(id),reservedTask=!!existing||A().runningTask(d,id),step=runtime&&b.hoursPerDay>0?Math.max(1,Math.ceil(b.interval/b.hoursPerDay)):0;
    let due=b.dueDate,display=[due,start].sort().at(-1),n=0,phase={cycleAnchor:t.routeDue?.cycleAnchor||b.dueDate,cycleTarget:t.routeDue?.cycleTarget||b.dueDate};
    while((display<=end||(n===0&&earlyDate(t,d,due)<=end&&start<=end))&&n<400){
     if(n>0||!reservedTask||includeReserved){
      const earliest=[earlyDate(t,d,due),start].sort().at(-1);
      const suggested=ppr&&anchor?W().nextPprFromAnchor(anchor,earliest):'';
      const pprConflict=ppr&&(!suggested||suggested>due||cfg&&!cfg.weekdays.includes(new Date(suggested+'T00:00:00Z').getUTCDay()||7));
      const calendarDate=display>end&&earliest<=end?earliest:display;
      const cycleTarget=r.cycleMode==='fixed_weekly'&&!runtime?phase.cycleTarget:'',cycleConflict=!!cycleTarget&&cycleTarget>due;
      const k=JSON.stringify([r.id,calendarDate,due,ppr,n===0,cycleTarget]);
      if(!jobs.has(k))jobs.set(k,{r,date:calendarDate,due,entries:[],ppr,pprConflict:false,suggested,repeat:n>0,runtime,cycleTarget,cycleConflict,overdue:due<D().today()});
      const job=jobs.get(k);job.entries.push({taskId:id});job.pprConflict||=pprConflict;if(suggested>job.suggested)job.suggested=suggested;
     }
     n++;
     // For a pending job forecast subsequent cycles after its proposed execution,
     // but leave its first obligation visible only as the actual plan item.
     const assumed=n===1&&existing?[display,W().effectiveDate(existing)].sort().at(-1):display;
     if(runtime){if(!step)break;due=add(assumed,step)}
     else {const next=D().calendarStep(assumed,{...b,dueDate:due},r,phase);due=next.nextDate;phase={...phase,...next}}
     if(!due||due<=display)break;display=due;
    }
   }
  }
  const occurrences=[];
  for(const j of jobs.values()){
   const chunks=partition(j.r,[{date:j.date,entries:j.entries}],d,ix);
   for(const c of chunks)occurrences.push({routeId:j.r.id,routeName:j.r.name||j.r.code||j.r.id,lineId:j.r.lineId,date:j.date,technicalDate:j.due,taskIds:c.taskIds,minutes:duration(j.r,c.taskIds,d,ix),ppr:j.ppr,pprConflict:j.pprConflict,suggestedPpr:j.suggested,repeat:j.repeat,runtime:j.runtime,cycleTarget:j.cycleTarget,cycleConflict:j.cycleConflict,overdue:j.overdue});
  }
  occurrences.sort((a,b)=>a.date.localeCompare(b.date)||a.routeName.localeCompare(b.routeName,'ru'));
  return{ok:true,startDate,endDate,occurrences,unknown,projected:true};
 }
 function forecast({weeks=12,startDate=D().today(),lineId='',areaId='',groupKey='',groupKeys=null}={},d=db()){
  if(![4,12,26,52].includes(Number(weeks))||!D().day(startDate))return fail('FORECAST_RANGE','Выберите 4, 12, 26 или 52 недели');
  const start=W().rangeFor('week',startDate).startDate,end=add(start,Number(weeks)*7-1),rows=Array.from({length:Number(weeks)},(_,i)=>({startDate:add(start,i*7),endDate:add(start,i*7+6),minutes:0,tasks:0,runtimeTasks:0,pprConflicts:0,capacity:null}));
  const p=projectRange({startDate:start,endDate:end,lineId,areaId,groupKey,groupKeys,includeReserved:true},d);if(!p.ok)return p;
  const cfg=W().settings(d);
  for(const x of p.occurrences){const row=rows.find(w=>x.date>=w.startDate&&x.date<=w.endDate);if(!row)continue;row.minutes+=x.minutes;row.tasks+=x.taskIds.length;if(x.runtime)row.runtimeTasks+=x.taskIds.length;if(x.pprConflict)row.pprConflicts++}
  for(const row of rows){if(cfg)row.capacity=cfg.weekdays.length*cfg.shifts.reduce((n,x)=>n+x.minutes,0);row.overloadMinutes=row.capacity==null?null:Math.max(0,row.minutes-row.capacity)}
  return{...p,weeks:rows};
 }
 // Compare the next obligation and one hypothetical later cycle with the PPR phase.
 function pprSummary(route,d,anchor,firstPpr){
  const ix=E().contextIndex(d),byDate=new Map(),unknown=[];
  for(const id of ids(route.taskIds)){
   const t=ix.get(id)?.task,b=t&&D().dueFor(t,d,ix);
   if(!b?.ok||!b.dueDate){unknown.push(id);continue}
   const dates=[{date:b.dueDate,projected:false}];
   if(b.kind!=='runtime_hours'){const later=P().addInterval(b.dueDate,{kind:b.kind,value:b.interval});if(later)dates.push({date:later,projected:true})}
   for(const x of dates){
    const earliest=b.kind==='runtime_hours'?x.date:earlyDate(t,d,x.date),start=earliest<D().today()?D().today():earliest;
    const suggested=W().nextPpr(String(route.lineId),start,d),conflict=!suggested||suggested>x.date;
    const k=JSON.stringify([x.date,x.projected,suggested,conflict]);if(!byDate.has(k))byDate.set(k,{...x,suggested,conflict,count:0});byDate.get(k).count++;
   }
  }
  return{anchor,firstPpr,dates:[...byDate.values()].sort((a,b)=>a.date.localeCompare(b.date)||Number(a.projected)-Number(b.projected)),unknown:unknown.length,capacityConfigured:!!W().settings(d)};
 }
 // R8: one selection table, one transactional reconcile for all checked groups.
 function candidates(o={},d=db()){
  if(!d)return fail('DATABASE_MISSING','База недоступна');
  const report=reconcile(d,{lineId:o.lineId||'',areaId:o.areaId||'',activateReady:true});
  if(!report.ok)return report;
  const index=E().contextIndex(d),routes=new Map(arr(d.routes).map(r=>[String(r.id),r])),phases=new Map(W().pprSettings(d).ppr.map(x=>[x.lineId,x.anchorDate]));
  return {...report,groups:report.groups.map(g=>{
   const r=routes.get(String(g.routeId)),anchor=phases.get(String(g.lineId))||'',m=/^days:(\d+)$/.exec(g.scheduleKey),weeks=m&&Number(m[1])%7===0?Number(m[1])/7:0;
   return {...g,weeks,locked:!!r&&locked(d,r)||g.action==='blocked',routeMode:r&&W().requiresPpr(r.id,d)?'ppr':'normal',cycleMode:r?.cycleMode==='fixed_weekly'?'fixed_weekly':'actual',existingMeter:!!r&&arr(r.taskIds).some(id=>D().parseBasis(index.get(String(id))?.task||{},d,index).kind==='runtime_hours'),scheduleDefaults:r?.scheduleDefaults||null,pprAnchor:anchor,nextPpr:anchor?W().nextPprFromAnchor(anchor,D().today()):''};
  })};
 }
 function prepareBatch(o,work,info){
  if(!Array.isArray(o.batch)||!o.batch.length)return fail('GROUP_SCOPE','Выберите хотя бы один маршрут');
  if(o.groupKey||o.pprMode||o.groupKeys)return fail('GROUP_SCOPE','Выберите только один способ задания охвата');
  const known=new Map([...info.valid.values()].map(g=>[g.key,g]));
  for(const r of arr(work.routes))if(r.status!=='archived'&&D().typed(r)&&!known.has(A().routeKey(r)))known.set(A().routeKey(r),r);
  const existing=A().ownership(work),map=new Map(),phases=new Map(W().pprSettings(work).ppr.map(x=>[x.lineId,x.anchorDate]));
  for(const row of o.batch){
   const key=str(row?.key),g=known.get(key),rs=existing.byGroup.get(key)||[];
   if(!g||map.has(key)||!scope(g,o))return fail('GROUP_SCOPE','Неверный, повторный или устаревший маршрут в выборе');
   if(rs.length>1||rs.some(r=>r.source!=='auto'||!D().typed(r)))return fail('GROUP_SCOPE','Ручной или неоднозначный маршрут защищён');
   const r=rs[0],mode=str(row.pprMode),cycle=str(row.cycleMode),savedMode=r&&W().requiresPpr(r.id,work)?'ppr':'normal',savedCycle=r?.cycleMode==='fixed_weekly'?'fixed_weekly':'actual';
   if(mode&&!['normal','ppr'].includes(mode)||cycle&&!['actual','fixed_weekly'].includes(cycle))return fail('CYCLE_INVALID','Некорректный режим маршрута');
   const m=/^days:(\d+)$/.exec(g.scheduleKey),weekly=!!m&&Number(m[1])>0&&Number(m[1])%7===0;
   if(cycle==='fixed_weekly'&&!weekly&&!(g.scheduleKey.startsWith('runtime_hours:')&&row.initial?.planningMode==='calendar_runtime'))return fail('CYCLE_INVALID','Фиксированный недельный цикл возможен только для целого числа недель');
   if(r&&locked(work,r))return fail('ROUTE_LOCKED','Сначала завершите или снимите открытое задание '+(r.name||r.id));
   let initial={...(o.initial||{}),...(row.initial||{})};
   if(initial.mode&&!['next','last'].includes(initial.mode))return fail('INITIAL_DATE','Некорректное основание даты');
   if(str(initial.date)&&(!D().day(initial.date)||initial.mode==='last'&&initial.date>D().today()))return fail('INITIAL_DATE','Некорректная исходная дата');
   if(g.scheduleKey.startsWith('runtime_hours:')&&initial.planningMode!=='calendar_runtime')initial.date='';
   const effectiveMode=mode||savedMode,anchor=phases.get(String(g.lineId))||'';
   if(effectiveMode==='ppr'&&!anchor)return fail('PPR_ANCHOR_REQUIRED','Сначала задайте дату отсчёта ППР линии в настройках предприятия');
   if(effectiveMode==='ppr'&&!initial.date&&initial.mode!=='last'&&(!g.scheduleKey.startsWith('runtime_hours:')||initial.planningMode==='calendar_runtime'))initial={...initial,mode:'next',date:W().nextPprFromAnchor(anchor,D().today())};
   map.set(key,{key,g,initial,mode:effectiveMode,cycle,anchor,routeId:r?.id});
  }
  return{ok:true,map,options:{...o,groupKeys:[...map.keys()],batchByKey:map}};
 }
 function simulate(o={},d=db()){
  if(!d)return fail('DATABASE_MISSING','База недоступна');
  let work=copy(d);
  if(o.workloadSettings){const res=W().saveSettings(o.workloadSettings,work,{persist:false});if(!res.ok)return res;work=res.database||work}
  const info=eligible(work);if(!info.ok)return fail('QA_MISSING','Инженерный контроль недоступен');
  const batch=o.batch!==undefined?prepareBatch(o,work,info):null;
  if(batch&&!batch.ok)return batch;
  if(batch)o=batch.options;
  if(o.groupKey&&![...info.valid.values(),...arr(work.routes).filter(r=>r.status!=='archived')].some(g=>groupScope(g,o)))return fail('GROUP_SCOPE','Выберите актуальный маршрут в выбранном участке');
   const group=o.groupKey&&[...info.valid.values(),...arr(work.routes).filter(r=>r.status!=='archived')].find(g=>groupScope(g,o)),pprMode=str(o.pprMode);
   let anchor='',firstPpr='';
   if(pprMode){
    if(!group||!['normal','ppr'].includes(pprMode))return fail('PPR_SCOPE_INVALID','Выберите один маршрут для настройки режима ППР');
    const existing=arr(work.routes).filter(r=>r.status!=='archived'&&A().routeKey(r)===o.groupKey);
    if(existing.length>1||existing.some(r=>r.source!=='auto'||!D().typed(r)))return fail('PPR_SCOPE_INVALID','Ручной или неоднозначный маршрут защищён');
    if(existing.some(r=>locked(work,r)&&W().requiresPpr(r.id,work)!==(pprMode==='ppr')))return fail('PPR_ROUTE_LOCKED','Сначала завершите или снимите открытые задания маршрута');
    if(pprMode==='ppr'){
     const saved=W().pprSettings(work).ppr.find(x=>x.lineId===String(group.lineId));
     const given=D().day(o.pprAnchorDate);
     if(saved&&str(o.pprAnchorDate)&&given!==saved.anchorDate)return fail('PPR_PHASE_LOCKED','Дата ППР уже задана для линии. Изменяйте её в общих настройках');
     anchor=saved?.anchorDate||given;
     if(!anchor)return fail('PPR_ANCHOR_REQUIRED','Укажите известную дату отсчёта ППР линии');
     const start=!saved&&anchor>D().today()?anchor:D().today();
     firstPpr=W().nextPprFromAnchor(anchor,start);
    }
   }
   const init=o.initial||{};
   const useFirst=pprMode==='ppr'&&o.initialFromPpr===true&&!str(init.date)&&init.mode!=='last'&&!group.scheduleKey.startsWith('runtime_hours:');
   const prep=setup(work,useFirst?{...o,initial:{...init,mode:'next',date:firstPpr}}:o,info);if(!prep.ok)return prep;
  const options={lineId:o.lineId||'',areaId:o.areaId||'',groupKey:o.groupKey||'',...(batch?{groupKeys:o.groupKeys}:{}),applyOrder:o.applyOrder===true,activateReady:o.activateReady===true};
  const report=reconcile(work,options);
  if(!report.ok)return report;
  if(batch&&report.groups.some(g=>g.action==='blocked'))return {...fail('GROUP_BLOCKED','Выбранные группы требуют уточнения. Снимите выбор защищённых маршрутов или устраните конфликт состава.'),report};
  const result=E().applyAutoGrouping(options,report.token,work,{persist:false});
  if(!result.ok)return fail('RECONCILE_FAILED',result.reason||'Проверка состава не пройдена');
  let next=result.database||work,plan=null,allocation=null,preparation=[],ppr=null;
   if(pprMode){
    const route=arr(next.routes).find(r=>r.status!=='archived'&&r.source==='auto'&&D().typed(r)&&groupScope(r,o));
    if(!route&&pprMode==='ppr')return fail('PPR_SCOPE_INVALID','Нет доступного маршрута для настройки ППР. Проверьте готовность и защищённые назначения');
    if(route){
     const saved=W().saveRoutePpr(route.id,pprMode,anchor,next,{persist:false});if(!saved.ok)return saved;
     next=saved.database||next;if(saved.changed)prep.changes.push({taskId:route.id,action:'ppr',detail:pprMode==='ppr'?'Только ППР своей линии':'Обычный график маршрута',value:pprMode==='ppr'?anchor:''});
     if(pprMode==='ppr')ppr=pprSummary(route,next,anchor,firstPpr);
    }
   }
  const batchSchedules=[];
  if(batch){
   for(const row of batch.map.values()){
    let route=arr(next.routes).find(r=>r.status!=='archived'&&r.source==='auto'&&D().typed(r)&&A().routeKey(r)===row.key);
    if(!route)continue; // groups excluded or archived by the canonical reconciliation
    const existingMode=W().requiresPpr(route.id,next)?'ppr':'normal';
    if(row.mode&&row.mode!==existingMode){
     const saved=W().saveRoutePpr(route.id,row.mode,row.anchor,next,{persist:false});if(!saved.ok)return saved;
     next=saved.database||next;if(saved.changed)prep.changes.push({taskId:route.id,action:'ppr',detail:row.mode==='ppr'?'Только ППР своей линии':'Обычный график маршрута',value:row.anchor});
     route=arr(next.routes).find(r=>r.id===route.id);
    }
    if(row.cycle&&row.cycle!==(route.cycleMode||'actual')){
     if(locked(next,route))return fail('ROUTE_LOCKED','Открытые задания защищают цикл маршрута');
     route.cycleMode=row.cycle;
     // A new explicitly selected fixed cycle starts from each existing next date.
     for(const t of arr(next.tasks).filter(t=>arr(route.taskIds).includes(String(t.id))&&t.routeDue?.nextDate)){
      if(row.cycle==='fixed_weekly'){t.routeDue.cycleAnchor=t.routeDue.nextDate;t.routeDue.cycleTarget=t.routeDue.nextDate;}
      else {delete t.routeDue.cycleAnchor;delete t.routeDue.cycleTarget;}
     }
     E().ensureRouteRevision(route.id,next,{note:'Изменён режим недельного цикла',reason:'route_cycle'});prep.changes.push({taskId:route.id,action:'cycle',detail:row.cycle==='fixed_weekly'?'Фиксированный недельный цикл':'От фактического выполнения',value:''});
    }
    if(row.initial.planningMode==='calendar_runtime'&&row.initial.confirmCalendar===true&&row.initial.date){const defaults={planningMode:'calendar_runtime',maxHoursPerDay:Number(row.initial.maxHoursPerDay),confirmCalendar:true};if(JSON.stringify(route.scheduleDefaults)!==JSON.stringify(defaults)){route.scheduleDefaults=defaults;E().ensureRouteRevision(route.id,next,{note:'Подтверждён календарный режим по наработке',reason:'schedule'});prep.changes.push({taskId:route.id,action:'schedule',detail:'Календарное планирование по наработке',value:defaults.maxHoursPerDay})}}
    const pprOnly=W().requiresPpr(route.id,next),phase=row.anchor;
    if(pprOnly){const summary=pprSummary(route,next,phase,W().nextPprFromAnchor(phase,D().today()));batchSchedules.push({routeId:route.id,name:route.name,cycleMode:route.cycleMode||'actual',...summary});}
    if(pprOnly||arr(route.taskIds).some(id=>taskPpr(id,next))){const issues=D().activationIssues(route,next);if(issues.some(x=>x.code==='PPR_CYCLE'||x.code==='PPR_ANCHOR_REQUIRED'))return {...fail('PPR_CYCLE',issues.find(x=>x.code==='PPR_CYCLE'||x.code==='PPR_ANCHOR_REQUIRED').message),details:issues,report,prep};}
   }
  }
  const selected=arr(next.routes).filter(r=>r.source==='auto'&&D().typed(r)&&r.status==='active'&&groupScope(r,o)).map(r=>r.id);
  if(o.plan){
   const rg=W().range(o.startDate,o.endDate);if(!rg.ok)return rg;
   const po={startDate:rg.startDate,endDate:rg.endDate,routeIds:selected};
   plan=P().commit(po,next,{persist:false});if(!plan.ok)return{...fail('PLAN_BLOCKED',plan.reason),report,prep,plan:plan.preview};
   next=plan.database||next;
   const routes=new Map(E().routeEntries(next,{preview:false}).map(r=>[r.id,r])),previous=new Set(arr(d.routePlanItems).map(x=>x.id)),shared=E().validationContext?.(next);
   for(const item of arr(next.routePlanItems).filter(x=>!previous.has(x.id)&&x.planningBasis==='task_due')){const route=routes.get(item.routeId),selectedRoute=route&&D().selectRoute(route,item,next),p=selectedRoute&&global.LubricaRoutePreparation?.build?.(selectedRoute,next,shared);if(p)preparation.push({routeName:item.routeName,ready:p.ready,text:item.plannedDate+' · '+arr(p.materials).map(m=>[m.code||m.name,m.total,m.baseUnit].filter(x=>x!==''&&x!=null).join(' ')).join('; ')+(p.warnings?.length?' · замечаний: '+p.warnings.length:'')+(p.errors?.length?' · ошибок: '+p.errors.length:'')})}
   if(preparation.some(x=>!x.ready))return{...fail('PREPARATION_BLOCKED','Не все задания готовы по материалам и нормам. Исправьте замечания или снимите флажок формирования плана.'),report,prep,plan:plan.preview,preparation};
   if(o.allocate){
    const wo={...po,allowDelay:o.allowDelay===true,reason:str(o.delayReason)};
    allocation=W().preview(wo,next);if(!allocation.ok)return{...allocation,report,prep,plan:plan.preview};
    const a=W().apply(wo,allocation.token,next,{persist:false});if(!a.ok)return a;next=a.database||next;
   }
  }
  return{ok:true,report,prep,ppr,batchSchedules,plan:plan?{created:plan.created,preview:plan.preview}:null,preparation,allocation,forecast:o.forecast===false?null:forecast({weeks:Number(o.forecastWeeks)||12,lineId:o.lineId,areaId:o.areaId,groupKey:o.groupKey,groupKeys:o.groupKeys},next),database:next};
 }
 function preview(o={},d=db()){
  const result=simulate(o,d);if(!result.ok)return result;
  const {database,...rest}=result;return{...rest,token:JSON.stringify([D().today(),o,d])};
 }
 function apply(o,token,d=db()){
  if(!d||!token||token!==JSON.stringify([D().today(),o,d]))return fail('STALE_PREVIEW','Данные изменились. Повторите предварительный просмотр');
  const result=simulate(o,d);if(!result.ok)return result;
  if(JSON.stringify(result.database)!==JSON.stringify(d)){global.LubricaCore.State.setDatabase(result.database);global.LubricaApp?.refreshFromCore?.()}
  const {database,...rest}=result;return rest;
 }
 global.LubricaRouteAutomation=Object.freeze({eligible,candidates,setupAllowed,config,equipmentOrder,policy,taskPpr,taskMinutes,duration,earlyDate,allowedEarliest,reconcile,historyFor,partition,projectRange,forecast,preview,apply});
})(window);
