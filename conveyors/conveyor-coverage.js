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
  byPointId=new Map(points.map(x=>[String(x.id),x])),
  byComponentId=new Map(components.map(x=>[String(x.id),x]));
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
  const linkedPointIds=new Map();
  const mark=(sourceId,pointId)=>{
   const id=String(sourceId||'');if(!id)return;
   if(!linkedPointIds.has(id))linkedPointIds.set(id,new Set());
   linkedPointIds.get(id).add(String(pointId));
  };
  const relatedPointIds=new Set(relatedPoints.map(p=>String(p.id)));
  for(const p of relatedPoints){
   mark(p?.componentBinding?.sourceComponentId,p.id);
   mark(p?.installedComponent?.id,p.id);
   const origin=String(p.candidateOriginKey||'').match(/^component:([^:]+):/);
   if(origin)mark(origin[1],p.id);
  }
  for(const c of components){
   if(!ownedIds.has(c.equipmentId))continue;
   for(const pid of c.candidateCreatedPointIds||[])
    if(relatedPointIds.has(String(pid)))mark(c.id,pid);
  }
  const linkedComponents=new Set(linkedPointIds.keys());
  const unlinked=ev.actual.filter(x=>x.source==='component'&&!linkedComponents.has(String(x.id)));
  const evidenceRows=[];
  // Each source retains original equipment ownership; matching part numbers
  // alone never establish a lubrication point. This report changes no data.
  for(const [kind,items] of [['CANDIDATE',ev.actual],['DRIVE',ev.assets],['CONTEXT',ev.context],['EXCLUDED',ev.excluded]]){
   for(const item of items){
    if(!['component','equipment'].includes(item.source))continue;
    const component=item.source==='component'?byComponentId.get(String(item.id)):null;
    const pids=item.source==='component'
      ?Array.from(linkedPointIds.get(String(item.id))||[])
      :(pointsByOwner.get(item.id)||[]).map(p=>String(p.id));
    const tids=Array.from(new Set(pids.flatMap(pid=>(tasksByPoint.get(String(pid))||[]).map(t=>String(t.id)))));
    evidenceRows.push({
     sourceId:String(item.id),sourceType:item.source,sourceExternalCode:item.externalCode||'',
     ownerEquipmentId:item.equipmentId||'',ownerEquipmentName:byId.get(item.equipmentId)?.name||'',
     name:item.name||'',kind,category:item.category||item.equipmentType||'',
     candidateState:component?.candidateState||'',servicePolicy:item.servicePolicy||'',
     reason:item.reason||item.label||'',pointIds:pids,taskIds:tids,
     state:kind==='CANDIDATE'?(pids.length?'LINKED_POINT_REVIEW':'PHYSICAL_REVIEW'):
       kind==='DRIVE'?'OEM_REVIEW':kind==='EXCLUDED'?'EXCLUDED_FROM_PROPOSAL':'CONTEXT_ONLY'
    });
   }
  }
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
   evidenceRows,evidenceRowCount:evidenceRows.length,
   candidateLinkedCount:evidenceRows.filter(x=>x.kind==='CANDIDATE'&&x.pointIds.length).length,
   candidateUnlinkedCount:evidenceRows.filter(x=>x.kind==='CANDIDATE'&&!x.pointIds.length).length,
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
  totalSourceRows:rows.reduce((n,x)=>n+number(x.evidenceRowCount),0),
  machinesWithUnlinkedCandidates:rows.filter(x=>x.candidateUnlinkedCount>0).length,
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
// Exact source-level read-only field checklist (not the approved map).
function csvEvidence(report){
 const quote=v=>{const raw=text(v);return '"'+(/^[=+@-]/.test(raw)?"'"+raw:raw).replace(/"/g,'""')+'"'};
 const header=['Машина ID','Код машины','Линия','Участок','Машина','Подтип','Статус машины',
  'Тип источника','Source ID','Код ТМЦ','Владелец ID','Владелец','Наименование ТМЦ / узла',
  'Группа','Категория','Исходное решение ТМЦ','Состояние проверки','Политика обслуживания',
  'Причина / источник','Связанные pointId','Связанные taskId'];
 const rows=[header];
 for(const machine of report?.rows||[])for(const item of machine.evidenceRows||[])
  rows.push([machine.id,machine.externalCode,machine.lineName,machine.areaName,machine.name,machine.label,
   machine.status,item.sourceType,item.sourceId,item.sourceExternalCode,item.ownerEquipmentId,
   item.ownerEquipmentName,item.name,item.kind,item.category,item.candidateState,item.state,
   item.servicePolicy,item.reason,item.pointIds.join(', '),item.taskIds.join(', ')]);
 return rows.map(row=>row.map(quote).join(';')).join('\n');
}
API.csvEvidence=csvEvidence;
API.audit=audit;API.csv=csv;API.outOfScope=outOfScope;
})(window);
