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
function sourceRecord(database,source,id){return source==='equipment'?byId(database.equipment,id):byId(database.components,id)}
function sourceEquipment(database,source,record){return source==='equipment'?record:byId(database.equipment,record?.equipmentId)}
function isRotating(record,source){if(source==='equipment'&&/^(Шпиндели|Валы|Барабаны|Ролики|Оси)$/i.test(clean(record?.name)))return false;const type=source==='equipment'?(record?.maintenanceEquipmentType||record?.equipmentType):(record?.candidateEquipmentType);const template=source==='equipment'?record?.maintenanceTemplate:record?.candidateTemplate;return ROTATING_TYPES.has(type)||['rotating_arrangement','two_support_rotating','spindle','drum_review'].includes(template?.id)}
function evidence(database,equipment,record,source){
 const components=(database.components||[]).filter(c=>c.equipmentId===equipment.id&&c.status!=='retired');
 const bearingRe=/подшипник|подшипников(ый|ая)\s+узел|корпусн.*подшип|опора\s+вала|букса/i;
 const bearings=components.filter(c=>c.id!==record?.id&&((c.candidateCategory==='bearing'||c.candidateCategory==='linear_bearing')||bearingRe.test(c.name||''))).map(c=>({id:c.id,name:c.name,source:'component',equipmentId:c.equipmentId,category:c.candidateCategory||'bearing'}));
 const context=components.filter(c=>c.id!==record?.id&&!bearings.some(b=>b.id===c.id)&&(/вал|барабан|ролик|шпиндел|ось/i.test(c.name||'')||ROTATING_TYPES.has(c.candidateEquipmentType))).map(c=>({id:c.id,name:c.name,source:'component'}));
 const stored=(source==='equipment'?record?.rotatingArrangement:record?.rotatingArrangement)||null;
 return {bearings,context,stored,count:bearings.length};
}
function defaultSupportCount(ev){const saved=Number(ev?.stored?.supportCount||0);if(saved>=1&&saved<=6)return saved;const c=ev?.count||0;if(c>=1&&c<=4)return c===1?2:c;return 2}
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
 const count=Math.max(1,Math.min(6,Number(setup.supportCount)||2));
 const keep=new Set();
 for(let i=0;i<count;i++){
   const role=`rotating_support_${i+1}`;keep.add(role);const name=clean(setup.supports?.[i])||'';let c=database.components.find(x=>x.equipmentId===equipment.id&&x.manualRotatingRole===role)||null;
   if(!name){if(c)c.status='retired';continue}
   if(!c){c={id:nextId(),externalCode:'',equipmentId:equipment.id,parentEquipmentExternalCode:equipment.externalCode||'',name,manufacturer:'',componentType:'manual_rotating_support',status:'active',sourceFile:'',origin:'manual',manualRotatingRole:role};database.components.push(c)}
   Object.assign(c,{name,status:'active',candidateState:'candidate',candidateKind:'point',candidateCategory:'bearing',candidateEquipmentType:null,candidateConfidence:1,candidateLabel:'Подшипник',candidateReason:'Опора явно задана при ручном создании вращающегося узла',candidateClassifiedAt:now(),manualRotatingRole:role});
 }
 for(const c of database.components.filter(x=>x.equipmentId===equipment.id&&x.manualRotatingRole&&!keep.has(x.manualRotatingRole)))c.status='retired';
 equipment.manualRotatingSetup={version:'1.0.33.22',supportCount:count,supports:Array.from({length:count},(_,i)=>clean(setup.supports?.[i])||''),updatedAt:now()};
 return database.components.filter(x=>x.equipmentId===equipment.id&&x.manualRotatingRole&&x.status!=='retired');
}
function open(source,id){
 const database=db();const record=sourceRecord(database,source,id);const equipment=sourceEquipment(database,source,record);if(!record||!equipment||!isRotating(record,source)){global.LubricaApp?.showToast?.('Вращающийся узел не найден','error');return}
 const ev=evidence(database,equipment,record,source),dlg=document.getElementById('structureDialog');if(!dlg)return;
 const initial=defaultSupportCount(ev),type=source==='equipment'?(record.maintenanceEquipmentType||record.equipmentType):(record.candidateEquipmentType||'rotating_shaft');
 const typeLabel={rotating_shaft:'Вал / вращающийся узел',drum:'Барабан',roller:'Ролик',spindle:'Шпиндель',axis:'Ось'}[type]||'Вращающийся узел';
 dlg.classList.add('candidate-finalize-dialog');
 dlg.innerHTML=`<form method="dialog" class="structure-form"><div class="dialog-head"><div><span class="eyebrow">КОНСТРУКТОР ВРАЩАЮЩЕГОСЯ УЗЛА</span><h2>${esc(record.name||typeLabel)}</h2></div><button type="button" class="icon-btn" data-cancel>×</button></div><div class="candidate-finalize-context"><b>${esc(equipment.name)}</b><span>${esc(typeLabel)} · фактическая схема опор подтверждается инженером</span></div><div class="conveyor-arrangement-intro"><div><span class="eyebrow">ФАКТИЧЕСКАЯ КОНСТРУКЦИЯ</span><b>Не создаём виртуальные подшипники без подтверждения</b><p>Укажите реальное число обслуживаемых опор и назначьте найденный ТМЦ либо введите обозначение вручную. Название точки описывает физическое место, обозначение подшипника хранится отдельно.</p></div><div class="conveyor-evidence-grid"><section class="conveyor-evidence-card service"><header><b>Найденные подшипниковые ТМЦ</b><span>${ev.bearings.length}</span></header>${ev.bearings.length?`<div>${ev.bearings.slice(0,12).map(x=>`<p><strong>${esc(cleanTmcName(x.name))}</strong></p>`).join('')}</div>`:'<p class="conveyor-evidence-empty">Подшипниковые ТМЦ автоматически не найдены.</p>'}</section><section class="conveyor-evidence-card context"><header><b>Контекст конструкции</b><span>${ev.context.length}</span></header>${ev.context.length?`<div>${ev.context.slice(0,12).map(x=>`<p><strong>${esc(cleanTmcName(x.name))}</strong></p>`).join('')}</div>`:'<p class="conveyor-evidence-empty">Дополнительный контекст не найден.</p>'}</section></div></div><section class="conveyor-support-mapping"><div class="wizard-note"><b>Физические опоры</b><span>Для обычного вала предложены 2 опоры, но это только стартовое значение. Измените количество, если фактическая конструкция другая.</span></div><label class="candidate-point-category"><span>Количество обслуживаемых опор</span><select name="rot_support_count">${[1,2,3,4,5,6].map(n=>`<option value="${n}" ${n===initial?'selected':''}>${n}</option>`).join('')}</select></label><div class="conveyor-support-map-grid" data-rotating-supports>${supportRows(initial,ev.bearings,ev.stored)}</div></section><div class="wizard-note"><b>Имена точек</b><span>Для 2 опор создаются «Левая опора» и «Правая опора». Для 3 и более — «Опора 1», «Опора 2» и т.д. ТМЦ/обозначение не добавляется в название точки.</span></div><menu><button type="button" class="btn ghost" data-cancel>Отмена</button><button type="button" class="btn primary" data-save>Подтвердить конструкцию</button></menu></form>`;
 const form=dlg.querySelector('form'),host=form.querySelector('[data-rotating-supports]');
 const rerender=()=>{const count=Number(form.elements.rot_support_count.value)||2;host.innerHTML=supportRows(count,ev.bearings,ev.stored)};form.elements.rot_support_count.addEventListener('change',rerender);
 form.querySelectorAll('[data-cancel]').forEach(b=>b.onclick=()=>{dlg.classList.remove('candidate-finalize-dialog');dlg.close()});
 form.querySelector('[data-save]').onclick=()=>{
   const count=Number(form.elements.rot_support_count.value)||2,specs=[],supports=[];
   for(let i=0;i<count;i++){
     const selected=form.elements[`rot_bearing_${i}`]?.value||'',manual=clean(form.elements[`rot_manual_${i}`]?.value),ref=selected?ev.bearings.find(x=>String(x.id)===String(selected))||null:null;
     if(!ref&&!manual){global.LubricaApp?.showToast?.(`Укажите ТМЦ или обозначение для ${supportLabel(i,count)}. Если опора необслуживаемая, уменьшите количество обслуживаемых опор.`,'warn');form.elements[`rot_bearing_${i}`]?.focus();return}
     const location=supportLabel(i,count),sourceRef=ref||{source:'manual',id:`manual_${i}`,name:manual};
     specs.push({key:`rotating_support_${i+1}`,name:location,serviceLocationName:location,category:'bearing',position:location,activities:[{type:'regrease',label:'Досмазывание'}],selected:true,actual:!!ref,rotatingEvidence:true,sourceRef});
     supports.push({key:`support_${i+1}`,locationName:location,sourceRef:ref,manualDesignation:ref?'':manual});
   }
   const finalizer=global.LubricaCandidateFinalizer;if(!finalizer?.applyConfirmedSpecs){global.LubricaApp?.showToast?.('Модуль подтверждения точек не готов','error');return}
   const template={id:'rotating_arrangement',title:`${typeLabel}: подшипниковые опоры`};const applied=finalizer.applyConfirmedSpecs(database,source,record,equipment,template,specs);
   record.rotatingArrangement={version:'1.0.33.22',supportCount:count,supports,createdPointIds:applied.createdPointIds,confirmedAt:new Date().toISOString(),source:'engineer_confirmed_constructor'};
   for(const s of specs){const linked=s.sourceRef?.source==='component'?byId(database.components,s.sourceRef.id):null;if(linked){linked.candidateState='confirmed';linked.candidateReviewedAt=new Date().toISOString();}}
   Core.State.setDatabase(Core.Database.normalize(database));global.LubricaApp?.refreshFromCore?.();global.LubricaApp?.renderAll?.();global.LubricaStructure?.render?.();global.LubricaCandidates?.render?.();global.LubricaApp?.showToast?.(`Подтверждено опор: ${count}`);dlg.classList.remove('candidate-finalize-dialog');dlg.close();
 };
 dlg.showModal();
}
API.open=open;API.isRotating=isRotating;API.evidence=evidence;API.ensureManualComponents=ensureManualComponents;API.ROTATING_TYPES=ROTATING_TYPES;
})(window);
