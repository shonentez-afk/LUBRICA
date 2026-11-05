(function(global){
'use strict';
const CATEGORY_ORDER=['structure','points','materials','norms','periodicity','sources','routes'];
const CATEGORY_LABELS={
 structure:'Структура',points:'Точки',materials:'Материалы',norms:'Нормы',
 periodicity:'Периодичность',sources:'Источники',routes:'Маршруты'
};
const SEVERITY_RANK={blocker:0,error:1,warn:2,info:3};
const MATERIAL_FREE_OPS=new Set(['Контроль состояния','Проверка уровня','Осмотр масла','Контроль натяжения','Контроль удлинения','Очистка','Отбор пробы']);
function db(){return global.LubricaCore?.State?.getDatabase?.()||null}
function clean(v){return String(v??'').trim()}
function has(v){return v!==null&&v!==undefined&&clean(v)!==''}
function num(v){if(v===null||v===undefined||clean(v)==='')return null;const n=Number(String(v).replace(',','.').replace(/[^\d.+-]/g,''));return Number.isFinite(n)?n:null}
function arr(x){return Array.isArray(x)?x:[]}
function mapBy(a){return new Map(arr(a).map(x=>[String(x.id),x]))}
function approved(t){return ['approved','ready'].includes(clean(t?.approvalStatus).toLowerCase())||t?.verified===true}
function taskInterval(t){return clean(t?.schedule?.legacyText)||clean(t?.schedule?.interval)||clean(t?.interval)||clean(t?.legacy?.interval)}
function taskQty(t){return t?.quantity?.approved??t?.approvedQuantity??t?.quantityApproved??t?.legacy?.qty??null}
function taskUnit(t){return clean(t?.quantity?.unit)||clean(t?.unit)||clean(t?.legacy?.measure)}
function taskQuantitySource(t){return clean(t?.quantity?.source)||clean(t?.quantitySource)||clean(t?.engineeringSources?.quantity)||clean(t?.legacy?.quantitySource)}
function taskIntervalSource(t){return clean(t?.schedule?.source)||clean(t?.intervalSource)||clean(t?.engineeringSources?.interval)||clean(t?.legacy?.intervalSource)}
function operationNeedsMaterial(t){return !MATERIAL_FREE_OPS.has(clean(t?.operation))}
function effectiveMaterialId(t,lp){
 if(clean(t?.materialMode)==='none')return '';
 if(clean(t?.materialMode)==='explicit')return clean(t?.materialId);
 return clean(lp?.targetMaterialId)||clean(t?.materialId);
}
function pointCalculations(p){
 const known=['bearing','linearBearing','gearboxOil','chain','coupling','greasePoint','ballScrew','oilSystem','openGear','wireRope','centralLubrication'];
 return known.map(k=>p?.[k]?.calculation).filter(x=>x&&typeof x==='object');
}
function calculationMeta(t,p){
 const legacy=t?.legacy||{}, taskCalc=t?.calculation||{}, calcs=[taskCalc,...pointCalculations(p),legacy?.calculation].filter(x=>x&&typeof x==='object');
 const calculated=!!(t?.quantity?.calculated!=null||t?.quantity?.calculatedGrams!=null||legacy?.calculationResult||t?.calculationResult||calcs.some(c=>c.calculatedAt||Object.keys(c).some(k=>/^calculated/i.test(k)&&c[k]!=null)));
 const approvedCalc=!!(t?.calculationApproved||legacy?.calculationApproved||calcs.some(c=>c.approved===true||Object.keys(c).some(k=>/^approved/i.test(k)&&c[k]!==null&&c[k]!==undefined&&clean(c[k])!=='')));
 return {approved:approvedCalc,calculated,calcs};
}
function calculationSource(p,key){
 const calcs=pointCalculations(p);
 const names=key==='quantity'?['quantitySource','source']:['intervalSource','scheduleSource'];
 for(const c of calcs)for(const n of names)if(has(c?.[n]))return clean(c[n]);
 return '';
}
function materialSource(p){return clean(p?.engineeringSources?.material?.reference)||clean(p?.engineeringSources?.material?.source)||clean(p?.materialSource)||clean(p?.materialRationale)}
function issue(code,category,severity,entityType,entityId,title,message,action=''){
 return {id:`${code}:${entityType}:${entityId}`,code,category,severity,entityType,entityId:String(entityId||''),title,message,action};
}
function createBucket(){return Object.fromEntries(CATEGORY_ORDER.map(k=>[k,{key:k,label:CATEGORY_LABELS[k],passed:0,applicable:0,issues:0}]))}


// Only actual imported component candidates are considered; no physical point is invented.
const REVIEW_CATEGORIES=new Set(['bearing','linear_bearing','chain','bushing','joint','guide','coupling','screw_drive','open_gear','gearbox_oil','wire_rope','oil_system','central_point']);
const REVIEW_CATEGORY_LABELS={bearing:'Подшипники',linear_bearing:'Линейные подшипники',chain:'Цепи',bushing:'Втулки',joint:'Шарниры',guide:'Направляющие',coupling:'Муфты',screw_drive:'Винты',open_gear:'Зубчатые передачи',gearbox_oil:'Редукторы',wire_rope:'Канаты',oil_system:'Масляные системы',central_point:'Центральные точки'};
const REVIEW_PRIORITY={bearing:5,linear_bearing:5,gearbox_oil:5,chain:4,screw_drive:4,open_gear:4,coupling:3,bushing:2,joint:2,guide:2,wire_rope:2,oil_system:3,central_point:3};
function candidateQueue(database=db()){
 const d=database||{},equipment=mapBy(d.equipment),lines=mapBy(d.lines),areas=mapBy(d.areas),groups=new Map(),byCategory={};
 const linked=new Set(arr(d.lubricationPoints).map(p=>clean(p?.componentBinding?.sourceComponentId)).filter(Boolean));
 for(const p of arr(d.lubricationPoints)){
  const m=clean(p?.candidateOriginKey).match(/^component:([^:]+):/);
  if(m)linked.add(m[1]);
 }
 let totalCandidates=0,alreadyLinked=0;
 for(const part of arr(d.components)){
  const category=clean(part.candidateCategory),state=clean(part.candidateState).toLowerCase();
  if(!REVIEW_CATEGORIES.has(category)||!['candidate','review'].includes(state))continue;
  totalCandidates++;
  if(linked.has(clean(part.id))){alreadyLinked++;continue}
  const e=equipment.get(String(part.equipmentId||''));if(!e)continue;
  const groupId=String(e.id),line=lines.get(String(e.lineId||'')),area=areas.get(String(e.areaId||''));
  if(!groups.has(groupId))groups.set(groupId,{equipmentId:groupId,equipmentName:clean(e.name)||groupId,lineId:String(e.lineId||''),lineName:clean(line?.name)||String(e.lineId||''),areaName:clean(area?.name)||String(e.areaId||''),count:0,priority:0,byCategory:{},items:[]});
  const g=groups.get(groupId);g.count++;g.priority+=REVIEW_PRIORITY[category]||1;g.byCategory[category]=(g.byCategory[category]||0)+1;
  // A component is evidence for a possible service location, not a service point.
  g.items.push({id:String(part.id),name:clean(part.name),externalCode:clean(part.externalCode),category,state,decision:part.engineeringDecision?.action||'',decisionReason:clean(part.engineeringDecision?.reason)});
  byCategory[category]=(byCategory[category]||0)+1;
 }
 const result=Array.from(groups.values()).sort((a,b)=>b.priority-a.priority||b.count-a.count||a.equipmentName.localeCompare(b.equipmentName,'ru'));
 const lineOptions=Array.from(new Map(result.map(g=>[g.lineId,{id:g.lineId,name:g.lineName}])).values()).sort((a,b)=>a.name.localeCompare(b.name,'ru'));
 const resolved=arr(d.components).filter(c=>c.engineeringDecision?.action&&equipment.has(clean(c.equipmentId)))
 .map(c=>{const e=equipment.get(clean(c.equipmentId)),line=lines.get(clean(e.lineId)),decision=c.engineeringDecision;
   return{componentId:String(c.id),componentName:clean(c.name),externalCode:clean(c.externalCode),equipmentId:String(e.id),
    equipmentName:clean(e.name),lineId:clean(e.lineId),lineName:clean(line?.name),action:clean(decision.action),
    reason:clean(decision.reason),sourceReference:clean(decision.sourceReference),confirmedAt:clean(decision.confirmedAt),
    createdPointIds:arr(decision.createdPointIds).map(String)};}).sort((a,b)=>b.confirmedAt.localeCompare(a.confirmedAt)||a.componentName.localeCompare(b.componentName,'ru'));
 return {totalCandidates,alreadyLinked,unlinked:result.reduce((n,g)=>n+g.count,0),byCategory,groups:result,lines:lineOptions,categoryLabels:REVIEW_CATEGORY_LABELS,resolved};
}
function skfSealedSpherical(p){
 const bearing=p?.bearing||{},calc=bearing.calculation||{},designation=clean(bearing.effectiveDesignation||bearing.actualDesignation||bearing.structuralDesignation).toUpperCase().replace(/\s+/g,'');
 return bearing.bearingType==='spherical_roller'&&(/\bSKF\b/i.test(clean(calc.manufacturer))||/\bSKF\b/i.test(clean(calc.oemSource))||/^BRG-SKF/.test(clean(bearing.catalogId).toUpperCase()))&&(/-2CS(?:2|5)?(?:\/|$)/.test(designation)||/^2CS(?:2|5)?$/.test(clean(bearing.sealingCode).toUpperCase()));
}

function audit(database=db()){
 const d=database||{},eq=mapBy(d.equipment),nodes=mapBy(d.nodes),lps=mapBy(d.lubricationPoints),tasks=mapBy(d.tasks),materials=mapBy(d.materials),tools=mapBy(d.tools);
 const libraryIds=new Set(arr(d.componentLibraryEntries).map(x=>String(x.id)));
 const materialByName=new Map(arr(d.materials).flatMap(m=>[[clean(m.name).toLowerCase(),m],[clean(m.code).toLowerCase(),m]]).filter(x=>x[0]));
 const routes=arr(d.routes),issues=[],b=createBucket();
 function check(category,ok,problem){b[category].applicable++;if(ok){b[category].passed++;return}b[category].issues++;if(problem)issues.push(problem)}
 // Engineer decisions must not silently remain trusted after a source component changes on re-import.
 for(const c of arr(d.components)){
  const prior=c.engineeringDecision?.identity;if(!prior)continue;
  const current={equipmentId:clean(c.equipmentId),externalCode:clean(c.externalCode),
   name:clean(c.name),category:clean(c.candidateCategory)};
  const drift=Object.keys(current).some(key=>current[key]!==clean(prior[key]));
  check('structure',!drift,issue('ENGINEERING_DECISION_SOURCE_CHANGED','structure','warn','equipment',c.equipmentId,
   'Изменился исходный ТМЦ после инженерного решения',
   c.id+' · '+(c.name||'ТМЦ')+': изменена идентичность, категория или оборудование. Перепроверьте ранее сохранённое инженерное решение и его доказательство.',
   'Открыть оборудование'));
 }
 // STRUCTURE: equipment and points must resolve through the current hierarchy.
 for(const p of lps.values()){
   const e=eq.get(String(p.equipmentId||'')),n=nodes.get(String(p.nodeId||''));
   check('structure',!!e,issue('POINT_EQUIPMENT_MISSING','structure','blocker','point',p.id,'Точка без оборудования',`Точка ${p.legacyId||p.id} ссылается на отсутствующее оборудование ${p.equipmentId||'—'}.`,'Открыть точку'));
   check('structure',!!n,issue('POINT_NODE_MISSING','structure','error','point',p.id,'Точка без узла',`Для точки ${p.legacyId||p.id} не найден связанный узел ${p.nodeId||'—'}.`,'Открыть точку'));
   if(e){check('structure',has(e.lineId),issue('EQUIPMENT_LINE_MISSING','structure','error','equipment',e.id,'Оборудование без линии',`${e.name||e.id}: не назначена линия.`,'Открыть структуру'));
         check('structure',has(e.areaId),issue('EQUIPMENT_AREA_MISSING','structure','error','equipment',e.id,'Оборудование без участка',`${e.name||e.id}: не назначен участок.`,'Открыть структуру'))}
   const binding=p.componentBinding||{},bindingId=clean(binding.actualLibraryEntryId||binding.libraryEntryId);
   check('structure',!!bindingId,issue('COMPONENT_LIBRARY_UNBOUND','structure','warn','point',p.id,'Компонент не связан со Справочником',`Точка ${p.legacyId||p.id}: нет привязки компонента к инженерному Справочнику.`,'Открыть точку'));
   if(bindingId&&libraryIds.size)check('structure',libraryIds.has(bindingId),issue('COMPONENT_LIBRARY_ENTRY_MISSING','structure','error','point',p.id,'Привязка к Справочнику потеряна',`Точка ${p.legacyId||p.id}: запись ${bindingId} отсутствует в Справочнике.`,'Открыть точку'));
 }
 // Duplicate physical point detection must use a physical origin key, not a catalogue/library entry id.
 // Many independent points may legitimately use the same UCP212/UC216/etc. library entry.
 const originGroups=new Map();
 for(const p of lps.values()){
   const originKey=clean(p.candidateOriginKey);
   if(originKey){if(!originGroups.has(originKey))originGroups.set(originKey,[]);originGroups.get(originKey).push(p)}
 }
 for(const [originKey,pts] of originGroups)if(pts.length>1)for(const p of pts)check('points',false,issue('PHYSICAL_POINT_ORIGIN_DUPLICATE','points','warn','point',p.id,'Один физический источник создал несколько одинаковых точек',`Источник ${originKey} связан с ${pts.length} точками. Проверьте дублирование физической точки.`,'Открыть точку'));
 // POINTS: physical point integrity and at least one event.
 const taskCountByPoint=new Map();
 for(const t of tasks.values()){const pid=String(t.lubricationPointId||'');taskCountByPoint.set(pid,(taskCountByPoint.get(pid)||0)+1)}
 for(const p of lps.values()){
   check('points',(taskCountByPoint.get(String(p.id))||0)>0,issue('POINT_WITHOUT_TASKS','points','error','point',p.id,'Точка есть в Структуре, но не попадает в Карту',`У точки ${p.legacyId||p.id} · ${p.name||'без названия'} нет ни одного мероприятия. Карта смазки показывает мероприятия, поэтому такая физическая точка в ней не отображается. Добавьте мероприятие или удалите пустую точку из Структуры.`,'Открыть в Структуре'));
   check('points',has(p.name)||has(p.legacyId),issue('POINT_NAME_MISSING','points','warn','point',p.id,'У точки нет понятного наименования',`Точка ${p.id}: заполните наименование/обозначение.`,'Открыть точку'));
 }
 // TASK/event checks: every row in the final lubrication map is one task.
 for(const t of tasks.values()){
   const pid=String(t.lubricationPointId||''),p=lps.get(pid),op=clean(t.operation)||clean(t.activityType)||t.id;
   check('points',!!p,issue('TASK_ORPHAN_POINT','points','blocker','task',t.id,'Мероприятие относится к удалённой точке',`${t.id} · ${op}: физическая точка ${t.lubricationPointId||'—'} отсутствует.`,'Открыть мероприятие'));
   check('points',has(t.operation),issue('TASK_OPERATION_MISSING','points','error','task',t.id,'У мероприятия нет операции',`${t.id}: не задано наименование мероприятия.`,'Открыть мероприятие'));
   const needsMaterial=operationNeedsMaterial(t),mid=effectiveMaterialId(t,p),materialName=clean(t.materialName)||clean(t.legacy?.material);
   const material=mid?materials.get(mid):(materialName?materialByName.get(materialName.toLowerCase()):null);
   if(needsMaterial){
     const materialAssigned=!!mid||!!materialName;
     check('materials',materialAssigned,issue('TASK_MATERIAL_MISSING','materials','error','task',t.id,'Мероприятие без материала',`${t.id} · ${op}: материал не назначен.`,'Открыть мероприятие'));
     if(materialAssigned)check('materials',!!material,issue('TASK_MATERIAL_LIBRARY_MISSING','materials','blocker','task',t.id,'Материал отсутствует в библиотеке',`${t.id} · ${op}: назначенный материал ${mid||materialName} отсутствует в библиотеке.`,'Открыть мероприятие'));
   }
   const q=taskQty(t),qn=num(q);
   if(needsMaterial){
     check('norms',qn!==null&&qn>0,issue('TASK_QUANTITY_MISSING','norms','error','task',t.id,'Нет утверждённой нормы',`${t.id} · ${op}: не задано положительное утверждённое количество.`,'Открыть мероприятие'));
     check('norms',has(taskUnit(t)),issue('TASK_QUANTITY_UNIT_MISSING','norms','error','task',t.id,'Нет единицы нормы',`${t.id} · ${op}: норма есть, но единица измерения не задана.`,'Открыть мероприятие'));
   }
   if(p&&skfSealedSpherical(p)){
     const bearing=p.bearing||{},bc=bearing.calculation||{},type=clean(t.activityType).toLowerCase(),operation=clean(t.operation).toLowerCase(),isRegrease=type==='regrease'||/досмаз/.test(operation),isRenewal=type==='grease_full_replacement'||/полная замена смазки/.test(operation);
     const eRef=clean(bc.sealedRelubeSource||bearing.sealedRelubeSource);
     const confirmed=bc.sealedRelubeConfirmed===true&&!!eRef;
     const dmm=num(bearing.D),bmm=num(bearing.B),guide=dmm>0&&bmm>0?Math.round(.0015*dmm*bmm*100)/100:null;
     if(isRegrease){
       const q=num(taskQty(t)),isGeneric=clean(bc.relubeMethod)==='lubrica_unified';
       const guideText=guide!==null?`Если OEM-повторная смазка действительно требуется, контрольный ориентир SKF Gp=0,0015×D×B — ${guide} г; записано ${q===null?'—':q+' г'}.`:'';
       const msg=`SKF ${bearing.effectiveDesignation||p.name}: уплотнения 2CS не исключают досмазывание, но его необходимость определяется ресурсом заводской смазки, наличием доступного канала и OEM-процедурой. ${guideText} Проверьте совместимость выбранной смазки с заводской SKF LGEP 2; общая методика для открытого подшипника не может автоматически считаться подтверждённой.`;
       if(!confirmed||isGeneric)check('norms',false,issue('SKF_SEALED_RELUBE_REVIEW','norms',approved(t)?'error':'warn','task',t.id,'SKF sealed: проверить необходимость и норму досмазывания',msg,'Открыть расчёт'));
     }
     if(isRenewal&&!bc.sealedFullRenewalConfirmed){
       check('norms',false,issue('SKF_SEALED_FULL_RENEWAL_REVIEW','norms',approved(t)?'error':'warn','task',t.id,'SKF sealed: проверить применимость полной замены смазки',`${t.id}: закрытый подшипник ${bearing.effectiveDesignation||p.name}; подтвердите процедуру производителя или предусмотрите замену подшипника. Нельзя считать обычную полную замену смазки применимой по одному геометрическому объёму.`,'Открыть расчёт'));
     }
   }
   const cm=calculationMeta(t,p);
   if(cm.calculated)check('norms',cm.approved,issue('CALCULATION_NOT_APPROVED','norms','warn','task',t.id,'Расчёт не утверждён',`${t.id} · ${op}: расчёт присутствует, но не подтверждён как утверждённый результат.`,'Открыть расчёт'));
   check('periodicity',has(taskInterval(t)),issue('TASK_INTERVAL_MISSING','periodicity','error','task',t.id,'Нет периодичности',`${t.id} · ${op}: не задана периодичность выполнения.`,'Открыть мероприятие'));
   if(needsMaterial)check('sources',has(taskQuantitySource(t))||has(calculationSource(p,'quantity')),issue('QUANTITY_SOURCE_MISSING','sources','warn','task',t.id,'Нет источника нормы',`${t.id} · ${op}: не указан источник утверждённого количества.`,'Открыть мероприятие'));
   // Selecting an approved material from the library is sufficient for the task itself.
   // Missing documentary reference is audited once per used material below, not repeated for every task.
   check('sources',has(taskIntervalSource(t))||has(calculationSource(p,'interval')),issue('INTERVAL_SOURCE_MISSING','sources','warn','task',t.id,'Нет источника периодичности',`${t.id} · ${op}: не указан источник периодичности.`,'Открыть мероприятие'));
 }
 // SOURCES: audit missing material documentary reference once per actually used library material.
 const usedMaterialIds=new Set();
 for(const t of tasks.values()){const p=lps.get(String(t.lubricationPointId||''));if(operationNeedsMaterial(t)){const mid=effectiveMaterialId(t,p);if(mid)usedMaterialIds.add(mid)}}
 for(const mid of usedMaterialIds){
   const m=materials.get(String(mid));
   if(!m)continue;
   const ref=clean(m.sourceReference)||clean(m.densitySource)||clean(m.notes);
   check('sources',!!ref,issue('MATERIAL_REFERENCE_MISSING','sources','warn','material',m.id,'У материала нет документального источника',`${m.code||m.id} · ${m.name||'Материал'}: материал выбран из утверждённого справочника, но в его карточке не указан паспорт/TDS/OEM-источник.`,'Открыть материалы'));
 }
 // MATERIAL MASTER DATA: suspicious physical properties are findings, never silent auto-corrections.
 for(const m of materials.values()){
   const densityText=clean(m.density),density=num(m.density);
   if(densityText)check('materials',density!==null&&density>=.5&&density<=2,issue('MATERIAL_DENSITY_IMPLAUSIBLE','materials','error','material',m.id,'Проверить плотность материала',`${m.code||m.id} · ${m.name||''}: значение «${densityText}» не похоже на плотность в г/см³. Сверьте паспорт и не используйте это значение для перевода массы/объёма до исправления.`,'Открыть материал'));
   const isOil=/масл|\boil\b/i.test(clean(m.kind)),vg=num(m.isoVg),v40=num(m.baseViscosity40);
   if(isOil&&vg>0&&v40>0)check('materials',Math.abs(v40-vg)/vg<=.15,issue('MATERIAL_OIL_VG_CONFLICT','materials','warn','material',m.id,'Масло: ISO VG и вязкость при 40°C не согласованы',`${m.code||m.id} · ${m.name||''}: ISO VG ${vg}, но вязкость при 40°C записана как ${v40} мм²/с. Сверьте TDS; для редукторного масла эти данные требуют проверки.`,'Открыть материал'));
 }
 // ROUTES: current references, tools and coverage for approved tasks.
 const activeRoutes=routes.filter(r=>r.status!=='archived'),assigned=new Map();
 for(const r of activeRoutes){
   const ids=arr(r.taskIds).map(String);
   check('routes',ids.length>0,issue('ROUTE_EMPTY','routes','error','route',r.id,'Пустой маршрут',`${r.code||r.id}: в маршруте нет мероприятий.`,'Открыть маршрут'));
   check('routes',has(r.lineId),issue('ROUTE_LINE_MISSING','routes','error','route',r.id,'Маршрут без линии',`${r.code||r.id}: линия не назначена.`,'Открыть маршрут'));
   for(const id of ids){
     const t=tasks.get(id);
     check('routes',!!t,issue('ROUTE_TASK_MISSING','routes','blocker','route',r.id,'Маршрут содержит удалённое мероприятие',`${r.code||r.id}: мероприятие ${id} отсутствует в базе.`,'Открыть маршрут'));
     if(t){
       assigned.set(id,(assigned.get(id)||0)+1);
       const needsTool=operationNeedsMaterial(t);
       if(needsTool)check('routes',has(t.toolId),issue('ROUTE_TASK_TOOL_MISSING','routes','warn','task',t.id,'Для маршрутного мероприятия не назначен инструмент',`${r.code||r.id} · ${t.id}: смазочное оборудование/инструмент не назначен.`,'Открыть мероприятие'));
       if(t.toolId)check('routes',tools.has(String(t.toolId)),issue('ROUTE_TOOL_LIBRARY_MISSING','routes','error','task',t.id,'Инструмент отсутствует в библиотеке',`${t.id}: ссылка ${t.toolId} не найдена в библиотеке смазочного оборудования.`,'Открыть мероприятие'));
     }
   }
 }
 const approvedTasks=Array.from(tasks.values()).filter(approved);
 if(activeRoutes.length===0){
   if(approvedTasks.length)check('routes',false,issue('ROUTES_NOT_CREATED','routes','warn','route','routes','Текущие маршруты ещё не созданы',`Есть ${approvedTasks.length} утверждённых мероприятий, но нет ни одного текущего маршрута. После формирования маршрутов контроль проверит покрытие каждого мероприятия.`,'Открыть маршруты'));
 }else{
   for(const t of approvedTasks)check('routes',(assigned.get(String(t.id))||0)>0,issue('APPROVED_TASK_NOT_ROUTED','routes','warn','task',t.id,'Утверждённое мероприятие не включено в текущий маршрут',`${t.id} · ${t.operation||'Мероприятие'}: утверждено, но отсутствует во всех текущих маршрутах.`,'Открыть мероприятие'));
 }
 // Final readiness is calculated from concrete checks, never manually assigned.
 const categories=CATEGORY_ORDER.map(k=>{const x=b[k],score=x.applicable?Math.round(x.passed/x.applicable*1000)/10:100;return {...x,score,failed:x.applicable-x.passed}});
 const totalApplicable=categories.reduce((s,x)=>s+x.applicable,0),totalPassed=categories.reduce((s,x)=>s+x.passed,0);
 const readiness=totalApplicable?Math.round(totalPassed/totalApplicable*1000)/10:100;
 issues.sort((a,b)=>(SEVERITY_RANK[a.severity]??9)-(SEVERITY_RANK[b.severity]??9)||CATEGORY_ORDER.indexOf(a.category)-CATEGORY_ORDER.indexOf(b.category)||a.entityId.localeCompare(b.entityId,'ru'));
 const severityCounts={blocker:0,error:0,warn:0,info:0};for(const x of issues)severityCounts[x.severity]=(severityCounts[x.severity]||0)+1;
 return{generatedAt:new Date().toISOString(),readiness,totalApplicable,totalPassed,totalFailed:totalApplicable-totalPassed,categories,issues,severityCounts,counts:{equipment:eq.size,points:lps.size,tasks:tasks.size,materials:materials.size,routes:activeRoutes.length},candidateQueue:candidateQueue(d)};
}
global.LubricaProgramQA=Object.freeze({audit,candidateQueue,CATEGORY_ORDER,CATEGORY_LABELS});
})(window);