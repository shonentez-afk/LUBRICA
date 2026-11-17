(function(global){
'use strict';
// Stage 5B.13: an imported bearing designation is a TYPE, never a quantity.
// This module records reviewed physical positions; it never creates points,
// tasks, approves maintenance, touches routes, or modifies an OEM method.
const API=global.LubricaConveyorBearingVerification=global.LubricaConveyorBearingVerification||{};
const clean=x=>String(x??'').trim(),list=x=>Array.isArray(x)?x:[],copy=x=>JSON.parse(JSON.stringify(x));
const byId=(db,id)=>list(db?.equipment).find(e=>String(e.id)===String(id))||null;
const PLACE_STATES=new Set(['serviceable','not_serviceable','review']);
function sources(db,equipment){
 const ev=global.LubricaClassifier?.conveyorEvidence?.(db,equipment)||{};
 return list(ev.actual).filter(x=>x.source==='component'&&x.category==='bearing'&&
  !/(?:уточнить|не\s+указан)/i.test(x.name||'')&&
  list(db?.components).some(c=>String(c.id)===String(x.id)&&c.status!=='retired'));
}
function reviewState(db,equipment){
 const data=equipment?.conveyorBearingSurvey||null,bs=sources(db,equipment);
 if(!data)return {status:bs.length?'MODEL_KNOWN_COUNT_UNKNOWN':'BEARING_SOURCE_UNKNOWN',
  label:bs.length?'Модель подшипника есть; число физических опор неизвестно':'Модель и количество опор не подтверждены',
  sourceCount:bs.length,declaredCount:null,confirmedCount:null,positions:[],pending:true};
 const positions=list(data.positions),completed=positions.filter(x=>x.state==='serviceable'&&x.serviceAccessConfirmed&&x.bearingSourceId).length;
 const status=data.status||'COUNT_REVIEW';
 return {status,label:status==='CONFIRMED'?'Позиции опор проверены; обслуживаемость подтверждать по каждой':
  status==='SOURCE_REQUIRED'?'Места известны; не хватает подтверждённых ТМЦ/доступа':
  status==='ZERO_CONFIRMED'?'Отсутствие опор заявлено инженером; проверить назначение машины':
  'Количество / схема опор требуют проверки',sourceCount:bs.length,
  declaredCount:data.reportedCount??null,confirmedCount:data.physicalCountConfirmed?positions.length:null,
  positions,serviceableCount:completed,pending:status!=='CONFIRMED',sourceReference:data.sourceReference||''};
}
function preview(db,equipmentId,input={}){
 const errors=[],warnings=[],eq=byId(db,equipmentId),confirmed=input.physicalCountConfirmed===true;
 if(!eq||eq.status==='retired')errors.push('Конвейер не найден или снят с эксплуатации.');
 const allowedRoles=new Set(['conveyor','other']);
 if(eq&&!allowedRoles.has(clean(eq.equipmentType)))errors.push('Проверка опор доступна только для конвейера.');
 if(eq&&global.LubricaPointAcceleration?.outOfScope?.(db,eq))errors.push('Объект вне текущего объёма: центрифуги и охлаждение не изменять.');
 const role=eq?global.LubricaClassifier?.conveyorIdentity?.(eq.name,eq.equipmentType,eq)?.role:null;
 if(role==='group'||role==='ancillary')errors.push('Для групп и обслуживающих систем сначала откройте конкретную физическую машину.');
 const rows=list(input.positions),sourceList=eq?sources(db,eq):[],sourceIds=new Set(sourceList.map(x=>String(x.id)));
 const ref=clean(input.sourceReference),reason=clean(input.reason);
 const reportedText=clean(input.reportedCount),count=reportedText===''?null:Number(reportedText);
 if(count!==null&&(!Number.isInteger(count)||count<0||count>1000))errors.push('Количество должно быть целым от 0 до 1000.');
 if(rows.length>1000)errors.push('Слишком много физических позиций.');
 const ids=new Set(),locations=new Set();
 const normalized=rows.map((row,i)=>{
  const positionId=clean(row.positionId)||'pos_'+String(i+1).padStart(4,'0'),location=clean(row.location),
   state=PLACE_STATES.has(row.state)?row.state:'review',bearingSourceId=clean(row.bearingSourceId),
   serviceAccessConfirmed=row.serviceAccessConfirmed===true;
  if(ids.has(positionId))errors.push('Дублирующийся ID физической позиции: '+positionId);
  ids.add(positionId);
  if(location&&locations.has(location.toLowerCase()))errors.push('Дублирующееся место: '+location);
  if(location)locations.add(location.toLowerCase());
  if(bearingSourceId&&!sourceIds.has(bearingSourceId))errors.push('ТМЦ подшипника '+bearingSourceId+' отсутствует в подтверждённой конструкции машины.');
  if(confirmed&&!location)errors.push('Для позиции '+(i+1)+' нужно точное фактическое место.');
  if(state==='serviceable'&&confirmed){
   if(!bearingSourceId)errors.push('У обслуживаемой опоры '+(location||i+1)+' нет исходного ТМЦ.');
   if(!serviceAccessConfirmed)errors.push('У опоры '+(location||i+1)+' не подтверждён доступ к смазке.');
  }
  return {positionId,location,state,bearingSourceId,serviceAccessConfirmed,
   sourceReference:clean(row.sourceReference)||ref,notes:clean(row.notes)};
 });
 if(confirmed){
  if(count===null)errors.push('Укажите фактическое количество подшипниковых позиций.');
  else if(count!==rows.length)errors.push('Количество позиций не соответствует проверенному числу. Добавьте каждое реальное место отдельно.');
  if(!ref)errors.push('Укажите документ, фото или осмотр, подтверждающие количество опор.');
  if(reason.length<8)errors.push('Опишите фактическую проверку схемы (не менее 8 символов).');
  if(count===0)warnings.push('Нулевая схема не означает «машина не смазывается»: проверьте другие узлы и обслуживание.');
 }else if(rows.length){warnings.push('Позиции сохранены как неподтверждённая схема. Точки из них не создаются.');}
 if(confirmed){
  const already=list(db?.lubricationPoints).filter(p=>String(p.equipmentId)===String(equipmentId));
  for(const row of normalized.filter(x=>x.state==='serviceable'&&x.location)){
   const origin='equipment:'+equipmentId+':conveyor_survey_'+row.positionId;
   if(already.some(p=>String(p.candidateOriginKey||'')!==origin&&
     [clean(p.name).toLowerCase(),clean(p.positionLabel).toLowerCase()].includes(row.location.toLowerCase())))
    errors.push('На физическом месте «'+row.location+'» уже существует другая точка. Сначала проверьте дубликат.');
  }
 }
 if(count===null)warnings.push('Количество подшипников не задано; наличие модели ТМЦ не устанавливает число опор.');
 else if(!confirmed)warnings.push('Число из ведомости — неподтверждённое значение, не основание для новых точек.');
 const old=eq?.conveyorBearingSurvey;
 if(old&&list(db?.lubricationPoints).some(p=>String(p.candidateOriginKey||'').startsWith('equipment:'+equipmentId+':conveyor_survey_'))){
  const previous=JSON.stringify(list(old.positions).map(x=>[x.positionId,x.location,x.state,x.bearingSourceId,x.serviceAccessConfirmed]));
  const next=JSON.stringify(normalized.map(x=>[x.positionId,x.location,x.state,x.bearingSourceId,x.serviceAccessConfirmed]));
  if(previous!==next)errors.push('По ранее подтверждённым опорам уже созданы точки. Изменять их физическую схему через общий реестр нельзя.');
 }
 const allResolved=normalized.every(x=>x.state!=='review'&&(x.state!=='serviceable'||(x.bearingSourceId&&x.serviceAccessConfirmed)));
 const status=!confirmed?'COUNT_REVIEW':count===0?'ZERO_CONFIRMED':allResolved?'CONFIRMED':'SOURCE_REQUIRED';
 return {allowed:!errors.length,errors,warnings,equipmentId:String(equipmentId),
  physicalCountConfirmed:confirmed,reportedCount:count,positions:normalized,
  sourceReference:ref,reason,status,
  serviceableCount:confirmed?normalized.filter(x=>x.state==='serviceable'&&x.bearingSourceId&&x.serviceAccessConfirmed).length:0,
  createPoints:false,createTasks:false,approve:false};
}
function commit(db,equipmentId,input={}){
 const result=preview(db,equipmentId,input);
 if(!result.allowed)throw new Error(result.errors.join(' '));
 const eq=byId(db,equipmentId);
 const original=eq.conveyorBearingSurvey||null;
 const fields={version:1,status:result.status,reportedCount:result.reportedCount,
  physicalCountConfirmed:result.physicalCountConfirmed,sourceReference:result.sourceReference,
  reason:result.reason,positions:copy(result.positions)};
 const compare=x=>JSON.stringify(x?{...x,reviewedAt:undefined}:x);
 if(compare(original)===compare(fields))return {changed:false,...result};
 eq.conveyorBearingSurvey={...fields,reviewedAt:new Date().toISOString()};
 return {changed:true,...result};
}
function verifiedPositions(db,equipment){
 const s=equipment?.conveyorBearingSurvey;
 if(!s?.physicalCountConfirmed||s.status!=='CONFIRMED')return[];
 const ids=new Set(sources(db,equipment).map(x=>String(x.id)));
 return list(s.positions).filter(x=>x.state==='serviceable'&&x.serviceAccessConfirmed&&
  clean(x.location)&&ids.has(String(x.bearingSourceId)));
}
API.sources=sources;API.reviewState=reviewState;API.preview=preview;API.commit=commit;
API.verifiedPositions=verifiedPositions;
})(window);
