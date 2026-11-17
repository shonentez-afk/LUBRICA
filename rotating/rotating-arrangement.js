(function(global){
'use strict';
const API=global.LubricaRotatingArrangement=global.LubricaRotatingArrangement||{};
const Core=global.LubricaCore;
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const clean=v=>String(v??'').trim();
const db=()=>Core?.State?.getDatabase?.();
const byId=(a,id)=>(a||[]).find(x=>x.id===id);
const cleanTmcName=v=>String(v??'').replace(/\s+Линия\s*№?\s*\d+\s*$/i,'').replace(/^Узел\s+подшипниковый\s+/i,'').replace(/^Подшипник\s+/i,'').replace(/\s{2,}/g,' ').trim();
const ROTATING_TYPES=new Set(['rotating_shaft','drum','roller','spindle','axis']);
const norm=x=>clean(x).toLowerCase().replace(/ё/g,'е').replace(/\s+/g,' ');
const sealedRe=/(?:2rs1?|2rsh|2rsl|2cs|2rz|2z|zz|llu)(?:\b|[-/])/i;
function outOfScope(d,e){
 const seen=new Set();while(e&&!seen.has(String(e.id))){
  if(/центрифуг|маслораспылител|маслян.*туман|охлаждени|охлажден/i.test(clean(e.name)))return true;
  seen.add(String(e.id));e=byId(d.equipment,e.parentEquipmentId);
 }
 return false;
}
function sourceRecord(database,source,id){return source==='equipment'?byId(database.equipment,id):byId(database.components,id)}
function sourceEquipment(database,source,record){return source==='equipment'?record:byId(database.equipment,record?.equipmentId)}
function isRotating(record,source){if(source==='equipment'&&/^(Шпиндели|Валы|Барабаны|Ролики|Оси)$/i.test(clean(record?.name)))return false;const type=source==='equipment'?(record?.maintenanceEquipmentType||record?.equipmentType):(record?.candidateEquipmentType);const template=source==='equipment'?record?.maintenanceTemplate:record?.candidateTemplate;return ROTATING_TYPES.has(type)||['rotating_arrangement','two_support_rotating','spindle','drum_review'].includes(template?.id)||(source==='component'&&/^(вал|ось|барабан|ролик)\s+/i.test(clean(record?.name)))}
function evidence(database,equipment,record,source){
 const components=(database.components||[]).filter(c=>c.equipmentId===equipment.id&&c.status!=='retired'&&!['excluded','rejected'].includes(c.candidateState));
 const bearingRe=/подшипник|подшипников(ый|ая)\s+узел|корпусн.*подшип|опора\s+вала|букса/i;
 const bearings=components.filter(c=>c.id!==record?.id&&(c.candidateCategory==='bearing'||(c.candidateCategory!=='linear_bearing'&&bearingRe.test(c.name||'')))).map(c=>({id:c.id,name:c.name,source:'component',equipmentId:c.equipmentId,category:'bearing',externalCode:c.externalCode||'',sealed:sealedRe.test(c.name||'')}));
 const context=components.filter(c=>c.id!==record?.id&&!bearings.some(b=>b.id===c.id)&&(/вал|барабан|ролик|шпиндел|ось/i.test(c.name||'')||ROTATING_TYPES.has(c.candidateEquipmentType))).map(c=>({id:c.id,name:c.name,source:'component'}));
 const stored=record?.rotatingArrangementSurvey||null;
 return {bearings,context,stored,count:bearings.length};
}
function defaultSupportCount(ev){const saved=Number(ev?.stored?.reportedCount||0);return Number.isInteger(saved)&&saved>0&&saved<=6?saved:0}
function supportLabel(i,count){if(count===1)return 'Опора';if(count===2)return i===0?'Левая опора':'Правая опора';return `Опора ${i+1}`}
function supportRows(count,bearings,stored){
 const prior=stored?.supports||[];
 return Array.from({length:count},(_,i)=>{const p=prior[i]||{},selected=p.sourceRef?.id||'',manual=p.manualDesignation||'';const opts=`<option value="">Не выбрано</option>${bearings.map(b=>`<option value="${esc(b.id)}" ${String(selected)===String(b.id)?'selected':''}>${esc(cleanTmcName(b.name))}</option>`).join('')}`;return `<div class="conveyor-support-assign rotating-support-row" data-rotating-support-row="${i}"><span>${esc(p.locationName||supportLabel(i,count))}</span><select name="rot_bearing_${i}">${opts}</select><input name="rot_manual_${i}" value="${esc(manual)}" placeholder="Или ввести обозначение вручную"></div>`}).join('')
}
function ensureManualComponents(database,equipment,setup={}){
 if(equipment?.origin!=='manual')return [];
 database.components=database.components||[];
 const now=()=>new Date().toISOString();
 const nextId=()=>global.LubricaCore?.IDs?.nextFrom?.(database.components,'COMP',7)||`COMP-MANUAL-${Date.now()}`;
 const count=Math.max(0,Math.min(6,Number(setup.supportCount)||0));
 const keep=new Set();
 for(let i=0;i<count;i++){
   const role=`rotating_support_${i+1}`;keep.add(role);const name=clean(setup.supports?.[i])||'';let c=database.components.find(x=>x.equipmentId===equipment.id&&x.manualRotatingRole===role)||null;
   if(!name){if(c&&!(database.lubricationPoints||[]).some(p=>p.componentBinding?.sourceComponentId===c.id))c.status='retired';continue}
   if(!c){c={id:nextId(),externalCode:'',equipmentId:equipment.id,parentEquipmentExternalCode:equipment.externalCode||'',name,manufacturer:'',componentType:'manual_rotating_support',status:'active',sourceFile:'',origin:'manual',manualRotatingRole:role};database.components.push(c)}
   Object.assign(c,{name,status:'active',candidateState:c.candidateState==='confirmed'?'confirmed':'review',candidateKind:'point',candidateCategory:'bearing',candidateEquipmentType:null,candidateConfidence:.65,candidateLabel:'Подшипник',candidateReason:'Обозначение введено вручную; физическая опора и доступ ещё требуют проверки',candidateClassifiedAt:now(),manualRotatingRole:role});
 }
 for(const c of database.components.filter(x=>x.equipmentId===equipment.id&&x.manualRotatingRole&&!keep.has(x.manualRotatingRole)))if(!(database.lubricationPoints||[]).some(p=>p.componentBinding?.sourceComponentId===c.id))c.status='retired';
 equipment.manualRotatingSetup={version:'1.0.33.79',supportCount:count,supports:Array.from({length:count},(_,i)=>clean(setup.supports?.[i])||''),updatedAt:now()};
 return database.components.filter(x=>x.equipmentId===equipment.id&&x.manualRotatingRole&&x.status!=='retired');
}
function physicalPositionId(site,i){return clean(site.positionId)||'support_'+(i+1)}
function linkedPointFor(d,componentId,location,originKey){
 return (d.lubricationPoints||[]).some(p=>{
  if(p.candidateOriginKey===originKey)return false;
  const bound=String(p.componentBinding?.sourceComponentId||p.installedComponent?.id||'')===String(componentId)||
    String(p.candidateOriginKey||'').startsWith('component:'+componentId+':');
  if(!bound)return false;
  const existing=norm(p.serviceLocationName||p.positionLabel||p.name);
  return !existing||existing===norm(location)||!String(p.candidateOriginKey||'').includes(':rotating_position_');
 });
}
function preview(d,source,id,input){
 const record=sourceRecord(d||{},source,id),equipment=sourceEquipment(d||{},source,record);
 const errors=[],warnings=[],sites=Array.isArray(input?.positions)?input.positions:[];
 if(!record||!equipment||!isRotating(record,source))return {allowed:false,errors:['Вал или вращающийся узел не найден'],warnings,selectedCount:0};
 if(outOfScope(d,equipment))return {allowed:false,errors:['Центрифуги и охлаждение исключены из конструктора'],warnings,selectedCount:0};
 const ev=evidence(d,equipment,record,source),raw=clean(input.reportedCount),count=raw===''?0:Number(raw);
 const confirmed=input.physicalCountConfirmed===true;
 if(!Number.isInteger(count)||count<0||count>6||sites.length>6)errors.push('Количество физических мест: от 0 до 6');
 if(confirmed&&(!count||sites.length!==count))errors.push('Подтвердите число и перечислите каждую фактическую опору');
 const ids=new Set(),locations=new Set();let selectedCount=0;
 for(const [i,site] of sites.entries()){
  const pid=physicalPositionId(site,i),location=clean(site.location),state=site.state||'review';
  if(ids.has(pid))errors.push('Повторён ID физической опоры '+pid);
  ids.add(pid);
  if(!['review','serviceable','not_serviceable'].includes(state))errors.push('Неизвестный статус места '+(i+1));
  if(location&&locations.has(norm(location)))errors.push('Физическое место повторяется: '+location);
  if(location)locations.add(norm(location));
  if(confirmed&&!location)errors.push('Укажите место опоры '+(i+1));
  if(state==='not_serviceable'&&!clean(input.sourceReference))errors.push('Нужен OEM/осмотр для подтверждения необслуживаемой опоры');
  if(state==='serviceable'){
   selectedCount++;
   if(!confirmed)errors.push('Количество и места ещё не подтверждены');
   if(!location)errors.push('Отсутствует расположение обслуживаемой опоры '+(i+1));
   if(site.serviceAccessConfirmed!==true)errors.push('Не подтверждён реальный канал подачи: '+(location||i+1));
   const ref=ev.bearings.find(b=>b.id===String(site.bearingSourceId||''));
   if(!ref)errors.push('Не указан исходный подшипниковый ТМЦ: '+(location||i+1));
   if(ref?.sealed)errors.push('Закрытый подшипник '+ref.name+': нужна специальная OEM-процедура, не обычная досмазка');
   if(ref&&linkedPointFor(d,ref.id,location,source+':'+id+':rotating_position_'+pid))
    errors.push('По этому ТМЦ уже существует совпадающая или неоднозначная физическая точка: '+location);
  }
 }
 if(selectedCount&&!clean(input.sourceReference))errors.push('Нужен источник фактической схемы: паспорт, фото или осмотр');
 if(!confirmed)warnings.push('Количество неизвестно или не подтверждено — сохраняется только черновик');
 if(!selectedCount)warnings.push('Ни одной новой точки смазки не будет');
 return {allowed:errors.length===0,errors,warnings,selectedCount,status:!confirmed?'REVIEW':selectedCount?'CONFIRMED':'COUNT_CONFIRMED_NO_SERVICE'};
}
function commit(source,id,input){
 const current=db();if(!current)return {ok:false,errors:['База не загружена']};
 const check=preview(current,source,id,input);if(!check.allowed)return {ok:false,...check};
 const d=Core?.DatabaseSchema?.clone?.(current)||JSON.parse(JSON.stringify(current));
 const record=sourceRecord(d,source,id),equipment=sourceEquipment(d,source,record);
 const positions=(input.positions||[]).map((site,i)=>({
  positionId:physicalPositionId(site,i),location:clean(site.location),state:site.state||'review',
  bearingSourceId:clean(site.bearingSourceId),serviceAccessConfirmed:site.serviceAccessConfirmed===true,
  notes:clean(site.notes)
 }));
 const originBase=source+':'+id+':rotating_position_';
 const priorPoints=(d.lubricationPoints||[]).filter(p=>String(p.candidateOriginKey||'').startsWith(originBase));
 for(const point of priorPoints){
  const positionId=String(point.candidateOriginKey).slice(originBase.length),site=positions.find(p=>p.positionId===positionId);
  if(!site||site.state!=='serviceable'||norm(site.location)!==norm(point.serviceLocationName||point.name)||
   clean(site.bearingSourceId)!==clean(point.componentBinding?.sourceComponentId||point.installedComponent?.id))
   return {ok:false,errors:['Подтверждённая опора уже имеет точку. Для изменения требуется отдельная инженерная миграция.']};
 }
 const sourceRef=clean(input.sourceReference),updatedAt=new Date().toISOString();
 record.rotatingArrangementSurvey={version:'1.0.33.79',reportedCount:clean(input.reportedCount)===''?'':Number(input.reportedCount),
  physicalCountConfirmed:input.physicalCountConfirmed===true,positions,
  sourceReference:sourceRef,reason:clean(input.reason),status:check.status,updatedAt};
 let applied={createdPointIds:[]};
 if(check.selectedCount){
  const f=global.LubricaCandidateFinalizer;
  if(typeof f?.applyConfirmedSpecs!=='function')return {ok:false,errors:['Штатный финализатор точек недоступен']};
  const selected=positions.filter(p=>p.state==='serviceable').map(p=>{
   const comp=byId(d.components,p.bearingSourceId);
   return {key:'rotating_position_'+p.positionId,name:p.location,serviceLocationName:p.location,
    category:'bearing',position:p.location,activities:[{type:'regrease',label:'Досмазывание'}],actual:true,
    sourceRef:{source:'component',id:comp.id,name:comp.name}};
  });
  applied=f.applyConfirmedSpecs(d,source,record,equipment,{id:'rotating_arrangement',title:'Физические подшипниковые опоры'},selected);
 }
 record.rotatingArrangement={...record.rotatingArrangement,version:'1.0.33.79',status:check.status,
  supportCount:check.selectedCount,supports:positions.map(x=>({positionId:x.positionId,locationName:x.location,state:x.state,
   sourceRef:x.bearingSourceId?{source:'component',id:x.bearingSourceId}:null,
   serviceAccessConfirmed:x.serviceAccessConfirmed})),sourceReference:sourceRef,
  createdPointIds:applied.createdPointIds||[],confirmedAt:check.selectedCount?updatedAt:null};
 Core.State.setDatabase(Core.Database?.normalize?.(d)||d);
 return {ok:true,status:check.status,createdPointIds:applied.createdPointIds||[],selectedCount:check.selectedCount};
}
function open(source,id){
 const d=db(),record=sourceRecord(d||{},source,id),equipment=sourceEquipment(d||{},source,record);
 if(!record||!equipment||!isRotating(record,source)||outOfScope(d,equipment)){
  global.LubricaApp?.showToast?.('Вращающийся узел недоступен или исключён','warn');return}
 const dlg=document.getElementById('structureDialog');if(!dlg)return;
 const ev=evidence(d,equipment,record,source),old=ev.stored||{},initial=defaultSupportCount(ev);
 const options='<option value="">Неизвестный подшипник — без точки</option>'+ev.bearings.map(b=>
  '<option value="'+esc(b.id)+'">'+esc(cleanTmcName(b.name))+' · '+esc(b.externalCode||b.id)+(b.sealed?' · закрытый':'')+'</option>').join('');
 dlg.classList.add('candidate-finalize-dialog');
 dlg.innerHTML='<form class="structure-form rotating-confirm-form"><div class="dialog-head"><div><span class="eyebrow">ВАЛЫ И ФИЗИЧЕСКИЕ ОПОРЫ</span><h2>'+esc(record.name)+'</h2></div><button type="button" class="icon-btn" data-cancel>×</button></div>'+
  '<div class="wizard-note"><b>'+esc(equipment.externalCode||'')+' · '+esc(equipment.name)+'</b><span>Два вала или одна модель подшипника не доказывают двух либо четырёх реальных опор. Подтвердите каждое обслуживаемое место.</span></div>'+
  '<div class="conveyor-evidence-grid"><section class="conveyor-evidence-card service"><header><b>Подшипники ТМЦ</b><span>'+ev.bearings.length+'</span></header>'+
  (ev.bearings.map(b=>'<p>'+esc(b.name)+' · '+esc(b.externalCode||b.id)+'</p>').join('')||'<p>Нет данных о подшипниках</p>')+'</section>'+
  '<section class="conveyor-evidence-card context"><header><b>Конструктивные ТМЦ</b><span>'+ev.context.length+'</span></header>'+
  (ev.context.map(c=>'<p>'+esc(c.name)+'</p>').join('')||'<p>Нет данных</p>')+'</section></div>'+
  '<label>Число опор<select name="rot_count">'+[0,1,2,3,4,5,6].map(n=>'<option value="'+n+'" '+(initial===n?'selected':'')+'>'+ (n===0?'Неизвестно':n+' — по осмотру или паспорту')+'</option>').join('')+'</select></label>'+
  '<label class="checkline"><input type="checkbox" name="rot_count_confirmed" '+(old.physicalCountConfirmed?'checked':'')+'> Реальное число и места подтверждены</label>'+
  '<div data-rot-rows></div><label>Осмотр / обоснование<textarea rows="2" name="rot_reason">'+esc(old.reason||'')+'</textarea></label>'+
  '<label>Источник (чертёж, фото, паспорт)<input name="rot_source" value="'+esc(old.sourceReference||'')+'"></label>'+
  '<div class="wizard-note" data-rot-result role="status" aria-live="polite">При неизвестном количестве сохраняется черновик без точек.</div>'+
  '<menu><button type="button" class="btn ghost" data-cancel>Отмена</button><button type="button" class="btn secondary" data-check>Проверить</button><button type="button" class="btn primary" data-save disabled>Сохранить конструкцию</button></menu></form>';
 const form=dlg.querySelector('form'),host=form.querySelector('[data-rot-rows]');let reviewed='';
 const invalidate=()=>{reviewed='';form.querySelector('[data-save]').disabled=true};
 const positions=()=>Array.from(host.children).map(el=>({positionId:el.dataset.positionId,
  location:el.querySelector('[name=location]').value,bearingSourceId:el.querySelector('[name=bearingSourceId]').value,
  state:el.querySelector('[name=state]').value,serviceAccessConfirmed:el.querySelector('[name=access]').checked}));
 function add(i,p={}){
  const el=document.createElement('article');el.className='rotating-physical-row';el.dataset.positionId=p.positionId||'support_'+(i+1);
  el.innerHTML='<b>Опора '+(i+1)+'</b><label>Физическое расположение<input name="location" value="'+esc(p.location||'')+'" placeholder="'+esc(supportLabel(i,Number(form.elements.rot_count.value)||2))+' — указать реальное место"></label>'+
   '<label>Исходный подшипник<select name="bearingSourceId">'+options+'</select></label>'+
   '<label>Статус<select name="state"><option value="review">Требуется уточнение</option><option value="serviceable">Обслуживаемая опора</option><option value="not_serviceable">Не обслуживается — по источнику</option></select></label>'+
   '<label class="checkline"><input type="checkbox" name="access"> Физически подтверждены маслёнка/канал и доступ</label>';
  el.querySelector('[name=bearingSourceId]').value=p.bearingSourceId||'';
  el.querySelector('[name=state]').value=p.state||'review';
  el.querySelector('[name=access]').checked=p.serviceAccessConfirmed===true;
  el.querySelectorAll('input,select').forEach(x=>{x.addEventListener('input',invalidate);x.addEventListener('change',invalidate)});
  host.appendChild(el);
 }
 function draw(){const prev=positions();host.innerHTML='';const count=Number(form.elements.rot_count.value)||0;
  for(let i=0;i<count;i++)add(i,prev[i]||old.positions?.[i]||{});invalidate()}
 const payload=()=>({reportedCount:form.elements.rot_count.value==='0'?'':form.elements.rot_count.value,
  physicalCountConfirmed:form.elements.rot_count_confirmed.checked,reason:form.elements.rot_reason.value,
  sourceReference:form.elements.rot_source.value,positions:positions()});
 form.elements.rot_count.addEventListener('change',draw);
 form.querySelectorAll('[data-cancel]').forEach(b=>b.onclick=()=>{dlg.classList.remove('candidate-finalize-dialog');dlg.close()});
 for(const e of form.querySelectorAll('textarea,input'))e.addEventListener('input',invalidate);
 form.querySelector('[data-check]').onclick=()=>{
  const input=payload(),result=preview(Core.State.getDatabase(),source,id,input);
  form.querySelector('[data-rot-result]').innerHTML='<b>'+esc(result.allowed?'Проверка пройдена: '+result.status:'Есть ошибки')+'</b><p>Обслуживаемых мест: '+result.selectedCount+'</p>'+result.errors.concat(result.warnings).map(x=>'<p>'+esc(x)+'</p>').join('');
  reviewed=result.allowed?JSON.stringify(input):'';form.querySelector('[data-save]').disabled=!result.allowed;
 };
 form.querySelector('[data-save]').onclick=()=>{
  const input=payload();if(!reviewed||reviewed!==JSON.stringify(input)){global.LubricaApp?.showToast?.('После изменения полей повторите проверку','warn');return}
  const result=commit(source,id,input);
  if(!result.ok){global.LubricaApp?.showToast?.(result.errors?.join('; ')||'Ошибка','warn');return}
  global.LubricaApp?.refreshFromCore?.();global.LubricaApp?.renderAll?.();global.LubricaStructure?.render?.();global.LubricaCandidates?.render?.();
  global.LubricaApp?.showToast?.(result.selectedCount?'Сохранены только проверенные опоры; новые мероприятия в review':'Сохранён черновик без новых точек');
  dlg.classList.remove('candidate-finalize-dialog');dlg.close();
 };
 draw();dlg.showModal();
}
API.open=open;API.isRotating=isRotating;API.evidence=evidence;API.defaultSupportCount=defaultSupportCount;
API.preview=preview;API.commit=commit;API.outOfScope=outOfScope;
API.ensureManualComponents=ensureManualComponents;API.ROTATING_TYPES=ROTATING_TYPES;
})(window);
