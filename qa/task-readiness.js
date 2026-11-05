(function(global){
'use strict';
// Read-only point/task completion presenter. A task is not a lubrication point;
// one physical point may have multiple independently approved activities.
const arr=v=>Array.isArray(v)?v:[];
const clean=v=>String(v??'').trim();
const byId=a=>new Map(arr(a).map(x=>[String(x.id),x]));
const MATERIAL_FREE=new Set([
 'condition_check','oil_level_check','tension_check','elongation_check',
 'cleaning','oil_sample','oil_inspection','filter_dp_check',
 'inspection','state_inspection','replacement'
]);
const MATERIAL_FREE_LABELS=new Set([
 'контроль состояния','проверка уровня','контроль натяжения',
 'контроль удлинения','очистка','отбор пробы','осмотр масла',
 'осмотр','осмотр состояния'
]);
const ISSUE_ACTIONS={
 SKF_SEALED_RELUBE_REVIEW:'calculation',
 SKF_SEALED_FULL_RENEWAL_REVIEW:'calculation',
 ENGINEERING_DECISION_SOURCE_CHANGED:'structure',
 CALCULATION_NOT_APPROVED:'calculation',
 POINT_NODE_MISSING:'structure',
 POINT_EQUIPMENT_MISSING:'structure',
 COMPONENT_LIBRARY_ENTRY_MISSING:'structure',
 TASK_ORPHAN_POINT:'structure',
 TASK_OPERATION_MISSING:'operation',
 TASK_MATERIAL_MISSING:'material',
 TASK_MATERIAL_LIBRARY_MISSING:'material',
 TASK_QUANTITY_MISSING:'quantity',
 TASK_QUANTITY_UNIT_MISSING:'quantity',
 TASK_INTERVAL_MISSING:'interval',
 QUANTITY_SOURCE_MISSING:'evidence',
 INTERVAL_SOURCE_MISSING:'evidence'
};
const ISSUE_PRIORITY=[
 'TASK_ORPHAN_POINT','POINT_EQUIPMENT_MISSING','POINT_NODE_MISSING',
 'ENGINEERING_DECISION_SOURCE_CHANGED','COMPONENT_LIBRARY_ENTRY_MISSING',
 'TASK_OPERATION_MISSING',
 'SKF_SEALED_RELUBE_REVIEW','SKF_SEALED_FULL_RENEWAL_REVIEW',
 'TASK_MATERIAL_LIBRARY_MISSING','TASK_MATERIAL_MISSING',
 'TASK_QUANTITY_MISSING','TASK_QUANTITY_UNIT_MISSING',
 'CALCULATION_NOT_APPROVED','TASK_INTERVAL_MISSING',
 'QUANTITY_SOURCE_MISSING','INTERVAL_SOURCE_MISSING'
];
const ACTIONS={
 structure:{label:'Проверить физическую точку',hint:'Откройте оборудование и уточните фактический узел, привязку и источник.'},
 operation:{label:'Выбрать мероприятие',hint:'Откройте карточку и укажите фактически выполняемую операцию.'},
 material:{label:'Выбрать материал',hint:'Откройте вкладку «Анализ» и выберите материал из справочника.'},
 quantity:{label:'Рассчитать и применить норму',hint:'Откройте «Расчёт», проверьте конструкцию и примените результат.'},
 calculation:{label:'Проверить расчёт и OEM',hint:'Откройте «Расчёт → Подробнее», проверьте применимость и источник методики.'},
 interval:{label:'Указать периодичность',hint:'Откройте мероприятие и задайте периодичность по OEM или подтверждённому режиму.'},
 evidence:{label:'Подтвердить источник',hint:'Проверьте обоснование нормы и интервала, при необходимости дополните источник.'},
 approve:{label:'Утвердить мероприятие',hint:'После сохранения данных утвердите мероприятие отдельно, чтобы оно участвовало в плане.'},
 complete:{label:'Мероприятие готово',hint:'Мероприятие утверждено. Проверьте включение в маршрут и план.'},
 disabled:{label:'Мероприятие отключено',hint:'Оно не участвует в плане. При необходимости измените статус в карточке.'}
};
const STEPS=[
 ['structure','Физическое место'],['operation','Мероприятие'],
 ['material','Материал'],['quantity','Норма'],['interval','Периодичность'],
 ['evidence','Источники'],['approve','Утверждение']
];
function needsMaterial(t){
 const type=clean(t?.activityType).toLowerCase();
 const op=clean(t?.operation).toLowerCase();
 if(MATERIAL_FREE.has(type)||MATERIAL_FREE_LABELS.has(op))return false;
 return true;
}
function quantity(t){
 const q=t?.quantity?.approved??t?.approvedQuantity??t?.quantityApproved??t?.legacy?.qty;
 const n=Number(clean(q).replace(',','.'));
 return clean(q)!==''&&Number.isFinite(n)&&n>0;
}
function interval(t){
 return !!(clean(t?.schedule?.legacyText)||clean(t?.schedule?.interval)||
  clean(t?.interval)||clean(t?.legacy?.interval)||t?.schedule?.strategy==='По состоянию');
}
function material(t,p,materials){
 if(!needsMaterial(t))return true;
 const mode=clean(t?.materialMode),id=mode==='explicit'?clean(t?.materialId):clean(p?.targetMaterialId)||clean(t?.materialId);
 if(id)return materials.has(id);
 const name=clean(t?.materialName)||clean(t?.legacy?.material);
 if(!name)return false;
 return Array.from(materials.values()).some(m=>clean(m.name).toLowerCase()===name.toLowerCase()||
   clean(m.code).toLowerCase()===name.toLowerCase());
}
function issueKey(i){return String(i.entityType)+':'+String(i.entityId)}
function sourceCode(i){return clean(i?.code)}
function summary(db,allIssues=[]){
 const d=db||{},equipment=byId(d.equipment),nodes=byId(d.nodes),points=byId(d.lubricationPoints),
  materials=byId(d.materials),lines=byId(d.lines),areas=byId(d.areas),components=byId(d.components),
  issuesById=new Map(),groupMap=new Map(),result=[];
 for(const i of arr(allIssues)){
  const k=issueKey(i);if(!issuesById.has(k))issuesById.set(k,[]);issuesById.get(k).push(i);
 }
 let ready=0,review=0,needsData=0,disabled=0,approvedWithGaps=0;
 for(const task of arr(d.tasks)){
  const p=points.get(String(task.lubricationPointId)),e=p&&equipment.get(String(p.equipmentId)),
   node=p&&nodes.get(String(p.nodeId)),line=e&&lines.get(String(e.lineId)),area=e&&areas.get(String(e.areaId)),
   sourceCmp=p&&components.get(String(p.componentBinding?.sourceComponentId));
  const relevant=[...(issuesById.get('task:'+String(task.id))||[]),...(p?(issuesById.get('point:'+String(p.id))||[]):[]),
   ...(sourceCmp?(issuesById.get('component:'+String(sourceCmp.id))||[]):[])];
  const first=ISSUE_PRIORITY.map(code=>relevant.find(i=>i.code===code)).find(Boolean);
  const critical=relevant.filter(i=>i.severity==='blocker'||i.severity==='error');
  const warnings=relevant.filter(i=>i.severity==='warn');
  const inactive=clean(task.approvalStatus).toLowerCase()==='disabled';
  const approved=clean(task.approvalStatus).toLowerCase()==='approved'||task.verified===true;
  const noMaterial=!needsMaterial(task),hasMat=material(task,p,materials);
  const unit=clean(task?.quantity?.unit)||clean(task?.unit)||clean(task?.legacy?.measure);
  const hasQty=noMaterial||(quantity(task)&&!!unit);
  const hasInterval=interval(task);
  const sourceOK=!relevant.some(i=>['QUANTITY_SOURCE_MISSING','INTERVAL_SOURCE_MISSING'].includes(i.code));
  const physical=!!p&&!!e&&!!node&&!relevant.some(i=>
   ['POINT_NODE_MISSING','POINT_EQUIPMENT_MISSING','TASK_ORPHAN_POINT','ENGINEERING_DECISION_SOURCE_CHANGED'].includes(i.code));
  const operation=!!clean(task.operation);
  const steps=[
   {key:'structure',label:'Физическое место',ok:physical},
   {key:'operation',label:'Мероприятие',ok:operation},
   {key:'material',label:'Материал',ok:hasMat,notApplicable:noMaterial},
   {key:'quantity',label:'Норма',ok:hasQty,notApplicable:noMaterial},
   {key:'interval',label:'Периодичность',ok:hasInterval},
   {key:'evidence',label:'Источники',ok:sourceOK},
   {key:'approve',label:'Утверждение',ok:approved}
  ];
  const completed=steps.filter(x=>x.ok).length;
  let action='approve';
  if(inactive)action='disabled';
  else if(first)action=ISSUE_ACTIONS[first.code]||'evidence';
  else if(!physical)action='structure';
  else if(!operation)action='operation';
  else if(!hasMat)action='material';
  else if(!hasQty)action='quantity';
  else if(!hasInterval)action='interval';
  else if(!sourceOK)action='evidence';
  else if(approved)action='complete';
  const dataGap=!physical||!operation||!hasMat||!hasQty||!hasInterval||critical.length>0||
   ['structure','operation','material','quantity','calculation','interval'].includes(action);
  let status;
  if(inactive){status='disabled';disabled++}
  else if(approved){status=dataGap||warnings.length?'attention':'ready';if(status==='ready')ready++;else approvedWithGaps++}
  else if(dataGap){status='needs_data';needsData++}
  else{status='review';review++}
  const mainIssue=first||critical[0]||warnings[0]||null;
  const next=ACTIONS[action]||ACTIONS.approve;
  const item={
   taskId:String(task.id),pointId:p?String(p.id):'',equipmentId:e?String(e.id):'',
   lineId:e?String(e.lineId||''):'',areaId:e?String(e.areaId||''):'',
   lineName:clean(line?.name)||'Линия не задана',
   areaName:clean(area?.name)||'Участок не задан',
   equipmentName:clean(e?.name)||'Оборудование не найдено',
   pointName:clean(p?.name)||'Физическая точка не найдена',
   operation:clean(task.operation)||clean(task.activityType)||'Операция не задана',
   approvalStatus:clean(task.approvalStatus)||'review',
   status,steps,completed,total:steps.length,
   next:{code:action,label:next.label,hint:next.hint,issueCode:mainIssue?.code||'',
    reason:mainIssue?.message||next.hint,entityType:action==='structure'?'point':'task'},
   issueCount:relevant.length,warningCodes:relevant.map(sourceCode),
   analogSuggestion:task?.quantity?.analogSuggested||null
  };
  result.push(item);
  const gkey=item.equipmentId||'missing:'+item.pointId;
  if(!groupMap.has(gkey))groupMap.set(gkey,{equipmentId:item.equipmentId,equipmentName:item.equipmentName,
   lineId:item.lineId,lineName:item.lineName,areaName:item.areaName,count:0,ready:0,needsData:0,review:0,
   attention:0,disabled:0,items:[]});
  const group=groupMap.get(gkey);group.count++;group.items.push(item);
  if(status==='needs_data')group.needsData++;
  else if(status==='attention')group.attention++;
  else group[status]=(group[status]||0)+1;
 }
 const rank={attention:0,needs_data:1,review:2,ready:3,disabled:4};
 result.sort((a,b)=>(rank[a.status]??8)-(rank[b.status]??8)||
  a.lineName.localeCompare(b.lineName,'ru')||a.equipmentName.localeCompare(b.equipmentName,'ru')||
  a.pointName.localeCompare(b.pointName,'ru')||a.operation.localeCompare(b.operation,'ru'));
 const groups=Array.from(groupMap.values()).sort((a,b)=>(b.needsData+b.attention)-(a.needsData+a.attention)||
   b.count-a.count||a.equipmentName.localeCompare(b.equipmentName,'ru'));
 const lineOptions=Array.from(new Map(result.filter(x=>x.lineId).map(x=>[x.lineId,
   {id:x.lineId,name:x.lineName}])).values()).sort((a,b)=>a.name.localeCompare(b.name,'ru'));
 return{total:result.length,ready,review,needsData,disabled,approvedWithGaps,items:result,
  groups,lines:lineOptions,steps:STEPS,actions:ACTIONS};
}
global.LubricaTaskReadiness=Object.freeze({summarize,needsMaterial,ACTIONS,STEPS});
global.LubricaSystem?.registerModule?.('Task Readiness','ok','Следующее действие для мероприятий');
})(window);