"use strict";
/* Stage 9.1 — operational checklist templates and execution state. */
(function(global){
 const clean=v=>String(v??'').trim();
 const now=()=>new Date().toISOString();
 const clone=x=>JSON.parse(JSON.stringify(x));
 function db(){return global.LubricaCore?.State?.getDatabase?.()||null}
 function taskId(p){return String(global.taskKey?global.taskKey(p):(p.taskId||p.id||''))}
 function maps(d){return{
  tasks:new Map((d.tasks||[]).map(x=>[String(x.id),x])),
  lps:new Map((d.lubricationPoints||[]).map(x=>[x.id,x])),
  materials:new Map((d.materials||[]).map(x=>[String(x.id),x])),
  materialList:d.materials||[],
  tools:new Map((d.tools||[]).map(x=>[String(x.id),x])),
  toolList:d.tools||[]
 }}
 function resolveRecord(list,map,...keys){
  for(const key of keys){if(key==null||String(key).trim()==='')continue;const direct=map.get(String(key));if(direct)return direct;const q=clean(key).toLowerCase();const hit=(list||[]).find(x=>[x.id,x.code,x.name,x.productCode].some(v=>clean(v).toLowerCase()===q));if(hit)return hit}
  return{}
 }
 function operationKey(p,t){const a=clean(t?.activityType).toLowerCase(),o=clean(p?.operation||t?.operation).toLowerCase();
  if(a)return a;
  if(/досмаз|шприц/.test(o))return'regrease';
  if(/пол.*замен.*смаз|замен.*смаз/.test(o))return'grease_full_replacement';
  if(/провер.*уров/.test(o))return'oil_level_check';
  if(/долив/.test(o))return'oil_topup';
  if(/замен.*масл/.test(o))return'oil_change';
  if(/отбор.*проб|анализ.*масл/.test(o))return'oil_sample';
  if(/нанес.*смаз|смаз.*цеп|кисть/.test(o))return'lubricant_apply';
  return'generic';
 }
 const COMMON=[
  'Сверить оборудование и ID точки с маршрутом.',
  'Проверить безопасный режим выполнения работ и требования участка.',
  'Сверить назначенный материал, инструмент и норму.',
  'После выполнения зафиксировать отклонения в поле «Наблюдения, коррекции».'
 ];
 const TEMPLATES={
  bearing_regrease:{title:'Досмазывание подшипника',steps:[
   'Сверить ID точки на оборудовании с ID точки в маршруте.',
   'Сверить кодировку смазочного пистолета с кодом материала в маршруте.',
   'Осмотреть и очистить подшипниковый узел от загрязнений.',
   'Снять колпачки с пресс-маслёнки и штуцера пистолета; при необходимости очистить ветошью.',
   'Проверить состояние уплотнений и исправность пресс-маслёнки.',
   'Заменить или протянуть неисправную пресс-маслёнку, если это предусмотрено допуском работ.',
   'Внести смазку строго по указанному количеству / количеству качков.',
   'Удалить лишнюю смазку с уплотнений и пресс-маслёнки.',
   'Закрыть защитные колпачки.',
   'Отметить выполнение и записать выявленные повреждения или отклонения.'
  ]},
  bearing_grease_full_replacement:{title:'Полная замена смазки подшипника',steps:[
   'Сверить ID точки, материал и утверждённое количество.',
   'Обеспечить останов и безопасный доступ к узлу.',
   'Очистить узел и исключить попадание загрязнений.',
   'Удалить старую смазку в объёме, предусмотренном технологией/OEM.',
   'Осмотреть уплотнения, посадки и состояние узла.',
   'Внести новый материал в утверждённом количестве.',
   'Восстановить уплотнения/крышки и удалить излишки.',
   'Зафиксировать выполнение и наблюдения.'
  ]},
  gearbox_oil_level_check:{title:'Проверка уровня масла редуктора',steps:[
   'Сверить редуктор, материал и способ контроля уровня.',
   'Обеспечить безопасный режим проверки по инструкции оборудования.',
   'Очистить область смотрового стекла/щупа/контрольной пробки.',
   'Проверить уровень и наличие утечек.',
   'При необходимости выполнить долив только назначенным маслом до установленного уровня.',
   'Зафиксировать долитое количество и наблюдения.'
  ]},
  gearbox_oil_topup:{title:'Долив масла в редуктор',steps:[
   'Сверить редуктор и марку масла.',
   'Проверить причину снижения уровня и наличие утечек.',
   'Очистить место заливки.',
   'Долить масло до установленного контрольного уровня, не превышая его.',
   'Закрыть заливное устройство и удалить загрязнения.',
   'Зафиксировать фактическое количество долива и наблюдения.'
  ]},
  gearbox_oil_change:{title:'Замена масла в редукторе',steps:[
   'Сверить редуктор, масло, объём и интервал.',
   'Подготовить ёмкость для отработанного масла и обеспечить безопасный слив.',
   'Слить масло согласно инструкции OEM.',
   'Осмотреть масло, магнит/пробку и доступные признаки загрязнения.',
   'Закрыть слив и залить назначенное масло до контрольного уровня.',
   'Проверить отсутствие утечек.',
   'Зафиксировать фактический объём и наблюдения.'
  ]},
  chain_lubricant_apply:{title:'Смазка цепной передачи',steps:[
   'Сверить цепь, материал, норму и способ нанесения.',
   'Очистить цепь в объёме, предусмотренном технологией.',
   'Осмотреть натяжение, ролики/втулки и явные повреждения.',
   'Подавать материал преимущественно в шарнир палец–втулка и между пластинами.',
   'Нанести утверждённое количество по всей обслуживаемой зоне.',
   'Удалить излишки, способные загрязнять оборудование/продукт.',
   'Зафиксировать состояние цепи и выполнение.'
  ]},
  ball_screw_regrease:{title:'Досмазывание ШВП',steps:[
   'Сверить ШВП, материал и норму на гайку.',
   'Очистить зону смазывания и пресс-маслёнку/порт.',
   'Проверить состояние уплотнений и отсутствие загрязнений на винте.',
   'Внести назначенное количество смазки.',
   'При предусмотренной OEM процедуре выполнить необходимые перемещения для распределения смазки.',
   'Удалить излишки и зафиксировать наблюдения.'
  ]},
  linear_bearing_regrease:{title:'Досмазывание линейной направляющей / втулки',steps:[
   'Сверить линейный узел, количество кареток/втулок, материал и норму.',
   'Очистить зону подачи смазки и доступные поверхности.',
   'Проверить уплотнения и отсутствие повреждений направляющей.',
   'Внести норму по каждой каретке/втулке согласно маршруту.',
   'При предусмотренной OEM процедуре выполнить перемещение для распределения смазки.',
   'Удалить излишки и записать наблюдения.'
  ]},
  generic:{title:'Смазочное обслуживание',steps:COMMON}
 };
 function templateFor(p,t){const type=clean(p?.type),op=operationKey(p,t);const key=`${type}_${op}`;
  if(TEMPLATES[key])return TEMPLATES[key];
  if(type==='gearbox_oil'&&TEMPLATES[`gearbox_${op}`])return TEMPLATES[`gearbox_${op}`];
  if(type==='chain'&&op==='lubricant_apply')return TEMPLATES.chain_lubricant_apply;
  if(type==='ball_screw'&&op==='regrease')return TEMPLATES.ball_screw_regrease;
  if(type==='linear_bearing'&&op==='regrease')return TEMPLATES.linear_bearing_regrease;
  return TEMPLATES.generic;
 }
 function numeric(v){if(v==null||String(v).trim()==='')return null;const n=Number(String(v).replace(',','.'));return Number.isFinite(n)?n:null}
 function fmtNumber(v,max=2){if(!Number.isFinite(v))return'';return Number(v.toFixed(max)).toLocaleString('ru-RU',{maximumFractionDigits:max})}
 // R7: canonical quantity units, shared by checklist, preparation and plan/fact.
 const unitInfo=value=>{
  const raw=clean(value).toLowerCase().replace(/³/g,'3').replace(/\s+/g,'').replace(/\.$/,'');
  const alias={г:['mass','g',1,'г'],гр:['mass','g',1,'г'],g:['mass','g',1,'г'],кг:['mass','g',1000,'кг'],kg:['mass','g',1000,'кг'],мл:['volume','ml',1,'мл'],ml:['volume','ml',1,'мл'],см3:['volume','ml',1,'мл'],'см^3':['volume','ml',1,'мл'],cm3:['volume','ml',1,'мл'],cc:['volume','ml',1,'мл'],л:['volume','ml',1000,'л'],l:['volume','ml',1000,'л'],литр:['volume','ml',1000,'л'],литра:['volume','ml',1000,'л'],литров:['volume','ml',1000,'л']};
  const x=Object.hasOwn(alias,raw)?alias[raw]:null;if(x)return{dim:x[0],base:x[1],factor:x[2],label:x[3]};
  if(!raw||!/^\p{L}+(?:\/\p{L}+)?$/u.test(raw))return null;
  return{dim:'other',base:raw,factor:1,label:raw};
 };
 const qtyBase=q=>{const u=unitInfo(q?.unit),n=numeric(q?.value);return u&&n!=null&&n>=0?{amount:n*u.factor,dim:u.dim,base:u.base,unit:u.dim==='mass'?'г':u.dim==='volume'?'мл':u.label}:null};
 function parseQuantity(value,defaultUnit=''){
  const text=clean(value);if(!text)return null;
  const match=text.match(/^(\d+(?:[.,]\d+)?)\s*(.*?)\s*$/);if(!match)return null;
  const suffix=match[2].replace(/\s+\([^)]*\)$/,'').trim(),u=unitInfo(suffix||defaultUnit),n=numeric(match[1]);
  return u&&n!=null&&n>=0?{value:n,unit:u.label}:null;
 }
 function convertQuantity(value,unit,targetUnit){
  const n=numeric(value),from=unitInfo(unit),to=unitInfo(targetUnit);
  return n!=null&&n>=0&&from&&to&&from.dim===to.dim&&from.base===to.base?n*from.factor/to.factor:null;
 }
 global.LubricaRouteUnits=Object.freeze({unitInfo,parse:parseQuantity,base:qtyBase,convert:convertQuantity});
 function unitAmount(value,unit,targetUnit){return convertQuantity(value,unit,targetUnit)}
 function deliveryDenominatorLabel(unit,count){
  const u=clean(unit).toLowerCase();
  if(/кач/.test(u))return`${fmtNumber(count,1)} кач.`;
  if(/ход/.test(u))return`${fmtNumber(count,1)} ход.`;
  if(/цикл/.test(u))return`${fmtNumber(count,1)} цикл.`;
  if(/имп/.test(u))return`${fmtNumber(count,1)} имп.`;
  if(/мин/.test(u))return`${fmtNumber(count,2)} мин подачи`;
  if(/сут|дн/.test(u))return`${fmtNumber(count,2)} сут подачи`;
  return`${fmtNumber(count,2)} ${unit}`
 }
 function toolDeliveryDetails(tool,q,approved,unit){
  const cal=numeric(tool?.calibrationValue??tool?.gramsPerStroke),calUnit=clean(tool?.calibrationUnit||(tool?.gramsPerStroke?'г/качок':''));
  if(!(cal>0)||!calUnit)return{calibrationText:'',derivedText:'',displayText:''};
  const parts=calUnit.split('/').map(clean),calibrationText=`${fmtNumber(cal,3)} ${calUnit}`;
  if(parts.length!==2)return{calibrationText,derivedText:'',displayText:`Параметр оборудования: ${calibrationText}`};
  const [numerator,denominator]=parts;
  let total=unitAmount(approved,unit,numerator);
  if(total==null&&q?.calculated!=null)total=unitAmount(q.calculated,unit,numerator);
  if(total!=null&&total>=0){
   const count=total/cal;
   if(Number.isFinite(count)){
    const derivedText=deliveryDenominatorLabel(denominator,count);
    return{calibrationText,derivedText,displayText:`${derivedText} · ${calibrationText}`}
   }
  }
  if(clean(unit).toLowerCase().includes('кач')&&/кач/.test(denominator)&&q?.calculatedGrams!=null){
   return{calibrationText,derivedText:`≈ ${fmtNumber(Number(q.calculatedGrams),2)} г`,displayText:`≈ ${fmtNumber(Number(q.calculatedGrams),2)} г · ${calibrationText}`}
  }
  return{calibrationText,derivedText:'',displayText:`Настройка: ${calibrationText}`}
 }
 function taskDetails(p,d,m=maps(d)){
  const id=taskId(p),t=m.tasks.get(id)||{},lp=m.lps.get(t.lubricationPointId||p.lubricationPointId)||{};
  const materialId=t.materialMode==='explicit'?t.materialId:(lp.targetMaterialId||t.materialId||p.materialId);
  const mat=resolveRecord(m.materialList,m.materials,materialId,t.materialName,p.material);
  const tool=resolveRecord(m.toolList,m.tools,t.toolId||p.toolId,p.toolName);
  const q=t.quantity||{},approved=q.approved!==undefined?q.approved:p.qty,unit=q.unit||p.measure||'';
  let quantityPrimary=clean(approved);if(quantityPrimary&&unit)quantityPrimary=`${quantityPrimary} ${unit}`;
  if(!quantityPrimary&&q.calculated!=null)quantityPrimary=`${q.calculated} ${unit}`.trim();
  const delivery=toolDeliveryDetails(tool,q,approved,unit);
  if(!delivery.displayText&&q.calculatedStrokes!=null&&quantityPrimary&&!/кач/.test(quantityPrimary))delivery.displayText=`${fmtNumber(Number(q.calculatedStrokes),1)} кач.`;
  const quantity=quantityPrimary?(delivery.displayText?`${quantityPrimary} (${delivery.displayText})`:quantityPrimary):(delivery.displayText||'—');
  const template=templateFor(p,t);
  return {taskId:id,pointId:p.pointDisplayId||lp.legacyId||lp.id||p.id,pointName:lp.name||p.unit||p.component||p.position||'',equipmentCode:p.position||'',equipment:p.equipment||'',node:p.unit||'',operation:p.operation||t.operation||'',materialName:mat.name||p.material||t.materialName||'',materialCode:mat.code||'',toolName:tool.name||p.toolName||'',toolCode:tool.code||'',quantity,quantityPrimary:quantityPrimary||'—',equipmentQuantity:delivery.displayText||'',toolCalibration:delivery.calibrationText||'',type:p.type||lp.category||'other',activityType:t.activityType||operationKey(p,t),templateTitle:template.title,steps:clone(template.steps)};
 }
 function groupTasks(route,d= db()){
  if(!route||!d)return[];const m=maps(d),groups=[];let last=null,step=0,lastPointKey='';
  for(const p of route.points||[]){const x=taskDetails(p,d,m),key=`${x.equipmentCode}|${x.equipment}|${x.node}`,pointKey=String(p.lubricationPointId||x.pointId||'');
   if(pointKey!==lastPointKey){step++;lastPointKey=pointKey}
   x.routeStep=step;x.pointKey=pointKey;
   if(!last||last.key!==key){last={key,equipmentCode:x.equipmentCode,equipment:x.equipment,node:x.node,tasks:[]};groups.push(last)}last.tasks.push(x)}
  return groups;
 }
 function model(route,d=db()){if(!route||!d)return null;const groups=groupTasks(route,d),tasks=groups.flatMap(g=>g.tasks),pointCount=new Set(tasks.map(x=>x.pointKey||x.pointId)).size;return{routeId:route.id,routeCode:route.code||route.id,title:route.name||`Маршрут смазочных работ ${route.id}`,line:route.line,area:route.area,assignee:route.assignee||'Смазчик',interval:route.interval,estimatedMinutes:route.estimatedMinutes,pointCount,taskCount:tasks.length,groups,materials:[...new Map(groups.flatMap(g=>g.tasks).filter(x=>x.materialName).map(x=>[x.materialCode||x.materialName,{code:x.materialCode,name:x.materialName}])).values()],tools:[...new Map(groups.flatMap(g=>g.tasks).filter(x=>x.toolName||x.toolCode).map(x=>[x.toolCode||x.toolName,{code:x.toolCode,name:x.toolName}])).values()]}}
 function runs(d){d.checklistRuns=Array.isArray(d.checklistRuns)?d.checklistRuns:[];return d.checklistRuns}
 function nextRunId(d){let n=runs(d).length+1;let id;do{id=`CHK-${String(n++).padStart(5,'0')}`}while(runs(d).some(x=>x.id===id));return id}
 function runTaskIds(run,route=null){
  const frozen=Array.isArray(run?.routeTaskIds)?run.routeTaskIds.map(String).filter(Boolean):[];
  if(frozen.length)return frozen;
  return (route?.points||[]).map(taskId).filter(Boolean)
 }
 function routeRuns(routeId,d=db()){if(!d)return[];return runs(d).filter(r=>r.routeId===routeId&&!['superseded'].includes(r.status)).sort((a,b)=>(Number(b.executionNo)||0)-(Number(a.executionNo)||0)||String(b.startedAt||b.updatedAt||'').localeCompare(String(a.startedAt||a.updatedAt||'')))}
 function getRun(runId,d=db()){return d?runs(d).find(r=>r.id===runId)||null:null}
 function activeRuns(routeId,d=db()){if(!d)return[];return runs(d).filter(r=>r.routeId===routeId&&r.status==='in_progress').sort((a,b)=>(Number(b.executionNo)||0)-(Number(a.executionNo)||0)||String(b.startedAt||b.updatedAt||'').localeCompare(String(a.startedAt||a.updatedAt||'')))}
 function normalizeActiveRuns(routeId,d=db()){const list=activeRuns(routeId,d);if(list.length<=1)return list[0]||null;const keep=list[0];for(const stale of list.slice(1)){stale.status='superseded';stale.supersededAt=now();stale.updatedAt=now();stale.supersededBy=keep.id}return keep}
 function executionNumber(routeId,d){return runs(d).filter(r=>r.routeId===routeId&&!['superseded'].includes(r.status)).length+1}
 function createRun(routeId,{route=null,date='',performer='',shift='',forceNew=false,planItemId=''}={}){
  const d=db();if(!d)return null;
  const currentRoute=(d.routes||[]).find(r=>String(r.id)===String(routeId));
  const isTyped=currentRoute?.groupingMode==='area_service_interval_v1';if(global.LubricaRouteAutomation&&global.LubricaRouteDue&&!isTyped)return null;
  const W=global.LubricaRouteWorkload,activeWork=activeRuns(routeId,d)[0];
  if(activeWork?.workAssignment&&(forceNew||clean(planItemId)&&activeWork.plannedItemId!==clean(planItemId)))return null;
  let workCheck=isTyped||activeWork&&!forceNew?{ok:true}:W?.startPolicy(routeId,planItemId,date,shift,d)||{ok:true};
  if(!workCheck.ok||forceNew&&workCheck.assignment)return null;
  let taskPlan=null,checked=null;
  if(isTyped){
   const D=global.LubricaRouteDue;
   if(!D||!clean(performer)||!clean(shift)||forceNew)return null;
   const active=activeRuns(routeId,d);
   if(active.length)return active[0].plannedItemId===clean(planItemId)?active[0]:null;
   taskPlan=D.planItem(routeId,planItemId,d);
   const entry=global.LubricaRouteEngine?.routeEntries?.(d,{preview:false})?.find(r=>r.id===routeId);
   checked=D.checkStart(entry,taskPlan,d,date,{shift});
   if(!checked.ok)return null;
   route=checked.route;workCheck=checked.work||{ok:true};
  }
  const existing=normalizeActiveRuns(routeId,d);if(existing&&!forceNew){global.LubricaCore.State.setDatabase(d);return existing}
  if(existing&&forceNew){existing.status='superseded';existing.supersededAt=now();existing.updatedAt=now()}
  const ids=(route?.points||[]).map(taskId).filter(Boolean);
  if(route&&ids.length===0)return null;
  const revisionResult=route&&!isTyped?global.LubricaRouteEngine?.ensureRouteRevision?.(routeId,d,{note:'Автофиксация перед выполнением',reason:'execution'}):null;
  const routeRevision=isTyped?{revision:taskPlan.routeRevision,id:taskPlan.routeRevisionId}:(revisionResult?.revision||global.LubricaRouteEngine?.routeRevisions?.(routeId,d)?.[0]||null);
  const snapshot=isTyped?clone(checked.snapshot):(route?model(route,d):null);
  if(isTyped){const byId=new Map(checked.dueEntries.map(e=>[String(e.taskId),e]));for(const group of snapshot.groups)for(const task of group.tasks)task.dueEntry=clone(byId.get(String(task.taskId)))}
  const startedAt=now();
  const run={id:nextRunId(d),routeId,plannedItemId:clean(planItemId),routeRevision:Number(routeRevision?.revision)||Number(route?.revision)||1,routeRevisionId:routeRevision?.id||'',status:'in_progress',executionNo:executionNumber(routeId,d),date:date||new Date().toISOString().slice(0,10),performer:clean(performer),shift:clean(shift),taskResults:{},comments:'',actualStartAt:startedAt,actualEndAt:null,actualDurationMinutes:null,routeTaskIds:ids,routeSnapshot:snapshot?clone(snapshot):null,routeUpdatedAt:route?.updatedAt||null,snapshotAt:snapshot?startedAt:null,startedAt,updatedAt:startedAt,completedAt:null,cancelledAt:null};
  if(isTyped){run.dueEntries=clone(checked.dueEntries);run.serviceDate=date;run.plannedMinutes=taskPlan.plannedMinutes;}
  if(workCheck.assignment)run.workAssignment={...clone(workCheck.assignment),pprRequired:!!workCheck.pprRequired,lineId:workCheck.lineId||''};
  runs(d).push(run);if(isTyped)global.LubricaRoutePlanning?.syncFromRun?.(run,d,{persist:false});global.LubricaCore.State.setDatabase(d);if(!isTyped)global.LubricaRoutePlanning?.syncFromRun?.(run,d);return run
 }
 function latestRun(routeId,{includeCompleted=true}={}){const d=db();if(!d)return null;if(!includeCompleted)return normalizeActiveRuns(routeId,d);return routeRuns(routeId,d)[0]||null}
 function ensureRun(routeId,route=null){return latestRun(routeId,{includeCompleted:false})||createRun(routeId,{route})}
 function updateRun(runId,patch){const d=db(),r=runs(d).find(x=>x.id===runId);if(!r||r.status!=='in_progress')return null;if(r.dueEntries?.length||r.workAssignment){const fields=r.workAssignment?['performer','comments']:['performer','shift','comments'];patch=Object.fromEntries(Object.entries(patch||{}).filter(([k])=>fields.includes(k)))}Object.assign(r,patch,{updatedAt:now()});global.LubricaCore.State.setDatabase(d);return r}
 function updateTask(runId,id,patch){const d=db(),r=runs(d).find(x=>x.id===runId);if(!r||r.status!=='in_progress'||(r.dueEntries?.length&&!runTaskIds(r).includes(String(id))))return null;r.taskResults=r.taskResults||{};r.taskResults[id]={done:false,resultStatus:'pending',observations:'',actualQuantity:'',actualQuantityUnit:'',deviationReason:'',...r.taskResults[id],...patch,updatedAt:now()};
  if(r.taskResults[id].done)r.taskResults[id].resultStatus='completed';
  else if(!['skipped','not_applicable'].includes(r.taskResults[id].resultStatus))r.taskResults[id].resultStatus='pending';r.updatedAt=now();global.LubricaCore.State.setDatabase(d);return r.taskResults[id]}
 function progress(run,route){
 const ids=runTaskIds(run,route),done=ids.filter(id=>run?.taskResults?.[id]?.done===true).length;
 const skipped=ids.filter(id=>!run?.taskResults?.[id]?.done&&['skipped','not_applicable'].includes(run?.taskResults?.[id]?.resultStatus)).length;
 const resolved=done+skipped,total=ids.length;
 return{done,total,percent:total?Math.round(done/total*100):0,complete:total>0&&done===total,
  skipped,resolved,pending:total-resolved,resolvedPercent:total?Math.round(resolved/total*100):0}
}
 function validateCompletion(run,route){
  if(!run||run.status!=='in_progress')return{ok:false,progress:{done:0,total:0,percent:0,complete:false},missing:['Нет активного выполнения']};
  const p=progress(run,route),missing=[];const ids=runTaskIds(run,route),results=run.taskResults||{};
  const unresolved=ids.filter(id=>{const x=results[id]||{};return !x.done&&!['skipped','not_applicable'].includes(x.resultStatus)});
  const noReason=ids.filter(id=>{const x=results[id]||{};return ['skipped','not_applicable'].includes(x.resultStatus)&&!clean(x.deviationReason)});
  if(p.total===0)missing.push('В маршруте нет задач');else if(unresolved.length)missing.push(`Выполнить все задачи или указать отклонение (${ids.length-unresolved.length}/${ids.length})`);
  if(noReason.length)missing.push(`Указать причину для пропущенных/неприменимых мероприятий (${noReason.length})`);
  if(!clean(run.date))missing.push('Указать дату');
  if(!clean(run.performer))missing.push('Указать ФИО исполнителя');
  if(!clean(run.shift))missing.push('Указать смену');
  if(run.dueEntries?.length)missing.push(...(global.LubricaRouteDue?.completionErrors(run)||['Модуль индивидуальных сроков недоступен']));
  return{ok:missing.length===0,progress:p,missing}
 }
 // R8.2 — one closing operation for every typed job. Keep actual work even
 // when the remaining operations cannot be performed.
 function closeTypedRun(d,r,route,reason=null){
  const p=progress(r,route),D=global.LubricaRouteDue;
  if(!D||D.completionErrors(r,d).length)return null;
  if(reason===null&&!validateCompletion(r,route).ok)return null;
  if(reason!==null&&p.pending&&!clean(reason))return null;
  if(reason!==null)for(const id of runTaskIds(r,route)){const result=r.taskResults?.[id];if(result?.done)continue;r.taskResults=r.taskResults||{};r.taskResults[id]={done:false,resultStatus:'pending',...result,deviationReason:clean(result?.deviationReason)||clean(reason)};}
  r.status=p.done===p.total&&p.total>0?'completed':p.done>0?'partial':'cancelled';
  const stamp=now();r.closedAt=stamp;r.actualEndAt=stamp;r.updatedAt=stamp;
  if(r.status==='cancelled')r.cancelledAt=stamp;else r.completedAt=stamp;
  if(reason!==null)r.cancelReason=clean(reason);
  const a=Date.parse(r.actualStartAt||r.startedAt||''),b=Date.parse(stamp);
  r.actualDurationMinutes=Number.isFinite(a)&&Number.isFinite(b)?Math.max(0,Math.round((b-a)/60000)):null;
  r.completionProgress=p;
  const frv=global.LubricaFRV?.freeze?.(r)||null;
  r.executionFact={actualStartAt:r.actualStartAt||r.startedAt||'',actualEndAt:stamp,actualDurationMinutes:r.actualDurationMinutes,performer:r.performer||'',shift:r.shift||'',comments:r.comments||'',tasks:clone(r.taskResults||{}),frv:frv?clone(frv):null};
  D.advanceCompleted(r,d);global.LubricaRoutePlanning?.syncFromRun?.(r,d,{persist:false});
  global.LubricaCore.State.setDatabase(d);return r;
 }
 function completeRun(runId,route=null){
  const d=db(),r=runs(d).find(x=>x.id===runId);if(!r||r.status!=='in_progress')return null;
  if(r.dueEntries?.length)return closeTypedRun(d,r,route);
  const validation=validateCompletion(r,route);if(!validation.ok)return null;
  r.status='completed';r.completedAt=now();r.actualEndAt=r.completedAt;
  const startMs=Date.parse(r.actualStartAt||r.startedAt||'');const endMs=Date.parse(r.actualEndAt||'');
  r.actualDurationMinutes=Number.isFinite(startMs)&&Number.isFinite(endMs)?Math.max(0,Math.round((endMs-startMs)/60000)):null;
  r.updatedAt=now();r.completionProgress=validation.progress;
  const frvFact=global.LubricaFRV?.freeze?.(r)||null;r.executionFact={actualStartAt:r.actualStartAt||r.startedAt||'',actualEndAt:r.actualEndAt||r.completedAt||'',actualDurationMinutes:r.actualDurationMinutes,performer:r.performer||'',shift:r.shift||'',comments:r.comments||'',tasks:clone(r.taskResults||{}),frv:frvFact?clone(frvFact):null};
  for(const stale of activeRuns(r.routeId,d)){if(stale.id===r.id)continue;stale.status='superseded';stale.supersededAt=now();stale.updatedAt=now();stale.supersededBy=r.id}
  if(r.dueEntries?.length){global.LubricaRouteDue.advanceCompleted(r,d);global.LubricaRoutePlanning?.syncFromRun?.(r,d,{persist:false})}
  global.LubricaCore.State.setDatabase(d);if(!r.dueEntries?.length)global.LubricaRoutePlanning?.syncFromRun?.(r,d);return r
 }
 function cancelRun(runId,{reason=''}={}){const d=db(),r=runs(d).find(x=>x.id===runId);if(!r||r.status!=='in_progress')return null;if(r.dueEntries?.length)return closeTypedRun(d,r,null,reason);r.status='cancelled';r.cancelledAt=now();r.cancelReason=clean(reason);r.updatedAt=now();if(r.dueEntries?.length)global.LubricaRoutePlanning?.syncFromRun?.(r,d,{persist:false});global.LubricaCore.State.setDatabase(d);if(!r.dueEntries?.length)global.LubricaRoutePlanning?.syncFromRun?.(r,d);return r}
 function lifecycleState(routeId,route=null,d=db(),{planItemId='',date='',shift=''}={}){
  if(!d)return{state:'unavailable',active:null,last:null,runs:[],progress:{done:0,total:0,percent:0,complete:false},canStart:false,canComplete:false,canCancel:false};
  const active=normalizeActiveRuns(routeId,d),history=routeRuns(routeId,d),last=history[0]||null,current=active||last;
  const p=current?progress(current,route):{done:0,total:(route?.points||[]).length,percent:0,complete:false};
  const validation=active?validateCompletion(active,route):{ok:false,progress:p,missing:[]};
  const state=active?'in_progress':last&&['completed','partial','cancelled'].includes(last.status)?last.status:'not_started';
  const D=global.LubricaRouteDue,typed=D?.typed(route),start=typed?D.checkStart(route,D.planItem(routeId,planItemId,d),d,date||D.today(),{shift}):null;
  return{state,active,last,current,runs:history,progress:p,validation,startAssessment:start,canStart:!active&&((route?.points||[]).length>0)&&(!typed||!!start?.ok),canComplete:!!active&&validation.ok,canCancel:!!active};
 }
 function modelForRun(route,run,d=db()){if(run?.routeSnapshot)return clone(run.routeSnapshot);return model(route,d)}
 function statusLabel(status){return status==='completed'?'Завершено':status==='partial'?'Частично выполнено':status==='in_progress'?'В работе':status==='cancelled'?'Отменено':status==='superseded'?'Заменено':'Не начато'}
 global.LubricaChecklistEngine=Object.freeze({templateFor,taskDetails,groupTasks,model,modelForRun,createRun,latestRun,ensureRun,updateRun,updateTask,completeRun,cancelRun,progress,validateCompletion,activeRuns,normalizeActiveRuns,routeRuns,getRun,statusLabel,runTaskIds,toolDeliveryDetails,lifecycleState});
 global.LubricaSystem?.registerModule?.('Выполнение маршрутов','ok','Чек-листы и фиксация выполнения работ');
})(window);
