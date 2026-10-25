(function(global){
'use strict';
const API=global.LubricaOscillatingLinkageArrangement=global.LubricaOscillatingLinkageArrangement||{};
const Core=global.LubricaCore;
const clean=v=>String(v??'').trim();
const norm=v=>clean(v).toLowerCase().replace(/ё/g,'е').replace(/[–—]/g,'-').replace(/\s+/g,' ');
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const db=()=>Core?.State?.getDatabase?.();
const byId=(a,id)=>(a||[]).find(x=>String(x.id)===String(id));
const ROLE_LABELS=Object.freeze({
 oscillating_system:'Система качания',crank_linkage:'Кривошипно-шатунный механизм',connecting_rod:'Шатун',link_rod:'Тяга',pivot_shaft:'Ось вращения',compensator:'Компенсатор',support_bracket:'Кронштейн',lever:'Рычаг',rocker:'Коромысло',eccentric:'Эксцентрик',pin:'Палец',other:'Элемент механизма'
});
const CONNECTION_TYPES=Object.freeze({
 unknown:{label:'Требует уточнения',category:null},bearing:{label:'Подшипник качения',category:'bearing',needsDesignation:true},housed_bearing:{label:'UC/UK корпусный узел',category:'bearing',needsDesignation:true},snl:{label:'SKF SNL + внутренний подшипник',category:'bearing',needsDesignation:true},snh:{label:'SKF SNH + внутренний подшипник',category:'bearing',needsDesignation:true},plain_bearing:{label:'Подшипник скольжения',category:'bushing'},bushing:{label:'Втулка',category:'bushing'},grease_pin:{label:'Палец со смазкой',category:'joint'},spherical_joint:{label:'Сферический шарнирный подшипник',category:'joint'},rod_end:{label:'Шарнирная головка',category:'joint'},joint:{label:'Шарнир',category:'joint'},guide:{label:'Направляющая',category:'guide'},other:{label:'Другая подтверждённая пара',category:'other'},non_serviceable:{label:'Необслуживаемый',category:null},no_connection:{label:'Нет соединения',category:null},none:{label:'Необслуживаемый (legacy)',category:null,legacy:true}
});
function normalizeConnectionType(v){return v==='none'?'non_serviceable':(v||'unknown')}
function lineToken(v){const m=clean(v).match(/линия\s*№?\s*(\d+)/i);return m?m[1]:''}
function sideOf(v){const n=norm(v);if(/(^|\s)(левый|левая|левое|лев)(\s|$)/.test(n))return'left';if(/(^|\s)(правый|правая|правое|прав)(\s|$)/.test(n))return'right';return'unknown'}
function roleOf(v){
 const n=norm(v);
 if(/система\s+качания|механизм\s+качания/.test(n))return'oscillating_system';
 if(/кривошипно[- ]шатун|\bкшм\b|^кривошип\b/.test(n))return'crank_linkage';
 if(/(^|\s)шатун(\s|$)/.test(n))return'connecting_rod';
 if(/(^|\s)ось\s+вращения(\s|$)|^поворотн.*ось/.test(n))return'pivot_shaft';
 if(/(^|\s)тяга(\s|$)/.test(n)&&!/тягов.*цеп|цеп.*тягов/.test(n))return'link_rod';
 if(/^компенсатор(?:\s|$)/.test(n)&&!/тканев|сильфон|газоход|dn\s*\d|\d+x\d/.test(n))return'compensator';
 if(/^кронштейн(?:\s|$)/.test(n)&&(/лев|прав/.test(n)||n==='кронштейн'))return'support_bracket';
 if(/(^|\s)коромысл(о|а)(\s|$)/.test(n))return'rocker';
 if(/(^|\s)рычаг(\s|$)/.test(n))return'lever';
 if(/(^|\s)эксцентрик(\s|$)/.test(n))return'eccentric';
 if(/^палец(?:\s|$)/.test(n))return'pin';
 return null;
}
function isSealedBearingMarking(v){return /(?:^|[^A-Z0-9])(?:2RS1?|2RSH|2CS5?|2CS2|2Z|ZZ|DDU|VV)(?:[^A-Z0-9]|$)/i.test(String(v||''))}
function housingFamilyMarking(v){const t=String(v||'');if(/\b(?:F?SNL|F?SE)\s*[-_]?\s*\d{3}/i.test(t))return'SNL';if(/\bSNH\s*[-_]?\s*\d{3}/i.test(t))return'SNH';return''}
function isServiceComponent(c){const name=String(c?.name||'');if(['excluded','rejected'].includes(String(c?.candidateState||''))||/\b(?:TOLLOK\s+)?TLK\s*400\b|втулк.*\bTLK\s*400\b/i.test(name))return false;const cat=c?.candidateCategory||'';if(['bearing','linear_bearing','bushing','joint','guide'].includes(cat))return true;return /подшипник|подшипников.*узел|\buc[pflta]?\s*\d|\buk\w*\s*\d|\b(?:snl|snh)\s*\d|втулк|шарнир|шарнирн.*голов|палец.*смаз|сферическ.*шарнир/i.test(name)}
function descendants(database,root){const out=[],queue=[root.id],seen=new Set(queue);while(queue.length){const p=queue.shift();for(const e of (database.equipment||[])){if(String(e.parentEquipmentId||'')!==String(p)||seen.has(e.id))continue;seen.add(e.id);out.push(e);queue.push(e.id)}}return out}
function oscillatingRoots(database){return (database.equipment||[]).filter(e=>(e.maintenanceEquipmentType==='oscillating_mechanism'||e.equipmentType==='oscillating_mechanism'||roleOf(e.name)==='oscillating_system')&&e.status!=='retired')}
function rootForEquipment(database,equipment){
 if(!equipment)return null;if(roleOf(equipment.name)==='oscillating_system'||equipment.maintenanceEquipmentType==='oscillating_mechanism'||equipment.equipmentType==='oscillating_mechanism')return equipment;
 let cur=equipment,guard=0;while(cur?.parentEquipmentId&&guard++<20){cur=byId(database.equipment,cur.parentEquipmentId);if(cur&&(roleOf(cur.name)==='oscillating_system'||cur.maintenanceEquipmentType==='oscillating_mechanism'||cur.equipmentType==='oscillating_mechanism'))return cur;}
 const roots=oscillatingRoots(database).filter(r=>(!equipment.areaId||!r.areaId||String(r.areaId)===String(equipment.areaId))&&(!equipment.lineId||!r.lineId||String(r.lineId)===String(equipment.lineId)));
 const tok=lineToken(equipment.name);if(tok){const exact=roots.find(r=>lineToken(r.name)===tok);if(exact)return exact}
 const parentId=clean(equipment.parentEquipmentId);
 const siblings=parentId?roots.filter(r=>String(r.parentEquipmentId||'')===String(parentId)):[];
 return siblings.length===1?siblings[0]:null;
}
function rootForRecord(database,record,source='equipment'){
 if(!record)return null;
 if(source==='equipment'){
  const explicitRootId=record.oscillatingContextRootId||record.maintenanceTemplate?.oscillatingContextRootId||null;
  if(explicitRootId)return byId(database.equipment,explicitRootId)||null;
  const role=roleOf(record.name)||record.maintenanceMechanismRole||record.maintenanceTemplate?.oscillatingRole||null;
  if(role==='oscillating_system'||record.maintenanceEquipmentType==='oscillating_mechanism'||record.equipmentType==='oscillating_mechanism')return rootForEquipment(database,record);
  if(!role)return null;
  return rootForEquipment(database,record);
 }
 const equipment=byId(database.equipment,record.equipmentId);if(!equipment)return null;
 const explicitRootId=record.oscillatingContextRootId||equipment.oscillatingContextRootId||null;
 if(explicitRootId)return byId(database.equipment,explicitRootId)||null;
 const componentRole=roleOf(record.name)||record.manualOscillatingRole||record.oscillatingRoleOverride||null;
 const ownerRole=roleOf(equipment.name)||equipment.maintenanceMechanismRole||equipment.maintenanceTemplate?.oscillatingRole||null;
 if(!componentRole&&!ownerRole&&equipment.maintenanceEquipmentType!=='oscillating_mechanism'&&equipment.equipmentType!=='oscillating_mechanism')return null;
 return rootForEquipment(database,equipment);
}
function defaultConnections(role){
 const mk=(key,label)=>({key,label,type:'unknown',componentId:'',manualDesignation:''});
 if(role==='connecting_rod'||role==='link_rod')return[mk('a','Шарнир A'),mk('b','Шарнир B')];
 if(role==='pivot_shaft')return[mk('a','Опора A'),mk('b','Опора B')];
 if(role==='compensator')return[mk('a','Шарнир / направляющая')];
 if(role==='support_bracket')return[mk('a','Обслуживаемый элемент')];
 if(role==='pin')return[mk('a','Пара трения')];
 if(['lever','rocker','eccentric'].includes(role))return[mk('a','Соединение 1')];
 if(role==='crank_linkage')return[];
 return[];
}
function relatedEquipment(database,root){
 const desc=descendants(database,root),ids=new Set(desc.map(x=>x.id));
 const tok=lineToken(root.name);
 const lineCompatible=e=>(!root.lineId||!e.lineId||String(e.lineId)===String(root.lineId))&&(!tok||!lineToken(e.name)||lineToken(e.name)===tok);
 const rootParentId=clean(root.parentEquipmentId);
 const sameParent=rootParentId?(database.equipment||[]).filter(e=>e.id!==root.id&&!ids.has(e.id)&&String(e.parentEquipmentId||'')===String(rootParentId)&&lineCompatible(e)&&roleOf(e.name)&&roleOf(e.name)!=='oscillating_system'):[];
 const sameArea=(database.equipment||[]).filter(e=>e.id!==root.id&&!ids.has(e.id)&&!sameParent.includes(e)&&String(e.areaId||'')===String(root.areaId||'')&&lineCompatible(e)&&((e.oscillatingContextRootId&&String(e.oscillatingContextRootId)===String(root.id))||(lineToken(e.name)&&lineToken(root.name)&&lineToken(e.name)===lineToken(root.name)))&&roleOf(e.name)&&roleOf(e.name)!=='oscillating_system');
 return [root,...desc,...sameParent,...sameArea];
}
function evidence(database,root){
 const eqs=relatedEquipment(database,root),eqIds=new Set(eqs.map(x=>x.id));const elements=[];
 for(const e of eqs){const role=e.oscillatingRoleOverride||roleOf(e.name);if(!role||role==='oscillating_system')continue;elements.push({key:`equipment_${e.id}`,source:'equipment',id:e.id,equipmentId:e.id,name:e.name,role,side:e.oscillatingSideOverride||sideOf(e.name),externalCode:e.externalCode||'',componentId:null,rawDesignation:e.model||''});}
 for(const c of (database.components||[]).filter(c=>eqIds.has(c.equipmentId)&&c.status!=='retired')){const role=c.oscillatingRoleOverride||c.manualOscillatingRole||roleOf(c.name);if(!role||role==='oscillating_system'||isServiceComponent(c))continue;elements.push({key:c.manualOscillatingKey||`component_${c.id}`,source:'component',id:c.id,equipmentId:c.equipmentId,name:c.name,role,side:c.oscillatingSideOverride||c.manualOscillatingSide||sideOf(c.name),externalCode:c.externalCode||'',componentId:c.id,rawDesignation:c.name||'',removableManual:c.origin==='manual'&&c.componentType==='manual_oscillating_element'&&!!c.manualOscillatingKey});}
 const seen=new Set(),unique=elements.filter(x=>{const k=`${x.source}:${x.id}`;if(seen.has(k))return false;seen.add(k);return true});
 const service=(database.components||[]).filter(c=>eqIds.has(c.equipmentId)&&c.status!=='retired'&&isServiceComponent(c)).map(c=>({id:c.id,name:c.name,equipmentId:c.equipmentId,externalCode:c.externalCode||'',category:c.candidateCategory||'',state:c.candidateState||'',source:'component',side:sideOf(c.name),sealed:isSealedBearingMarking(c.name),housingFamily:housingFamilyMarking(c.name)}));
 return {root,equipmentIds:[...eqIds],elements:unique,serviceComponents:service,counts:unique.reduce((a,x)=>(a[x.role]=(a[x.role]||0)+1,a),{}),unresolved:unique.length===0};
}
function savedMap(root){const arr=root?.oscillatingArrangement?.elements||[];return new Map(arr.map(x=>[x.key,x]))}
function mergeDraft(ev){const prior=savedMap(ev.root);return ev.elements.map(x=>{const p=prior.get(x.key)||{};return {...x,role:p.role||x.role,side:p.side||x.side,connections:(p.connections&&p.connections.length?p.connections:defaultConnections(p.role||x.role)).map(c=>({...c,type:normalizeConnectionType(c.type)}))}})}
function cleanDisplayName(v){return clean(v).replace(/\s+Линия\s*№?\s*\d+\s*$/i,'').replace(/\s{2,}/g,' ')}
function sideLabel(s){return s==='left'?'Левая':s==='right'?'Правая':'Не определена'}
function roleOptions(selected){return Object.entries(ROLE_LABELS).filter(([k])=>k!=='oscillating_system').map(([k,l])=>`<option value="${k}" ${k===selected?'selected':''}>${esc(l)}</option>`).join('')}
function sideOptions(selected){return [['left','Левая'],['right','Правая'],['unknown','Не определена']].map(([k,l])=>`<option value="${k}" ${k===selected?'selected':''}>${l}</option>`).join('')}
function typeOptions(selected){selected=normalizeConnectionType(selected);return Object.entries(CONNECTION_TYPES).filter(([,v])=>!v.legacy).map(([k,v])=>`<option value="${k}" ${k===selected?'selected':''}>${esc(v.label)}</option>`).join('')}
function candidateOptions(service,element,selected){
 const same=service.filter(c=>String(c.equipmentId)===String(element.equipmentId));const side=element.side==='unknown'?[]:service.filter(c=>c.side===element.side&&!same.includes(c));const rest=service.filter(c=>!same.includes(c)&&!side.includes(c));const ordered=[...same,...side,...rest];
 return `<option value="">Не привязан</option>${ordered.map(c=>`<option value="${esc(c.id)}" ${String(c.id)===String(selected||'')?'selected':''}>${esc(cleanDisplayName(c.name))}${c.sealed?' · закрытый / проверить обслуживаемость':''}${c.housingFamily?` · корпус ${c.housingFamily}`:''}</option>`).join('')}`;
}
function renderConnection(element,conn,idx,service){return `<div class="oscillating-connection-row" data-connection-key="${esc(conn.key)}"><label><span>Место обслуживания</span><input data-conn-label value="${esc(conn.label||`Соединение ${idx+1}`)}"></label><label><span>Фактическая конструкция</span><select data-conn-type>${typeOptions(conn.type||'unknown')}</select></label><label><span>Найденный ТМЦ</span><select data-conn-component>${candidateOptions(service,element,conn.componentId)}</select></label><label><span>Маркировка / уточнение</span><input data-conn-manual value="${esc(conn.manualDesignation||'')}" placeholder="Не придумывать; оставить пустым, если неизвестно"></label><button type="button" class="btn ghost oscillating-remove-connection" data-remove-connection title="Удалить соединение">×</button></div>`}
function renderElement(element,service,index){return `<section class="oscillating-element-card" data-element-index="${index}"><header><div><span class="eyebrow">ЭЛЕМЕНТ МЕХАНИЗМА</span><b>${esc(cleanDisplayName(element.name||'Новый элемент'))}</b><small>${esc(ROLE_LABELS[element.role]||element.role)} · ${esc(sideLabel(element.side))}</small></div>${(element.manualDraft||element.removableManual)?'<button type="button" class="btn ghost danger" data-remove-element>Удалить</button>':''}</header><div class="oscillating-element-meta"><label><span>Название</span><input data-element-name value="${esc(element.name||'')}"></label><label><span>Роль</span><select data-element-role>${roleOptions(element.role)}</select></label><label><span>Сторона</span><select data-element-side>${sideOptions(element.side)}</select></label></div><div class="oscillating-connections" data-connections>${(element.connections||[]).map((c,i)=>renderConnection(element,c,i,service)).join('')}</div><button type="button" class="btn ghost" data-add-connection>＋ Добавить соединение</button>${!(element.connections||[]).length?'<div class="wizard-note"><b>Соединения не заданы.</b><span>Для КШМ и нестандартных механизмов количество соединений не зашивается. Добавьте только фактически подтверждённые места.</span></div>':''}</section>`}
function summarizeCounts(ev){const order=['crank_linkage','connecting_rod','link_rod','pivot_shaft','compensator','support_bracket','lever','rocker','eccentric','pin'];const bits=order.filter(k=>ev.counts[k]).map(k=>`${ROLE_LABELS[k]}: ${ev.counts[k]}`);return bits.length?bits.join(' · '):'Связанные элементы автоматически не найдены.'}
function pointName(element,conn){const base=cleanDisplayName(element.name)||ROLE_LABELS[element.role]||'Элемент';let loc=clean(conn.label)||'соединение';if(element.role==='connecting_rod'||element.role==='link_rod')loc=loc.replace(/^Шарнир/i,'шарнир');else if(element.role==='pivot_shaft')loc=loc.replace(/^Опора/i,'опора');return `${base} · ${loc}`}
function activityFor(category){if(category==='guide'||category==='other')return[{type:'lubrication_service',label:'Смазочное обслуживание'}];return[{type:'regrease',label:'Досмазывание'}]}
function housingForBearing(database,ref,family){if(!ref||!family)return null;const re=family==='SNH'?/\bSNH\s*[-_]?\s*\d{3}/i:/\b(?:F?SNL|F?SE)\s*[-_]?\s*\d{3}/i;const rows=(database.components||[]).filter(c=>String(c.equipmentId||'')===String(ref.equipmentId||'')&&c.status!=='retired'&&!['excluded','rejected'].includes(String(c.candidateState||''))&&re.test(String(c.name||'')));return rows.length===1?rows[0]:null}
function manualHousingMarking(v,family){const re=family==='SNH'?/\bSNH\s*[-_]?\s*\d{3}(?:\s*[A-Z]{1,3})?/i:/\b(?:F?SNL|F?SE)\s*[-_]?\s*\d{3}(?:-\d{3})?/i;return (String(v||'').match(re)||[])[0]||''}
function validateAndBuild(database,root,draft,service){
 const specs=[],unresolved=[];let noPointConfirmed=0;
 for(const el of draft){for(const conn of (el.connections||[])){
  const type=normalizeConnectionType(conn.type),def=CONNECTION_TYPES[type]||CONNECTION_TYPES.unknown;conn.type=type;
  if(!def.category){if(type==='unknown')unresolved.push(`${cleanDisplayName(el.name)} · ${clean(conn.label)||'соединение'}`);else noPointConfirmed++;continue}
  const ref=conn.componentId?byId(database.components,conn.componentId):null,manual=clean(conn.manualDesignation);
  if(ref&&['excluded','rejected'].includes(String(ref.candidateState||''))){unresolved.push(`${cleanDisplayName(el.name)} · ${clean(conn.label)||'соединение'}: выбранный ТМЦ исключён из смазочного домена`);continue}
  if(def.needsDesignation&&!ref&&!manual){unresolved.push(`${cleanDisplayName(el.name)} · ${clean(conn.label)||'соединение'}: требуется фактическое обозначение/ТМЦ`);continue}
  const selectedBearingMarking=clean(ref?.name||manual);
  if(def.category==='bearing'&&selectedBearingMarking&&isSealedBearingMarking(selectedBearingMarking)){unresolved.push(`${cleanDisplayName(el.name)} · ${clean(conn.label)||'соединение'}: ${cleanDisplayName(selectedBearingMarking)} — закрытое исполнение; плановое досмазывание не создаётся без отдельного OEM-подтверждения`);continue}
  const housingFamily=type==='snh'?'SNH':type==='snl'?'SNL':'';
  const selectedHousingFamily=ref?housingFamilyMarking(ref.name):'';
  if(selectedHousingFamily&&!housingFamily){unresolved.push(`${cleanDisplayName(el.name)} · ${clean(conn.label)||'соединение'}: выбран корпус ${selectedHousingFamily}; выберите тип корпусной опоры и фактический внутренний подшипник`);continue}
  if(housingFamily&&ref&&housingFamilyMarking(ref.name)===housingFamily){unresolved.push(`${cleanDisplayName(el.name)} · ${clean(conn.label)||'соединение'}: выбран корпус ${housingFamily}; выберите фактический внутренний подшипник`);continue}
  const housingRef=housingFamily&&ref?housingForBearing(database,ref,housingFamily):null;
  const housingManual=housingFamily?manualHousingMarking(manual,housingFamily):'';
  if(housingFamily&&!housingRef&&!housingManual){unresolved.push(`${cleanDisplayName(el.name)} · ${clean(conn.label)||'соединение'}: корпус ${housingFamily} не подтверждён рядом с выбранным подшипником`);continue}
  const key=`osc_${String(el.key).replace(/[^a-zA-Z0-9_-]+/g,'_')}_${String(conn.key).replace(/[^a-zA-Z0-9_-]+/g,'_')}`,name=pointName(el,conn);
  specs.push({key,groupKey:`osc_group_${String(el.key).replace(/[^a-zA-Z0-9_-]+/g,'_')}`,name,serviceLocationName:name,category:def.category,position:clean(conn.label),activities:activityFor(def.category),selected:true,sourceRef:ref?{id:ref.id,name:ref.name,source:'component',equipmentId:ref.equipmentId}:manual?{id:`manual_${key}`,name:manual,source:'manual'}:null,manualDesignation:manual,housingRef:housingRef?{id:housingRef.id,name:housingRef.name,source:'component',equipmentId:housingRef.equipmentId}:null,housingFamily,housingManual,oscillatingEvidence:true,oscillatingElementKey:el.key,connectionType:type});
 }}
 return {specs,unresolved,noPointConfirmed};
}

function oscillatingPointOrigin(rootId,spec){return `equipment:${rootId}:${spec.key}`}
function syncGeneratedArtifacts(database,root,specs){
 const base=`equipment:${root.id}:osc_`,expected=new Set((specs||[]).map(s=>oscillatingPointOrigin(root.id,s)));
 const stale=(database.lubricationPoints||[]).filter(p=>String(p.candidateOriginKey||'').startsWith(base)&&!expected.has(String(p.candidateOriginKey||'')));
 const stalePointIds=new Set(stale.map(p=>String(p.id))),staleTaskIds=new Set((database.tasks||[]).filter(t=>stalePointIds.has(String(t.lubricationPointId))||stale.some(p=>String(t.candidateOriginKey||'').startsWith(`${p.candidateOriginKey}|`))).map(t=>String(t.id)));
 if(staleTaskIds.size){for(const r of (database.routes||[])){if(Array.isArray(r.taskIds))r.taskIds=r.taskIds.filter(id=>!staleTaskIds.has(String(id)));}}
 database.tasks=(database.tasks||[]).filter(t=>!staleTaskIds.has(String(t.id))&&!stalePointIds.has(String(t.lubricationPointId)));
 database.lubricationPoints=(database.lubricationPoints||[]).filter(p=>!stalePointIds.has(String(p.id)));
 const liveNodeIds=new Set((database.lubricationPoints||[]).map(p=>String(p.nodeId||'')).filter(Boolean));
 database.nodes=(database.nodes||[]).filter(n=>!String(n.candidateOriginKey||'').startsWith(`equipment:${root.id}:osc_group_`)||liveNodeIds.has(String(n.id)));
 const livePointIds=new Set((database.lubricationPoints||[]).map(p=>String(p.id)));
 root.maintenanceCreatedPointIds=(root.maintenanceCreatedPointIds||[]).filter(id=>livePointIds.has(String(id)));
 return {removedPointIds:[...stalePointIds],removedTaskIds:[...staleTaskIds]};
}
function removeMissingManualElements(database,root,draft){
 const keep=new Set((draft||[]).map(el=>String(el.key))),remove=[];
 for(const c of (database.components||[])){if(String(c.equipmentId)!==String(root.id)||c.origin!=='manual'||c.componentType!=='manual_oscillating_element'||!c.manualOscillatingKey||keep.has(String(c.manualOscillatingKey)))continue;const referenced=(database.lubricationPoints||[]).some(p=>String(p.componentBinding?.sourceComponentId||'')===String(c.id)||String(p.installedComponent?.id||'')===String(c.id));if(!referenced)remove.push(String(c.id));}
 if(remove.length){const ids=new Set(remove);database.components=(database.components||[]).filter(c=>!ids.has(String(c.id)));}
 return remove;
}
function syncGeneratedTasks(database,root,specs){
 for(const spec of (specs||[])){const pointKey=oscillatingPointOrigin(root.id,spec),point=(database.lubricationPoints||[]).find(p=>String(p.candidateOriginKey||'')===pointKey);if(!point)continue;const expected=new Set((spec.activities||[]).map(a=>`${pointKey}|${a.type||'custom'}`));database.tasks=(database.tasks||[]).filter(t=>String(t.lubricationPointId)!==String(point.id)||!String(t.candidateOriginKey||'').startsWith(`${pointKey}|`)||expected.has(String(t.candidateOriginKey||'')));}
}
function refreshPointContext(database,root,specs){
 for(const spec of (specs||[])){const point=(database.lubricationPoints||[]).find(p=>String(p.candidateOriginKey||'')===oscillatingPointOrigin(root.id,spec));if(!point)continue;point.name=spec.serviceLocationName;point.serviceLocationName=spec.serviceLocationName;point.positionLabel=spec.position||'';point.category=spec.category;point.oscillatingLinkage={rootEquipmentId:root.id,elementKey:spec.oscillatingElementKey,connectionType:spec.connectionType};
  const sourceName=clean(spec.sourceRef?.name||spec.manualDesignation||point.installedComponent?.sourceName||point.installedComponent?.name||'');
  if(spec.manualDesignation&&!point.installedComponent)point.installedComponent={id:null,name:spec.manualDesignation,displayName:spec.manualDesignation,sourceName:spec.manualDesignation,externalCode:'',source:'manual_confirmed'};
  if(['snl','snh'].includes(spec.connectionType)){const family=spec.connectionType==='snh'?'SNH':'SNL',raw=clean(spec.housingRef?.name||spec.housingManual||manualHousingMarking(spec.manualDesignation,family)||sourceName);point.bearingHousing={family,rawMarking:raw,source:'oscillating_linkage',confirmed:true,housingComponentId:spec.housingRef?.id||null};}else if(point.bearingHousing?.source==='oscillating_linkage')point.bearingHousing=null;
 }
}
function persistElementContext(database,root,draft){database.components=database.components||[];const now=new Date().toISOString();const nextId=()=>Core?.IDs?.nextFrom?.(database.components,'COMP',7)||`COMP-MANUAL-${Date.now()}`;for(const el of draft){let rec=null;if(el.source==='component'&&el.id)rec=byId(database.components,el.id);if(el.source==='equipment'&&el.id)rec=byId(database.equipment,el.id);if(el.manualDraft){rec=(database.components||[]).find(c=>c.equipmentId===root.id&&c.manualOscillatingKey===el.key)||null;if(!rec){rec={id:nextId(),externalCode:'',equipmentId:root.id,parentEquipmentExternalCode:root.externalCode||'',name:clean(el.name)||ROLE_LABELS[el.role]||'Элемент механизма',manufacturer:'',componentType:'manual_oscillating_element',status:'active',sourceFile:'',origin:'manual',manualOscillatingKey:el.key};database.components.push(rec)}rec.manualOscillatingRole=el.role;rec.manualOscillatingSide=el.side;rec.candidateState='review';rec.candidateKind='equipment_template';rec.candidateEquipmentType=el.role==='connecting_rod'?'connecting_rod':el.role==='pivot_shaft'?'axis':el.role==='crank_linkage'?'crank':el.role;rec.candidateCategory=null;rec.candidateLabel=ROLE_LABELS[el.role]||'Элемент механизма';rec.candidateReason='Элемент подтверждён в универсальном конструкторе системы качания';rec.candidateClassifiedAt=now;el.source='component';el.id=rec.id;el.componentId=rec.id;el.removableManual=true;}
  if(rec){rec.name=clean(el.name)||rec.name;rec.oscillatingRoleOverride=el.role;rec.oscillatingSideOverride=el.side;rec.oscillatingContextRootId=root.id;rec.oscillatingContextConfirmedAt=now;}
 }
}
function markLinkedComponents(database,specs){for(const s of specs){if(s.sourceRef?.source!=='component')continue;const c=byId(database.components,s.sourceRef.id);if(c){c.candidateState='confirmed';c.candidateReviewedAt=new Date().toISOString();}}}
function saveState(database,root,draft,result,applied){const now=new Date().toISOString();root.oscillatingArrangement={version:'1.0.33.51',engine:'oscillating_linkage',confirmedAt:now,status:result.unresolved.length?'NEEDS_CONFIRMATION':'CONFIRMED',elements:draft.map(el=>({key:el.key,source:el.source,id:el.id||null,name:clean(el.name),role:el.role,side:el.side,connections:(el.connections||[]).map(c=>({key:c.key,label:clean(c.label),type:normalizeConnectionType(c.type),componentId:c.componentId||'',manualDesignation:clean(c.manualDesignation)}))})),createdPointIds:applied?.createdPointIds||root.maintenanceCreatedPointIds||[],unresolved:[...result.unresolved],source:'engineer_confirmed_constructor'};root.maintenanceEquipmentType='oscillating_mechanism';root.maintenanceTemplate={id:'oscillating_linkage',title:'Система качания / рычажный механизм',requiresEngineerConfirmation:true};root.maintenanceCandidateState=result.unresolved.length?'review':'confirmed';root.maintenanceReviewedAt=now;}
function collectFormDraft(form,draft){
 form.querySelectorAll('[data-element-index]').forEach(card=>{const i=Number(card.dataset.elementIndex),el=draft[i];if(!el)return;el.name=clean(card.querySelector('[data-element-name]')?.value)||el.name;el.role=card.querySelector('[data-element-role]')?.value||el.role;el.side=card.querySelector('[data-element-side]')?.value||el.side;el.connections=[];card.querySelectorAll('[data-connection-key]').forEach((row,j)=>{el.connections.push({key:row.dataset.connectionKey||`c${j+1}`,label:clean(row.querySelector('[data-conn-label]')?.value)||`Соединение ${j+1}`,type:normalizeConnectionType(row.querySelector('[data-conn-type]')?.value||'unknown'),componentId:row.querySelector('[data-conn-component]')?.value||'',manualDesignation:clean(row.querySelector('[data-conn-manual]')?.value)});});});return draft;
}
function open(rootId){
 const database=db(),root=byId(database?.equipment,rootId);if(!database||!root){global.LubricaApp?.showToast?.('Система качания не найдена','error');return}const ev=evidence(database,root),prior=savedMap(root);let draft=mergeDraft(ev);const dlg=document.getElementById('structureDialog');if(!dlg)return;
 const render=()=>{dlg.classList.add('candidate-finalize-dialog');dlg.innerHTML=`<form method="dialog" class="structure-form oscillating-constructor"><div class="dialog-head"><div><span class="eyebrow">КОНСТРУКТОР СИСТЕМЫ КАЧАНИЯ / РЫЧАЖНОГО МЕХАНИЗМА</span><h2>${esc(root.name)}</h2></div><button type="button" class="icon-btn" data-cancel>×</button></div><div class="candidate-finalize-context"><b>${esc(root.name)}</b><span>${esc(summarizeCounts(ev))}</span></div><div class="wizard-note"><b>Точка создаётся только по фактическому обслуживаемому элементу.</b><span>Название «шатун», «тяга», «ось», «компенсатор» или «кронштейн» само по себе точку не создаёт. Если конструкция неизвестна, оставьте «Требует уточнения» — виртуальная точка не появится.</span></div><div class="oscillating-elements" data-elements>${draft.map((e,i)=>renderElement(e,ev.serviceComponents,i)).join('')}</div><section class="oscillating-add-element"><div class="wizard-note"><b>Добавить элемент механизма</b><span>Используется и для ручного сценария, и когда импорт неполный. Элемент попадёт в структуру только после финального «Создать точки».</span></div><div class="oscillating-element-meta"><label><span>Название</span><input name="new_element_name" placeholder="Например: Тяга левая"></label><label><span>Роль</span><select name="new_element_role">${roleOptions('connecting_rod')}</select></label><label><span>Сторона</span><select name="new_element_side">${sideOptions('unknown')}</select></label></div><button type="button" class="btn ghost" data-add-element>＋ Добавить элемент</button></section><menu><button type="button" class="btn ghost" data-cancel>Отмена</button><button type="button" class="btn primary" data-save>Создать точки</button></menu></form>`;
 const form=dlg.querySelector('form');
 form.querySelectorAll('[data-cancel]').forEach(b=>b.onclick=()=>{dlg.classList.remove('candidate-finalize-dialog');dlg.close()});
 form.querySelectorAll('[data-element-index]').forEach(card=>{const i=Number(card.dataset.elementIndex);card.querySelector('[data-element-role]')?.addEventListener('change',e=>{collectFormDraft(form,draft);const old=draft[i].connections||[];draft[i].role=e.target.value;if(!old.length)draft[i].connections=defaultConnections(draft[i].role);render()});card.querySelector('[data-add-connection]')?.addEventListener('click',()=>{collectFormDraft(form,draft);const n=(draft[i].connections||[]).length+1;draft[i].connections=draft[i].connections||[];draft[i].connections.push({key:`c${Date.now()}_${n}`,label:`Соединение ${n}`,type:'unknown',componentId:'',manualDesignation:''});render()});card.querySelectorAll('[data-remove-connection]').forEach((b,j)=>b.onclick=()=>{collectFormDraft(form,draft);draft[i].connections.splice(j,1);render()});card.querySelector('[data-remove-element]')?.addEventListener('click',()=>{collectFormDraft(form,draft);draft.splice(i,1);render()});});
 form.querySelector('[data-add-element]').onclick=()=>{collectFormDraft(form,draft);const name=clean(form.elements.new_element_name.value),role=form.elements.new_element_role.value,side=form.elements.new_element_side.value;if(!name){global.LubricaApp?.showToast?.('Введите название элемента механизма','warn');form.elements.new_element_name.focus();return}draft.push({key:`manual_${Date.now()}_${draft.length+1}`,source:'manual',id:null,equipmentId:root.id,name,role,side,componentId:null,rawDesignation:'',manualDraft:true,removableManual:true,connections:defaultConnections(role)});render()};
 form.querySelector('[data-save]').onclick=()=>{collectFormDraft(form,draft);const result=validateAndBuild(database,root,draft,ev.serviceComponents);const finalizer=global.LubricaCandidateFinalizer;if(result.specs.length&&!finalizer?.applyConfirmedSpecs){global.LubricaApp?.showToast?.('Модуль подтверждения точек не готов','error');return}syncGeneratedArtifacts(database,root,result.specs);removeMissingManualElements(database,root,draft);persistElementContext(database,root,draft);let applied={createdPointIds:(database.lubricationPoints||[]).filter(p=>String(p.candidateOriginKey||'').startsWith(`equipment:${root.id}:osc_`)).map(p=>p.id)};if(result.specs.length){applied=finalizer.applyConfirmedSpecs(database,'equipment',root,root,{id:'oscillating_linkage',title:'Система качания / рычажный механизм'},result.specs);syncGeneratedTasks(database,root,result.specs);refreshPointContext(database,root,result.specs);markLinkedComponents(database,result.specs);}else{root.maintenanceCreatedPointIds=(database.lubricationPoints||[]).filter(p=>String(p.candidateOriginKey||'').startsWith(`equipment:${root.id}:osc_`)).map(p=>p.id);applied={createdPointIds:[...root.maintenanceCreatedPointIds]};}
 saveState(database,root,draft,result,applied);Core.State.setDatabase(Core.Database.normalize(database));global.LubricaApp?.refreshFromCore?.();global.LubricaApp?.renderAll?.();global.LubricaStructure?.render?.();global.LubricaCandidates?.render?.();const ok=!result.unresolved.length;const message=result.specs.length?`Создано/подтверждено точек: ${result.specs.length}${result.unresolved.length?` · требуют уточнения: ${result.unresolved.length}`:''}`:result.unresolved.length?`Точки не созданы: требуют уточнения ${result.unresolved.length} соединений`:'Конструкция подтверждена: обслуживаемые точки не требуются.';global.LubricaApp?.showToast?.(message,ok?'success':'warn');dlg.classList.remove('candidate-finalize-dialog');dlg.close();};
 dlg.showModal();};render();
}
API.roleOf=roleOf;API.sideOf=sideOf;API.evidence=evidence;API.rootForEquipment=rootForEquipment;API.rootForRecord=rootForRecord;API.open=open;API.defaultConnections=defaultConnections;API.validateAndBuild=validateAndBuild;API.syncGeneratedArtifacts=syncGeneratedArtifacts;API.removeMissingManualElements=removeMissingManualElements;API.refreshPointContext=refreshPointContext;API.CONNECTION_TYPES=CONNECTION_TYPES;API.ROLE_LABELS=ROLE_LABELS;
})(window);
