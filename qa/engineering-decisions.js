(function(global){
'use strict';
// Stage 2: engineer decisions are bound to the imported physical component,
// not to a catalog designation. No point is created merely by classification.
const ACTIONS=Object.freeze({
 point:'Создать физическую точку',
 context:'Конструктивный контекст',
 not_lubricated:'Не смазывается',
 clarify:'Требует уточнения'
});
const allowed=new Set(['point','context','not_lubricated','clarify']);
const clean=v=>String(v??'').trim();
const arr=x=>Array.isArray(x)?x:[];
const copy=v=>v===undefined?undefined:JSON.parse(JSON.stringify(v));
const get=(db,id)=>arr(db?.components).find(x=>String(x.id)===String(id))||null;
const originPrefix=id=>'component:'+String(id)+':';
const auditKeys=['candidateState','candidateLabel','candidateReason','candidateReviewedAt',
 'candidateCreatedPointIds','lubricationDomainOverride','lubricationDomainStatus','lubricationDomainRule'];
function capture(c){
 const out={};for(const k of auditKeys)out[k]={exists:Object.prototype.hasOwnProperty.call(c,k),value:copy(c[k])};return out;
}
function restore(c,previous){for(const k of auditKeys){const s=previous?.[k];if(s?.exists)c[k]=copy(s.value);else delete c[k]}}
function fingerprint(c){return{equipmentId:clean(c.equipmentId),externalCode:clean(c.externalCode),name:clean(c.name),category:clean(c.candidateCategory)}}
function sameIdentity(c,f){if(!c||!f)return false;const a=fingerprint(c);return Object.keys(a).every(k=>a[k]===clean(f[k]))}
function linkedPoints(db,id){const prefix=originPrefix(id);return arr(db?.lubricationPoints).filter(p=>clean(p.componentBinding?.sourceComponentId)===String(id)||clean(p.candidateOriginKey).startsWith(prefix))}
function input(action,params={}){
 return {action:clean(action),reason:clean(params.reason),sourceReference:clean(params.sourceReference),physicalConfirmed:params.physicalConfirmed===true};
}
function preview(db,id,action,params={}){
 const c=get(db,id),p=input(action,params),errors=[],warnings=[];
 if(!c){errors.push('Импортированный компонент отсутствует в текущей базе.');return{allowed:false,errors,warnings,action:p.action}}
 if(!allowed.has(p.action))errors.push('Неизвестное инженерное решение.');
 if(c.engineeringDecision)errors.push('По компоненту уже сохранено решение. Для изменения сначала отмените его безопасным способом.');
 if(!['candidate','review'].includes(clean(c.candidateState).toLowerCase()))errors.push('Компонент уже подтверждён, исключён или относится к другому рабочему процессу.');
 if(!clean(c.equipmentId)||!arr(db.equipment).some(e=>String(e.id)===String(c.equipmentId)))errors.push('Нельзя принять решение без фактического оборудования.');
 if(!clean(c.candidateCategory))errors.push('Категория обслуживаемого компонента не определена.');
 if(clean(c.status).toLowerCase()==='retired')errors.push('Снятая с эксплуатации ТМЦ требует проверки статуса, а не создания точки.');
 if(linkedPoints(db,id).length)errors.push('Компонент уже привязан к физической точке. Новую точку создавать нельзя.');
 if(p.reason.length<8)errors.push('Укажите основание решения (не менее 8 символов).');
 if(['point','not_lubricated'].includes(p.action)&&!p.sourceReference)errors.push('Укажите источник подтверждения: осмотр, паспорт, чертёж или проверку по месту.');
 if(p.action==='point'&&!p.physicalConfirmed)errors.push('Подтвердите, что место обслуживания существует физически.');
 if(p.action==='point'){
  const specialized=global.LubricaOscillatingLinkageArrangement?.rootForRecord?.(db,c,'component');
  if(specialized)errors.push('Компонент относится к механизму качания. Создайте физические точки через его специализированный конструктор.');
  if(global.LubricaRotatingArrangement?.isRotating?.(c,'component')&&
   ['rotating_arrangement','two_support_rotating','spindle','drum_review'].includes(c.candidateTemplate?.id||'rotating_arrangement'))
   errors.push('Вращающийся узел требует специализированного конструктора, чтобы не создавать виртуальные опоры.');
  if(c.candidateEquipmentType==='fan'||c.candidateEquipmentType==='motor')
   errors.push('Для вентилятора/двигателя используйте мастер фактических подшипниковых опор.');
 }
 if(p.action==='point')warnings.push('Далее откроется существующий мастер создания точки и мероприятий. На этом шаге ничего не сохраняется; новые мероприятия останутся в review.');
 if(p.action==='context')warnings.push('ТМЦ останется частью структуры. Самостоятельная точка и мероприятие не создаются.');
 if(p.action==='not_lubricated')warnings.push('Компонент сохраняется в структуре как явно не смазываемый; точки и мероприятия не создаются.');
 if(p.action==='clarify')warnings.push('Компонент остаётся в очереди review до получения инженерных данных.');
 return{allowed:errors.length===0,errors,warnings,action:p.action,componentId:String(id),
  equipmentId:clean(c.equipmentId),componentName:clean(c.name),
  sourceReference:p.sourceReference,reason:p.reason,physicalConfirmed:p.physicalConfirmed,
  change:p.action==='point'?'Перейти в мастер подтверждения точки':'Сохранить инженерное решение'};
}
function history(c,entry){
 c.engineeringDecisionHistory=[...arr(c.engineeringDecisionHistory),entry].slice(-100);
}
function commit(db,id,action,params={}){
 const existing=get(db,id)?.engineeringDecision;
 if(existing?.action===action&&existing.reason===clean(params.reason)&&
   existing.sourceReference===clean(params.sourceReference)&&sameIdentity(get(db,id),existing.identity))
   return{changed:false,action,componentId:String(id)};
 const p=preview(db,id,action,params);if(!p.allowed)throw new Error(p.errors.join(' '));
 if(action==='point')throw new Error('Создание точки выполняется только через существующий мастер LubricaCandidateFinalizer.');
 const c=get(db,id),previous=capture(c),at=new Date().toISOString();
 c.engineeringDecision={version:1,action,reason:p.reason,sourceReference:p.sourceReference,
  confirmedAt:at,identity:fingerprint(c),previous,createdPointIds:[],createdTaskIds:[]};
 c.candidateState=action==='context'?'confirmed':action==='not_lubricated'?'rejected':'review';
 c.candidateLabel=action==='context'?'Конструктивный контекст':action==='not_lubricated'?'Не смазывается':'Ожидает уточнения';
 c.candidateReason=p.reason;c.candidateReviewedAt=at;
 c.lubricationDomainOverride=action==='clarify'?'REVIEW':'ENGINEER_CONFIRMED';
 history(c,{action,reason:p.reason,sourceReference:p.sourceReference,at,kind:'confirmed'});
 return{changed:true,action,componentId:String(id)};
}
function prepareCreate(db,id,params={}){
 const p=preview(db,id,'point',params);
 if(!p.allowed)throw new Error(p.errors.join(' '));
 return{version:1,componentId:String(id),identity:fingerprint(get(db,id)),
  previous:capture(get(db,id)),reason:p.reason,sourceReference:p.sourceReference,
  existingNodeIds:arr(db.nodes).filter(n=>clean(n.candidateOriginKey).startsWith(originPrefix(id))).map(n=>String(n.id)),
  physicalConfirmed:true};
}
function recordCreated(db,id,context,pointIds=[]){
 const c=get(db,id);if(!c||!context||String(context.componentId)!==String(id)||!sameIdentity(c,context.identity))
  throw new Error('Состав или привязка ТМЦ изменились; сохранение решения остановлено.');
 if(c.engineeringDecision)throw new Error('Решение уже сохранено. Повторное создание не допускается.');
 const points=arr(db.lubricationPoints).filter(p=>pointIds.some(x=>String(x)===String(p.id)));
 if(!points.length||points.length!==new Set(pointIds.map(String)).size||
  points.some(p=>!clean(p.candidateOriginKey).startsWith(originPrefix(id))))
  throw new Error('Нельзя подтвердить точку без физически привязанного исходного ТМЦ.');
 const createdTaskIds=arr(db.tasks).filter(t=>points.some(p=>String(p.id)===String(t.lubricationPointId))).map(t=>String(t.id));
 if(!createdTaskIds.length)throw new Error('Мастер не создал мероприятий для точки.');
 const at=new Date().toISOString();
 for(const point of points){
  point.engineeringSources={...(point.engineeringSources||{}),physical:{
   status:'engineer_confirmed',sourceComponentId:String(id),reference:clean(context.sourceReference),
   reason:clean(context.reason),confirmedAt:at}};
 }
 const createdNodeIds=arr(db.nodes).filter(n=>clean(n.candidateOriginKey).startsWith(originPrefix(id))&&
  !arr(context.existingNodeIds).map(String).includes(String(n.id))).map(n=>String(n.id));
 c.engineeringDecision={version:1,action:'point',reason:clean(context.reason),
  sourceReference:clean(context.sourceReference),confirmedAt:at,identity:copy(context.identity),
  previous:copy(context.previous),createdPointIds:points.map(p=>String(p.id)),
  createdTaskIds,createdNodeIds};
 c.candidateState='confirmed';c.candidateLabel='Физическая точка подтверждена';
 c.candidateReason=clean(context.reason);c.candidateReviewedAt=at;
 c.lubricationDomainOverride='ENGINEER_CONFIRMED';
 history(c,{action:'point',reason:clean(context.reason),sourceReference:clean(context.sourceReference),
  createdPointIds:points.map(p=>String(p.id)),createdTaskIds,at,kind:'confirmed'});
 return{changed:true,pointIds:points.map(p=>String(p.id)),taskIds:createdTaskIds};
}
function referenceExists(db,ids){
 const token=new Set(ids.map(String));
 for(const collection of ['routes','routeRevisions','checklistRuns','routePlanItems','routeHistory','routePlans']){
  for(const obj of arr(db?.[collection])){
   const raw=JSON.stringify(obj);
   if([...token].some(id=>raw.includes('"'+id+'"')))return collection;
  }
 }
 return'';
}
function previewUndo(db,id){
 const c=get(db,id),d=c?.engineeringDecision,errors=[],warnings=[],pointIds=arr(d?.createdPointIds).map(String);
 if(!d){errors.push('Сохранённое решение отсутствует.');return{allowed:false,errors,warnings}}
 if(!sameIdentity(c,d.identity)){if(d.action==='point')errors.push('После решения изменились оборудование, категория или имя ТМЦ. Для созданной точки нужна ручная сверка привязки.');else warnings.push('Исходная ТМЦ изменилась после решения. Отмена оставит текущую запись ТМЦ и вернёт её на инженерную проверку.');}
 let taskIds=[];
 if(d.action==='point'){
  if(!pointIds.length)errors.push('Список созданных физических точек отсутствует.');
  const points=arr(db.lubricationPoints).filter(p=>pointIds.includes(String(p.id)));
  if(points.length!==pointIds.length)errors.push('Одна из созданных точек уже отсутствует или была заменена.');
  for(const p of points){
   if(!clean(p.candidateOriginKey).startsWith(originPrefix(id)))errors.push('Точка создана другим источником.');
   if(!['review','draft'].includes(clean(p.status).toLowerCase()))errors.push('Физическая точка была подтверждена или переведена в другой статус.');
   if(clean(p.location)||clean(p.feedMethod)||p.bearing?.calculation?.calculatedAt||p.gearboxOil?.calculation?.calculatedAt)
    errors.push('Конфигурация или расчёт точки изменены после создания.');
  }
  const tasks=arr(db.tasks).filter(t=>pointIds.includes(String(t.lubricationPointId)));
  taskIds=tasks.map(t=>String(t.id));
  if(taskIds.length!==arr(d.createdTaskIds).length||taskIds.some(x=>!arr(d.createdTaskIds).map(String).includes(x)))
   errors.push('Состав мероприятий точки изменён.');
  for(const t of tasks){
   if(!clean(t.candidateOriginKey).startsWith(originPrefix(id)))errors.push('У точки появилось мероприятие из другого источника.');
   if(!['review','draft'].includes(clean(t.approvalStatus).toLowerCase())||t.verified===true)errors.push('Есть утверждённое или выполненное мероприятие.');
   if(clean(t.materialId)||clean(t.materialName)||clean(t.toolId)||clean(t.quantity?.approved)||
    clean(t.schedule?.legacyText)||t.quantity?.calculated!=null||t.schedule?.approvedHours!=null)
    errors.push('Мероприятие уже настраивали; безопасная автоматическая отмена запрещена.');
  }
  const ref=referenceExists(db,taskIds.concat(pointIds));
  if(ref)errors.push('На точку или мероприятия ссылаются '+ref+'.');
  if(!errors.length)warnings.push('Будут удалены только ещё не настроенные точки и мероприятия, созданные этим решением.');
 }else if(linkedPoints(db,id).length)errors.push('Компонент уже привязан к физической точке.');
 return{allowed:errors.length===0,errors:Array.from(new Set(errors)),warnings,action:d.action,
  componentId:String(id),pointIds,taskIds,reason:d.reason};
}
function undo(db,id){
 if(!get(db,id)?.engineeringDecision)return{changed:false,componentId:String(id)};
 const p=previewUndo(db,id);if(!p.allowed)throw new Error(p.errors.join(' '));
 const c=get(db,id),d=c.engineeringDecision;
 if(d.action==='point'){
  const ids=new Set(p.pointIds),tasks=new Set(p.taskIds);
  db.tasks=arr(db.tasks).filter(t=>!tasks.has(String(t.id)));
  db.lubricationPoints=arr(db.lubricationPoints).filter(x=>!ids.has(String(x.id)));
  const ownNodes=new Set(arr(d.createdNodeIds).map(String));
  db.nodes=arr(db.nodes).filter(n=>!ownNodes.has(String(n.id))||
   arr(db.lubricationPoints).some(p=>String(p.nodeId)===String(n.id)));
 }
 restore(c,d.previous);
 delete c.engineeringDecision;
 history(c,{action:d.action,at:new Date().toISOString(),kind:'undo',
  reason:'Отмена инженерного решения',createdPointIds:p.pointIds,createdTaskIds:p.taskIds});
 return{changed:true,action:d.action,pointIds:p.pointIds,taskIds:p.taskIds};
}
global.LubricaEngineeringDecisions=Object.freeze({ACTIONS,preview,commit,prepareCreate,recordCreated,previewUndo,undo,linkedPoints});
global.LubricaSystem?.registerModule?.('Engineering Candidate Decisions','ok','Подтверждение физических ТМЦ');
})(window);