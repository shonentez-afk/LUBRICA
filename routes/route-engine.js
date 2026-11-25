"use strict";
/* Stage 9.0 — persistent operational routes built from approved tasks. */
(function(global){
 const clone=x=>JSON.parse(JSON.stringify(x));
 const clean=v=>String(v??'').trim();
 const now=()=>new Date().toISOString();
 function database(){return global.LubricaCore?.State?.getDatabase?.()||null}
 function approved(t){return t?.approvalStatus==='approved'||t?.approvalStatus==='ready'}
 function intervalForTask(t){const s=t?.schedule||{},v=clean(s.calendarValue),u=clean(s.calendarUnit);return clean(s.legacyText)||clean(s.interval)||clean(t?.interval)||clean(t?.legacy?.interval)||(s.runtimeHours>0?`${s.runtimeHours} ч`:'')||(v&&u?`${v} ${u}`:'')||(s.strategy==='По состоянию'?'По состоянию':'Без периодичности')}
 function isPeriodic(v){return !!clean(v)&&!/без период|по состояни|по событ|по требован/i.test(v)}
 // Use existing seven-step Task Readiness, omitting route-coverage findings to avoid circular gating.
 function readinessIndex(d){if(!global.LubricaTaskReadiness?.summarize)return null;const issues=(global.LubricaProgramQA?.audit?.(d)?.issues||[]).filter(x=>x.category!=='routes');return new Map((global.LubricaTaskReadiness.summarize(d,issues).items||[]).map(x=>[String(x.taskId),x]))}
 function routeEligibility(t,d,index=null,context=null){if(t?.routeIdentityConflict)return{ok:false,code:'TASK_IDENTITY_CONFLICT',message:'Исторические идентификаторы мероприятий требуют инженерной сверки; автоматическое объединение запрещено'};if(!approved(t))return{ok:false,code:'TASK_NOT_APPROVED',message:'Мероприятие не утверждено'};if(!isPeriodic((context||taskContext(d,t)).interval))return{ok:false,code:'TASK_NON_PERIODIC',message:'Не задана плановая периодичность'};const item=index?.get(String(t.id));if(item){const missing=(item.steps||[]).filter(x=>!x.ok).map(x=>x.label);if(item.status!=='ready'||missing.length)return{ok:false,code:'TASK_NOT_READY',message:missing.length?'Не завершено: '+missing.join(', '):item.next?.reason||'Инженерная готовность не подтверждена'}}return{ok:true,code:'READY',message:''}}

 function maps(d){return {
   tasks:new Map((d.tasks||[]).map(x=>[String(x.id),x])),
   lps:new Map((d.lubricationPoints||[]).map(x=>[x.id,x])),
   eq:new Map((d.equipment||[]).map(x=>[x.id,x])),
   nodes:new Map((d.nodes||[]).map(x=>[x.id,x])),
   lines:new Map((d.lines||[]).map(x=>[x.id,x])),
   areas:new Map((d.areas||[]).map(x=>[x.id,x])),legacy:new Map((global.state?.points||[]).map(p=>[String(p.taskId||p.id),p]))
 }}
 function taskContext(d,t,m=maps(d)){
   const lp=m.lps.get(t.lubricationPointId)||{},eq=m.eq.get(lp.equipmentId)||{},node=m.nodes.get(lp.nodeId)||{},line=m.lines.get(eq.lineId)||{},area=m.areas.get(eq.areaId)||{};
   const legacy=m.legacy.get(String(t.id))||{};
   return {task:t,lp,eq,node,line:{name:line.name||legacy.line||'',...line},area:{name:area.name||legacy.area||(global.SCOPE_LABELS?.[legacy.scope])||legacy.scope||'',...area},lineId:eq.lineId||`legacy-line:${clean(legacy.line)||'none'}`,areaId:eq.areaId||`legacy-area:${clean(legacy.area||(global.SCOPE_LABELS?.[legacy.scope])||legacy.scope)||'none'}`,interval:intervalForTask(t)==='Без периодичности'?clean(legacy.interval)||'Без периодичности':intervalForTask(t)};
 }
 function contextIndex(d){const m=maps(d);return new Map((d.tasks||[]).map(t=>[String(t.id),taskContext(d,t,m)]))}
 function groupKey(c){return [c.lineId,c.areaId,c.interval].join('|')}
 function typed(r){return !!r?.groupingMode&&r.groupingMode===global.LubricaRouteAutoGrouping?.MODE}
 function typedLocked(d,r){if(global.LubricaRouteAutoGrouping)return global.LubricaRouteAutoGrouping.routeLocked(d,r);return typed(r)&&((d.routePlanItems||[]).some(x=>String(x.routeId)===String(r.id)&&['planned','in_progress'].includes(x.status))||(d.checklistRuns||[]).some(x=>String(x.routeId)===String(r.id)&&x.status==='in_progress'))}
 function typedMeta(r){return typed(r)?{groupingMode:r.groupingMode,serviceKey:r.serviceKey||'',serviceLabel:r.serviceLabel||'',scheduleKey:r.scheduleKey||''}:{}}
 function matchesService(r,c){return !typed(r)||global.LubricaRouteAutoGrouping.matches(r,c)}
 function compatibleInterval(r,c){const A=global.LubricaRouteAutoGrouping;if(typed(r))return A.scheduleFor(c.task).key===r.scheduleKey;if(r.intervalMode==='mixed')return true;if(A){const target=A.parseText(r.interval),source=A.scheduleFor(c.task);return !!target&&source.ok&&target.key===source.key}return c.interval===r.interval}
 function eligibleGroups(d){
   const groups=new Map(),m=maps(d),readiness=readinessIndex(d);
   (d.tasks||[]).forEach(t=>{const c=taskContext(d,t,m);if(!routeEligibility(t,d,readiness,c).ok)return;const key=groupKey(c);if(!groups.has(key))groups.set(key,{key,lineId:c.lineId,areaId:c.areaId,interval:c.interval,contexts:[]});groups.get(key).contexts.push(c)});
   return groups;
 }
 function nextRouteId(routes,d={}){let n=1;const used=new Set([...(routes||[]).map(r=>r.id),...(d.routeRevisions||[]).map(r=>r.routeId),...(d.routePlanItems||[]).map(r=>r.routeId),...(d.checklistRuns||[]).map(r=>r.routeId),...(d.routeWorkload?.pprRouteIds||[])]);while(used.has(`М-${String(n).padStart(3,'0')}`))n++;return `М-${String(n).padStart(3,'0')}`}
 function nextRouteCode(routes,lineId='',areaId=''){const cleanCode=v=>clean(v).toUpperCase().replace(/[^A-ZА-Я0-9]+/gi,'-').replace(/^-+|-+$/g,'').slice(0,12);const lp=cleanCode(lineId)||'L',ap=cleanCode(areaId)||'A';let n=1;const used=new Set((routes||[]).map(r=>clean(r.code)));let code='';do{code=`R-${lp}-${ap}-${String(n++).padStart(3,'0')}`}while(used.has(code));return code}
 function normalizeRoute(r,i=0){return {...r,id:r.id||`М-${String(i+1).padStart(3,'0')}`,code:r.code||'',name:r.name||'',description:r.description||'',lineId:r.lineId||'',areaId:r.areaId||'',interval:r.interval||'',intervalMode:r.intervalMode||'fixed',routeType:r.routeType||'lubrication',...typedMeta(r),sequenceMode:r.sequenceMode||'manual',taskIds:Array.isArray(r.taskIds)?r.taskIds.map(String):[],excludedTaskIds:Array.isArray(r.excludedTaskIds)?r.excludedTaskIds.map(String):[],assignee:r.assignee||'Смазчик',estimatedMinutesPerTask:Number(r.estimatedMinutesPerTask)||5,fixedMinutes:r.fixedMinutes==null?10:Number(r.fixedMinutes),planningAnchorDate:r.planningAnchorDate||'',runtimePlanningHoursPerDay:Number(r.runtimePlanningHoursPerDay)||0,status:r.status||'active',source:r.source||'auto',revision:Number(r.revision)||1,createdAt:r.createdAt||now(),updatedAt:r.updatedAt||now()}}
 // Automatic routes are changed exclusively through a confirmed preview.
 function syncRoutes(d=database()){
   return {database:d,created:0,updated:0,removed:0,routes:d?.routes||[],requiresConfirmation:true,preview:previewAutoGrouping({},d)};
 }
 function legacyPointMap(d){const legacy=global.LubricaCore?.Database?.toLegacy?.(d)?.points||global.state?.points||[];return new Map(legacy.map(p=>[String(global.taskKey?global.taskKey(p):(p.taskId||p.id)),p]))}
 function routeEntries(d=database(),{preview=true,includeArchived=false,status='all'}={}){
   if(!d)return [];
   const routes=(d.routes||[]).map(normalizeRoute);
   if(!routes.length)return [];
   const pmap=legacyPointMap(d),m=maps(d),eligible=eligibleGroups(d),typedEligible=new Map();
   if(global.LubricaRouteAutoGrouping)for(const g of eligible.values())for(const c of g.contexts){const info=global.LubricaRouteAutoGrouping.describe(c);if(!info.ok)continue;if(!typedEligible.has(info.key))typedEligible.set(info.key,[]);typedEligible.get(info.key).push(c)}
   const ix=global.LubricaRouteAutomation?new Map((d.tasks||[]).map(t=>[String(t.id),taskContext(d,t,m)])):null;
   const visible=routes.filter(r=>includeArchived||r.status!=='archived').filter(r=>status==='all'||r.status===status);
   return visible.map(r=>{
     const area=m.areas.get(r.areaId)||{},line=m.lines.get(r.lineId)||{};
     const points=(r.taskIds||[]).map(id=>pmap.get(String(id))).filter(Boolean);
     const excludedPoints=(r.excludedTaskIds||[]).map(id=>pmap.get(String(id))).filter(Boolean);
     const allEligible=typed(r)?(typedEligible.get(routeKey(r))||[]):(eligible.get([r.lineId,r.areaId,r.interval].join('|'))?.contexts||[]);
     const pointGroups=pointGroupsForRoute(r.id,d,{maps:m,legacy:pmap}),physicalPointCount=new Set(pointGroups.map(g=>String(g.pointId))).size;return {...r,key:routeKey(r),line:line.name||r.lineName||String(r.lineId||'').replace(/^legacy-line:/,'')||'Без линии',area:area.name||r.areaName||String(r.areaId||'').replace(/^legacy-area:/,'')||(r.source==='manual'||r.source==='copy'?'Все участки':'Без участка'),points,pointGroups,pointCount:pointGroups.length,physicalPointCount,excludedPoints,eligibleCount:allEligible.length,excludedCount:(r.excludedTaskIds||[]).length,estimatedMinutes:typed(r)&&global.LubricaRouteAutomation?global.LubricaRouteAutomation.duration({...r,points},r.taskIds,d,ix):(Number(r.fixedMinutes)||0)+points.length*(Number(r.estimatedMinutesPerTask)||5)};
   }).sort((a,b)=>(a.line+a.area+a.interval).localeCompare(b.line+b.area+b.interval,'ru'));
 }

 function revisionStore(d){d.routeRevisions=Array.isArray(d.routeRevisions)?d.routeRevisions:[];return d.routeRevisions}
 function revisionPayload(route){return {routeId:route.id,code:route.code||'',name:route.name||'',description:route.description||'',lineId:route.lineId||'',areaId:route.areaId||'',interval:route.interval||'',intervalMode:route.intervalMode||'fixed',routeType:route.routeType||'lubrication',...typedMeta(route),...(route.automationContent?{automationContent:route.automationContent}:{}),...(route.cycleMode==='fixed_weekly'?{cycleMode:route.cycleMode}:{}),...(route.scheduleDefaults?{scheduleDefaults:route.scheduleDefaults}:{}),sequenceMode:route.sequenceMode||'manual',assignee:route.assignee||'Смазчик',estimatedMinutesPerTask:Number(route.estimatedMinutesPerTask)||5,fixedMinutes:Number(route.fixedMinutes)||0,planningAnchorDate:route.planningAnchorDate||'',runtimePlanningHoursPerDay:Number(route.runtimePlanningHoursPerDay)||0,status:route.status||'draft',source:route.source||'manual',taskIds:[...(route.taskIds||[])].map(String),excludedTaskIds:[...(route.excludedTaskIds||[])].map(String)}}
 function revisionSignature(payload){return JSON.stringify(payload)}
 function routeRevisions(routeId,d=database()){if(!d)return[];return (Array.isArray(d.routeRevisions)?d.routeRevisions:[]).filter(x=>String(x.routeId)===String(routeId)).sort((a,b)=>(Number(b.revision)||0)-(Number(a.revision)||0))}
 function ensureRouteRevision(routeId,d=database(),{note='',reason='auto'}={}){const r=rawRoute(d,routeId);if(!r)return {ok:false,reason:'Маршрут не найден'};const payload=revisionPayload(r),list=routeRevisions(routeId,d),latest=list[0]||null,sig=revisionSignature(payload);if(latest&&latest.signature===sig){r.revision=Number(latest.revision)||1;return {ok:true,created:false,revision:latest}}const rev=(latest?Number(latest.revision)||0:0)+1,createdAt=now(),entry={id:`${r.id}-REV-${String(rev).padStart(3,'0')}`,routeId:r.id,revision:rev,createdAt,note:clean(note),reason,signature:sig,snapshot:clone(payload)};revisionStore(d).push(entry);r.revision=rev;r.revisionUpdatedAt=createdAt;return {ok:true,created:true,revision:entry}}
 function commitRouteRevision(routeId,{note='',reason='manual'}={},d=database()){const result=ensureRouteRevision(routeId,d,{note,reason});if(result.ok)save(d,result.created?`Ревизия ${result.revision.revision} зафиксирована`:`Маршрут уже соответствует ревизии ${result.revision.revision}`);return result}
 function revisionState(routeId,d=database()){const r=rawRoute(d,routeId);if(!r)return null;const list=routeRevisions(routeId,d),latest=list[0]||null,current=revisionPayload(r),changed=!latest||latest.signature!==revisionSignature(current);return {routeId,revision:latest?.revision||Number(r.revision)||1,revisionId:latest?.id||'',changed,revisions:list}}
 function compareRouteRevisions(routeId,aRevision,bRevision,d=database()){const list=routeRevisions(routeId,d),a=list.find(x=>Number(x.revision)===Number(aRevision)),b=list.find(x=>Number(x.revision)===Number(bRevision));if(!a||!b)return null;const aa=a.snapshot?.taskIds||[],bb=b.snapshot?.taskIds||[],as=new Set(aa),bs=new Set(bb);return {from:a,to:b,added:bb.filter(x=>!as.has(x)),removed:aa.filter(x=>!bs.has(x)),orderChanged:aa.length===bb.length&&aa.some((x,i)=>bb[i]!==x),metadataChanged:['name','description','lineId','areaId','interval','assignee','estimatedMinutesPerTask','fixedMinutes','planningAnchorDate','runtimePlanningHoursPerDay','status'].filter(k=>JSON.stringify(a.snapshot?.[k])!==JSON.stringify(b.snapshot?.[k]))}}

 function save(d,message='Маршруты сохранены'){global.LubricaCore?.State?.setDatabase?.(d);global.LubricaApp?.refreshFromCore?.();global.LubricaApp?.showToast?.(message)}
 function syncAndSave(){return syncRoutes(database())}
 function validTiming(p={}){return ['estimatedMinutesPerTask','fixedMinutes'].every(k=>!(k in p)||(p[k]!==''&&p[k]!=null&&Number.isFinite(Number(p[k]))&&Number(p[k])>=(k==='fixedMinutes'?0:0.1)))}
 function transitionCheck(r,status,d,{restore=false}={}){
  if(!r||!['draft','active','archived'].includes(status))return{ok:false,reason:'Неверный статус маршрута'};
  if(r.status==='archived'&&status!=='archived'&&(!restore||status!=='draft'))return{ok:false,reason:'Сначала восстановите маршрут из архива'};
  if(status!==r.status&&typedLocked(d,r))return{ok:false,reason:'Сначала завершите или снимите открытые задания'};
  const A=global.LubricaRouteAutoGrouping,D=global.LubricaRouteDue;
  if(A&&typed(r)&&status!=='archived'){
   const own=A.ownership(d),key=A.routeKey(r);
   if(!key||own.routes.some(x=>x.id!==r.id&&A.routeKey(x)===key))return{ok:false,code:'GROUP_EXISTS',reason:'Маршрут этой группы уже существует'};
   if((r.taskIds||[]).some(id=>(own.owners.get(String(id))||[]).some(x=>x.id!==r.id)||restore&&(own.reserved.has(String(id))||own.excluded.has(String(id)))))return{ok:false,code:'TASK_ASSIGNED',reason:'Состав маршрута уже используется'};
  }
  if(status==='active'&&r.status!=='active'){
   if(global.LubricaRouteAutomation&&!typed(r))return{ok:false,reason:'Создайте маршрут в едином движке'};
   if(typed(r)){const issues=D?.activationIssues(r,d)||[{message:'Модуль сроков недоступен'}];if(issues.length)return{ok:false,code:'ROUTE_SCHEDULE_REQUIRED',reason:issues[0].message,issues,report:{errors:issues}}}
   const check=validateRoute(r.id,d);if(!check.valid)return{ok:false,reason:check.errors[0]?.message||'Маршрут не готов',report:check};
  }
  return{ok:true};
 }
 function routeAssessment(routeId,d=database()){
  const r=rawRoute(d,routeId);if(!r)return{status:'blocked',label:'Заблокирован',errors:[{message:'Маршрут не найден'}],warnings:[],locked:true,readyCount:0,total:0};
  const report=validateRoute(routeId,d),D=global.LubricaRouteDue,issues=[...report.errors];
  if(typed(r)&&r.status!=='active')for(const issue of D?.activationIssues(r,d)||[])if(!issues.some(x=>x.code===issue.code&&String(x.taskId||'')===String(issue.taskId||'')))issues.push(issue);
  const bad=new Set(issues.filter(x=>x.taskId).map(x=>String(x.taskId))),total=(r.taskIds||[]).length,readyCount=issues.some(x=>!x.taskId)?0:Math.max(0,total-bad.size),blocked=issues.some(x=>!x.taskId||!['TASK_DUE_MISSING','TASK_METER_MISSING','TASK_CALENDAR_RUNTIME_INVALID','PPR_ANCHOR_REQUIRED'].includes(x.code));
  const status=blocked?'blocked':issues.length||report.warnings.length?'warning':'ready';
  return{routeStatus:r.status,status,label:status==='ready'?'Готов':status==='warning'?'Требует уточнения':'Заблокирован',errors:issues,warnings:report.warnings,readyCount,total,locked:typedLocked(d,r),canActivate:r.status==='draft'&&transitionCheck(r,'active',d).ok};
 }
 function updateRoute(id,patch){if(!validTiming(patch))return null;const d=database();if(!d)return null;const r=(d.routes||[]).find(x=>x.id===id);if(!r||r.status==='archived'||typedLocked(d,r))return null;if(typed(r)){const keys=['name','description','assignee','estimatedMinutesPerTask','fixedMinutes'];patch=Object.fromEntries(Object.entries(patch||{}).filter(([key])=>keys.includes(key)))}Object.assign(r,patch,{updatedAt:now()});save(d,'Маршрут сохранён');return r}
 function updateRouteSettings(id,patch={},status,d=database()){
  if(!d)return{ok:false,reason:'База недоступна'};const work=clone(d),r=rawRoute(work,id);if(!r||r.status==='archived'||typedLocked(work,r))return{ok:false,reason:'Маршрут архивирован или защищён открытым заданием'};
  if(!validTiming(patch))return{ok:false,code:'TIME_INVALID',reason:'Укажите допустимый норматив времени'};
  const keys=['name','description','assignee','estimatedMinutesPerTask','fixedMinutes',...(!typed(r)&&!global.LubricaRouteAutomation?['planningAnchorDate','runtimePlanningHoursPerDay']:[])];
  Object.assign(r,Object.fromEntries(Object.entries(patch).filter(([k])=>keys.includes(k)).map(([k,v])=>[k,['estimatedMinutesPerTask','fixedMinutes','runtimePlanningHoursPerDay'].includes(k)?Number(v):v])));
  const desired=status??r.status,gate=transitionCheck(r,desired,work);if(!gate.ok)return gate;r.status=desired;
  r.updatedAt=now();ensureRouteRevision(id,work,{reason:'settings',note:'Настройки маршрута'});save(work,'Параметры маршрута сохранены');return{ok:true,route:r};
 }
 function moveTask(routeId,taskId,delta){const d=database(),r=(d?.routes||[]).find(x=>x.id===routeId);if(!r||r.status==='archived'||typedLocked(d,r))return false;const a=r.taskIds||[],i=a.indexOf(String(taskId)),j=i+delta;if(i<0||j<0||j>=a.length)return false;[a[i],a[j]]=[a[j],a[i]];r.updatedAt=now();save(d,'Порядок маршрута изменён');return true}
 function excludeTask(routeId,taskId){const d=database(),r=(d?.routes||[]).find(x=>x.id===routeId);if(!r||r.status==='archived'||typedLocked(d,r))return false;const id=String(taskId);r.taskIds=(r.taskIds||[]).filter(x=>String(x)!==id);r.excludedTaskIds=[...new Set([...(r.excludedTaskIds||[]),id])];r.updatedAt=now();save(d,'Мероприятие исключено из маршрута');return true}
 function restoreTask(routeId,taskId){const d=database(),r=(d?.routes||[]).find(x=>x.id===routeId);if(!r||r.status==='archived'||typedLocked(d,r))return false;const id=String(taskId);if(typed(r)||global.LubricaRouteAutoGrouping){const t=maps(d).tasks.get(id),c=t&&taskContext(d,t);if(!t||!matchesService(r,c)||!compatibleInterval(r,c)||!routeEligibility(t,d,readinessIndex(d)).ok||typed(r)&&r.status==='active'&&global.LubricaRouteDue?.activationIssues({...r,taskIds:[id]},d).length||(d.routes||[]).some(x=>x.id!==r.id&&x.status!=='archived'&&(x.taskIds||[]).map(String).includes(id))||global.LubricaRouteAutoGrouping?.taskReserved(d,id))return false;}r.excludedTaskIds=(r.excludedTaskIds||[]).filter(x=>String(x)!==id);if(!(r.taskIds||[]).includes(id))r.taskIds.push(id);r.updatedAt=now();save(d,'Мероприятие возвращено в маршрут');return true}

 function rawRoute(d,routeId){return (d?.routes||[]).find(r=>String(r.id)===String(routeId))||null}
 function routeKey(r){return typed(r)?global.LubricaRouteAutoGrouping.routeKey(r):[r?.lineId||'',r?.areaId||'',r?.interval||''].join('|')}
 function taskNativeKey(d,taskId,m=maps(d)){
   const t=m.tasks.get(String(taskId));if(!t)return'';const c=taskContext(d,t,m),g=global.LubricaRouteAutoGrouping?.describe(c);return g?.ok?g.key:groupKey(c);
 }
 function pointIdForTask(d,taskId,m=maps(d)){
   return m.tasks.get(String(taskId))?.lubricationPointId||'';
 }
 function taskAssignments(d=database()){
   const out=new Map();
   for(const r of (d?.routes||[]).filter(r=>r.status!=='archived'))for(const id of r.taskIds||[]){const k=String(id);if(!out.has(k))out.set(k,[]);out.get(k).push(r.id)}
   return out;
 }
 function pointGroupsForRoute(routeId,d=database(),shared=null){
   const r=rawRoute(d,routeId);if(!r)return[];
   const m=shared?.maps||maps(d),pmap=shared?.legacy||legacyPointMap(d),groups=[],byPoint=new Map();
   for(const taskId of r.taskIds||[]){
     const id=String(taskId),t=m.tasks.get(id);if(!t)continue;
     const c=taskContext(d,t,m),lp=m.lps.get(t.lubricationPointId)||{},eq=m.eq.get(lp.equipmentId)||{},node=m.nodes.get(lp.nodeId)||{},legacy=pmap.get(id)||{};
     const pointId=lp.id||t.lubricationPointId||`task:${id}`;
     let g=byPoint.get(pointId);
     if(!g){g={pointKey:pointId,visitKey:pointId,variantKey:pointId,pointId,pointDisplayId:lp.legacyId||legacy.pointDisplayId||lp.id||pointId,equipmentId:eq.id||'',equipmentCode:eq.externalCode||legacy.position||'',equipment:eq.name||legacy.equipment||'Не определено',nodeId:node.id||'',node:node.name||legacy.unit||'Без узла',pointName:lp.name||legacy.unit||legacy.component||pointId,category:lp.category||legacy.type||'other',lineId:c.lineId,areaId:c.areaId,line:c.line?.name||'',area:c.area?.name||'',taskIds:[],tasks:[],firstTaskIndex:groups.length};byPoint.set(pointId,g);groups.push(g)}
     g.taskIds.push(id);g.tasks.push({id,operation:t.operation||legacy.operation||'Мероприятие',activityType:t.activityType||'',interval:c.interval,material:legacy.material||t.materialName||'',quantity:t.quantity?.approved??'',unit:t.quantity?.unit||'',toolId:t.toolId||'',approvalStatus:t.approvalStatus||''});
   }
   return groups;
 }
 function findVisitGroup(groups,ref){
   const key=String(ref||'');if(!key)return null;
   return groups.find(g=>String(g.pointId)===key||String(g.pointKey)===key||String(g.visitKey)===key||String(g.variantKey)===key)||null;
 }
 function compatibleTaskIdsForPoint(d,r,pointId,m=maps(d)){
   const targetKey=routeKey(r);
   return (d.tasks||[]).filter(t=>approved(t)&&String(t.lubricationPointId)===String(pointId)&&(typed(r)?matchesService(r,taskContext(d,t,m)):groupKey(taskContext(d,t,m))===targetKey)).map(t=>String(t.id));
 }
 function pointTaskCandidates(routeId,d=database(),options={}){
   const includeUnapproved=!!options.includeUnapproved,r=rawRoute(d,routeId);if(!r)return[];
   const m=maps(d),readiness=includeUnapproved?null:readinessIndex(d),pmap=legacyPointMap(d),current=new Set((r.taskIds||[]).map(String)),assign=taskAssignments(d),groups=new Map();
   for(const t of d.tasks||[]){
     if(!includeUnapproved&&!routeEligibility(t,d,readiness).ok)continue;
     const c=taskContext(d,t,m),id=String(t.id),lp=m.lps.get(t.lubricationPointId)||{},eq=m.eq.get(lp.equipmentId)||{},node=m.nodes.get(lp.nodeId)||{},legacy=pmap.get(id)||{},pointId=lp.id||t.lubricationPointId||`task:${id}`;
     let g=groups.get(pointId);
     if(!g){g={pointKey:pointId,pointId,pointDisplayId:lp.legacyId||legacy.pointDisplayId||pointId,equipmentCode:eq.externalCode||legacy.position||'',equipment:eq.name||legacy.equipment||'Не определено',node:node.name||legacy.unit||'Без узла',pointName:lp.name||legacy.unit||legacy.component||pointId,category:lp.category||legacy.type||'other',line:c.line?.name||'',area:c.area?.name||'',lineId:c.lineId,areaId:c.areaId,tasks:[]};groups.set(pointId,g)}
     const assigned=(assign.get(id)||[]).filter(rid=>rid!==routeId),sameLine=c.lineId===r.lineId,sameArea=!r.areaId||c.areaId===r.areaId,sameInterval=compatibleInterval(r,c),sameService=matchesService(r,c);
     g.tasks.push({id,operation:t.operation||legacy.operation||'Мероприятие',activityType:t.activityType||'',interval:c.interval,material:legacy.material||t.materialName||'',quantity:t.quantity?.approved??'',unit:t.quantity?.unit||'',toolId:t.toolId||'',approvalStatus:t.approvalStatus||'',inCurrent:current.has(id),assignedRouteIds:assigned,sameLine,sameArea,sameInterval,sameService,recommended:sameLine&&sameArea&&sameInterval&&sameService,warnings:[!sameLine?'Другая линия':'',!sameArea?'Другой участок':'',!sameInterval?'Другая периодичность':'',!sameService?'Другой вид обслуживания':''].filter(Boolean)});
   }
   return [...groups.values()].map(g=>({...g,recommendedTaskCount:g.tasks.filter(t=>t.recommended&&!t.inCurrent).length,availableTaskCount:g.tasks.filter(t=>!t.inCurrent).length,inCurrentCount:g.tasks.filter(t=>t.inCurrent).length})).filter(g=>g.availableTaskCount>0).sort((a,b)=>(Number(b.recommendedTaskCount>0)-Number(a.recommendedTaskCount>0))||(a.equipmentCode+a.pointName).localeCompare(b.equipmentCode+b.pointName,'ru'));
 }
 function taskCandidate(routeId,taskId,d=database()){
   for(const g of pointTaskCandidates(routeId,d,{includeUnapproved:true})){const t=g.tasks.find(x=>String(x.id)===String(taskId));if(t)return {...t,point:g}}
   return null;
 }
 function insertTaskIds(r,ids,options={},d=database()){
   const position=options.position||'end',referencePointId=options.referencePointId||'',referenceVisitKey=options.referenceVisitKey||'',unique=ids.map(String).filter(id=>!(r.taskIds||[]).some(x=>String(x)===id));if(!unique.length)return;
   if(position==='start'){r.taskIds=[...unique,...r.taskIds];return}
   const ref=referencePointId||referenceVisitKey;
   if((position==='before'||position==='after')&&ref){const groups=pointGroupsForRoute(r.id,d),g=findVisitGroup(groups,ref);if(g){const indexes=g.taskIds.map(id=>r.taskIds.indexOf(id)).filter(i=>i>=0);const at=position==='before'?Math.min(...indexes):Math.max(...indexes)+1;r.taskIds.splice(at,0,...unique);return}}
   r.taskIds.push(...unique);
 }
 function addTasksToRoute(routeId,taskIds,options={},d=database()){
   const target=rawRoute(d,routeId);if(!target)return {ok:false,reason:'Маршрут не найден'};if(target.status==='archived')return{ok:false,reason:'Архивный маршрут нельзя менять'};if(typedLocked(d,target))return{ok:false,reason:'Состав зафиксирован в незавершённых заданиях'};
   const readiness=readinessIndex(d),ids=[...new Set((taskIds||[]).map(String))],m=maps(d),accepted=[],warnings=[],conflicts=[];
   for(const id of ids){
     const t=m.tasks.get(id);if(!t){conflicts.push({taskId:id,reason:'Мероприятие не найдено'});continue}
     if(!approved(t)){conflicts.push({taskId:id,reason:'Мероприятие не утверждено'});continue}const eligibility=routeEligibility(t,d,readiness);if(!eligibility.ok){conflicts.push({taskId:id,reason:eligibility.message});continue}
     const c=taskContext(d,t,m),sameLine=c.lineId===target.lineId,sameArea=!target.areaId||c.areaId===target.areaId,sameInterval=compatibleInterval(target,c);if(!matchesService(target,c)){conflicts.push({taskId:id,reason:'Другой вид обслуживания или периодичность'});continue}
     if(!sameInterval&&(typed(target)||!options.allowIntervalMismatch||target.status==='active')){conflicts.push({taskId:id,reason:`Другая периодичность: ${c.interval}`});continue}
     if(!sameLine||!sameArea){if(typed(target)||target.status==='active'){conflicts.push({taskId:id,reason:'Линия или участок отличаются'});continue}if(!sameLine)warnings.push(`${id}: другая линия`);if(!sameArea)warnings.push(`${id}: другой участок`)}
     if(typed(target)&&target.status==='active'&&global.LubricaRouteDue?.activationIssues({...target,taskIds:[id]},d).length){conflicts.push({taskId:id,reason:'Сначала задайте срок нового мероприятия; действующий маршрут не изменён'});continue}
     const other=(d.routes||[]).filter(r=>r.id!==routeId&&r.status!=='archived'&&(r.taskIds||[]).some(x=>String(x)===id));if((target.status==='active'&&other.some(r=>r.status==='active'))||(global.LubricaRouteAutoGrouping&&other.length&&options.copy===true)){conflicts.push({taskId:id,reason:'Мероприятие уже назначено в активном маршруте'});continue}
     if(other.length&&options.copy!==true&&options.move!==true){conflicts.push({taskId:id,reason:`Мероприятие уже включено: ${other.map(r=>r.code||r.id).join(', ')}`});continue}
     if(options.move===true&&(other.some(r=>typedLocked(d,r))||global.LubricaRouteAutoGrouping?.taskReserved(d,id))){conflicts.push({taskId:id,reason:'Мероприятие зафиксировано в незавершённом задании'});continue}if(options.move===true){const native=pointNativeRoute(d,id);for(const r of other)r.taskIds=(r.taskIds||[]).filter(x=>String(x)!==id);if(native&&native.id!==routeId)native.excludedTaskIds=[...new Set([...(native.excludedTaskIds||[]),id])]}
     target.excludedTaskIds=(target.excludedTaskIds||[]).filter(x=>String(x)!==id);accepted.push(id);
   }
   insertTaskIds(target,accepted,options,d);target.updatedAt=now();
   if(accepted.length)save(d,`В маршрут добавлено мероприятий: ${accepted.length}`);
   return {ok:accepted.length>0||conflicts.length===0,taskIds:accepted,warnings:[...new Set(warnings)],conflicts};
 }
 function removeTaskFromRoute(routeId,taskId,d=database()){
   const r=rawRoute(d,routeId);if(!r)return {ok:false,reason:'Маршрут не найден'};if(r.status==='archived'||typedLocked(d,r))return{ok:false,reason:'Состав архивирован или зафиксирован в плане'};const id=String(taskId);
   if(!(r.taskIds||[]).some(x=>String(x)===id))return {ok:false,reason:'Мероприятие не входит в маршрут'};
   r.taskIds=(r.taskIds||[]).filter(x=>String(x)!==id);const native=pointNativeRoute(d,id);if(native?.id===routeId)r.excludedTaskIds=[...new Set([...(r.excludedTaskIds||[]),id])];r.updatedAt=now();save(d,'Мероприятие исключено из маршрута');return {ok:true,taskId:id};
 }
 function availablePoints(routeId,d=database()){
   const r=rawRoute(d,routeId);if(!r)return[];const excluded=new Set((r.excludedTaskIds||[]).map(String));
   return pointTaskCandidates(routeId,d).map(g=>{const compatible=g.tasks.filter(t=>t.sameLine&&t.sameArea&&t.sameInterval&&t.sameService!==false),excludedTaskIds=compatible.filter(t=>excluded.has(String(t.id))).map(t=>t.id),assignedRouteIds=[...new Set(compatible.flatMap(t=>t.assignedRouteIds||[]))];return {...g,taskIds:compatible.map(t=>t.id),excludedTaskIds,assignedRouteIds,missingTaskIds:compatible.filter(t=>!t.inCurrent).map(t=>t.id),state:compatible.length&&excludedTaskIds.length===compatible.length?'excluded':assignedRouteIds.length?'other_route':'available'}}).filter(g=>g.taskIds.length&&g.missingTaskIds.length);
 }
 function setPointOrder(routeId,visitRefs,d=database(),{persist=true}={}){
   const r=rawRoute(d,routeId);if(!r||r.status==='archived'||typedLocked(d,r))return false;
   const groups=pointGroupsForRoute(routeId,d),wanted=[],seen=new Set();
   for(const ref of visitRefs||[]){const g=findVisitGroup(groups,ref);if(g&&!seen.has(g.visitKey)){wanted.push(g);seen.add(g.visitKey)}}
   for(const g of groups)if(!seen.has(g.visitKey))wanted.push(g);
   r.taskIds=wanted.flatMap(g=>g.taskIds);r.updatedAt=now();if(persist)save(d,'Очередь маршрута изменена');return true;
 }
 function movePointToIndex(routeId,visitRef,targetIndex,d=database()){
   const groups=pointGroupsForRoute(routeId,d),targetGroup=findVisitGroup(groups,visitRef),from=targetGroup?groups.indexOf(targetGroup):-1;if(from<0)return false;
   const to=Math.max(0,Math.min(groups.length-1,Number(targetIndex)));if(from===to)return true;
   const [g]=groups.splice(from,1);groups.splice(to,0,g);return setPointOrder(routeId,groups.map(x=>x.visitKey),d);
 }
 function movePoint(routeId,visitRef,delta,d=database()){
   const groups=pointGroupsForRoute(routeId,d),g=findVisitGroup(groups,visitRef),i=g?groups.indexOf(g):-1;if(i<0)return false;return movePointToIndex(routeId,g.visitKey,i+Number(delta),d);
 }
 function movePointBefore(routeId,visitRef,beforeVisitRef,d=database()){
   const groups=pointGroupsForRoute(routeId,d),source=findVisitGroup(groups,visitRef),beforeGroup=findVisitGroup(groups,beforeVisitRef),from=source?groups.indexOf(source):-1,before=beforeGroup?groups.indexOf(beforeGroup):-1;if(from<0||before<0||from===before)return false;
   const [g]=groups.splice(from,1),target=groups.findIndex(x=>x.visitKey===beforeGroup.visitKey);groups.splice(target<0?groups.length:target,0,g);return setPointOrder(routeId,groups.map(x=>x.visitKey),d);
 }
 function pointNativeRoute(d,taskId){const t=maps(d).tasks.get(String(taskId));if(!t)return null;const c=taskContext(d,t),k=taskNativeKey(d,taskId),legacy=groupKey(c),rows=(d.routes||[]).filter(r=>r.status!=='archived');return rows.find(r=>r.source==='auto'&&routeKey(r)===k)||rows.find(r=>routeKey(r)===k)||rows.find(r=>r.source==='auto'&&!typed(r)&&routeKey(r)===legacy)||rows.find(r=>!typed(r)&&routeKey(r)===legacy)||null}
 function addPointToRoute(routeId,pointId,d=database()){
   const target=rawRoute(d,routeId);if(!target)return {ok:false,reason:'Маршрут не найден'};
   const ids=compatibleTaskIdsForPoint(d,target,pointId,maps(d));if(!ids.length)return {ok:false,reason:'У точки нет утверждённых мероприятий с периодичностью этого маршрута'};
   return addTasksToRoute(routeId,ids,{move:true},d);
 }
 function removePointFromRoute(routeId,pointRef,d=database()){
   const r=rawRoute(d,routeId);if(!r)return {ok:false,reason:'Маршрут не найден'};if(r.status==='archived'||typedLocked(d,r))return{ok:false,reason:'Состав архивирован или зафиксирован в плане'};
   const group=findVisitGroup(pointGroupsForRoute(routeId,d),pointRef),ids=group?.taskIds||[];if(!ids.length)return {ok:false,reason:'Точка не найдена в маршруте'};
   r.taskIds=(r.taskIds||[]).filter(x=>!ids.includes(String(x)));
   for(const id of ids){const native=pointNativeRoute(d,id);if(native?.id===routeId)r.excludedTaskIds=[...new Set([...(r.excludedTaskIds||[]),id])]}
   r.updatedAt=now();save(d,'Точка исключена из маршрута');return {ok:true,taskIds:ids};
 }
 function queueState(routeId,d=database()){
   const r=rawRoute(d,routeId);return {route:r,current:pointGroupsForRoute(routeId,d),available:availablePoints(routeId,d)};
 }

 function routeCreationOptions(d=database()){
   const m=maps(d||{}),intervals=[...new Set((d?.tasks||[]).filter(approved).map(intervalForTask).filter(isPeriodic))].sort((a,b)=>a.localeCompare(b,'ru'));
   return {lines:[...(d?.lines||[])].map(x=>({id:x.id,name:x.name||x.id})),areas:[...(d?.areas||[])].map(x=>({id:x.id,lineId:x.lineId||'',name:x.name||x.id})),intervals,routes:(d?.routes||[]).map(normalizeRoute).filter(r=>r.status!=='archived')};
 }
 function suggestRouteName({lineId='',areaId='',interval=''}={},d=database()){
   const m=maps(d||{}),line=m.lines.get(lineId),area=m.areas.get(areaId);return [line?.name||lineId,area?.name||areaId,interval].filter(Boolean).join(' — ')||'Новый маршрут';
 }
 function previewPointTaskCatalog(input={},d=database()){
    if(!d)return {points:[],matchingTaskIds:[],pointCount:0,taskCount:0,matchingTaskCount:0};
    const spec={lineId:clean(input.lineId),areaId:clean(input.areaId),interval:clean(input.interval),intervalMode:input.intervalMode||'fixed',...typedMeta(input)},m=maps(d),readiness=readinessIndex(d),pmap=legacyPointMap(d),groups=new Map(),A=global.LubricaRouteAutoGrouping,own=A?.ownership(d);
    for(const t of d.tasks||[]){
      const c=taskContext(d,t,m),id=String(t.id);if(!routeEligibility(t,d,readiness,c).ok||c.lineId!==spec.lineId||(spec.areaId&&c.areaId!==spec.areaId))continue;
      if(own){const g=A.describe(c);if(own.owners.has(id)||own.excluded.has(id)||own.reserved.has(id)||!readiness?.has(id)||(!g.ok&&!['SERVICE_CATEGORY_UNKNOWN','SERVICE_OPERATION_UNKNOWN'].includes(g.code))||!A.scheduleFor(t).ok)continue;}
      const lp=m.lps.get(t.lubricationPointId)||{},eq=m.eq.get(lp.equipmentId)||{},node=m.nodes.get(lp.nodeId)||{},legacy=pmap.get(id)||{},pointId=lp.id||t.lubricationPointId||`task:${id}`,matchesInterval=compatibleInterval(spec,c)&&matchesService(spec,c);
      let g=groups.get(pointId);if(!g){g={pointId,pointDisplayId:lp.legacyId||legacy.pointDisplayId||pointId,equipmentCode:eq.externalCode||legacy.position||'',equipment:eq.name||legacy.equipment||'Не определено',node:node.name||legacy.unit||'Без узла',pointName:lp.name||legacy.unit||legacy.component||pointId,line:c.line?.name||'',area:c.area?.name||'',tasks:[]};groups.set(pointId,g)}
      g.tasks.push({id,operation:t.operation||legacy.operation||'Мероприятие',activityType:t.activityType||'',interval:c.interval,material:legacy.material||t.materialName||'',quantity:t.quantity?.approved??'',unit:t.quantity?.unit||'',matchesInterval});
    }
    const points=[...groups.values()].sort((a,b)=>(a.equipmentCode+a.pointName).localeCompare(b.equipmentCode+b.pointName,'ru')),matchingTaskIds=points.flatMap(g=>g.tasks.filter(t=>t.matchesInterval).map(t=>t.id));return {points,matchingTaskIds,pointCount:points.length,taskCount:points.reduce((n,g)=>n+g.tasks.length,0),matchingTaskCount:matchingTaskIds.length};
  }
  function previewRouteCandidates(input={},d=database()){
    const catalog=previewPointTaskCatalog(input,d),points=catalog.points.map(g=>{const tasks=g.tasks.filter(t=>t.matchesInterval);return{...g,tasks,taskIds:tasks.map(t=>t.id)}}).filter(g=>g.taskIds.length);
    const taskIds=points.flatMap(g=>g.taskIds);return{points,variants:points,taskIds,pointCount:points.length,physicalPointCount:points.length,taskCount:taskIds.length};
  }
  function createRoute(input={},d=database()){
   if(!d)return {ok:false,reason:'База данных недоступна'};
   const routes=d.routes||[],A=global.LubricaRouteAutoGrouping;if(!validTiming(input))return{ok:false,code:'TIME_INVALID',reason:'Укажите допустимый норматив времени'};
   const lineId=clean(input.lineId),areaId=clean(input.areaId),interval=clean(input.interval);
   if(!lineId)return {ok:false,reason:'Выберите линию'};if(!interval&&input.intervalMode!=='mixed')return {ok:false,reason:'Выберите периодичность'};
   const code=clean(input.code)||nextRouteCode(routes,lineId,areaId);if(routes.some(r=>clean(r.code)&&clean(r.code)===code))return {ok:false,reason:`Код маршрута ${code} уже используется`};
   let r=normalizeRoute({id:nextRouteId(routes,d),code,name:clean(input.name)||suggestRouteName({lineId,areaId,interval},d),description:clean(input.description),lineId,areaId,interval,intervalMode:input.intervalMode||'fixed',routeType:input.routeType||'lubrication',...typedMeta(input),sequenceMode:'manual',assignee:clean(input.assignee)||'Смазчик',estimatedMinutesPerTask:Number(input.estimatedMinutesPerTask)||5,fixedMinutes:input.fixedMinutes==null?10:Number(input.fixedMinutes),planningAnchorDate:input.planningAnchorDate||'',runtimePlanningHoursPerDay:Number(input.runtimePlanningHoursPerDay)||0,status:input.status||'draft',source:input.source||'manual',taskIds:[],excludedTaskIds:[]});
   if(input.fillMode==='automatic')return{ok:false,code:'USE_AUTOMATION_MASTER',reason:'Автоматическое создание доступно только через мастер автоматических маршрутов'};
    if(Array.isArray(input.taskIds))for(const id of input.taskIds.map(String))if(!r.taskIds.includes(id))r.taskIds.push(id);
    if(A&&r.taskIds.length){const free=new Set(previewRouteCandidates(r,d).taskIds),bad=r.taskIds.filter(id=>!free.has(id));if(bad.length)return{ok:false,code:'TASK_UNAVAILABLE',reason:'Мероприятия уже назначены, исключены, защищены или не соответствуют маршруту: '+bad.join(', ')}}
    // New manual routes use exactly the same group and due engine as automatic routes.
     if(A&&global.LubricaRouteDue&&global.LubricaRouteAutomation){
      const ctx=contextIndex(d),infos=r.taskIds.map(id=>A.describe(ctx.get(id))),rule=A.parseText(r.interval),eligible=global.LubricaRouteAutomation.eligible(d);
      if(infos.some(x=>!x.ok)||r.taskIds.some(id=>!eligible.valid.has(id)))return{ok:false,code:'TASK_UNAVAILABLE',reason:'Не подтверждена инженерная готовность выбранного мероприятия'};
      const possible=[...new Map((infos.length?infos:[...eligible.valid.values()].filter(g=>g.lineId===lineId&&(!areaId||g.areaId===areaId)&&g.scheduleKey===rule?.key&&(!input.serviceKey||g.serviceKey===input.serviceKey))).map(g=>[g.key,g])).values()];
      if(possible.length!==1||!possible[0].areaId||input.intervalMode==='mixed')return{ok:false,code:'GROUP_SCOPE',reason:'Выберите один участок, один вид обслуживания и одну периодичность'};
      const g=possible[0];if(routes.some(x=>x.status!=='archived'&&A.routeKey(x)===g.key))return{ok:false,code:'GROUP_EXISTS',reason:'Маршрут этой группы уже существует. Настройте его вместо создания дубля'};
      Object.assign(r,{lineId:g.lineId,areaId:g.areaId,groupingMode:g.groupingMode,serviceKey:g.serviceKey,serviceLabel:g.serviceLabel,scheduleKey:g.scheduleKey,interval:g.interval,source:'manual'});
      if(!clean(input.name))r.name=g.name;
      const work=clone(d);r.status='draft';work.routes=[...(work.routes||[]),r];
      if(input.planningAnchorDate&&!g.scheduleKey.startsWith('runtime_hours:')&&r.taskIds.length){const result=global.LubricaRouteDue.configureRoute(r.id,{date:input.planningAnchorDate},work,{persist:false,activate:input.status==='active'});if(!result.ok)return{...result,reason:result.message};save(result.database,'Маршрут создан');return{ok:true,route:result.route}}
      if(input.status==='active')return{ok:false,code:'ROUTE_SCHEDULE_REQUIRED',reason:'Сначала настройте общий срок маршрута'};
      ensureRouteRevision(r.id,work,{note:'Исходная версия маршрута',reason:'create'});save(work,'Маршрут создан');return{ok:true,route:r};
     }
     if(!Array.isArray(d.routes))d.routes=[];d.routes.push(r);
    if(r.status==='active'){const report=validateRoute(r.id,d);if(!report.valid){d.routes=d.routes.filter(x=>x!==r);return{ok:false,reason:'Маршрут не готов к активации',report}}}
   ensureRouteRevision(r.id,d,{note:'Исходная версия маршрута',reason:'create'});save(d,'Маршрут создан');return {ok:true,route:r};
 }
 function cloneRoute(routeId,input={},d=database()){
   const src=rawRoute(d,routeId);if(!src)return {ok:false,reason:'Маршрут не найден'};const result=createRoute({...src,...input,id:undefined,code:input.code||'',name:input.name||`${src.name||src.id} — копия`,status:'draft',source:'copy',groupingMode:'',serviceKey:'',serviceLabel:'',scheduleKey:'',fillMode:'empty',taskIds:(src.taskIds||[]).filter(id=>!global.LubricaRouteAutoGrouping||previewRouteCandidates({...src,...input},d).taskIds.includes(String(id)))},d);return result;
 }
 function archiveRoute(routeId,d=database()){const r=rawRoute(d,routeId),gate=transitionCheck(r,'archived',d);if(!gate.ok)return false;ensureRouteRevision(routeId,d,{note:'Перед архивированием',reason:'archive'});r.status='archived';r.updatedAt=now();ensureRouteRevision(routeId,d,{reason:'archive'});save(d,'Маршрут архивирован');return true}
 function restoreRoute(routeId,d=database()){const r=rawRoute(d,routeId);if(r?.status!=='archived')return{ok:false,reason:'Выберите архивный маршрут'};const gate=transitionCheck(r,'draft',d,{restore:true});if(!gate.ok)return gate;r.status='draft';r.updatedAt=now();ensureRouteRevision(routeId,d,{reason:'restore'});save(d,'Маршрут восстановлен из архива');return {ok:true,route:r}}
 function setRouteStatus(routeId,status,d=database()){const r=rawRoute(d,routeId),gate=transitionCheck(r,status,d);if(!gate.ok)return gate;r.status=status;r.updatedAt=now();ensureRouteRevision(routeId,d,{reason:'status'});save(d,status==='active'?'Маршрут активирован':status==='archived'?'Маршрут архивирован':'Маршрут переведён в черновик');return {ok:true,route:r}}
 function deleteRoute(routeId,d=database()){const r=rawRoute(d,routeId);if(!r)return{ok:false,reason:'Маршрут не найден'};if((d.checklistRuns||[]).some(x=>x.routeId===routeId)||(d.routePlanItems||[]).some(x=>x.routeId===routeId))return{ok:false,reason:'Существуют выполнение или план; маршрут нужно архивировать'};if(r.source==='auto')return{ok:false,reason:'Автоматический маршрут нельзя удалить — его можно архивировать'};if(r.status==='active')return{ok:false,reason:'Активный маршрут сначала архивируйте'};ensureRouteRevision(routeId,d,{reason:'delete'});d.routes=d.routes.filter(x=>String(x.id)!==String(routeId));if(d.routeWorkload)d.routeWorkload={...d.routeWorkload,pprRouteIds:(d.routeWorkload.pprRouteIds||[]).filter(x=>String(x)!==String(routeId))};save(d,'Маршрут удалён');return{ok:true}}
 function candidatePointVariants(routeId,d=database(),options={}){
   const includeCurrent=!!options.includeCurrent;return pointTaskCandidates(routeId,d).flatMap(g=>{
     const byInterval=new Map();for(const t of g.tasks){if(!includeCurrent&&t.inCurrent)continue;const key=t.interval||'Без периодичности';if(!byInterval.has(key))byInterval.set(key,[]);byInterval.get(key).push(t)}
     return [...byInterval.entries()].map(([interval,tasks])=>({variantKey:`${g.pointId}||${interval}`,pointId:g.pointId,pointDisplayId:g.pointDisplayId,equipmentCode:g.equipmentCode,equipment:g.equipment,node:g.node,pointName:g.pointName,line:g.line,area:g.area,lineId:g.lineId,areaId:g.areaId,interval,taskIds:tasks.map(t=>t.id),tasks,assignedRouteIds:[...new Set(tasks.flatMap(t=>t.assignedRouteIds||[]))],inCurrentCount:tasks.filter(t=>t.inCurrent).length,missingTaskIds:tasks.filter(t=>!t.inCurrent).map(t=>t.id),sameLine:tasks.every(t=>t.sameLine),sameArea:tasks.every(t=>t.sameArea),sameInterval:tasks.every(t=>t.sameInterval),recommended:tasks.every(t=>t.recommended),warnings:[...new Set(tasks.flatMap(t=>t.warnings||[]))]}))
   });
 }
 function addPointVariantToRoute(routeId,variantKey,options={},d=database()){
   const variant=candidatePointVariants(routeId,d,{includeCurrent:true}).find(g=>g.variantKey===variantKey);if(!variant)return {ok:false,reason:'Точка или набор мероприятий не найден'};
   return addTasksToRoute(routeId,variant.taskIds,{...options,move:options.copy===true?false:true,copy:options.copy===true},d);
 }
 function movePointToRoute(sourceRouteId,targetRouteId,pointRef,options={},d=database()){
   const source=rawRoute(d,sourceRouteId),target=rawRoute(d,targetRouteId);if(!source||!target)return {ok:false,reason:'Маршрут не найден'};if(source.status==='archived'||target.status==='archived'||typedLocked(d,source)||typedLocked(d,target))return{ok:false,reason:'Состав архивирован или зафиксирован в плане'};if(source.lineId!==target.lineId||(source.areaId&&target.areaId&&source.areaId!==target.areaId))return{ok:false,reason:'Разные линии или участки'};const group=findVisitGroup(pointGroupsForRoute(sourceRouteId,d),pointRef);if(!group)return {ok:false,reason:'Точка не найдена в исходном маршруте'};
   const m=maps(d),incompatible=group.taskIds.filter(id=>{const t=m.tasks.get(String(id));if(!t)return true;const c=taskContext(d,t,m);return !compatibleInterval(target,c)||!matchesService(target,c)});
   if(incompatible.length)return {ok:false,reason:'Не все мероприятия точки соответствуют периодичности маршрута назначения',taskIds:incompatible};
   const ids=[...group.taskIds];if(typed(target)&&target.status==='active'&&global.LubricaRouteDue?.activationIssues({...target,taskIds:ids},d).length)return{ok:false,reason:'Настройте сроки мероприятий для маршрута назначения'};if(global.LubricaRouteAutoGrouping&&ids.some(id=>global.LubricaRouteAutoGrouping.taskReserved(d,id)||d.routes.some(r=>r.id!==sourceRouteId&&r.id!==targetRouteId&&r.status!=='archived'&&(r.taskIds||[]).map(String).includes(String(id)))))return{ok:false,reason:'Мероприятие защищено или уже назначено в другом маршруте'};source.taskIds=(source.taskIds||[]).filter(x=>!ids.includes(String(x)));insertTaskIds(target,ids,options,d);source.updatedAt=target.updatedAt=now();save(d,'Мероприятия точки перемещены в другой маршрут');return {ok:true,taskIds:ids,pointId:group.pointId};
 }
 function validationContext(d=database()){
   const m=maps(d),readiness=readinessIndex(d),contexts=new Map((d.tasks||[]).map(t=>[String(t.id),taskContext(d,t,m)])),owners=new Map();
   for(const r of d.routes||[])if(r.status==='active')for(const id of r.taskIds||[]){const k=String(id);if(!owners.has(k))owners.set(k,[]);owners.get(k).push(r)}
   return{maps:m,readiness,contexts,owners};
 }
 function validateRoute(routeId,d=database(),shared=null,taskIds=null){
   const r=rawRoute(d,routeId);if(!r)return{valid:false,errors:[{code:'ROUTE_MISSING',message:'Маршрут не найден'}],warnings:[],recommendations:[]};
   const ctx=shared||validationContext(d),m=ctx.maps,readiness=ctx.readiness,errors=[],warnings=[],seen=new Set(),selected=taskIds==null?(r.taskIds||[]):taskIds.map(String),members=new Set((r.taskIds||[]).map(String));
   if(taskIds!=null&&selected.some(id=>!members.has(id)))errors.push({code:'TASK_NOT_IN_ROUTE',message:'Задание содержит мероприятие вне маршрута'});
   if(!validTiming(r))errors.push({code:'TIME_INVALID',message:'Некорректный норматив времени маршрута'});
   const A=global.LubricaRouteAutoGrouping;if(typed(r)&&A&&(d.routes||[]).some(x=>x.id!==r.id&&x.status!=='archived'&&A.routeKey(x)===A.routeKey(r)))errors.push({code:'GROUP_EXISTS',message:'Несколько маршрутов одной группы'});
   if(!selected.length)errors.push({code:'ROUTE_EMPTY',message:'В маршруте нет мероприятий'});
   if(!r.lineId)errors.push({code:'ROUTE_LINE_MISSING',message:'Не указана линия'});
   if(typed(r)&&r.status==='active'){const D=global.LubricaRouteDue;if(!D)errors.push({code:'R3B_DUE_MODULE_REQUIRED',message:'Модуль индивидуальных сроков недоступен'});else errors.push(...D.activationIssues({...r,taskIds:selected},d,ctx.contexts))}

   for(const id of selected){const t=m.tasks.get(String(id));if(!t){errors.push({code:'TASK_MISSING',taskId:id,message:`Мероприятие ${id} отсутствует`});continue}
     const c=ctx.contexts.get(String(id))||taskContext(d,t,m),eligibility=routeEligibility(t,d,readiness,c);
     if(typed(r)&&!readiness?.has(String(id)))errors.push({code:'TASK_QA_MISSING',taskId:id,message:`${id}: инженерная готовность не подтверждена`});
     if(!eligibility.ok)errors.push({code:eligibility.code,taskId:id,message:`${id}: ${eligibility.message}`});
     if(!m.lps.has(t.lubricationPointId))errors.push({code:'POINT_MISSING',taskId:id,message:`${id}: отсутствует физическая точка`});
     if(seen.has(String(id)))errors.push({code:'DUPLICATE_TASK',taskId:id,message:`${id}: повторяется в маршруте`});seen.add(String(id));
     if(c.lineId!==r.lineId)errors.push({code:'LINE_MISMATCH',taskId:id,message:`${id}: другая линия`});
     if(r.areaId&&c.areaId!==r.areaId)errors.push({code:'AREA_MISMATCH',taskId:id,message:`${id}: другой участок`});
     if(typed(r)&&!matchesService(r,c))errors.push({code:'SERVICE_GROUP_MISMATCH',taskId:id,message:`${id}: не соответствует виду обслуживания/интервалу данного маршрута`});
     if(!compatibleInterval(r,c))errors.push({code:'INTERVAL_MISMATCH',taskId:id,message:`${id}: ${c.interval} вместо ${r.interval}`});
     const other=typed(r)?(d.routes||[]).find(x=>x.id!==r.id&&x.status!=='archived'&&(x.taskIds||[]).map(String).includes(String(id))):(ctx.owners.get(String(id))||[]).find(x=>x.id!==r.id);if(other){const issue={code:'ASSIGNED_ACTIVE_ROUTE',taskId:id,message:`${id}: уже назначено в ${other.code||other.id}`};errors.push(issue)}
   }
   if(r.intervalMode==='mixed')warnings.push({code:'MIXED_ROUTE',message:'Смешанная периодичность не поддерживает автоматический календарь'});
   return{valid:errors.length===0,errors,warnings,recommendations:[],summary:{errorCount:errors.length,warningCount:warnings.length}};
 }

 function previewAutoGrouping(options={},d=database()){
   const A=global.LubricaRouteAutoGrouping;
   if(!d||!A)return{ok:false,reason:'Автогруппировка недоступна',groups:[],issues:[],token:''};
   return A.preview(clone(d),options,window.LubricaRouteEngine);
 }
 function applyAutoGrouping(options={},expectedToken='',d=database(),{persist=true}={}){
   if(!d||!global.LubricaRouteAutoGrouping)return{ok:false,reason:'Автогруппировка недоступна'};
   const work=clone(d),report=global.LubricaRouteAutoGrouping.preview(work,options,window.LubricaRouteEngine);
   if(!report.ok)return report;
   if(!expectedToken||report.token!==expectedToken)return{ok:false,reason:'Данные изменились. Повторите предварительный просмотр.',preview:report};
   const actions=report.groups.filter(g=>['create','update','archive'].includes(g.action));
   if(!actions.length)return{ok:true,created:0,updated:0,routeIds:[],preview:report,database:d};
   work.routes=Array.isArray(work.routes)?work.routes:[];
   let created=0,updated=0,archived=0;const routeIds=[];
   for(const g of actions){
     let r;
     if(g.action==='create'){
       r=normalizeRoute({id:nextRouteId(work.routes,work),code:nextRouteCode(work.routes,g.lineId,g.areaId),name:g.name,lineId:g.lineId,areaId:g.areaId,
         interval:g.interval,intervalMode:'fixed',groupingMode:g.groupingMode,serviceKey:g.serviceKey,serviceLabel:g.serviceLabel,scheduleKey:g.scheduleKey,
         taskIds:g.taskIds,status:'draft',source:'auto',sequenceMode:'manual'});
       work.routes.push(r);created++;
     }else{
       r=rawRoute(work,g.routeId);
       if(!r||r.source!=='auto'||!typed(r)||!['draft','active'].includes(r.status)||typedLocked(work,r))return{ok:false,reason:'Маршрут защищён открытым заданием или недоступен'};
       if(g.action==='archive'){r.status='archived';r.updatedAt=now();archived++;routeIds.push(r.id);continue}
       r.taskIds=[...g.taskIds];r.updatedAt=now();updated++;
     }
     r.status=g.nextStatus;if(g.contentSig)r.automationContent=g.contentSig;
     routeIds.push(r.id);
   }
   const shared=validationContext(work);for(const id of routeIds){const raw=rawRoute(work,id),old=(d.routes||[]).find(r=>r.id===id),transition=transitionCheck({...raw,status:old?.status||'draft'},raw.status,work);if(!transition.ok)return{ok:false,reason:transition.reason,code:transition.issues?.[0]?.code||transition.code,issues:transition.issues,routeId:id};const check=raw.status==='archived'?{valid:true}:validateRoute(id,work,shared);if(!check.valid&&!(raw.status==='active'&&(d.routes||[]).some(r=>r.id===id&&r.status==='active')&&check.errors.every(e=>e.taskId&&['TASK_DUE_MISSING','TASK_METER_MISSING','TASK_CALENDAR_RUNTIME_INVALID','PPR_CYCLE','PPR_ANCHOR_REQUIRED'].includes(e.code))))return{ok:false,reason:'Проверка нового маршрута не пройдена',report:check,routeId:id};ensureRouteRevision(id,work,{note:'Подтверждённое формирование по участку, виду обслуживания и периодичности',reason:'auto_reconcile'})}
   if(persist)save(work,'Автомаршруты: создано '+created+', изменено '+updated+', архивировано '+archived);
   return{ok:true,created,updated,archived,routeIds,preview:report,database:work};
 }

 window.LubricaRouteEngine=Object.freeze({contextIndex,previewAutoGrouping,applyAutoGrouping,routeEntries,routeRevisions,revisionState,ensureRouteRevision,commitRouteRevision,compareRouteRevisions,syncRoutes,syncAndSave,updateRoute,updateRouteSettings,moveTask,excludeTask,restoreTask,taskContext,routeEligibility,readinessIndex,eligibleGroups,pointGroupsForRoute,pointTaskCandidates,taskCandidate,previewPointTaskCatalog,availablePoints,queueState,setPointOrder,movePoint,movePointToIndex,movePointBefore,addTasksToRoute,removeTaskFromRoute,addPointToRoute,removePointFromRoute,routeCreationOptions,suggestRouteName,previewRouteCandidates,createRoute,cloneRoute,archiveRoute,restoreRoute,setRouteStatus,deleteRoute,candidatePointVariants,addPointVariantToRoute,movePointToRoute,validateRoute,validationContext,transitionCheck,validTiming,routeAssessment});
 global.LubricaSystem?.registerModule?.('Маршруты','ok','Создание, ревизии и календарное планирование маршрутов');
})(window);
