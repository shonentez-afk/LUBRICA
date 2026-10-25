"use strict";
/* Stage 9.0 — persistent operational routes built from approved tasks. */
(function(global){
 const clone=x=>JSON.parse(JSON.stringify(x));
 const clean=v=>String(v??'').trim();
 const now=()=>new Date().toISOString();
 function database(){return global.LubricaCore?.State?.getDatabase?.()||null}
 function approved(t){return t?.approvalStatus==='approved'||t?.approvalStatus==='ready'}
 function maps(d){return {
   tasks:new Map((d.tasks||[]).map(x=>[String(x.id),x])),
   lps:new Map((d.lubricationPoints||[]).map(x=>[x.id,x])),
   eq:new Map((d.equipment||[]).map(x=>[x.id,x])),
   nodes:new Map((d.nodes||[]).map(x=>[x.id,x])),
   lines:new Map((d.lines||[]).map(x=>[x.id,x])),
   areas:new Map((d.areas||[]).map(x=>[x.id,x]))
 }}
 function taskContext(d,t,m=maps(d)){
   const lp=m.lps.get(t.lubricationPointId)||{},eq=m.eq.get(lp.equipmentId)||{},node=m.nodes.get(lp.nodeId)||{},line=m.lines.get(eq.lineId)||{},area=m.areas.get(eq.areaId)||{};
   const legacy=(global.state?.points||[]).find(p=>String(p.taskId||p.id)===String(t.id))||{};
   return {task:t,lp,eq,node,line:{name:line.name||legacy.line||'',...line},area:{name:area.name||legacy.area||(global.SCOPE_LABELS?.[legacy.scope])||legacy.scope||'',...area},lineId:eq.lineId||`legacy-line:${clean(legacy.line)||'none'}`,areaId:eq.areaId||`legacy-area:${clean(legacy.area||(global.SCOPE_LABELS?.[legacy.scope])||legacy.scope)||'none'}`,interval:clean(t.schedule?.legacyText)||clean(legacy.interval)||'Без периодичности'};
 }
 function groupKey(c){return [c.lineId,c.areaId,c.interval].join('|')}
 function eligibleGroups(d){
   const groups=new Map(),m=maps(d);
   (d.tasks||[]).filter(approved).forEach(t=>{const c=taskContext(d,t,m),key=groupKey(c);if(!groups.has(key))groups.set(key,{key,lineId:c.lineId,areaId:c.areaId,interval:c.interval,contexts:[]});groups.get(key).contexts.push(c)});
   return groups;
 }
 function nextRouteId(routes){let n=1;const used=new Set((routes||[]).map(r=>r.id));while(used.has(`М-${String(n).padStart(3,'0')}`))n++;return `М-${String(n).padStart(3,'0')}`}
 function nextRouteCode(routes,lineId='',areaId=''){const cleanCode=v=>clean(v).toUpperCase().replace(/[^A-ZА-Я0-9]+/gi,'-').replace(/^-+|-+$/g,'').slice(0,12);const lp=cleanCode(lineId)||'L',ap=cleanCode(areaId)||'A';let n=1;const used=new Set((routes||[]).map(r=>clean(r.code)));let code='';do{code=`R-${lp}-${ap}-${String(n++).padStart(3,'0')}`}while(used.has(code));return code}
 function normalizeRoute(r,i=0){return {id:r.id||`М-${String(i+1).padStart(3,'0')}`,code:r.code||'',name:r.name||'',description:r.description||'',lineId:r.lineId||'',areaId:r.areaId||'',interval:r.interval||'',intervalMode:r.intervalMode||'fixed',routeType:r.routeType||'lubrication',sequenceMode:r.sequenceMode||'manual',taskIds:Array.isArray(r.taskIds)?r.taskIds.map(String):[],excludedTaskIds:Array.isArray(r.excludedTaskIds)?r.excludedTaskIds.map(String):[],assignee:r.assignee||'Смазчик',estimatedMinutesPerTask:Number(r.estimatedMinutesPerTask)||5,fixedMinutes:Number(r.fixedMinutes)||10,planningAnchorDate:r.planningAnchorDate||'',status:r.status||'active',source:r.source||'auto',revision:Number(r.revision)||1,createdAt:r.createdAt||now(),updatedAt:r.updatedAt||now()}}
 function syncRoutes(d=database()){
   if(!d)return {database:null,created:0,updated:0,removed:0,routes:[]};
   d.routes=(d.routes||[]).map(normalizeRoute);
   const groups=eligibleGroups(d),byKey=new Map(d.routes.filter(r=>r.source==='auto').map(r=>[[r.lineId,r.areaId,r.interval].join('|'),r]));let created=0,updated=0;
   for(const [key,g] of groups){
     let r=byKey.get(key);
     if(!r){r=normalizeRoute({id:nextRouteId(d.routes),lineId:g.lineId,areaId:g.areaId,interval:g.interval,source:'auto'});d.routes.push(r);byKey.set(key,r);created++}
     const eligible=g.contexts.map(c=>String(c.task.id)),eligibleSet=new Set(eligible),excluded=new Set((r.excludedTaskIds||[]).filter(id=>eligibleSet.has(String(id))));
     const kept=(r.taskIds||[]).filter(id=>eligibleSet.has(String(id))&&!excluded.has(String(id))),seen=new Set(kept);
     const appended=eligible.filter(id=>!seen.has(id)&&!excluded.has(id));const next=[...kept,...appended];
     if(JSON.stringify(next)!==JSON.stringify(r.taskIds)||r.lineId!==g.lineId||r.areaId!==g.areaId){r.taskIds=next;r.lineId=g.lineId;r.areaId=g.areaId;r.lineName=g.contexts[0]?.line?.name||r.lineName||'';r.areaName=g.contexts[0]?.area?.name||r.areaName||'';r.updatedAt=now();updated++}
   }
   // Keep manually configured routes, but remove task references that are no longer approved.
   const approvedIds=new Set((d.tasks||[]).filter(approved).map(t=>String(t.id)));
   d.routes.forEach(r=>{r.taskIds=(r.taskIds||[]).filter(id=>approvedIds.has(String(id)));r.excludedTaskIds=(r.excludedTaskIds||[]).filter(id=>approvedIds.has(String(id)))});
   return {database:d,created,updated,removed:0,routes:d.routes};
 }
 function legacyPointMap(d){const legacy=global.LubricaCore?.Database?.toLegacy?.(d)?.points||global.state?.points||[];return new Map(legacy.map(p=>[String(global.taskKey?global.taskKey(p):(p.taskId||p.id)),p]))}
 function routeEntries(d=database(),{preview=true,includeArchived=false,status='all'}={}){
   if(!d)return [];
   let routes=(d.routes||[]).map(normalizeRoute);
   if(!routes.length&&preview){const temp=clone(d);syncRoutes(temp);routes=temp.routes}
   const pmap=legacyPointMap(d),m=maps(d);
   const visible=routes.filter(r=>includeArchived||r.status!=='archived').filter(r=>status==='all'||r.status===status);
   return visible.map(r=>{
     const area=m.areas.get(r.areaId)||{},line=m.lines.get(r.lineId)||{};
     const points=(r.taskIds||[]).map(id=>pmap.get(String(id))).filter(Boolean);
     const excludedPoints=(r.excludedTaskIds||[]).map(id=>pmap.get(String(id))).filter(Boolean);
     const allEligible=eligibleGroups(d).get([r.lineId,r.areaId,r.interval].join('|'))?.contexts||[];
     const pointGroups=pointGroupsForRoute(r.id,d),physicalPointCount=new Set(pointGroups.map(g=>String(g.pointId))).size;return {...r,key:[r.lineId,r.areaId,r.interval].join('|'),line:line.name||r.lineName||String(r.lineId||'').replace(/^legacy-line:/,'')||'Без линии',area:area.name||r.areaName||String(r.areaId||'').replace(/^legacy-area:/,'')||(r.source==='manual'||r.source==='copy'?'Все участки':'Без участка'),points,pointGroups,pointCount:pointGroups.length,physicalPointCount,excludedPoints,eligibleCount:allEligible.length,excludedCount:(r.excludedTaskIds||[]).length,estimatedMinutes:(Number(r.fixedMinutes)||0)+points.length*(Number(r.estimatedMinutesPerTask)||5)};
   }).sort((a,b)=>(a.line+a.area+a.interval).localeCompare(b.line+b.area+b.interval,'ru'));
 }

 function revisionStore(d){d.routeRevisions=Array.isArray(d.routeRevisions)?d.routeRevisions:[];return d.routeRevisions}
 function revisionPayload(route){return {routeId:route.id,code:route.code||'',name:route.name||'',description:route.description||'',lineId:route.lineId||'',areaId:route.areaId||'',interval:route.interval||'',intervalMode:route.intervalMode||'fixed',routeType:route.routeType||'lubrication',sequenceMode:route.sequenceMode||'manual',assignee:route.assignee||'Смазчик',estimatedMinutesPerTask:Number(route.estimatedMinutesPerTask)||5,fixedMinutes:Number(route.fixedMinutes)||0,planningAnchorDate:route.planningAnchorDate||'',status:route.status||'draft',source:route.source||'manual',taskIds:[...(route.taskIds||[])].map(String),excludedTaskIds:[...(route.excludedTaskIds||[])].map(String)}}
 function revisionSignature(payload){return JSON.stringify(payload)}
 function routeRevisions(routeId,d=database()){if(!d)return[];return revisionStore(d).filter(x=>String(x.routeId)===String(routeId)).sort((a,b)=>(Number(b.revision)||0)-(Number(a.revision)||0))}
 function ensureRouteRevision(routeId,d=database(),{note='',reason='auto'}={}){const r=rawRoute(d,routeId);if(!r)return {ok:false,reason:'Маршрут не найден'};const payload=revisionPayload(r),list=routeRevisions(routeId,d),latest=list[0]||null,sig=revisionSignature(payload);if(latest&&latest.signature===sig){r.revision=Number(latest.revision)||1;return {ok:true,created:false,revision:latest}}const rev=(latest?Number(latest.revision)||0:0)+1,createdAt=now(),entry={id:`${r.id}-REV-${String(rev).padStart(3,'0')}`,routeId:r.id,revision:rev,createdAt,note:clean(note),reason,signature:sig,snapshot:clone(payload)};revisionStore(d).push(entry);r.revision=rev;r.revisionUpdatedAt=createdAt;return {ok:true,created:true,revision:entry}}
 function commitRouteRevision(routeId,{note='',reason='manual'}={},d=database()){const result=ensureRouteRevision(routeId,d,{note,reason});if(result.ok)save(d,result.created?`Ревизия ${result.revision.revision} зафиксирована`:`Маршрут уже соответствует ревизии ${result.revision.revision}`);return result}
 function revisionState(routeId,d=database()){const r=rawRoute(d,routeId);if(!r)return null;const list=routeRevisions(routeId,d),latest=list[0]||null,current=revisionPayload(r),changed=!latest||latest.signature!==revisionSignature(current);return {routeId,revision:latest?.revision||Number(r.revision)||1,revisionId:latest?.id||'',changed,revisions:list}}
 function compareRouteRevisions(routeId,aRevision,bRevision,d=database()){const list=routeRevisions(routeId,d),a=list.find(x=>Number(x.revision)===Number(aRevision)),b=list.find(x=>Number(x.revision)===Number(bRevision));if(!a||!b)return null;const aa=a.snapshot?.taskIds||[],bb=b.snapshot?.taskIds||[],as=new Set(aa),bs=new Set(bb);return {from:a,to:b,added:bb.filter(x=>!as.has(x)),removed:aa.filter(x=>!bs.has(x)),orderChanged:aa.length===bb.length&&aa.some((x,i)=>bb[i]!==x),metadataChanged:['name','description','lineId','areaId','interval','assignee','estimatedMinutesPerTask','fixedMinutes','planningAnchorDate','status'].filter(k=>JSON.stringify(a.snapshot?.[k])!==JSON.stringify(b.snapshot?.[k]))}}

 function save(d,message='Маршруты сохранены'){global.LubricaCore?.State?.setDatabase?.(d);global.LubricaApp?.refreshFromCore?.();global.LubricaApp?.showToast?.(message)}
 function syncAndSave(){const d=database();const result=syncRoutes(d);if(d)save(d,`Маршруты обновлены · новых: ${result.created}`);return result}
 function updateRoute(id,patch){const d=database();if(!d)return null;const r=(d.routes||[]).find(x=>x.id===id);if(!r)return null;Object.assign(r,patch,{updatedAt:now()});save(d,'Маршрут сохранён');return r}
 function moveTask(routeId,taskId,delta){const d=database(),r=(d?.routes||[]).find(x=>x.id===routeId);if(!r)return false;const a=r.taskIds||[],i=a.indexOf(String(taskId)),j=i+delta;if(i<0||j<0||j>=a.length)return false;[a[i],a[j]]=[a[j],a[i]];r.updatedAt=now();save(d,'Порядок маршрута изменён');return true}
 function excludeTask(routeId,taskId){const d=database(),r=(d?.routes||[]).find(x=>x.id===routeId);if(!r)return false;const id=String(taskId);r.taskIds=(r.taskIds||[]).filter(x=>String(x)!==id);r.excludedTaskIds=[...new Set([...(r.excludedTaskIds||[]),id])];r.updatedAt=now();save(d,'Мероприятие исключено из маршрута');return true}
 function restoreTask(routeId,taskId){const d=database(),r=(d?.routes||[]).find(x=>x.id===routeId);if(!r)return false;const id=String(taskId);r.excludedTaskIds=(r.excludedTaskIds||[]).filter(x=>String(x)!==id);if(!(r.taskIds||[]).includes(id))r.taskIds.push(id);r.updatedAt=now();save(d,'Мероприятие возвращено в маршрут');return true}

 function rawRoute(d,routeId){return (d?.routes||[]).find(r=>String(r.id)===String(routeId))||null}
 function routeKey(r){return [r?.lineId||'',r?.areaId||'',r?.interval||''].join('|')}
 function taskNativeKey(d,taskId,m=maps(d)){
   const t=m.tasks.get(String(taskId));if(!t)return'';return groupKey(taskContext(d,t,m));
 }
 function pointIdForTask(d,taskId,m=maps(d)){
   return m.tasks.get(String(taskId))?.lubricationPointId||'';
 }
 function taskAssignments(d=database()){
   const out=new Map();
   for(const r of d?.routes||[])for(const id of r.taskIds||[]){const k=String(id);if(!out.has(k))out.set(k,[]);out.get(k).push(r.id)}
   return out;
 }
 function pointGroupsForRoute(routeId,d=database()){
   const r=rawRoute(d,routeId);if(!r)return[];
   const m=maps(d),pmap=legacyPointMap(d),groups=[],byPoint=new Map();
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
   return (d.tasks||[]).filter(t=>approved(t)&&String(t.lubricationPointId)===String(pointId)&&groupKey(taskContext(d,t,m))===targetKey).map(t=>String(t.id));
 }
 function pointTaskCandidates(routeId,d=database(),options={}){
   const includeUnapproved=!!options.includeUnapproved,r=rawRoute(d,routeId);if(!r)return[];
   const m=maps(d),pmap=legacyPointMap(d),current=new Set((r.taskIds||[]).map(String)),assign=taskAssignments(d),groups=new Map();
   for(const t of d.tasks||[]){
     if(!includeUnapproved&&!approved(t))continue;
     const c=taskContext(d,t,m),id=String(t.id),lp=m.lps.get(t.lubricationPointId)||{},eq=m.eq.get(lp.equipmentId)||{},node=m.nodes.get(lp.nodeId)||{},legacy=pmap.get(id)||{},pointId=lp.id||t.lubricationPointId||`task:${id}`;
     let g=groups.get(pointId);
     if(!g){g={pointKey:pointId,pointId,pointDisplayId:lp.legacyId||legacy.pointDisplayId||pointId,equipmentCode:eq.externalCode||legacy.position||'',equipment:eq.name||legacy.equipment||'Не определено',node:node.name||legacy.unit||'Без узла',pointName:lp.name||legacy.unit||legacy.component||pointId,category:lp.category||legacy.type||'other',line:c.line?.name||'',area:c.area?.name||'',lineId:c.lineId,areaId:c.areaId,tasks:[]};groups.set(pointId,g)}
     const assigned=(assign.get(id)||[]).filter(rid=>rid!==routeId),sameLine=c.lineId===r.lineId,sameArea=!r.areaId||c.areaId===r.areaId,sameInterval=r.intervalMode==='mixed'||c.interval===r.interval;
     g.tasks.push({id,operation:t.operation||legacy.operation||'Мероприятие',activityType:t.activityType||'',interval:c.interval,material:legacy.material||t.materialName||'',quantity:t.quantity?.approved??'',unit:t.quantity?.unit||'',toolId:t.toolId||'',approvalStatus:t.approvalStatus||'',inCurrent:current.has(id),assignedRouteIds:assigned,sameLine,sameArea,sameInterval,recommended:sameLine&&sameArea&&sameInterval,warnings:[!sameLine?'Другая линия':'',!sameArea?'Другой участок':'',!sameInterval?'Другая периодичность':''].filter(Boolean)});
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
   const target=rawRoute(d,routeId);if(!target)return {ok:false,reason:'Маршрут не найден'};
   const ids=[...new Set((taskIds||[]).map(String))],m=maps(d),accepted=[],warnings=[],conflicts=[];
   for(const id of ids){
     const t=m.tasks.get(id);if(!t){conflicts.push({taskId:id,reason:'Мероприятие не найдено'});continue}
     if(!approved(t)){conflicts.push({taskId:id,reason:'Мероприятие не утверждено'});continue}
     const c=taskContext(d,t,m),sameLine=c.lineId===target.lineId,sameArea=!target.areaId||c.areaId===target.areaId,sameInterval=target.intervalMode==='mixed'||c.interval===target.interval;
     if(!sameInterval&&!options.allowIntervalMismatch){conflicts.push({taskId:id,reason:`Другая периодичность: ${c.interval}`});continue}
     if(!sameLine)warnings.push(`${id}: другая линия`);if(!sameArea)warnings.push(`${id}: другой участок`);
     const other=(d.routes||[]).filter(r=>r.id!==routeId&&(r.taskIds||[]).some(x=>String(x)===id));
     if(other.length&&options.copy!==true&&options.move!==true){conflicts.push({taskId:id,reason:`Мероприятие уже включено: ${other.map(r=>r.code||r.id).join(', ')}`});continue}
     if(options.move===true){const native=pointNativeRoute(d,id);for(const r of other)r.taskIds=(r.taskIds||[]).filter(x=>String(x)!==id);if(native&&native.id!==routeId)native.excludedTaskIds=[...new Set([...(native.excludedTaskIds||[]),id])]}
     target.excludedTaskIds=(target.excludedTaskIds||[]).filter(x=>String(x)!==id);accepted.push(id);
   }
   insertTaskIds(target,accepted,options,d);target.updatedAt=now();
   if(accepted.length)save(d,`В маршрут добавлено мероприятий: ${accepted.length}`);
   return {ok:accepted.length>0||conflicts.length===0,taskIds:accepted,warnings:[...new Set(warnings)],conflicts};
 }
 function removeTaskFromRoute(routeId,taskId,d=database()){
   const r=rawRoute(d,routeId);if(!r)return {ok:false,reason:'Маршрут не найден'};const id=String(taskId);
   if(!(r.taskIds||[]).some(x=>String(x)===id))return {ok:false,reason:'Мероприятие не входит в маршрут'};
   r.taskIds=(r.taskIds||[]).filter(x=>String(x)!==id);const native=pointNativeRoute(d,id);if(native?.id===routeId)r.excludedTaskIds=[...new Set([...(r.excludedTaskIds||[]),id])];r.updatedAt=now();save(d,'Мероприятие исключено из маршрута');return {ok:true,taskId:id};
 }
 function availablePoints(routeId,d=database()){
   const r=rawRoute(d,routeId);if(!r)return[];const excluded=new Set((r.excludedTaskIds||[]).map(String));
   return pointTaskCandidates(routeId,d).map(g=>{const compatible=g.tasks.filter(t=>t.sameLine&&t.sameArea&&t.sameInterval),excludedTaskIds=compatible.filter(t=>excluded.has(String(t.id))).map(t=>t.id),assignedRouteIds=[...new Set(compatible.flatMap(t=>t.assignedRouteIds||[]))];return {...g,taskIds:compatible.map(t=>t.id),excludedTaskIds,assignedRouteIds,missingTaskIds:compatible.filter(t=>!t.inCurrent).map(t=>t.id),state:compatible.length&&excludedTaskIds.length===compatible.length?'excluded':assignedRouteIds.length?'other_route':'available'}}).filter(g=>g.taskIds.length&&g.missingTaskIds.length);
 }
 function setPointOrder(routeId,visitRefs,d=database(),{persist=true}={}){
   const r=rawRoute(d,routeId);if(!r)return false;
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
 function pointNativeRoute(d,taskId){const k=taskNativeKey(d,taskId);return (d.routes||[]).find(r=>r.source==='auto'&&routeKey(r)===k)||(d.routes||[]).find(r=>routeKey(r)===k)||null}
 function addPointToRoute(routeId,pointId,d=database()){
   const target=rawRoute(d,routeId);if(!target)return {ok:false,reason:'Маршрут не найден'};
   const ids=compatibleTaskIdsForPoint(d,target,pointId,maps(d));if(!ids.length)return {ok:false,reason:'У точки нет утверждённых мероприятий с периодичностью этого маршрута'};
   return addTasksToRoute(routeId,ids,{move:true},d);
 }
 function removePointFromRoute(routeId,pointRef,d=database()){
   const r=rawRoute(d,routeId);if(!r)return {ok:false,reason:'Маршрут не найден'};
   const group=findVisitGroup(pointGroupsForRoute(routeId,d),pointRef),ids=group?.taskIds||[];if(!ids.length)return {ok:false,reason:'Точка не найдена в маршруте'};
   r.taskIds=(r.taskIds||[]).filter(x=>!ids.includes(String(x)));
   for(const id of ids){const native=pointNativeRoute(d,id);if(native?.id===routeId)r.excludedTaskIds=[...new Set([...(r.excludedTaskIds||[]),id])]}
   r.updatedAt=now();save(d,'Точка исключена из маршрута');return {ok:true,taskIds:ids};
 }
 function queueState(routeId,d=database()){
   const r=rawRoute(d,routeId);return {route:r,current:pointGroupsForRoute(routeId,d),available:availablePoints(routeId,d)};
 }

 function routeCreationOptions(d=database()){
   const m=maps(d||{}),intervals=[...new Set((d?.tasks||[]).filter(approved).map(t=>clean(t.schedule?.legacyText)).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ru'));
   return {lines:[...(d?.lines||[])].map(x=>({id:x.id,name:x.name||x.id})),areas:[...(d?.areas||[])].map(x=>({id:x.id,lineId:x.lineId||'',name:x.name||x.id})),intervals,routes:(d?.routes||[]).map(normalizeRoute).filter(r=>r.status!=='archived')};
 }
 function suggestRouteName({lineId='',areaId='',interval=''}={},d=database()){
   const m=maps(d||{}),line=m.lines.get(lineId),area=m.areas.get(areaId);return [line?.name||lineId,area?.name||areaId,interval].filter(Boolean).join(' — ')||'Новый маршрут';
 }
 function previewPointTaskCatalog(input={},d=database()){
   if(!d)return {points:[],matchingTaskIds:[],pointCount:0,taskCount:0};
   const spec={lineId:clean(input.lineId),areaId:clean(input.areaId),interval:clean(input.interval),intervalMode:input.intervalMode||'fixed'},m=maps(d),pmap=legacyPointMap(d),groups=new Map();
   for(const t of d.tasks||[]){if(!approved(t))continue;const c=taskContext(d,t,m);if(c.lineId!==spec.lineId||(spec.areaId&&c.areaId!==spec.areaId))continue;const id=String(t.id),lp=m.lps.get(t.lubricationPointId)||{},eq=m.eq.get(lp.equipmentId)||{},node=m.nodes.get(lp.nodeId)||{},legacy=pmap.get(id)||{},pointId=lp.id||t.lubricationPointId||`task:${id}`,matchesInterval=spec.intervalMode==='mixed'||c.interval===spec.interval;let g=groups.get(pointId);if(!g){g={pointId,pointDisplayId:lp.legacyId||legacy.pointDisplayId||pointId,equipmentCode:eq.externalCode||legacy.position||'',equipment:eq.name||legacy.equipment||'Не определено',node:node.name||legacy.unit||'Без узла',pointName:lp.name||legacy.unit||legacy.component||pointId,line:c.line?.name||'',area:c.area?.name||'',tasks:[]};groups.set(pointId,g)}g.tasks.push({id,operation:t.operation||legacy.operation||'Мероприятие',activityType:t.activityType||'',interval:c.interval,material:legacy.material||t.materialName||'',quantity:t.quantity?.approved??'',unit:t.quantity?.unit||'',matchesInterval})}
   const points=[...groups.values()].sort((a,b)=>(a.equipmentCode+a.pointName).localeCompare(b.equipmentCode+b.pointName,'ru')),matchingTaskIds=points.flatMap(g=>g.tasks.filter(t=>t.matchesInterval).map(t=>t.id));return {points,matchingTaskIds,pointCount:points.length,taskCount:points.reduce((n,g)=>n+g.tasks.length,0),matchingTaskCount:matchingTaskIds.length};
 }
 function previewRouteCandidates(input={},d=database()){
   if(!d)return {points:[],variants:[],taskIds:[],pointCount:0,taskCount:0};
   const spec={lineId:clean(input.lineId),areaId:clean(input.areaId),interval:clean(input.interval),intervalMode:input.intervalMode||'fixed'},m=maps(d),pmap=legacyPointMap(d),groups=new Map();
   for(const t of d.tasks||[]){if(!approved(t))continue;const c=taskContext(d,t,m);if(c.lineId!==spec.lineId||(spec.areaId&&c.areaId!==spec.areaId)||(spec.intervalMode!=='mixed'&&c.interval!==spec.interval))continue;const id=String(t.id),lp=m.lps.get(t.lubricationPointId)||{},eq=m.eq.get(lp.equipmentId)||{},node=m.nodes.get(lp.nodeId)||{},legacy=pmap.get(id)||{},pointId=lp.id||t.lubricationPointId||`task:${id}`;let g=groups.get(pointId);if(!g){g={pointId,pointDisplayId:lp.legacyId||legacy.pointDisplayId||pointId,equipmentCode:eq.externalCode||legacy.position||'',equipment:eq.name||legacy.equipment||'Не определено',node:node.name||legacy.unit||'Без узла',pointName:lp.name||legacy.unit||legacy.component||pointId,line:c.line?.name||'',area:c.area?.name||'',taskIds:[],tasks:[]};groups.set(pointId,g)}g.taskIds.push(id);g.tasks.push({id,operation:t.operation||legacy.operation||'Мероприятие',activityType:t.activityType||'',interval:c.interval,material:legacy.material||t.materialName||'',quantity:t.quantity?.approved??'',unit:t.quantity?.unit||''})}
   const points=[...groups.values()].sort((a,b)=>(a.equipmentCode+a.pointName).localeCompare(b.equipmentCode+b.pointName,'ru')),taskIds=points.flatMap(g=>g.taskIds);return {points,variants:points,taskIds,pointCount:points.length,physicalPointCount:points.length,taskCount:taskIds.length};
 }
 function createRoute(input={},d=database()){
   if(!d)return {ok:false,reason:'База данных недоступна'};
   d.routes=(d.routes||[]).map(normalizeRoute);
   const lineId=clean(input.lineId),areaId=clean(input.areaId),interval=clean(input.interval);
   if(!lineId)return {ok:false,reason:'Выберите линию'};if(!interval&&input.intervalMode!=='mixed')return {ok:false,reason:'Выберите периодичность'};
   const code=clean(input.code)||nextRouteCode(d.routes,lineId,areaId);if(d.routes.some(r=>clean(r.code)&&clean(r.code)===code))return {ok:false,reason:`Код маршрута ${code} уже используется`};
   const r=normalizeRoute({id:nextRouteId(d.routes),code,name:clean(input.name)||suggestRouteName({lineId,areaId,interval},d),description:clean(input.description),lineId,areaId,interval,intervalMode:input.intervalMode||'fixed',routeType:input.routeType||'lubrication',sequenceMode:'manual',assignee:clean(input.assignee)||'Смазчик',estimatedMinutesPerTask:Number(input.estimatedMinutesPerTask)||5,fixedMinutes:Number(input.fixedMinutes)||10,planningAnchorDate:input.planningAnchorDate||'',status:input.status||'draft',source:input.source||'manual',taskIds:[],excludedTaskIds:[]});
   d.routes.push(r);
   if(input.fillMode==='automatic'){const m=maps(d);r.taskIds=(d.tasks||[]).filter(approved).filter(t=>{const c=taskContext(d,t,m);return c.lineId===r.lineId&&(!r.areaId||c.areaId===r.areaId)&&(r.intervalMode==='mixed'||c.interval===r.interval)}).map(t=>String(t.id));}
   if(Array.isArray(input.taskIds))for(const id of input.taskIds.map(String))if(!r.taskIds.includes(id))r.taskIds.push(id);
   ensureRouteRevision(r.id,d,{note:'Исходная версия маршрута',reason:'create'});save(d,'Маршрут создан');return {ok:true,route:r};
 }
 function cloneRoute(routeId,input={},d=database()){
   const src=rawRoute(d,routeId);if(!src)return {ok:false,reason:'Маршрут не найден'};const result=createRoute({...src,...input,id:undefined,code:input.code||'',name:input.name||`${src.name||src.id} — копия`,status:'draft',source:'copy',fillMode:'empty',taskIds:[...(src.taskIds||[])]},d);return result;
 }
 function archiveRoute(routeId,d=database()){const r=rawRoute(d,routeId);if(!r)return false;r.status='archived';r.updatedAt=now();save(d,'Маршрут архивирован');return true}
 function restoreRoute(routeId,d=database()){const r=rawRoute(d,routeId);if(!r)return {ok:false,reason:'Маршрут не найден'};r.status='draft';r.updatedAt=now();save(d,'Маршрут восстановлен из архива');return {ok:true,route:r}}
 function setRouteStatus(routeId,status,d=database()){const r=rawRoute(d,routeId);if(!r)return {ok:false,reason:'Маршрут не найден'};if(!['draft','active','archived'].includes(status))return {ok:false,reason:'Неизвестный статус маршрута'};if(status==='active'){const report=validateRoute(routeId,d);if(!report.valid)return {ok:false,reason:`Маршрут содержит ошибок: ${report.errors.length}`,report}}r.status=status;r.updatedAt=now();save(d,status==='active'?'Маршрут активирован':status==='archived'?'Маршрут архивирован':'Маршрут переведён в черновик');return {ok:true,route:r}}
 function deleteRoute(routeId,d=database()){const r=rawRoute(d,routeId);if(!r)return {ok:false,reason:'Маршрут не найден'};if(r.source==='auto')return {ok:false,reason:'Автоматический маршрут нельзя удалить — его можно архивировать'};if(r.status==='active')return {ok:false,reason:'Активный маршрут сначала архивируйте'};d.routes=d.routes.filter(x=>String(x.id)!==String(routeId));save(d,'Маршрут удалён');return {ok:true}}
 function candidatePointVariants(routeId,d=database(),options={}){
   const includeCurrent=!!options.includeCurrent;return pointTaskCandidates(routeId,d).flatMap(g=>{
     const byInterval=new Map();for(const t of g.tasks){if(!includeCurrent&&t.inCurrent)continue;const key=t.interval||'Без периодичности';if(!byInterval.has(key))byInterval.set(key,[]);byInterval.get(key).push(t)}
     return [...byInterval.entries()].map(([interval,tasks])=>({variantKey:`${g.pointId}||${interval}`,pointId:g.pointId,pointDisplayId:g.pointDisplayId,equipmentCode:g.equipmentCode,equipment:g.equipment,node:g.node,pointName:g.pointName,line:g.line,area:g.area,lineId:g.lineId,areaId:g.areaId,interval,taskIds:tasks.map(t=>t.id),tasks,assignedRouteIds:[...new Set(tasks.flatMap(t=>t.assignedRouteIds||[]))],inCurrentCount:tasks.filter(t=>t.inCurrent).length,missingTaskIds:tasks.filter(t=>!t.inCurrent).map(t=>t.id),sameLine:tasks.every(t=>t.sameLine),sameArea:tasks.every(t=>t.sameArea),sameInterval:tasks.every(t=>t.sameInterval),recommended:tasks.every(t=>t.recommended),warnings:[...new Set(tasks.flatMap(t=>t.warnings||[]))]}))
   });
 }
 function insertTaskBlock(r,ids,{position='end',referencePointId='',referenceVisitKey=''}={},d=database()){
   const unique=ids.map(String).filter(id=>!(r.taskIds||[]).some(x=>String(x)===id));if(!unique.length)return;
   if(position==='start'){r.taskIds=[...unique,...r.taskIds];return}
   const ref=referenceVisitKey||referencePointId;
   if((position==='before'||position==='after')&&ref){const groups=pointGroupsForRoute(r.id,d),g=findVisitGroup(groups,ref);if(g){const indexes=g.taskIds.map(id=>r.taskIds.indexOf(id)).filter(i=>i>=0);const at=position==='before'?Math.min(...indexes):Math.max(...indexes)+1;r.taskIds.splice(at,0,...unique);return}}
   r.taskIds.push(...unique);
 }
 function addPointVariantToRoute(routeId,variantKey,options={},d=database()){
   const variant=candidatePointVariants(routeId,d,{includeCurrent:true}).find(g=>g.variantKey===variantKey);if(!variant)return {ok:false,reason:'Точка или набор мероприятий не найден'};
   return addTasksToRoute(routeId,variant.taskIds,{...options,move:options.copy===true?false:true,copy:options.copy===true},d);
 }
 function movePointToRoute(sourceRouteId,targetRouteId,pointRef,options={},d=database()){
   const source=rawRoute(d,sourceRouteId),target=rawRoute(d,targetRouteId);if(!source||!target)return {ok:false,reason:'Маршрут не найден'};const group=findVisitGroup(pointGroupsForRoute(sourceRouteId,d),pointRef);if(!group)return {ok:false,reason:'Точка не найдена в исходном маршруте'};
   const m=maps(d),incompatible=group.taskIds.filter(id=>{const t=m.tasks.get(String(id));if(!t)return true;const c=taskContext(d,t,m);return target.intervalMode!=='mixed'&&c.interval!==target.interval});
   if(incompatible.length)return {ok:false,reason:'Не все мероприятия точки соответствуют периодичности маршрута назначения',taskIds:incompatible};
   const ids=[...group.taskIds];source.taskIds=(source.taskIds||[]).filter(x=>!ids.includes(String(x)));insertTaskIds(target,ids,options,d);source.updatedAt=target.updatedAt=now();save(d,'Мероприятия точки перемещены в другой маршрут');return {ok:true,taskIds:ids,pointId:group.pointId};
 }
 function validateRoute(routeId,d=database()){
   const r=rawRoute(d,routeId);if(!r)return {valid:false,errors:[{code:'ROUTE_MISSING',message:'Маршрут не найден'}],warnings:[],recommendations:[]};const m=maps(d),errors=[],warnings=[],seen=new Set();
   for(const id of r.taskIds||[]){const t=m.tasks.get(String(id));if(!t){errors.push({code:'TASK_MISSING',taskId:id,message:`Мероприятие ${id} не найдено`});continue}const c=taskContext(d,t,m);if(!m.lps.get(t.lubricationPointId))errors.push({code:'POINT_MISSING',taskId:id,message:`Для ${id} не найдена точка смазки`});if(seen.has(String(id)))warnings.push({code:'DUPLICATE_TASK',taskId:id,message:`Мероприятие ${id} включено повторно`});seen.add(String(id));if(c.lineId!==r.lineId)warnings.push({code:'LINE_MISMATCH',taskId:id,message:`${id}: другая линия`});if(r.areaId&&c.areaId!==r.areaId)warnings.push({code:'AREA_MISMATCH',taskId:id,message:`${id}: другой участок`});if(r.intervalMode!=='mixed'&&c.interval!==r.interval)warnings.push({code:'INTERVAL_MISMATCH',taskId:id,message:`${id}: ${c.interval} вместо ${r.interval}`})}
   const recommended=candidatePointVariants(routeId,d).filter(x=>x.recommended&&x.inCurrentCount===0).length;if(recommended)warnings.push({code:'NEW_MATCHING_POINTS',message:`Найдено новых подходящих точек: ${recommended}`});return {valid:errors.length===0,errors,warnings,recommendations:[],summary:{errorCount:errors.length,warningCount:warnings.length}};
 }

 window.LubricaRouteEngine=Object.freeze({routeEntries,routeRevisions,revisionState,ensureRouteRevision,commitRouteRevision,compareRouteRevisions,syncRoutes,syncAndSave,updateRoute,moveTask,excludeTask,restoreTask,taskContext,eligibleGroups,pointGroupsForRoute,pointTaskCandidates,taskCandidate,previewPointTaskCatalog,availablePoints,queueState,setPointOrder,movePoint,movePointToIndex,movePointBefore,addTasksToRoute,removeTaskFromRoute,addPointToRoute,removePointFromRoute,routeCreationOptions,suggestRouteName,previewRouteCandidates,createRoute,cloneRoute,archiveRoute,restoreRoute,setRouteStatus,deleteRoute,candidatePointVariants,addPointVariantToRoute,movePointToRoute,validateRoute});
 global.LubricaSystem?.registerModule?.('Маршруты','ok','Создание, ревизии и календарное планирование маршрутов');
})(window);
