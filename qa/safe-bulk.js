(function(global){
'use strict';
// Stage 5C.0: transactional bulk updates. Never circumvent per-task readiness.
const API=global.LubricaSafeBulk=global.LubricaSafeBulk||{};
const clean=v=>String(v??'').trim(),arr=x=>Array.isArray(x)?x:[],clone=x=>JSON.parse(JSON.stringify(x));
const isApproved=t=>['approved','ready','disabled'].includes(clean(t?.approvalStatus).toLowerCase())||t?.verified===true;
const routeCollections=['routes','routeRevisions','checklistRuns','routePlanItems','routeHistory','routePlans'];
function isInUse(db,id){
 const token='"'+String(id)+'"';return routeCollections.find(k=>arr(db?.[k]).some(x=>JSON.stringify(x).includes(token)))||'';
}
function preview(db,ids,patch={}){
 const errors=[],warnings=[],selected=Array.from(new Set(arr(ids).map(String))),materialId=clean(patch.materialId),
  interval=clean(patch.interval),approve=patch.approve===true;
 const working=clone(db||{}),tasks=arr(working.tasks),materials=arr(working.materials);
 if(!selected.length)errors.push('Не выбраны мероприятия для групповой операции.');
 if(!materialId&&!interval&&!approve)errors.push('Нет изменений для применения.');
 if(materialId&&!materials.some(m=>String(m.id)===materialId&&m.status!=='retired'))
  errors.push('Выбранный материал отсутствует в действующем справочнике.');
 for(const id of selected){
  const t=tasks.find(x=>String(x.id)===id);
  if(!t){errors.push('Мероприятие '+id+' отсутствует в базе.');continue}
  if(isApproved(t)){errors.push('Мероприятие '+id+' уже утверждено/отключено. Групповое изменение запрещено.');continue}
  const used=isInUse(db,id);
  if(used){errors.push('Мероприятие '+id+' связано с '+used+'; редактировать пакетно нельзя.');continue}
  if(materialId){const m=materials.find(x=>String(x.id)===materialId);t.materialMode='explicit';t.materialId=materialId;t.materialName=m?.name||''}
  if(interval)t.schedule={...(t.schedule||{}),legacyText:interval};
 }
 if(approve&&!errors.length){
  const qa=global.LubricaProgramQA?.audit?.(working);
  const completion=global.LubricaTaskReadiness?.summarize?.(working,qa?.issues||[]);
  if(!qa||!completion){errors.push('Контроль готовности недоступен. Массовое утверждение заблокировано.');}
  else for(const id of selected){
   const item=arr(completion.items).find(x=>String(x.taskId)===id),task=tasks.find(x=>String(x.id)===id);
   if(!item||!task){errors.push('Нет статуса готовности '+id);continue}
   const failed=arr(item.steps).filter(x=>x.key!=='approve'&&!x.ok);
   if(failed.length)errors.push('Мероприятие '+id+' не готово: '+failed.map(x=>x.label).join(', '));
   const related=arr(qa.issues).filter(x=>x.entityType==='task'&&String(x.entityId)===id);
   const critical=related.filter(x=>['blocker','error'].includes(x.severity)||
    ['SKF_SEALED_RELUBE_REVIEW','SKF_SEALED_FULL_RENEWAL_REVIEW','QUANTITY_SOURCE_MISSING','INTERVAL_SOURCE_MISSING','CALCULATION_NOT_APPROVED'].includes(x.code));
   if(critical.length)errors.push('Проверка '+id+': '+critical.map(x=>x.code).join(', '));
   const p=arr(working.lubricationPoints).find(x=>String(x.id)===String(task.lubricationPointId));
   if(!p?.id||!arr(working.equipment).some(x=>String(x.id)===String(p.equipmentId)))
    errors.push('Нет подтверждённой физической привязки точки для '+id);
  }
 }
 if(approve)warnings.push('Утверждение будет выполнено только для мероприятий, прошедших все проверки. Нормы по аналогу не считаются автоматически подтверждёнными.');
 else warnings.push('После группового изменения мероприятия останутся на инженерной проверке.');
 return {allowed:errors.length===0,errors,warnings,selected,materialId,interval,approve,
  changedCount:selected.length,doesNotCreatePoints:true,changesRoutes:false,
  signature:JSON.stringify({selected,materialId,interval,approve})};
}
function apply(db,ids,patch={}){
 const guard=preview(db,ids,patch);if(!guard.allowed)throw new Error(guard.errors.join(' '));
 const working=clone(db);
 for(const t of arr(working.tasks))if(guard.selected.includes(String(t.id))){
  if(guard.materialId){const m=working.materials.find(x=>String(x.id)===guard.materialId);
   t.materialMode='explicit';t.materialId=guard.materialId;t.materialName=m.name}
  if(guard.interval)t.schedule={...(t.schedule||{}),legacyText:guard.interval};
  if(guard.approve){t.approvalStatus='approved';t.verified=true}
 }
 return {database:working,preview:guard};
}
API.preview=preview;API.apply=apply;
})(window);
