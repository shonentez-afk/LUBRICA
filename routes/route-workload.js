"use strict";
/* R4: administrative work allocation. Engineering dates, taskIds, norms,
   revision and checklist snapshots are NEVER changed by this module. */
(function(global){
 const arr=x=>Array.isArray(x)?x:[],str=x=>String(x??'').trim(),clone=x=>JSON.parse(JSON.stringify(x));
 const db=()=>global.LubricaCore?.State?.getDatabase?.();
 const day=v=>{const s=str(v);if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return'';const d=new Date(s+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===s?s:''};
 const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
 const dateAt=(s,n)=>{const d=new Date(s+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
 const weekday=s=>new Date(s+'T00:00:00Z').getUTCDay()||7;
 const distance=(a,b)=>Math.round((Date.parse(b+'T00:00:00Z')-Date.parse(a+'T00:00:00Z'))/86400000);
 const fail=(code,message)=>({ok:false,code,message});
 const min=x=>{const n=Number(x);return str(x)&&Number.isFinite(n)&&n>0?Math.ceil(n):null};
 const slotKey=(date,shift)=>date+'|'+shift;
 const active=s=>['planned','in_progress','completed'].includes(s);
 function range(start,end){
  const a=day(start),b=day(end);
  if(!a||!b||b<a||distance(a,b)>92)return fail('INVALID_RANGE','Выберите корректный период не более 93 календарных дней');
  return{ok:true,startDate:a,endDate:b,dates:Array.from({length:distance(a,b)+1},(_,i)=>dateAt(a,i))};
 }
 function rangeFor(mode,anchor=today()){
  const a=day(anchor)||today();
  if(mode==='week'){const startDate=dateAt(a,1-weekday(a));return{startDate,endDate:dateAt(startDate,6)}}
  const startDate=a.slice(0,7)+'-01',d=new Date(startDate+'T00:00:00Z');
  d.setUTCMonth(d.getUTCMonth()+1);d.setUTCDate(0);
  return{startDate,endDate:d.toISOString().slice(0,10)};
 }
 function normalizeSettings(v){
  const days=arr(v?.weekdays).map(Number),weekdays=[...new Set(days)].sort((a,b)=>a-b),shifts=[];
  if(!weekdays.length||days.some(n=>!Number.isInteger(n)||n<1||n>7))return fail('WORKDAYS_REQUIRED','Выберите рабочие дни');
  const seen=new Set();
  for(const s of arr(v?.shifts)){
   const id=str(s.id),legacy=s.legacyAggregate===true||(s.workers==null&&s.minutesPerWorker==null);
   const workers=legacy?1:Number(s.workers),minutesPerWorker=legacy?Number(s.minutes):Number(s.minutesPerWorker);
   if(!/^[1-3]$/.test(id)||seen.has(id)||!Number.isInteger(workers)||workers<1||workers>100||!Number.isInteger(minutesPerWorker)||minutesPerWorker<1||minutesPerWorker>(legacy?10080:1440))return fail('CAPACITY_INVALID','Укажите 1–100 смазчиков и целое доступное время одного смазчика (до 1440 мин в смену)');
   seen.add(id);shifts.push({id,workers,minutesPerWorker,minutes:workers*minutesPerWorker,...(legacy?{legacyAggregate:true}:{})});
  }
  if(!shifts.length)return fail('CAPACITY_REQUIRED','Задайте доступные минуты хотя бы одной смены');
  shifts.sort((a,b)=>Number(a.id)-Number(b.id));
  const ppr=[],lineSeen=new Set();
  for(const x of arr(v?.ppr)){
   const lineId=str(x.lineId),anchorDate=day(x.anchorDate);
   if(!lineId||!anchorDate||lineSeen.has(lineId))return fail('PPR_INVALID','Укажите одну корректную дату отсчёта ППР для каждой выбранной линии');
   lineSeen.add(lineId);ppr.push({lineId,anchorDate,intervalDays:14});
  }
  ppr.sort((a,b)=>a.lineId.localeCompare(b.lineId));
  const pprRouteIds=[...new Set(arr(v?.pprRouteIds).map(str).filter(Boolean))].sort();
  return{ok:true,settings:{weekdays,shifts,ppr,pprRouteIds}};
 }
 // Anonymous worker capacity, not a named personnel roster. Largest-first
 // best-fit prevents assigning an indivisible job to an imaginary pooled worker.
 function fits(slot,values){
  const jobs=arr(values).slice().sort((a,b)=>b-a);
  if(jobs.some(x=>!Number.isFinite(x)||x<=0)||jobs.reduce((n,x)=>n+x,0)>slot.capacity)return false;
  if(slot.legacyAggregate)return true;
  const bins=Array.from({length:slot.workers},()=>slot.minutesPerWorker);
  for(const value of jobs){
   let best=-1;
   for(let i=0;i<bins.length;i++)if(bins[i]>=value&&(best<0||bins[i]<bins[best]))best=i;
   if(best<0)return false;
   bins[best]-=value;
  }
  return true;
 }
 function weekGroups(days){
  const map=new Map();
  for(const d of days){const start=rangeFor('week',d.date).startDate;
   if(!map.has(start))map.set(start,{startDate:start,endDate:dateAt(start,6),days:[],capacity:0,assignedMinutes:0,unassignedMinutes:0,staffConflicts:0,pprDays:0});
   const w=map.get(start);w.days.push(d);w.capacity+=d.capacity;w.assignedMinutes+=d.assignedMinutes;w.unassignedMinutes+=d.unassignedMinutes;w.staffConflicts+=d.staffConflicts||0;if(d.pprLines.length)w.pprDays++;
  }
  return[...map.values()];
 }
 function routeCycles(d=db()){
  const groups=new Map();
  for(const r of arr(d?.routes).filter(x=>x.status!=='archived')){
   const m=/^days:(\d+)$/.exec(str(r.scheduleKey));
   const spec=r.intervalMode==='mixed'?null:m?{ok:true,kind:'days',value:Number(m[1])}:r.scheduleKey?null:global.LubricaRouteAutoGrouping?.scheduleFor({schedule:{legacyText:r.interval}});
   const weeks=spec?.ok&&spec.kind==='days'&&spec.value>=7&&spec.value%7===0?spec.value/7:0;
   const key=weeks?'week:'+weeks:'other';
   if(!groups.has(key))groups.set(key,{weeks,label:weeks?weeks+' нед.':'Другие технические интервалы',routes:[]});
   groups.get(key).routes.push({id:r.id,name:r.name||r.code||r.id,interval:r.interval||'Не задан'});
  }
  return [...groups.values()].sort((a,b)=>(a.weeks||Infinity)-(b.weeks||Infinity));
 }
 function settings(d=db()){const s=normalizeSettings(d?.routeWorkload);return s.ok?s.settings:null}
 function saveSettings(input,d=db(),{persist=true}={}){
  if(!d)return fail('DATABASE_MISSING','База недоступна');
  const v=normalizeSettings(input);if(!v.ok)return v;
  const lines=new Set(arr(d.lines).map(x=>String(x.id))),routes=new Map(arr(d.routes).map(x=>[String(x.id),x]));
  if(v.settings.ppr.some(x=>!lines.has(x.lineId))||v.settings.pprRouteIds.some(id=>!routes.has(id)))return fail('PPR_SCOPE_INVALID','Линия или маршрут больше не существует');
  if(v.settings.pprRouteIds.some(id=>!v.settings.ppr.some(p=>p.lineId===String(routes.get(id).lineId))))return fail('PPR_ANCHOR_REQUIRED','Укажите дату отсчёта ППР для всех линий маршрутов «только ППР»');
  if(JSON.stringify(settings(d))===JSON.stringify(v.settings))return{ok:true,changed:false,settings:v.settings,database:d};
  const w=clone(d);w.routeWorkload=v.settings;if(persist)global.LubricaCore.State.setDatabase(w);
  return{ok:true,changed:true,settings:v.settings,database:w};
 }
 function assignment(item){
  const a=item?.workAssignment;
  return day(a?.date)&&str(a?.shiftId)?a:null;
 }
 const effectiveDate=item=>assignment(item)?.date||day(item?.plannedDate);
 // PPR is a line-specific 14-day phase, NOT a lubrication interval or fact.
 const lineFor=(item,d)=>str(item?.lineId||arr(d?.routes).find(r=>String(r.id)===String(item?.routeId))?.lineId);
 function requiresPpr(routeId,d=db()){return !!settings(d)?.pprRouteIds.includes(String(routeId))}
 function pprOnly(item,d=db()){return requiresPpr(item?.routeId,d)||item?.access==='ppr'||arr(item?.taskIds).some(id=>global.LubricaRouteAutomation?.taskPpr(id,d))}
 function pprOn(lineId,date,d=db()){
  const a=settings(d)?.ppr.find(x=>x.lineId===String(lineId)),s=day(date);
  return !!(a&&s&&distance(a.anchorDate,s)%14===0);
 }
 function nextPpr(lineId,date,d=db()){
  const a=settings(d)?.ppr.find(x=>x.lineId===String(lineId)),s=day(date);
  if(!a||!s)return'';
  const phase=((distance(a.anchorDate,s)%14)+14)%14;
  return dateAt(s,(14-phase)%14);
 }
 function pprLines(date,d=db()){return arr(settings(d)?.ppr).filter(x=>pprOn(x.lineId,date,d)).map(x=>({id:x.lineId,name:arr(d?.lines).find(l=>String(l.id)===x.lineId)?.name||x.lineId}))}
 function allowedWindow(item,date,d=db()){return !pprOnly(item,d)||pprOn(lineFor(item,d),date,d)}

 function earliestDate(item,d){return global.LubricaRouteAutomation?.allowedEarliest(item,d)||day(item?.plannedDate)}
 // Same-route jobs are kept sequential: the existing checklist engine has one active run per route.
 function fitJob(slot,rows,item,minutes){
  const all=[...rows,{item,minutes}];if(!fits(slot,all.map(x=>x.minutes)))return false;
  if(slot.legacyAggregate)return true;
  const groups=new Map();for(const x of all)if(x.item?.planningBasis==='task_due'){const k=String(x.item.routeId);groups.set(k,(groups.get(k)||0)+x.minutes)}
  return [...groups.values()].every(n=>n<=slot.minutesPerWorker);
 }
 function technicalDate(item){
  const dates=arr(item?.dueEntries).map(x=>day(x.dueDate)).filter(Boolean).sort();
  return dates[0]||day(item?.plannedDate);
 }
 function states(d){
  const runs=new Map(),byPlan=new Map();
  for(const r of arr(d?.checklistRuns)){runs.set(String(r.id),r);if(r.plannedItemId){const old=byPlan.get(String(r.plannedItemId));if(!old||old.status!=='in_progress')byPlan.set(String(r.plannedItemId),r)}}
  return arr(d?.routePlanItems).map(item=>{
   const run=runs.get(String(item.runId||''))||byPlan.get(String(item.id))||null;
   const status=run&&['completed','cancelled','in_progress'].includes(run.status)?run.status:item.status;
   const a=assignment(item),fixed=!!run||!!item.runId||status!=='planned';
   return {item,run,status,fixed,a,date:a?.date||day(item.plannedDate),shiftId:a?.shiftId||'',minutes:min(item.plannedMinutes)};
  }).filter(x=>active(x.status));
 }
 function load(options={},d=db()){
  const r=range(options.startDate,options.endDate);if(!r.ok)return r;
  if(!d)return fail('DATABASE_MISSING','База недоступна');
  const cfg=settings(d),all=states(d),dates=new Map(),unassigned=[],problems=[];
  for(const date of r.dates){
   const working=!!cfg?.weekdays.includes(weekday(date));
   dates.set(date,{date,working,pprLines:pprLines(date,d),pprConflicts:[],slots:(cfg?.shifts||[]).map(s=>({date,shiftId:s.id,capacity:working?s.minutes:0,workers:s.workers,minutesPerWorker:s.minutesPerWorker,legacyAggregate:!!s.legacyAggregate,minutes:0,jobs:[],proposedMinutes:[],proposedJobs:[]})),unknownMinutes:0,unknownJobs:[],unassigned:[]});
  }
  const report=(row,code,message)=>problems.push({id:row.item.id,code,message,date:row.date});
  for(const row of all){
   const {item,status,fixed,a,minutes}=row,base=day(item.plannedDate);
   if(!base){report(row,'JOB_DATE_INVALID','Не задана корректная дата задания');continue}
   let date=row.date,shiftId=row.shiftId;
   // Existing execution without assignment is counted only when a factual shift
   // is available; otherwise block automatic allocation on that day.
   if(!a&&fixed&&row.run){date=day(row.run.date)||date;shiftId=str(row.run.shift)}
   const bucket=dates.get(date);
   if(!a&&!fixed){
    if(earliestDate(item,d)<=r.endDate){unassigned.push(row);if(bucket)bucket.unassigned.push(row);if(minutes==null)report(row,'JOB_MINUTES_INVALID','Не задана положительная длительность задания')}
    continue;
   }
   if(!bucket)continue;
   if(status==='planned'&&pprOnly(item,d)&&!allowedWindow(item,date,d)){bucket.pprConflicts.push(row);report(row,'PPR_CONFLICT','Назначение вне даты ППР своей линии')}
   const slot=bucket.slots.find(s=>s.shiftId===shiftId);
   if(!slot||minutes==null){
    bucket.unknownJobs.push(row);bucket.unknownMinutes+=minutes||0;
    report(row,minutes==null?'JOB_MINUTES_INVALID':'SHIFT_UNKNOWN',minutes==null?'Длительность не подтверждена':'Не определена смена уже назначенной/выполнявшейся работы');
    continue;
   }
   slot.jobs.push(row);slot.minutes+=minutes;
  }
  const days=[...dates.values()];
  const totals={capacity:0,assignedMinutes:0,unassignedMinutes:0,unknownMinutes:0,overloadMinutes:0,overloadedDays:0,unassigned:unassigned.length,unknownJobs:0,lateJobs:0,pprConflicts:0,staffConflicts:0};
  for(const b of days){
   b.capacity=b.slots.reduce((n,s)=>n+s.capacity,0);b.assignedMinutes=b.slots.reduce((n,s)=>n+s.minutes,0);
   b.unassignedMinutes=b.unassigned.reduce((n,x)=>n+(x.minutes||0),0);
   b.overloadMinutes=b.slots.reduce((n,s)=>n+Math.max(0,s.minutes-s.capacity),0);
   b.staffConflicts=0;
   for(const s of b.slots){s.overloadMinutes=Math.max(0,s.minutes-s.capacity);s.staffConflict=!s.legacyAggregate&&!s.overloadMinutes&&!fits(s,s.jobs.map(x=>x.minutes))||!s.legacyAggregate&&!s.overloadMinutes&&s.jobs.length>0&&!fitJob(s,s.jobs.slice(0,-1),s.jobs.at(-1).item,s.jobs.at(-1).minutes);if(s.staffConflict)b.staffConflicts++;s.remaining=Math.max(0,s.capacity-s.minutes);totals.lateJobs+=s.jobs.filter(x=>s.date>technicalDate(x.item)).length}
   totals.staffConflicts+=b.staffConflicts;
   totals.capacity+=b.capacity;totals.assignedMinutes+=b.assignedMinutes;totals.unknownMinutes+=b.unknownMinutes;totals.unknownJobs+=b.unknownJobs.length;totals.pprConflicts+=b.pprConflicts.length;totals.overloadMinutes+=b.overloadMinutes;if(b.overloadMinutes)totals.overloadedDays++;
  }
  totals.unassignedMinutes=unassigned.reduce((n,x)=>n+(x.minutes||0),0);
  return{ok:true,...r,settings:cfg,days,weeks:weekGroups(days),unassigned,problems,totals};
 }
 function preview(options={},d=db()){
  const L=load(options,d);if(!L.ok)return L;
  if(!L.settings)return fail('CAPACITY_REQUIRED','Сначала сохраните доступное время и рабочие дни');
  if(L.settings.shifts.some(s=>s.legacyAggregate))return fail('STAFF_CONFIRMATION_REQUIRED','Уточните число смазчиков и чистое время одного человека вместо прежнего суммарного ресурса');
  const allowDelay=options.allowDelay===true,reason=str(options.reason);
  if(allowDelay&&!reason)return fail('DELAY_REASON_REQUIRED','Укажите причину разрешённого переноса');
  const proposals=[],remaining=[],current=today();
  const ordered=L.unassigned.filter(x=>!Array.isArray(options.routeIds)||options.routeIds.includes(x.item.routeId)).sort((a,b)=>technicalDate(a.item).localeCompare(technicalDate(b.item))||String(a.item.id).localeCompare(String(b.item.id),'ru',{numeric:true}));
  // Allocate against all fixed assignments. Do not assume an unknown shift is free.
  for(const row of ordered){
   const item=row.item,base=day(item.plannedDate),earliest=[earliestDate(item,d),L.startDate,current].sort().at(-1);
   const latest=allowDelay?L.endDate:base;
   let slot=null;const candidates=[];
   if(row.minutes!=null&&earliest<=latest){
    for(const b of L.days){
     if(b.date<earliest||b.date>latest||!b.working||b.unknownJobs.length||!allowedWindow(item,b.date,d))continue;
     for(const s of b.slots)if(fitJob(s,[...s.jobs,...s.proposedJobs],item,row.minutes))candidates.push(s);
    }
    const balance=global.LubricaRouteAutomation?.config(d).balance===true;
    const weekLoad=s=>{const w=L.weeks.find(w=>s.date>=w.startDate&&s.date<=w.endDate);return w&&w.capacity?w.days.reduce((n,b)=>n+b.slots.reduce((m,x)=>m+x.minutes,0),0)/w.capacity:1};
    candidates.sort((a,b)=>Number(a.date>base)-Number(b.date>base)||(a.date>base&&b.date>base?a.date.localeCompare(b.date):0)||(balance?weekLoad(a)-weekLoad(b)||a.minutes/a.capacity-b.minutes/b.capacity:0)||(a.date<=base&&b.date<=base?b.date.localeCompare(a.date):a.date.localeCompare(b.date))||Number(a.shiftId)-Number(b.shiftId));
    slot=candidates[0]||null;
   }
   if(!slot){
    const next=pprOnly(item,d)?nextPpr(lineFor(item,d),earliest,d):'';
    const why=row.minutes==null?'Не подтверждена длительность':pprOnly(item,d)&&!next?'Не задана дата ППР линии':pprOnly(item,d)&&next>latest?'Ближайший ППР '+next+' вне допустимого срока; требуется согласованный перенос':earliest>latest?'Нужен разрешённый перенос':row.minutes>Math.max(...L.settings.shifts.map(s=>s.legacyAggregate?s.minutes:s.minutesPerWorker))?'Задание длиннее доступного времени одного смазчика; требуется отдельное решение':pprOnly(item,d)?'Нет свободной смены на ППР своей линии':'Нет свободной смены в разрешённом диапазоне';
    remaining.push({id:item.id,routeName:item.routeName||item.routeId,plannedDate:base,minutes:row.minutes,nextPpr:next,reason:why});continue
   }
   slot.minutes+=row.minutes;slot.proposedMinutes.push(row.minutes);slot.proposedJobs.push({item,minutes:row.minutes});
   const delayed=slot.date>base;
   proposals.push({id:item.id,routeName:item.routeName||item.routeId,plannedDate:base,technicalDate:technicalDate(item),date:slot.date,shiftId:slot.shiftId,minutes:row.minutes,delayDays:distance(base,slot.date),reason:delayed?reason:slot.date<base?'Досрочное обслуживание в согласованном окне':'Распределение в исходный день',pprOnly:pprOnly(item,d)});
  }
  const fingerprint=states(d).map(x=>[x.item.id,x.status,x.fixed,x.item.plannedDate,x.minutes,x.a,x.run?.date,x.run?.shift,technicalDate(x.item),lineFor(x.item,d),pprOnly(x.item,d),earliestDate(x.item,d)]);
  const token=JSON.stringify([L.settings,L.startDate,L.endDate,allowDelay,reason,current,fingerprint,proposals,remaining]);
  return{ok:true,proposals,remaining,token,summary:{assigned:proposals.length,delayed:proposals.filter(x=>x.delayDays>0).length,minutes:proposals.reduce((n,x)=>n+x.minutes,0),unassigned:remaining.length}};
 }
 function writeAssignment(item,to,reason){
  const old=assignment(item),at=new Date().toISOString();
  const next=to?{date:to.date,shiftId:to.shiftId,reason,assignedAt:at}:null;
  if(old?.date===next?.date&&old?.shiftId===next?.shiftId)return false;
  item.workAssignment=next;
  item.workAssignmentHistory=[...arr(item.workAssignmentHistory),{from:old?clone(old):null,to:next?clone(next):null,reason,at}];
  item.updatedAt=at;
  return true;
 }
 function apply(options={},token='',d=db(),{persist=true}={}){
  const p=preview(options,d);if(!p.ok)return p;
  if(!token||p.token!==token)return fail('STALE_PREVIEW','План или настройки изменились. Повторите предварительный просмотр');
  if(!p.proposals.length)return{ok:true,updated:0,database:d};
  const work=clone(d),map=new Map(arr(work.routePlanItems).map(x=>[String(x.id),x]));
  for(const x of p.proposals)writeAssignment(map.get(String(x.id)),x,x.reason);
  if(persist)global.LubricaCore.State.setDatabase(work);return{ok:true,updated:p.proposals.length,database:work};
 }
 function move(id,{date='',shiftId='',reason='',clear=false}={},d=db()){
  if(!d)return fail('DATABASE_MISSING','База недоступна');
  const row=states(d).find(x=>String(x.item.id)===String(id));
  if(!row||row.fixed||row.status!=='planned')return fail('JOB_LOCKED','Можно менять только незапущенное задание');
  reason=str(reason);date=day(date);shiftId=str(shiftId);
  if(clear&&!row.a)return{ok:true,updated:0};
  if(!clear){
   if(!date||date<today()||date<earliestDate(row.item,d))return fail('WORK_DATE_INVALID','Дата в прошлом или раньше согласованного окна');
   if(!row.minutes)return fail('JOB_MINUTES_INVALID','Не подтверждена длительность задания');
   if(!allowedWindow(row.item,date,d))return fail('PPR_CONFLICT','Выберите дату ППР своей линии: '+(nextPpr(lineFor(row.item,d),date,d)||'дата не задана'));
   if(row.a?.date===date&&row.a?.shiftId===shiftId)return{ok:true,updated:0};
   const L=load({startDate:date,endDate:date},d);if(!L.ok)return L;
   const b=L.days[0],slot=b.slots.find(x=>x.shiftId===shiftId);
   if(!slot||!b.working)return fail('SHIFT_UNAVAILABLE','Смена не работает в выбранный день');
   if(slot.legacyAggregate)return fail('STAFF_CONFIRMATION_REQUIRED','Сначала подтвердите число смазчиков и доступное время одного человека в смене');
   if(b.unknownJobs.length)return fail('LOAD_UNKNOWN','В этот день есть работы с неопределённой сменой или длительностью');
   const occupied=slot.jobs.filter(x=>String(x.item.id)!==String(id));
   if(!fitJob(slot,occupied,row.item,row.minutes))return fail('SHIFT_OVERLOADED','Недостаточно свободного времени одного смазчика или всей смены');
  }
  if((clear||row.a||date!==row.item.plannedDate)&&!reason)return fail('REASON_REQUIRED','Укажите причину переноса или снятия назначения');
  const w=clone(d),item=w.routePlanItems.find(x=>String(x.id)===String(id));
  const updated=writeAssignment(item,clear?null:{date,shiftId},reason||'Назначение в исходный день');
  if(updated)global.LubricaCore.State.setDatabase(w);
  return{ok:true,updated:updated?1:0};
 }
 function validateStart(item,date,shift,d=db()){
  const a=assignment(item);if(!a)return pprOnly(item,d)?fail('PPR_ASSIGNMENT_REQUIRED','Для работ только в ППР сначала назначьте задание на ППР своей линии'):{ok:true};
  if(a.date<earliestDate(item,d))return fail('WORK_DATE_INVALID','Дата вне согласованного окна');
  if(!allowedWindow(item,a.date,d))return fail('PPR_CONFLICT','Назначенная дата не является ППР своей линии. Перенесите задание');
  if(item.status!=='planned'||item.runId)return fail('JOB_LOCKED','Задание уже запущено или закрыто');
  if(day(date)!==a.date||a.date>today()||str(shift)!==a.shiftId)return fail('WORK_SLOT_MISMATCH','Назначено на '+a.date+', смена '+a.shiftId+'. При изменении рабочего дня/смены сначала перенесите задание в плане');
  const L=load({startDate:a.date,endDate:a.date},d);
  if(!L.ok)return L;
  const b=L.days[0],s=b.slots.find(s=>s.shiftId===a.shiftId);
  if(!b.working||!s||b.unknownJobs.length||s.minutes>s.capacity||s.staffConflict)return fail('WORK_SLOT_UNAVAILABLE','Назначенная смена перегружена или недоступна. Проверьте нагрузку в плане');
  return{ok:true};
 }
 function startPolicy(routeId,planId,date,shift,d=db()){
  const rows=arr(d?.routePlanItems).filter(x=>String(x.routeId)===String(routeId)),item=rows.find(x=>String(x.id)===String(planId));
  if(!item){
   if(requiresPpr(routeId,d)||arr(arr(d.routes).find(r=>String(r.id)===String(routeId))?.taskIds).some(id=>global.LubricaRouteAutomation?.taskPpr(id,d))||rows.some(x=>x.status==='planned'&&assignment(x)))return fail('WORK_PLAN_REQUIRED','Откройте назначенное задание из плана смазочных работ');
   return{ok:true};
  }
  const result=validateStart(item,date,shift,d);
  return result.ok?{ok:true,assignment:assignment(item),pprRequired:pprOnly(item,d),lineId:lineFor(item,d)}:result;
 }
 global.LubricaRouteWorkload=Object.freeze({day,today,range,rangeFor,routeCycles,weekGroups,settings,saveSettings,assignment,effectiveDate,technicalDate,earliestDate,lineFor,requiresPpr,pprOnly,pprOn,nextPpr,pprLines,load,preview,apply,move,validateStart,startPolicy});
})(window);
