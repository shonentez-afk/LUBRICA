"use strict";
/* R5: explicit, transactional route preparation. No equipment-family grouping,
   no fabricated history, no silent changes to engineering norms or open work. */
(function(global){
 const arr=x=>Array.isArray(x)?x:[],str=x=>String(x??'').trim(),ids=x=>arr(x).map(String),uniq=x=>[...new Set(ids(x))],copy=x=>JSON.parse(JSON.stringify(x));
 const E=()=>global.LubricaRouteEngine,A=()=>global.LubricaRouteAutoGrouping,D=()=>global.LubricaRouteDue,W=()=>global.LubricaRouteWorkload,P=()=>global.LubricaRoutePlanning;
 const db=()=>global.LubricaCore?.State?.getDatabase?.(),fail=(code,message)=>({ok:false,code,message,reason:message});
 const scope=(x,o={})=>(!o.lineId||String(x?.lineId)===String(o.lineId))&&(!o.areaId||String(x?.areaId)===String(o.areaId));
 const integer=(v,min,max)=>str(v)!==''&&Number.isInteger(Number(v))&&Number(v)>=min&&Number(v)<=max;
 const number=(v,min,max)=>str(v)!==''&&Number.isFinite(Number(v))&&Number(v)>=min&&Number(v)<=max;
 const add=(date,n)=>P().addInterval(date,{kind:'days',value:n});
 const locked=(d,r)=>arr(d.routePlanItems).some(x=>String(x.routeId)===String(r.id)&&(!['completed','cancelled'].includes(x.status)||x.runId&&x.status==='planned'))||arr(d.checklistRuns).some(x=>String(x.routeId)===String(r.id)&&x.status==='in_progress');
 const reserved=(d,id)=>arr(d.routePlanItems).some(x=>['planned','in_progress'].includes(x.status)&&ids(x.taskIds).includes(id))||arr(d.checklistRuns).some(x=>x.status==='in_progress'&&ids(x.routeTaskIds).includes(id));
 const ownedByManual=(d,id)=>arr(d.routes).some(r=>r.status!=='archived'&&(r.source!=='auto'||!D().typed(r))&&ids(r.taskIds).includes(id));
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
  const s=A().scheduleFor(t),p=policy(t,d);
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
  const {ix,valid}=info,issues=info.issues.filter(x=>scope(ix.get(x.taskId),o)),working=arr(d.routes).filter(r=>r.status!=='archived'),owners=new Map(),groups=new Map(),routeByKey=new Map(),excluded=new Set();
  const key=r=>A().routeKey(r),editable=r=>r&&r.source==='auto'&&D().typed(r)&&['active','draft'].includes(r.status)&&scope(r,o)&&!locked(d,r);
  const issue=(id,code,message,routeId='')=>issues.push({taskId:id,code,message,routeId});
  for(const r of working){for(const id of uniq(r.taskIds)){if(!owners.has(id))owners.set(id,[]);owners.get(id).push(r)}
   for(const id of uniq(r.excludedTaskIds))excluded.add(id);
   if(key(r)){if(!routeByKey.has(key(r)))routeByKey.set(key(r),[]);routeByKey.get(key(r)).push(r)}
  }
  for(const [id,g] of valid){if(!scope(g,o))continue;if(!groups.has(g.key))groups.set(g.key,{...g,ids:[]});groups.get(g.key).ids.push(id)}
  for(const r of working){if(!D().typed(r)||!scope(r,o))continue;const k=key(r);if(!groups.has(k))groups.set(k,{key:k,lineId:r.lineId,areaId:r.areaId,name:r.name||r.code||r.id,groupingMode:r.groupingMode,serviceKey:r.serviceKey,serviceLabel:r.serviceLabel,scheduleKey:r.scheduleKey,interval:r.interval,ids:[]})}
  const blocked=new Map();
  for(const [k,rs] of routeByKey){
   if(rs.length>1)blocked.set(k,'Несколько маршрутов одной группы');
   else if(!editable(rs[0]))blocked.set(k,'Ручной маршрут, другой охват или незавершённое задание');
   else if(uniq(rs[0].taskIds).length!==arr(rs[0].taskIds).length||uniq(rs[0].taskIds).some(id=>(owners.get(id)||[]).length>1||excluded.has(id)||reserved(d,id)))blocked.set(k,'Дубли или противоречивые ручные исключения');
  }
  let changed=true;
  while(changed){changed=false;for(const [k,rs] of routeByKey){
   if(blocked.has(k)||!editable(rs[0]))continue;
   for(const id of uniq(rs[0].taskIds)){
    const target=valid.get(id);if(target&&target.key!==k&&(!scope(target,o)||blocked.has(target.key))){blocked.set(k,'Перенос '+id+' требует доступного маршрута назначения в выбранном охвате');changed=true;break}
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
    if(reserved(d,id)&&!old.includes(id)){issue(id,'TASK_RESERVED','Есть открытое задание',own[0]?.id);continue}
    desired.push(id);
   }
   const ds=new Set(desired),removed=old.filter(id=>!ds.has(id)),adds=desired.filter(id=>!old.includes(id)).sort(compare(d,ix,g.areaId));
   let next=[...old.filter(id=>ds.has(id)),...adds];
   if(!r||o.applyOrder===true)next.sort(compare(d,ix,g.areaId));
   const basisMissing=next.filter(id=>!D().parseBasis(ix.get(id).task,d,ix).ok);
   const nextStatus=r?.status==='active'&&basisMissing.length===0?'active':o.activateReady===true&&next.length&&!basisMissing.length?'active':'draft';
   const contentSig=JSON.stringify(next.map(id=>{const c=ix.get(id),t=c?.task;return [id,t?.materialId,t?.materialName,t?.materialMode,t?.quantity,t?.toolId,c?.lp?.targetMaterialId,rawPolicy(t),taskMinutes(t,d,r||g,ix),config(d).transitionMinutes]}));
   const different=JSON.stringify(old)!==JSON.stringify(next),metadataChanged=!!r&&r.automationContent!==contentSig;
   let action='none',why='';
   if(reason){if(adds.length||removed.length||rs.length>1||metadataChanged||o.applyOrder===true&&different){action='blocked';why=reason}}
   else if(!next.length&&r){action='archive';why='В группе не осталось готовых мероприятий; история сохранится'}
   else if(!r&&next.length)action='create';
   else if(r&&next.length&&(different||metadataChanged||r.status!==nextStatus)){action='update';if(nextStatus==='draft'&&r.status==='active')why='Новые/изменённые мероприятия требуют исходных сроков; маршрут станет черновиком';else if(metadataChanged&&!different)why='Сверены материал, нормы, условия и трудоёмкость; будет зафиксирована новая ревизия'}
   if(action==='blocked'){next=old;for(const id of adds)issue(id,'GROUP_BLOCKED',why,r?.id||'')}
   if(action!=='none'||r||next.length)out.push({...g,ids:undefined,action,reason:why,routeId:r?.id||'',currentTaskIds:old,taskIds:action==='archive'?old:next,addTaskIds:action==='blocked'?[]:adds,removeTaskIds:action==='blocked'?[]:removed,invalidTaskIds:removed,basisMissing,contentSig,nextStatus,pointCount:new Set(next.map(id=>ix.get(id)?.lp?.id).filter(Boolean)).size,ownedCount:old.length});
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
   if(s.kind==='runtime_hours'){if(!number(x.runtimeMeterHours,0,1e12))continue;const h=Number(x.runtimeMeterHours);return{key,nextHours:h+s.value,readingHours:h,readingDate:r.date,hoursPerDay:0,lastRunId:r.id,lastServiceDate:r.date}}
   return{key,nextDate:P().addInterval(r.date,s),lastRunId:r.id,lastServiceDate:r.date};
  }
  return null;
 }
 function setup(d,o,info){
  const {ix,valid}=info,scopeIds=[...valid].filter(([id,g])=>scope(g,o)&&(!o.serviceKey||g.serviceKey===o.serviceKey)).map(([id])=>id);
  const usable=id=>!reserved(d,id)&&!ownedByManual(d,id);
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
  d.routeAutomation=settings;
  if(o.policy){
   const p=o.policy,chosen=uniq(p.taskIds);
   if(!chosen.length||chosen.some(id=>!scopeIds.includes(id)||!usable(id)))return fail('POLICY_SCOPE','Выберите доступные мероприятия без открытого задания');
   for(const id of chosen){
    const t=ix.get(id).task,s=A().scheduleFor(t),old=policy(t,d),next={...old,key:D().signature(t,d,ix)};
    if(p.access==='normal'||p.access==='ppr')next.access=p.access;
    if(str(p.earlyDays)!==''){
     const limit=s.kind==='runtime_hours'?0:Math.min(90,s.kind==='days'?s.value-1:28*s.value-1);
     if(!integer(p.earlyDays,0,limit)||Number(p.earlyDays)>0&&!str(p.earlyReason))return fail('EARLY_INVALID',id+': для календарного досрочного окна нужны допустимое число дней и инженерное основание; моточасы не округляются');
     next.earlyDays=Number(p.earlyDays);next.earlyReason=next.earlyDays?str(p.earlyReason):'';
    }
    if(str(p.minutes)!==''){if(!number(p.minutes,0,1440))return fail('TIME_INVALID',id+': время 0–1440 мин');next.minutes=Number(p.minutes)}
    t.routePolicy=next;changes.push({taskId:id,action:'policy',detail:'Условия, окно и время'});
   }
  }
  for(const id of scopeIds){
   const t=ix.get(id).task;if(D().parseBasis(t,d,ix).ok)continue;
   if(!usable(id)){issues.push({taskId:id,message:'Срок защищён назначением или ручным маршрутом'});continue}
   let b=o.recoverHistory?historyFor(t,d,ix):null,source=b?'Подтверждённый факт '+b.lastRunId:'';
   const s=A().scheduleFor(t),key=D().signature(t,d,ix),initial=o.initial||{};
   if(!b&&s.kind!=='runtime_hours'&&str(initial.date)){
    const date=D().day(initial.date);if(!date||initial.mode==='last'&&date>D().today())return fail('INITIAL_DATE','Некорректная исходная дата');
    b={key,nextDate:initial.mode==='last'?P().addInterval(date,s):date};source=initial.mode==='last'?'Введённая дата последнего обслуживания':'Введённый следующий срок';
   }
   if(!b&&s.kind==='runtime_hours'&&str(initial.equipmentId)&&String(ix.get(id)?.eq?.id)===str(initial.equipmentId)){
    const date=D().day(initial.readingDate),rate=str(initial.hoursPerDay)===''?0:Number(initial.hoursPerDay);
    if(!date||date>D().today()||!number(initial.lastHours,0,1e12)||!number(initial.readingHours,Number(initial.lastHours),1e12)||!number(rate,0,24)||initial.confirmMeter!==true)return fail('METER_INITIAL','Подтвердите общий счётчик выбранного оборудования, последнее обслуживание, текущее показание и дату');
    b={key,nextHours:Number(initial.lastHours)+s.value,readingHours:Number(initial.readingHours),readingDate:date,hoursPerDay:rate};source='Явно введённые показания общего счётчика';
   }
   if(b){const prev=t.routeDue;t.routeDue=b;if(!D().parseBasis(t,d,ix).ok){t.routeDue=prev;return fail('BASIS_INVALID',id+': не удалось проверить исходный срок')}changes.push({taskId:id,action:'basis',detail:source,value:b.nextDate||b.nextHours})}
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
 function forecast({weeks=12,startDate=D().today(),lineId='',areaId=''}={},d=db()){
  if(![4,12,26,52].includes(Number(weeks))||!D().day(startDate))return fail('FORECAST_RANGE','Выберите 4, 12, 26 или 52 недели');
  const start=W().rangeFor('week',startDate).startDate,end=add(start,Number(weeks)*7-1),rows=Array.from({length:Number(weeks)},(_,i)=>({startDate:add(start,i*7),endDate:add(start,i*7+6),minutes:0,tasks:0,runtimeTasks:0,pprConflicts:0,capacity:null}));
  const cfg=W().settings(d),shared=E().validationContext?.(d),ix=shared?.contexts||E().contextIndex(d),unknown=[],seen=new Set(),jobs=new Map();
  for(const r of E().routeEntries(d,{preview:false}).filter(r=>r.status==='active'&&D().typed(r)&&scope(r,{lineId,areaId}))){
   if(!E().validateRoute(r.id,d,shared).valid){unknown.push({routeId:r.id,message:'Маршрут не готов'});continue}
   for(const id of ids(r.taskIds)){
    if(seen.has(id)){unknown.push({taskId:id,message:'Дублирующее назначение'});continue}seen.add(id);
    const t=ix.get(id)?.task,b=t&&D().dueFor(t,d,ix);
    if(!b?.ok||!b.dueDate){unknown.push({taskId:id,message:b?.message||'Нет прогноза наработки'});continue}
    let due=b.dueDate<start?start:b.dueDate,n=0;const base=due,step=b.kind==='runtime_hours'&&b.hoursPerDay>0?Math.max(1,Math.ceil(b.interval/b.hoursPerDay)):0;
    while(due&&due<=end&&n<400){
     const week=rows.find(w=>due>=w.startDate&&due<=w.endDate);
     if(week){const ppr=t?.routePolicy?.access==='ppr'||W().requiresPpr(r.id,d),earliest=b.kind==='runtime_hours'?due:earlyDate(t,d,due),k=JSON.stringify([r.id,due,!!ppr]);
      if(!jobs.has(k))jobs.set(k,{r,due,week,ids:[],ppr,earliest});
      const job=jobs.get(k);job.ids.push(id);if(earliest>job.earliest)job.earliest=earliest;week.tasks++;if(b.kind==='runtime_hours')week.runtimeTasks++;
     }
     n++;if(b.kind==='runtime_hours'){if(!step){unknown.push({taskId:id,message:'Нет наработки для прогноза последующих циклов'});break}due=add(base,n*step)}else due=P().addInterval(base,{kind:b.kind,value:b.interval*n});
    }
   }
  }
  for(const j of jobs.values()){
   const chunks=partition(j.r,[{date:j.due,entries:j.ids.map(taskId=>({taskId}))}],d,ix);
   j.week.minutes+=chunks.reduce((n,c)=>n+duration(j.r,c.taskIds,d,ix),0);
   if(j.ppr){let fits=false;for(let x=j.earliest;x&&x<=j.due;x=add(x,1)){if(W().pprOn(j.r.lineId,x,d)&&(!cfg||cfg.weekdays.includes(new Date(x+'T00:00:00Z').getUTCDay()||7))){fits=true;break}}if(!fits)j.week.pprConflicts++}
  }
  for(const row of rows){if(cfg)row.capacity=cfg.weekdays.length*cfg.shifts.reduce((s,x)=>s+x.minutes,0);row.overloadMinutes=row.capacity==null?null:Math.max(0,row.minutes-row.capacity)}
  return{ok:true,startDate:start,endDate:end,weeks:rows,unknown,projected:true};
 }
 function simulate(o={},d=db()){
  if(!d)return fail('DATABASE_MISSING','База недоступна');
  let work=copy(d);
  if(o.workloadSettings){const res=W().saveSettings(o.workloadSettings,work,{persist:false});if(!res.ok)return res;work=res.database||work}
  const info=eligible(work);if(!info.ok)return fail('QA_MISSING','Инженерный контроль недоступен');
  const prep=setup(work,o,info);if(!prep.ok)return prep;
  const options={lineId:o.lineId||'',areaId:o.areaId||'',advanced:true,applyOrder:o.applyOrder===true,activateReady:o.activateReady===true};
  const report=reconcile(work,options);
  if(!report.ok)return report;
  const result=E().applyAutoGrouping(options,report.token,work,{persist:false});
  if(!result.ok)return fail('RECONCILE_FAILED',result.reason||'Проверка состава не пройдена');
  let next=result.database||work,plan=null,allocation=null,preparation=[];
  const selected=arr(next.routes).filter(r=>r.source==='auto'&&D().typed(r)&&r.status==='active'&&scope(r,o)).map(r=>r.id);
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
  return{ok:true,report,prep,plan:plan?{created:plan.created,preview:plan.preview}:null,preparation,allocation,forecast:forecast({weeks:Number(o.forecastWeeks)||12,lineId:o.lineId,areaId:o.areaId},next),database:next};
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
 global.LubricaRouteAutomation=Object.freeze({eligible,config,equipmentOrder,policy,taskPpr,taskMinutes,duration,earlyDate,allowedEarliest,reconcile,historyFor,partition,forecast,preview,apply});
})(window);
