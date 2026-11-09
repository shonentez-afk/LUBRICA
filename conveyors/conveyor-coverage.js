(function(global){
'use strict';
// Stage 5B.6: read-only coverage of actual conveyor machines.
// A name-derived subtype or a single imported TMC NEVER proves full service scope.
const C=global.LubricaClassifier;
const API=global.LubricaConveyorCoverage=global.LubricaConveyorCoverage||{};
const text=x=>String(x??'').trim();
const number=x=>Number(x)||0;
const excludeNames=/(центрифуг|охлажден|охлажден|охлаждени)/i;
function outOfScope(e,byId){
 let current=e,seen=new Set(),depth=0;
 while(current&&depth++<30&&!seen.has(current.id)){
  if(excludeNames.test(text(current.name)))return true;
  seen.add(current.id);
  current=byId.get(current.parentEquipmentId);
 }
 return false;
}
// The initial plant audit was limited to equipmentType=conveyor (293 entries).
// Also show clearly named conveyor machines accidentally imported as "other".
// Do NOT treat "motor-gearbox of conveyor" or a plural group as a standalone machine.
function hasConveyorMachineName(e){
 const n=text(e?.name).toLowerCase().replace(/ё/g,'е');
 return /^(?:конвейер(?:\s|$)|транспортер(?:\s|$)|(?:роликовый|ленточный|ременный|цепной|скребковый|ламельный|шнековый)\s+(?:конвейер|транспортер)(?:\s|$))/.test(n);
}
function audit(database){
 const d=database||{},equipment=Array.isArray(d.equipment)?d.equipment:[],
  components=Array.isArray(d.components)?d.components:[],
  points=Array.isArray(d.lubricationPoints)?d.lubricationPoints:[],
  tasks=Array.isArray(d.tasks)?d.tasks:[],
  lines=new Map((d.lines||[]).map(x=>[String(x.id),x])),
  areas=new Map((d.areas||[]).map(x=>[String(x.id),x])),
  byId=new Map(equipment.map(x=>[x.id,x])),
  byPointId=new Map(points.map(x=>[String(x.id),x]));
 const byOwner=new Map(),pointsByOwner=new Map(),tasksByPoint=new Map();
 for(const c of components){if(!byOwner.has(c.equipmentId))byOwner.set(c.equipmentId,[]);byOwner.get(c.equipmentId).push(c)}
 for(const p of points){if(!pointsByOwner.has(p.equipmentId))pointsByOwner.set(p.equipmentId,[]);pointsByOwner.get(p.equipmentId).push(p)}
 for(const t of tasks){
  const p=byPointId.get(String(t.lubricationPointId));
  if(!p)continue;
  const pointKey=String(p.id);
  if(!tasksByPoint.has(pointKey))tasksByPoint.set(pointKey,[]);
  tasksByPoint.get(pointKey).push(t);
 }
 const rows=[],bySubtype={},byRole={group:0,ancillary:0,machine:0},byStatus={};
 let excludedScope=0,totalConveyorRecords=0,extraNamedRecords=0;
 for(const eq of equipment){
  if(eq?.equipmentType!=='conveyor'&&!hasConveyorMachineName(eq))continue;
  totalConveyorRecords++;
  if(eq.equipmentType!=='conveyor')extraNamedRecords++;
  // Ignore centrifuges and their child machinery, and all cooling equipment.
  // Do not inspect their components, propose anything, or change their status.
  if(outOfScope(eq,byId)){excludedScope++;continue}
  const identity=C?.conveyorIdentity?.(eq.name||'',eq.equipmentType||'',eq);
  if(!identity)continue;
  byRole[identity.role]=(byRole[identity.role]||0)+1;
  if(identity.role!=='machine')continue;
  const ev=C.conveyorEvidence(d,eq);
  const subtypeSuggestion=identity.subtype==='unknown'?global.LubricaConveyorArrangement?.suggestSubtypeFromTmc?.(d,eq)||null:null;
  const descendants=C.conveyorDescendants?.(d,eq)||[];
  const ownedIds=new Set([eq.id,...descendants.filter(x=>!outOfScope(x,byId)).map(x=>x.id)]);
  const relatedPoints=points.filter(p=>ownedIds.has(p.equipmentId));
  const relatedTasks=relatedPoints.flatMap(p=>tasksByPoint.get(String(p.id))||[]);
  const directPoints=pointsByOwner.get(eq.id)||[];
  const ownComponents=byOwner.get(eq.id)||[];
  // Sources from old candidate constructors are traceable through originKey,
  // even before ComponentBinding populated sourceComponentId. Each source
  // must match a concrete component ID: a designation/name is insufficient.
  const linkedComponents=new Set();
  const relatedPointIds=new Set(relatedPoints.map(p=>String(p.id)));
  for(const p of relatedPoints){
   if(p?.componentBinding?.sourceComponentId)linkedComponents.add(String(p.componentBinding.sourceComponentId));
   if(p?.installedComponent?.id)linkedComponents.add(String(p.installedComponent.id));
   const origin=String(p.candidateOriginKey||'').match(/^component:([^:]+):/);
   if(origin)linkedComponents.add(origin[1]);
  }
  for(const c of components){
   if(!ownedIds.has(c.equipmentId))continue;
   if((c.candidateCreatedPointIds||[]).some(id=>relatedPointIds.has(String(id))))
    linkedComponents.add(String(c.id));
  }
  const unlinked=ev.actual.filter(x=>x.source==='component'&&!linkedComponents.has(String(x.id)));
  const configured=!!(eq.confirmedConveyorSubtype||eq.conveyorArrangement?.confirmedAt);
  const assembly=ev.assembly?.children||[];
  let status='SOURCE_REVIEW',next='Подтвердить физические места и обслуживание ТМЦ';
  if(identity.subtype==='unknown'){status='SUBTYPE_UNKNOWN';next='Определить фактический тип конвейера'}
  else if(assembly.length){status='COMPOSITE_REVIEW';next='Проверить состав и конструкторы каждого дочернего конвейера'}
  else if(!ev.actual.length&&!ev.assets.length&&!ev.context.length){status='EVIDENCE_MISSING';next='Проверить источник, добавить реальные компоненты и опоры'}
  else if(relatedPoints.length){status='POINTS_REVIEW';next='Сверить существующие точки со всеми физическими местами'}
  else{status='COMPONENTS_REVIEW'}
  // No implicit READY: even a persisted subtype or point may omit real supports.
  bySubtype[identity.subtype]=(bySubtype[identity.subtype]||0)+1;
  byStatus[status]=(byStatus[status]||0)+1;
  const area=areas.get(String(eq.areaId)),line=lines.get(String(eq.lineId||area?.lineId));
  rows.push({
   id:eq.id,externalCode:eq.externalCode||'',name:eq.name||'',importType:eq.equipmentType||'',lineId:eq.lineId||area?.lineId||'',
   lineName:line?.name||eq.lineId||'Линия не указана',areaId:eq.areaId||'',
   areaName:area?.name||'Участок не указан',subtype:identity.subtype,label:identity.label,
   role:identity.role,status,next,configured,subtypeSuggestion,
   ownComponentCount:ownComponents.filter(x=>x.status!=='retired').length,
   actualCount:ev.actual.length,shaftContextCount:ev.context.length,driveCount:ev.assets.length,
   ancillaryCount:ev.ancillary.length,excludedCount:ev.excluded.length,
   unlinkedCandidateCount:unlinked.length,unlinkedSourceComponentIds:unlinked.map(x=>x.id),ownPointCount:directPoints.length,
   relatedPointCount:relatedPoints.length,relatedTaskCount:relatedTasks.length,
   childConveyorCount:assembly.length,childIds:assembly.map(ch=>ch.id),
   supportLayoutProposed:!!ev.supportLayout,
   requiresPhysicalConfirmation:true
  });
 }
 const rank={SUBTYPE_UNKNOWN:0,EVIDENCE_MISSING:1,COMPOSITE_REVIEW:2,COMPONENTS_REVIEW:3,POINTS_REVIEW:4};
 rows.sort((a,b)=>(rank[a.status]??9)-(rank[b.status]??9)||
  a.lineName.localeCompare(b.lineName,'ru')||a.areaName.localeCompare(b.areaName,'ru')||
  a.name.localeCompare(b.name,'ru'));
 const lineOptions=Array.from(new Map(rows.filter(x=>x.lineId).map(x=>[String(x.lineId),{
  id:String(x.lineId),name:x.lineName
 }])).values()).sort((a,b)=>a.name.localeCompare(b.name,'ru'));
 return{
  source:'live_database_read_only',totalConveyorRecords,extraNamedRecords,excludedScope,byRole,bySubtype,byStatus,
  machineCount:rows.length,withActualEvidence:rows.filter(x=>x.actualCount||x.driveCount||x.shaftContextCount).length,
  withPoints:rows.filter(x=>x.relatedPointCount>0).length,
  unknownSubtype:byStatus.SUBTYPE_UNKNOWN||0,
  withSubtypeSuggestion:rows.filter(x=>x.subtypeSuggestion).length,
  totalUnlinkedCandidateRows:rows.reduce((n,x)=>n+number(x.unlinkedCandidateCount),0),
  rows,lines:lineOptions
 };
}
function csv(report){
 const quote=v=>'"'+text(v).replace(/"/g,'""')+'"';
 const head=['Оборудование ID','Код','Исходный тип','Линия','Участок','Конвейер','Подтип','Статус','Тип подтверждён','Подсказка по ТМЦ','IDs источников подсказки',
  'Свои ТМЦ','Кандидатные ТМЦ','Не привязаны по source ID','Конструктивный контекст',
  'Приводы','Исключено из смазки','Собственные точки','Точки с подсистемами',
  'Мероприятия с подсистемами','Дочерние машины','Следующее инженерное действие'];
 const r=report?.rows||[];
 return [head,...r.map(x=>[x.id,x.externalCode,x.importType,x.lineName,x.areaName,x.name,x.label,x.status,
  x.configured?'да':'нет',x.subtypeSuggestion?.label||'',(x.subtypeSuggestion?.sourceComponentIds||[]).join(', '),x.ownComponentCount,x.actualCount,x.unlinkedCandidateCount,
  x.shaftContextCount,x.driveCount,x.excludedCount,x.ownPointCount,x.relatedPointCount,
  x.relatedTaskCount,x.childConveyorCount,x.next])].map(row=>row.map(quote).join(';')).join('\n');
}
API.audit=audit;API.csv=csv;API.outOfScope=outOfScope;
})(window);
