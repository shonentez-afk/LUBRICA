(function(global){
'use strict';
const API=global.LubricaFanBearingArrangement=global.LubricaFanBearingArrangement||{};
const clean=v=>String(v??'').trim();
const norm=v=>clean(v).toLowerCase().replace(/ё/g,'е').replace(/[–—]/g,'-').replace(/\s+/g,' ');
const esc=v=>clean(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const FAN_RE=/(^|\s)(вентилятор|дымосос)(\s|$)/i;
const MOTOR_RE=/электродвиг|\bмотор\b|вибромотор/i;
const VFD_RE=/преобразователь\s+частот|частотн.*преобраз|\bпч\b|vfd/i;
const FAMILY_LABELS={SNL:'SKF SNL',ZLG:'SNR ZLG',TROESTER:'Tröster',OTHER:'Другое / OEM',UNKNOWN:'Не определено'};
const POSITION_LABELS={DRIVE_SIDE:'Со стороны привода',NON_DRIVE_SIDE:'С противоположной стороны привода',IMPELLER_SIDE:'Со стороны рабочего колеса',COUPLING_SIDE:'Со стороны муфты',BELT_SIDE:'Со стороны ременной передачи',CUSTOM:'Другое положение',UNKNOWN:'Положение не определено'};
function identifyAssets(db,equipment){
 const items=(db?.components||[]).filter(c=>c.equipmentId===equipment?.id&&c.status!=='retired');
 const fanCandidates=items.filter(c=>c.candidateEquipmentType==='fan'||(FAN_RE.test(c.name||'')&&!VFD_RE.test(c.name||'')));
 const motorCandidates=items.filter(c=>c.candidateEquipmentType==='motor'||(MOTOR_RE.test(c.name||'')&&!VFD_RE.test(c.name||'')));
 const fan=fanCandidates.find(c=>c.candidateEquipmentType==='fan')||fanCandidates[0]||null;
 const motor=motorCandidates.find(c=>c.candidateEquipmentType==='motor')||motorCandidates[0]||null;
 return {fan,motor,fanCandidates,motorCandidates};
}

function ensureManualAssets(db,equipment,{fanName='',motorName=''}={}){
 const result=identifyAssets(db,equipment);
 if(equipment?.origin!=='manual')return result;
 db.components=db.components||[];
 const upsert=(existing,name,role)=>{
   const cleaned=clean(name);
   if(!cleaned)return existing||null;
   let c=existing||null;
   if(!c){
     c={id:global.LubricaCore?.IDs?.nextFrom?.(db.components,'COMP',7)||`COMP-MANUAL-${Date.now()}`,externalCode:'',equipmentId:equipment.id,parentEquipmentExternalCode:equipment.externalCode||'',name:cleaned,manufacturer:'',componentType:`manual_${role}_asset`,status:'active',sourceFile:'',origin:'manual',candidateState:'equipment',candidateCategory:null,candidateEquipmentType:role,candidateConfidence:1,candidateLabel:role==='fan'?'Вентилятор':'Электродвигатель',candidateReason:'Ручной состав агрегата карты смазок',candidateClassifiedAt:new Date().toISOString()};
     db.components.push(c);
   }else{
     c.name=cleaned;c.equipmentId=equipment.id;c.status='active';c.origin=c.origin||'manual';c.componentType=c.componentType||`manual_${role}_asset`;c.candidateState='equipment';c.candidateEquipmentType=role;c.candidateConfidence=1;c.candidateLabel=role==='fan'?'Вентилятор':'Электродвигатель';c.candidateReason='Ручной состав агрегата карты смазок';c.candidateClassifiedAt=new Date().toISOString();
   }
   return c;
 };
 const fan=upsert(result.fan,fanName,'fan');
 const motor=upsert(result.motor,motorName,'motor');
 return identifyAssets(db,equipment);
}

function normalizeFamily(raw=''){
 const n=norm(raw).replace(/ö/g,'o');
 if(/\bsnl\b/.test(n))return'SNL';
 if(/(^|[^a-z0-9])zlg(?=\s|[-_/]?\d|$)/i.test(n))return'ZLG';
 if(/troster|tröster|\b3[123]\s*t\b.*\bl\b|\b3[123]\s*t\s*\d+\s*l/.test(n))return'TROESTER';
 if(!n)return'UNKNOWN';
 return'OTHER';
}
function defaultPortCount(family){return ['ZLG','TROESTER','TROESTER_31_33_TL'].includes(family)?2:null}
function shouldHideFanAsset(equipment){
 const a=equipment?.fanBearingArrangement;
 return !!(a&&a.driveType==='DIRECT_MOTOR_SHAFT'&&a.directOnMotorShaft===true&&a.bearingArrangementType==='NO_SEPARATE_FAN_BEARINGS');
}
function parseBearings(text=''){return clean(text).split(/[\n;,]+/).map(clean).filter(Boolean)}
function positionLabel(code,custom=''){return code==='CUSTOM'?(clean(custom)||'Другое положение'):(POSITION_LABELS[code]||'')}
function buildPortSpecs(arrangement){
 const out=[];
 for(const housing of arrangement.housings||[]){
   const count=Math.max(0,Number(housing.lubricationPortCount)||0);
   const pos=positionLabel(housing.position,housing.customPosition);
   for(let i=1;i<=count;i++){
     const raw=clean(housing.rawMarking)||FAMILY_LABELS[housing.family]||'Подшипниковый узел';
     const suffix=count>1?` ${i}`:'';
     out.push({
       key:`fan_port_${housing.id}_${i}`,
       groupKey:`fan_housing_${housing.id}`,
       name:`Маслёнка${suffix} — ${raw}${pos?` · ${pos}`:''}`,
       category:'bearing',position:pos,actions:['Досмазывание'],selected:true,
       fanLubrication:{arrangementId:arrangement.id,housingId:housing.id,portIndex:i,portCount:count,housingFamily:housing.family,rawHousingMarking:housing.rawMarking||'',lubricationZoneId:`${housing.id}:ZONE:${i}`,internalBearings:[...((housing.lubricationZones||[]).find(z=>z.portIndex===i)?.internalBearings||[])],zoneMappingConfirmed:!!((housing.lubricationZones||[]).find(z=>z.portIndex===i)?.internalBearings||[]).length,evidenceStatus:'CONFIRMED_USER'}
     });
   }
 }
 return out;
}
function readiness(arrangement){
 if(!arrangement)return {code:'UNCLASSIFIED',level:0,calculationAllowed:false,missing:['Конструкция вентилятора не определена']};
 if(arrangement.driveType==='DIRECT_MOTOR_SHAFT'&&arrangement.directOnMotorShaft)return {code:'NO_SEPARATE_FAN_BEARINGS',level:8,calculationAllowed:false,notApplicable:true,missing:[]};
 if(arrangement.driveType==='UNKNOWN')return {code:'NEEDS_CLARIFICATION',level:1,calculationAllowed:false,missing:['Тип привода']};
 if(arrangement.bearingArrangementType==='UNKNOWN')return {code:'NEEDS_CLARIFICATION',level:2,calculationAllowed:false,missing:['Схема подшипников вентилятора']};
 const housings=arrangement.housings||[];
 if(!housings.length)return {code:'NEEDS_CLARIFICATION',level:3,calculationAllowed:false,missing:['Фактический подшипниковый корпус/блок']};
 if(housings.some(h=>!Number(h.lubricationPortCount)))return {code:'NEEDS_CLARIFICATION',level:4,calculationAllowed:false,missing:['Количество фактических маслёнок']};
 if(housings.some(h=>!(h.internalBearings||[]).length))return {code:'NEEDS_CLARIFICATION',level:5,calculationAllowed:false,missing:['Обозначения внутренних подшипников']};
 if(housings.some(h=>(h.lubricationZones||[]).length!==Number(h.lubricationPortCount)||h.lubricationZones.some(z=>!(z.internalBearings||[]).length)))return {code:'NEEDS_CLARIFICATION',level:6,calculationAllowed:false,missing:['Связь каждой маслёнки с фактическими внутренними подшипниками / зоной смазки']};
 return {code:'OEM_METHOD_UNRESOLVED',level:7,calculationAllowed:false,missing:['OEM-методика узла / подтверждение расчётного источника']};
}
function familyOptions(selected){const current=selected==='TROESTER_31_33_TL'?'TROESTER':selected;return Object.entries(FAMILY_LABELS).map(([k,v])=>`<option value="${k}" ${k===current?'selected':''}>${esc(v)}</option>`).join('')}
function positionOptions(selected){return Object.entries(POSITION_LABELS).map(([k,v])=>`<option value="${k}" ${k===selected?'selected':''}>${esc(v)}</option>`).join('')}
function housingEditor(idx,prefix='support'){
 const isBlock=prefix==='block';
 const positionFields=isBlock?'':`<label><span>Положение</span><select name="position_${idx}">${positionOptions('UNKNOWN')}</select></label>
 <label><span>Свое обозначение положения</span><input name="customPosition_${idx}" placeholder="Заполняется только для «Другое»"></label>`;
 return `<div class="fan-arr-housing" data-housing="${idx}"><h4>${isBlock?'Совмещённый подшипниковый блок':`Опора ${idx+1}`}</h4>
 <div class="fan-arr-grid">
 <label><span>Семейство корпуса / блока</span><select name="family_${idx}">${familyOptions('UNKNOWN')}</select></label>
 <label><span>Фактическая маркировка</span><input name="marking_${idx}" placeholder="Например: SNL ..., ZLG317AK, Tröster 31 T 60 L-3R ..."></label>
 ${positionFields}
 <label><span>Количество фактических маслёнок</span><input type="number" min="1" max="12" name="ports_${idx}" placeholder="Подтвердите по узлу"></label>
 <label class="fan-arr-wide"><span>Внутренние подшипники (если известны)</span><textarea name="bearings_${idx}" rows="2" placeholder="По одному обозначению в строке. Если неизвестны — оставить пустым."></textarea></label>
 </div><div class="fan-arr-rule" data-rule="${idx}"></div><div class="fan-arr-zones" data-zones="${idx}"></div></div>`;
}
function renderArrangementFields(form,type){
 const host=form.querySelector('[data-arrangement-fields]');if(!host)return;
 if(type==='NO_SEPARATE_FAN_BEARINGS'){host.innerHTML='<div class="wizard-note"><b>Отдельные подшипники вентилятора не создаются.</b><span>Эта схема допустима только когда рабочее колесо фактически установлено непосредственно на валу электродвигателя. Подшипники двигателя обслуживаются в карточке двигателя.</span></div>';return}
 if(type==='TWO_SEPARATE_SUPPORTS')host.innerHTML=`${housingEditor(0)}${housingEditor(1)}`;
 else if(type==='MULTI_BEARING_BLOCK')host.innerHTML=housingEditor(0,'block');
 else host.innerHTML='<div class="wizard-note"><b>Конструкция сохраняется как неизвестная.</b><span>LUBRICA не создаст подшипники или маслёнки до фактического уточнения.</span></div>';
 bindFamilyRules(form);
}
function bindFamilyRules(form){
 form.querySelectorAll('[data-housing]').forEach(box=>{
   const i=box.dataset.housing,fam=form.elements[`family_${i}`],mark=form.elements[`marking_${i}`],ports=form.elements[`ports_${i}`],rule=box.querySelector(`[data-rule="${i}"]`),zones=box.querySelector(`[data-zones="${i}"]`);
   const renderZones=()=>{const count=Math.max(0,Number(ports.value)||0);const previous={};zones.querySelectorAll('textarea[data-zone-port]').forEach(x=>previous[x.dataset.zonePort]=x.value);zones.innerHTML=count?`<div class="fan-arr-zone-title">Связь маслёнок с внутренними подшипниками</div>${Array.from({length:count},(_,k)=>{const p=k+1;return `<label><span>Маслёнка ${p} обслуживает (только подтверждённые обозначения)</span><textarea data-zone-port="${p}" name="zoneBearings_${i}_${p}" rows="2" placeholder="По одному подшипнику в строке. Не знаете — оставьте пустым.">${esc(previous[p]||'')}</textarea></label>`}).join('')}`:''};
   const sync=()=>{let family=fam.value;if(family==='UNKNOWN'&&mark.value)family=normalizeFamily(mark.value);const fixed=defaultPortCount(family);if(fixed){ports.value=String(fixed);ports.readOnly=true;rule.textContent=`Для применяемого семейства ${FAMILY_LABELS[family]} в LUBRICA зафиксированы 2 фактические маслёнки.`}else{ports.readOnly=false;rule.textContent='Количество маслёнок не предполагается автоматически — подтвердите фактическое количество.'}renderZones()};
   fam.addEventListener('change',sync);mark.addEventListener('input',sync);ports.addEventListener('input',renderZones);sync();
 });
}
function collectArrangement(form,equipment,assets){
 const driveType=form.elements.driveType.value;
 const directOnMotorShaft=driveType==='DIRECT_MOTOR_SHAFT'&&form.elements.directOnMotorShaft?.checked;
 let bearingArrangementType=form.elements.arrangementType?.value||'UNKNOWN';
 if(directOnMotorShaft)bearingArrangementType='NO_SEPARATE_FAN_BEARINGS';
 const arrangement={id:`FANARR-${equipment.id}`,version:'1.0',fanPositionEquipmentId:equipment.id,fanAssetComponentId:assets.fan?.id||null,motorAssetComponentId:assets.motor?.id||null,fanRawDesignation:assets.fan?.name||'',motorRawDesignation:assets.motor?.name||'',driveType,directOnMotorShaft,bearingArrangementType,housings:[],evidenceStatus:'CONFIRMED_USER',updatedAt:new Date().toISOString()};
 const count=bearingArrangementType==='TWO_SEPARATE_SUPPORTS'?2:bearingArrangementType==='MULTI_BEARING_BLOCK'?1:0;
 for(let i=0;i<count;i++){
   let family=form.elements[`family_${i}`]?.value||'UNKNOWN';const rawMarking=clean(form.elements[`marking_${i}`]?.value);if(family==='UNKNOWN'&&rawMarking)family=normalizeFamily(rawMarking);
   const fixed=defaultPortCount(family);const portCount=fixed||Number(form.elements[`ports_${i}`]?.value)||0;
   const lubricationZones=[];for(let p=1;p<=portCount;p++)lubricationZones.push({id:`H${i+1}:ZONE:${p}`,portIndex:p,internalBearings:parseBearings(form.elements[`zoneBearings_${i}_${p}`]?.value),evidenceStatus:'CONFIRMED_USER'});
   const isIntegratedBlock=bearingArrangementType==='MULTI_BEARING_BLOCK';
   arrangement.housings.push({id:`H${i+1}`,family,rawMarking,position:isIntegratedBlock?'NOT_APPLICABLE':(form.elements[`position_${i}`]?.value||'UNKNOWN'),customPosition:isIntegratedBlock?'':clean(form.elements[`customPosition_${i}`]?.value),lubricationPortCount:portCount,internalBearings:parseBearings(form.elements[`bearings_${i}`]?.value),lubricationZones,evidenceStatus:'CONFIRMED_USER'});
 }
 arrangement.readiness=readiness(arrangement);return arrangement;
}
function open(equipmentId){
 const Core=global.LubricaCore,db=Core?.State?.getDatabase?.(),equipment=(db?.equipment||[]).find(e=>e.id===equipmentId);if(!equipment)return;
 const assets=identifyAssets(db,equipment),dlg=document.getElementById('structureDialog');if(!dlg)return;
 dlg.classList.add('candidate-finalize-dialog','fan-arrangement-dialog');
 dlg.innerHTML=`<form method="dialog" class="structure-form fan-arr-form"><div class="dialog-head"><div><span class="eyebrow">FAN BEARING ARRANGEMENT ENGINE</span><h2>${esc(equipment.externalCode||equipment.name)}</h2></div><button type="button" class="icon-btn" data-cancel>×</button></div>
 <div class="fan-arr-assets"><div><span>Позиция</span><b>${esc(equipment.externalCode||'—')} · ${esc(equipment.name)}</b></div><div><span>Сам вентилятор</span><b>${esc(assets.fan?.name||'Не распознан')}</b></div><div><span>Электродвигатель</span><b>${esc(assets.motor?.name||'Не распознан')}</b></div></div>
 ${equipment.origin==='manual'?`<div class="fan-arr-grid fan-arr-manual-assets"><label><span>Сам вентилятор — обозначение / модель</span><input name="manualFanAssetName" value="${esc(assets.fan?.name||'')}" placeholder="Например: Вентилятор E ..."></label><label><span>Электродвигатель — обозначение / модель</span><input name="manualMotorAssetName" value="${esc(assets.motor?.name||'')}" placeholder="Например: Электродвигатель M3AA ..."></label></div>`:''}
 <div class="wizard-note"><b>Контур карты смазок.</b><span>Мастер использует физический вентилятор, электродвигатель и фактическую механическую/подшипниковую схему.</span></div>
 <div class="fan-arr-grid"><label><span>Фактическая схема привода</span><select name="driveType"><option value="UNKNOWN">Не определена</option><option value="DIRECT_MOTOR_SHAFT">Прямой привод</option><option value="COUPLING_DRIVE">Через муфту</option><option value="BELT_DRIVE">Ременной привод</option><option value="GEAR_DRIVE">Через редуктор / передачу</option><option value="OTHER">Другая</option></select></label>
 <label class="fan-arr-direct hidden" data-direct-check><span>Подтверждение прямого привода</span><span class="fan-arr-check"><input type="checkbox" name="directOnMotorShaft"> Рабочее колесо установлено непосредственно на валу электродвигателя</span></label>
 <label data-arrangement-select><span>Фактическая схема подшипников вентилятора</span><select name="arrangementType"><option value="UNKNOWN">Не определена</option><option value="TWO_SEPARATE_SUPPORTS">Отдельный вал — две раздельные опоры</option><option value="MULTI_BEARING_BLOCK">Отдельный вал — совмещённый подшипниковый блок</option><option value="CUSTOM_SUPPORT_ARRANGEMENT">Другая конструкция / требует уточнения</option></select></label></div>
 <div data-arrangement-fields></div><div class="fan-arr-readiness" data-readiness></div>
 <menu><button type="button" class="btn ghost" data-cancel>Отмена</button><button type="button" class="btn primary" data-save>Сохранить фактическую конструкцию</button></menu></form>`;
 const form=dlg.querySelector('form'),drive=form.elements.driveType,arr=form.elements.arrangementType,directWrap=form.querySelector('[data-direct-check]'),arrWrap=form.querySelector('[data-arrangement-select]');
 const sync=()=>{const isDirect=drive.value==='DIRECT_MOTOR_SHAFT';directWrap.classList.toggle('hidden',!isDirect);const directConfirmed=isDirect&&form.elements.directOnMotorShaft.checked;arrWrap.classList.toggle('hidden',directConfirmed);renderArrangementFields(form,directConfirmed?'NO_SEPARATE_FAN_BEARINGS':arr.value);};
 drive.addEventListener('change',sync);arr.addEventListener('change',sync);form.elements.directOnMotorShaft.addEventListener('change',sync);sync();
 form.querySelectorAll('[data-cancel]').forEach(b=>b.onclick=()=>{dlg.classList.remove('candidate-finalize-dialog','fan-arrangement-dialog');dlg.close()});
 form.querySelector('[data-save]').onclick=()=>{
   const manualFanName=clean(form.elements.manualFanAssetName?.value||assets.fan?.name||'');
   const manualMotorName=clean(form.elements.manualMotorAssetName?.value||assets.motor?.name||'');
   const previewAssets={fan:assets.fan|| (manualFanName?{id:null,name:manualFanName}:null),motor:assets.motor||(manualMotorName?{id:null,name:manualMotorName}:null)};
   const preview=collectArrangement(form,equipment,previewAssets);
   if(preview.driveType==='DIRECT_MOTOR_SHAFT'&&!preview.directOnMotorShaft){global.LubricaApp?.showToast('Для прямого привода подтвердите, что рабочее колесо действительно находится на валу двигателя, либо выберите другую/неизвестную схему.','warn');return}
   if(preview.driveType==='DIRECT_MOTOR_SHAFT'&&preview.directOnMotorShaft&&!previewAssets.motor){global.LubricaApp?.showToast('Для прямого привода сначала укажите фактический электродвигатель. Без Motor Asset прямой привод подтверждать нельзя.','warn');return}
   if(equipment.origin==='manual'&&!previewAssets.fan){global.LubricaApp?.showToast('Для вручную созданного вентилятора укажите обозначение самого вентилятора. Оно будет сохранено как Fan Asset.','warn');return}
   for(const h of preview.housings){if(!h.rawMarking){global.LubricaApp?.showToast('Укажите фактическую маркировку каждого корпуса/блока. Если маркировка неизвестна, выберите «конструкция неизвестна» и уточните её до создания точек.','warn');return}if(!h.lubricationPortCount){global.LubricaApp?.showToast('Подтвердите фактическое количество маслёнок на каждом корпусе/блоке.','warn');return}}
   const persistedAssets=equipment.origin==='manual'?ensureManualAssets(db,equipment,{fanName:manualFanName,motorName:manualMotorName}):assets;
   const arrangement=collectArrangement(form,equipment,persistedAssets);
   equipment.fanBearingArrangement=arrangement;equipment.fanBearingArrangementStatus=arrangement.readiness.code;equipment.maintenanceReviewedAt=new Date().toISOString();
   const specs=buildPortSpecs(arrangement);global.LubricaCandidateFinalizer?.applyFanArrangement?.(db,equipment,specs,arrangement);
   Core.State.setDatabase(Core.Database.normalize(db));global.LubricaApp?.refreshFromCore?.();global.LubricaApp?.renderAll?.();global.LubricaStructure?.render?.();global.LubricaCandidates?.render?.();
   global.LubricaApp?.showToast?.(arrangement.readiness.notApplicable?'Конструкция подтверждена: отдельных подшипников вентилятора нет.':specs.length?`Конструкция сохранена. Фактических точек подачи смазки: ${specs.length}.`:'Конструкция сохранена без создания вымышленных точек.');dlg.classList.remove('candidate-finalize-dialog','fan-arrangement-dialog');dlg.close();
 };
 dlg.showModal();
}
API.identifyAssets=identifyAssets;API.ensureManualAssets=ensureManualAssets;API.normalizeFamily=normalizeFamily;API.defaultPortCount=defaultPortCount;API.shouldHideFanAsset=shouldHideFanAsset;API.buildPortSpecs=buildPortSpecs;API.readiness=readiness;API.collectArrangement=collectArrangement;API.open=open;API.FAMILY_LABELS=FAMILY_LABELS;API.POSITION_LABELS=POSITION_LABELS;
global.LubricaSystem?.registerModule?.('Fan Bearing Arrangement Engine','ok','Фактическая конструкция вентилятора без виртуальных опор');
})(window);
