(function(global){
'use strict';
// Stage 5C.0: one evidence-first point-completion queue for all machine families.
// Suggestions never mutate plant data, infer support counts, approve tasks or
// bypass the accepted constructors. Works offline (Edge file://).
const API=global.LubricaPointAcceleration=global.LubricaPointAcceleration||{};
const clean=v=>String(v??'').trim(),arr=x=>Array.isArray(x)?x:[];
const norm=v=>clean(v).toLowerCase().replace(/ё/g,'е').replace(/\s+/g,' ').trim();
const byId=a=>new Map(arr(a).map(x=>[String(x.id),x]));
const fq=(s,q)=>norm(s).includes(norm(q));
const FAMILIES=Object.freeze({
 conveyor:{label:'Конвейерные машины',status:'EXISTING_REVIEW',constructor:'Conveyor Arrangement',priority:1},
 saw_cut:{label:'Пилы, резка и каретки',status:'CONSTRUCTOR_GAP',constructor:'Saw / Cut & Traverse Arrangement',priority:2},
 fan:{label:'Вентиляторы и подшипниковые блоки',status:'EXISTING_REVIEW',constructor:'Fan Bearing Arrangement',priority:3},
 feeder:{label:'Питатели и дозаторы',status:'CONSTRUCTOR_GAP',constructor:'Feeder Arrangement',priority:4},
 cleaning:{label:'Щёточная очистка',status:'CONSTRUCTOR_GAP',constructor:'Brush / Cleaning Arrangement',priority:5},
 handling:{label:'Штабеллеры, транспортировка и упаковка',status:'CONSTRUCTOR_GAP',constructor:'Handling / Stacker Arrangement',priority:6},
 shredder:{label:'Роторные измельчители',status:'CONSTRUCTOR_GAP',constructor:'Shredder Rotor Arrangement',priority:7},
 oil_station:{label:'Масляные, насосные, гидравлические станции',status:'PARTIAL',constructor:'Oil System Arrangement',priority:8},
 drive_unit:{label:'Составные приводные агрегаты',status:'PARTIAL',constructor:'Drive Unit Arrangement',priority:9},
 rotating:{label:'Валы, барабаны, ролики',status:'EXISTING_REVIEW',constructor:'Rotating Arrangement',priority:10},
 oscillating:{label:'Качающиеся механизмы',status:'EXISTING_REVIEW',constructor:'Oscillating Linkage Arrangement',priority:11},
 other:{label:'Остальное оборудование — требуется классификация',status:'SOURCE_REQUIRED',constructor:'Физическая конструкция не определена',priority:12}
});
function outOfScope(db,e){
 const ids=byId(db?.equipment);const visited=new Set();let cur=e,depth=0;
 while(cur&&depth++<40&&!visited.has(String(cur.id))){
  if(/центрифуг|охлаждени|охлажден|маслян(?:ого|ый) туман|маслораспылител/i.test(norm(cur.name)))return true;
  visited.add(String(cur.id));cur=ids.get(String(cur.parentEquipmentId));
 }
 return false;
}
function family(eq){
 const name=norm(eq?.name),type=norm(eq?.equipmentType);
 if(type==='conveyor'||/конвейер|транспорт[её]р/.test(name))return'conveyor';
 if(type==='fan'||/вентилятор|дымосос|эксгауст|воздуходув/.test(name))return'fan';
 if(/пил[аы]|распил|гильотин|отрезн|каретк[аи]/.test(name))return'saw_cut';
 if(/питател|дозатор|подающ(?:ий|ая) механизм/.test(name))return'feeder';
 if(/щ[её]тк|механизм очистк|очистк[аи] ламел/.test(name))return'cleaning';
 if(/штабел|укладч|под[ъь]емник|толкател|упаковочн|упаковк|манипулятор/.test(name))return'handling';
 if(/измельчител|шредер|lindner|vega\s*1500/.test(name))return'shredder';
 if(type==='pump'||type==='hydraulic_station'||type==='oil_station'||/маслостан|гидростан|насосн[а-я]* станц/.test(name))return'oil_station';
 if(type==='motor_gearbox'||/мотор[- ]редуктор|мотор[- ]барабан/.test(name))return'drive_unit';
 if(type==='rotating_shaft'||type==='roller'||/^(вал|барабан|ролик|ось)\s/.test(name))return'rotating';
 if(type==='crank'||/качан|кривошип|рычажн/.test(name))return'oscillating';
 return'other';
}
function groupLike(eq,db){
 if(eq.isGroup===true||eq.structureRole==='group')return true;
 const n=norm(eq.name||'');
 if(/^(конвейеры|вентиляторы|питатели|насосы|приводы|редукторы|электродвигатели|ролики|шпиндели|валы)(\s+\S+){0,3}$/.test(n)&&
    arr(db.equipment).some(x=>x.parentEquipmentId===eq.id))return true;
 const id=global.LubricaClassifier?.conveyorIdentity?.(eq.name||'',eq.equipmentType||'',eq);
 return id?.role==='group'||id?.role==='ancillary';
}
function build(db){
 const equipments=arr(db?.equipment),components=arr(db?.components).filter(x=>x.status!=='retired');
 const points=arr(db?.lubricationPoints),tasks=arr(db?.tasks);
 const machines=byId(equipments),lines=byId(db?.lines),areas=byId(db?.areas);
 const byOwner=new Map(),linked=new Map(),pointsByOwner=new Map(),tasksByPoint=new Map();
 const add=(m,key,val)=>{key=String(key||'');if(!key)return;
   if(!m.has(key))m.set(key,[]);m.get(key).push(val)};
 for(const c of components)add(byOwner,c.equipmentId,c);
 for(const p of points){add(pointsByOwner,p.equipmentId,p);add(linked,p.componentBinding?.sourceComponentId,p);
  if(p.installedComponent?.id)add(linked,p.installedComponent.id,p);
  const m=String(p.candidateOriginKey||'').match(/^component:([^:]+):/);if(m)add(linked,m[1],p);
 }
 for(const c of components)for(const pid of arr(c.candidateCreatedPointIds)){
   const p=points.find(x=>String(x.id)===String(pid));if(p)add(linked,c.id,p);
 }
 for(const t of tasks)add(tasksByPoint,t.lubricationPointId,t);
 const uniq=a=>Array.from(new Set(a.map(x=>String(x.id))));
 const rows=equipments.map(e=>{
  const scope=outOfScope(db,e),group=groupLike(e,db),f=family(e),profile=FAMILIES[f];
  const own=byOwner.get(String(e.id))||[],ps=pointsByOwner.get(String(e.id))||[];
  const rowComponents=own.map(c=>{
   const bound=uniq(linked.get(String(c.id))||[]),pointIds=bound.map(p=>String(p.id));
   const taskIds=Array.from(new Set(bound.flatMap(p=>(tasksByPoint.get(String(p.id))||[]).map(t=>String(t.id)))));
   const state=c.engineeringDecision?.action||c.candidateState||'unclassified',cat=c.candidateCategory||'';
   const missing=!(cat||c.candidateEquipmentType)&&!c.engineeringDecision;
   const candidate=['candidate','review','unclassified'].includes(norm(state))&&
     (!!cat||!!c.candidateEquipmentType||/подшипник|втулк|цепь|шарнир|смаз|редуктор/i.test(c.name||''));
   return{sourceId:String(c.id),externalCode:c.externalCode||'',name:c.name||'',category:cat,
    candidateState:state,pointIds,taskIds,needsReview:!scope&&candidate&&!bound.length,
    missingCategory:missing,serviceSourceResolved:bound.length>0,sourceOwnerId:String(c.equipmentId||'')};
  });
  const needsReview=rowComponents.filter(x=>x.needsReview).length;
  const unclassified=rowComponents.filter(x=>x.missingCategory).length;
  const subtype=global.LubricaClassifier?.conveyorIdentity?.(e.name||'',e.equipmentType||'',e)?.subtype||null;
  const bearing=(!scope&&!group&&f==='conveyor')?global.LubricaConveyorBearingVerification?.reviewState?.(db,e)||null:null;
  const status=scope?'OUT_OF_SCOPE':group?'STRUCTURAL_CONTEXT':profile.status;
  const tasksFor=ps.flatMap(p=>tasksByPoint.get(String(p.id))||[]);
  const incompleteTasks=tasksFor.filter(t=>t.approvalStatus!=='approved'&&!t.verified).length;
  return {id:String(e.id),externalCode:e.externalCode||'',name:e.name||'',family:f,
   familyLabel:profile.label,constructor:profile.constructor,status,priority:profile.priority,
   lineId:e.lineId||'',lineName:lines.get(String(e.lineId))?.name||'',
   areaId:e.areaId||'',areaName:areas.get(String(e.areaId))?.name||'',
   model:e.model||'',manufacturer:e.manufacturer||'',subtype:subtype||'',
   candidateCount:needsReview,unclassifiedCount:unclassified,
   linkedPointCount:ps.length,incompleteTaskCount:incompleteTasks,
   components:rowComponents,bearing,analogSuggestions:[],
   nextAction:scope?'Не включать в конструкторный этап; исходные записи не менять':
    group?'Это контейнер/система, не создавать самостоятельные точки':
    f==='conveyor'&&bearing?.pending?'Проверить количество, физические места и обслуживаемость опор':
    status==='CONSTRUCTOR_GAP'?'Нужен составной конструктор семейства с подтверждением физики':
    needsReview?'Разобрать реальные ТМЦ в существующем конструкторе':'Подтвердить полноту физической схемы и источники'};
 });
 // Analog hints are suggestions only, anchored by exact normalized machine name
 // and a second-line owner. They never copy physical positions, IDs or approvals.
 const groups=new Map();for(const row of rows){if(row.status==='OUT_OF_SCOPE'||row.status==='STRUCTURAL_CONTEXT'||row.family==='other')continue;
  const signature=row.family+'|'+norm(row.name)+'|'+norm(row.model);
  if(!groups.has(signature))groups.set(signature,[]);groups.get(signature).push(row);
 }
 for(const members of groups.values())if(members.length>1)for(const row of members){
  row.analogSuggestions=members.filter(x=>x.id!==row.id&&x.lineId!==row.lineId)
   .slice(0,4).map(x=>({equipmentId:x.id,externalCode:x.externalCode,name:x.name,lineName:x.lineName,
    componentCount:x.components.length,sameComponentCount:x.components.length===row.components.length,
    requiresEngineerConfirmation:true,approvalTransfer:false,physicalPositionsTransfer:false}));
 }
 return rows;
}
function audit(db,options={}){
 const q=norm(options.query||''),lineId=clean(options.lineId||'all'),familyFilter=clean(options.family||'all');
 const all=build(db),active=all.filter(r=>r.status!=='OUT_OF_SCOPE'&&r.status!=='STRUCTURAL_CONTEXT');
 const rows=all.filter(r=>(options.includeOutOfScope||r.status!=='OUT_OF_SCOPE')&&
  (lineId==='all'||String(r.lineId)===lineId)&&
  (familyFilter==='all'||r.family===familyFilter)&&(!q||fq([r.externalCode,r.name,r.id,r.areaName,r.lineName,
   ...r.components.flatMap(c=>[c.name,c.externalCode,c.sourceId])].join(' '),q)));
 const gaps=Object.keys(FAMILIES).map(key=>({family:key,...FAMILIES[key],count:active.filter(r=>r.family===key).length,
  machinesWithSourcesToReview:active.filter(r=>r.family===key&&r.candidateCount>0).length}));
 const priority={CONSTRUCTOR_GAP:0,PARTIAL:1,EXISTING_REVIEW:2,SOURCE_REQUIRED:3,STRUCTURAL_CONTEXT:4,OUT_OF_SCOPE:5};
 rows.sort((a,b)=>(priority[a.status]??9)-(priority[b.status]??9)||b.candidateCount-a.candidateCount||
  (a.priority-b.priority)||a.name.localeCompare(b.name,'ru'));
 return {rows,gaps,totalEquipment:all.length,activeMachineHints:active.length,
  constructorGapHints:active.filter(x=>x.status==='CONSTRUCTOR_GAP').length,
  needCandidateReview:active.filter(x=>x.candidateCount>0).length,
  conveyorUnknownBearings:active.filter(x=>x.family==='conveyor'&&x.bearing?.pending).length,
  outOfScope:all.filter(x=>x.status==='OUT_OF_SCOPE').length,
  lines:arr(db?.lines).map(x=>({id:x.id,name:x.name})),
  warnings:['Это реестр исходных данных, не готовая карта смазки.','По названию и числу ТМЦ нельзя вывести количество физических обслуживаемых точек.'],
  changesDatabase:false};
}
function csv(report){
 const safe=v=>{const s=clean(v);return '"'+(/^[=+@-]/.test(s)?"'"+s:s).replace(/"/g,'""')+'"'};
 const rows=[['Оборудование ID','Внешний код','Линия','Участок','Наименование','Подсказка семейства','Статус конструктора',
  'Кандидатные ТМЦ без точек','Подшипниковая схема','Подтверждённое число позиций','Существующие точки','Мероприятия review',
  'ID ТМЦ','Код ТМЦ','Имя ТМЦ','Категория','Состояние','Привязанные pointId','Привязанные taskId','Следующее действие']];
 for(const e of arr(report?.rows))for(const c of e.components.length?e.components:[null])rows.push([
  e.id,e.externalCode,e.lineName,e.areaName,e.name,e.familyLabel,e.status,e.candidateCount,
  e.bearing?.status||'',e.bearing?.confirmedCount??'',e.linkedPointCount,e.incompleteTaskCount,
  c?.sourceId||'',c?.externalCode||'',c?.name||'',c?.category||'',c?.candidateState||'',
  c?.pointIds.join(',')||'',c?.taskIds.join(',')||'',e.nextAction]);
 return rows.map(row=>row.map(safe).join(';')).join('\n');
}
// Workbook is the existing LubricaImport.readWorkbook output. This mode only
// matches external identifiers; rows without uniquely matching IDs are errors.
// Excel numerical claims and OEM values are NEVER applied automatically.
function previewWorkbook(db,wb){
 const sheets=arr(wb?.sheets),rows=[],eq=arr(db?.equipment),components=arr(db?.components);
 const n=x=>norm(x).replace(/[\s._-]+/g,'');
 const cols={equipment:new Set(['кодоборудования','кодмашины','equipmentcode','position','кодпозиции','объекткод']),
  component:new Set(['кодтмц','кодкомпонента','componentcode','assetcode','asset','тмцкод']),
  place:new Set(['местосмазки','физическоеместо','точка','позициясмазки','pointlocation']),
  material:new Set(['материал','смазка','lubricant','material']),
  action:new Set(['мероприятие','операция','действие','operation']),
  quantity:new Set(['количество','доза','норма','quantity','объем','объём']),
  interval:new Set(['периодичность','интервал','period','interval']),
  source:new Set(['источник','source','основание','документ'])};
 for(const sheet of sheets){const matrix=arr(sheet.matrix);if(!matrix.length)continue;
  const head=arr(matrix[0]).map(n),fields={};for(const k of Object.keys(cols))fields[k]=head.findIndex(x=>cols[k].has(x));
  if(fields.equipment<0)continue;
  for(let i=1;i<matrix.length&&rows.length<5000;i++){
   const cells=arr(matrix[i]),val=k=>fields[k]<0?'':clean(cells[fields[k]]);
   if(!cells.some(x=>clean(x)))continue;
   const matches=eq.filter(x=>clean(x.externalCode)&&clean(x.externalCode)===val('equipment'));
   const owner=matches.length===1?matches[0]:null,cmatches=owner&&val('component')?
    components.filter(x=>String(x.equipmentId)===String(owner.id)&&clean(x.externalCode)===val('component')):[];
   const source=cmatches.length===1?cmatches[0]:null;
   const loc=val('place');const warnings=[];
   if(matches.length!==1)warnings.push(matches.length?'Один код соответствует нескольким объектам':'Оборудование не найдено по точному внешнему коду');
   if(val('component')&&cmatches.length!==1)warnings.push('ТМЦ не имеет однозначной привязки по коду и владельцу');
   if(!loc)warnings.push('В исходной строке не указано физическое место');
   const score=owner&&loc?source?'SOURCE_AND_LOCATION_MATCH':'EQUIPMENT_LOCATION_REVIEW':'IDENTITY_UNRESOLVED';
   rows.push({sheet:sheet.name||'',rowNumber:i+1,equipmentCode:val('equipment'),
    componentCode:val('component'),equipmentId:owner?.id||'',sourceComponentId:source?.id||'',
    physicalLocation:loc,material:val('material'),operation:val('action'),quantity:val('quantity'),
    interval:val('interval'),sourceReference:val('source'),status:score,warnings,
    createsPoint:false,approvesTask:false,requiresEngineerReview:true});
  }
 }
 return {fileName:wb?.fileName||'',rows,parsedRows:rows.length,
  uniquelyMatched:rows.filter(x=>x.status==='SOURCE_AND_LOCATION_MATCH').length,
  needsReview:rows.filter(x=>x.status!=='SOURCE_AND_LOCATION_MATCH').length,
  canApply:false,changesDatabase:false,
  warnings:['Это ТОЛЬКО предварительное сопоставление Excel с текущей базой. Новые точки и мероприятия не создаются.']};
}
function previewBatchDecisions(db,sourceIds,action,params={}){
 const ids=Array.from(new Set(arr(sourceIds).map(String))),errors=[],warnings=[];
 const engine=global.LubricaEngineeringDecisions;
 if(!['context','clarify'].includes(action))errors.push('Для массового решения доступны только «контекст» и «требует уточнения». Создание и исключение точек выполняются индивидуально.');
 if(!ids.length)errors.push('Выберите исходные ТМЦ.');
 if(ids.length>100)errors.push('За один раз можно проверить не более 100 ТМЦ.');
 if(!engine)errors.push('Инженерный модуль недоступен.');
 if(!errors.length)for(const id of ids){
  const p=engine.preview(db,id,action,params);
  if(!p.allowed)errors.push(id+': '+p.errors.join('; '));
  warnings.push(...p.warnings);
 }
 return{allowed:errors.length===0,errors,warnings,ids,action,params,
  changesPoints:false,changesTasks:false,changesRoutes:false,
  signature:JSON.stringify({ids,action,params})};
}
function applyBatchDecisions(db,sourceIds,action,params={}){
 const p=previewBatchDecisions(db,sourceIds,action,params);
 if(!p.allowed)throw new Error(p.errors.join(' '));
 const working=JSON.parse(JSON.stringify(db));
 const results=[];
 for(const id of p.ids)results.push(global.LubricaEngineeringDecisions.commit(working,id,action,params));
 return{database:working,results,preview:p};
}
API.previewBatchDecisions=previewBatchDecisions;API.applyBatchDecisions=applyBatchDecisions;
API.FAMILIES=FAMILIES;API.family=family;API.outOfScope=outOfScope;API.audit=audit;
API.csv=csv;API.previewWorkbook=previewWorkbook;
})(window);
