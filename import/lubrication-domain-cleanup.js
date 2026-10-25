(function(global){
'use strict';
const API=global.LubricaLubricationDomainCleanup=global.LubricaLubricationDomainCleanup||{};
const clean=v=>String(v??'').trim();
const norm=v=>clean(v).toLowerCase().replace(/ё/g,'е').replace(/[–—]/g,'-').replace(/\s+/g,' ');
let showFullStructure=false;

const equipmentStaticRules=[
 {code:'STATIC_DUCT_PIPE',re:/(^|\s)(газоход|воздуховод|дымох(?:од)?|трубопровод|участок трубы|труба ваграночных газов|патрубок)(\s|$)/,reason:'Статический газоход/воздуховод/трубопровод не является самостоятельным смазываемым узлом'},
 {code:'FRAME_PLATFORM',re:/(^|\s)(рама|площадка обслуживания|ограждение|лестница|кожух)(\s|$)/,reason:'Статический конструктивный элемент не является самостоятельным смазываемым узлом'},
 {code:'VFD_ELECTRICAL',re:/преобразователь\s+частот|частотн.*преобраз|\bпч\b|\bvfd\b/,reason:'Преобразователь частоты не относится к карте смазок'},
 {code:'PASSIVE_PIPING',re:/(^|\s)(фланец|фитинг|тройник|переходник|заглушка)(\s|$)|компенсатор\s+(тканев|сильфон)/,reason:'Пассивный элемент трубопровода не является самостоятельным смазываемым узлом'},
 {code:'PASSIVE_ELECTRICAL',re:/электромагнитн.*катуш|катушк.*электромаг|термопар|датчик|кабел|штекер|шкаф\s+управ|панель\s+управ/,reason:'Пассивный электрический/измерительный элемент не относится к карте смазок'},
 {code:'OXYGEN_STATIC',re:/рампа\s+кислород|копь[её]\s+кислород|трубопровод\s+подачи\s+кислород/,reason:'Статический элемент кислородной системы не является самостоятельным смазываемым узлом'},
 {code:'STATIC_RECEIVER',re:/(^|\s)ресивер(\s|$)/,reason:'Ресивер как статическая ёмкость не является самостоятельным смазываемым узлом'}
];
const componentStaticRules=[
 ...equipmentStaticRules,
 {code:'FASTENER',re:/стопорн.*кольц|\bболт\b|\bгайк|винт\s+креп|шайб|шплинт/,reason:'Крепёж не является самостоятельной точкой смазки'},
 {code:'SEAL',re:/манжет|сальник|уплотнен/,reason:'Уплотнение не является самостоятельной точкой смазки'},
 {code:'BELT_PULLEY',re:/\bремень\b|\bшкив\b/,reason:'Ремень/шкив не является самостоятельной точкой смазки'},
 {code:'PASSIVE_SPRING',re:/(^|\s)пружин/,reason:'Пружина не является самостоятельной точкой смазки'}
];
function matchRules(name,rules){const t=norm(name);for(const r of rules)if(r.re.test(t))return r;return null}
function classifyStaticEquipment(e){return matchRules(`${e?.name||''} ${e?.equipmentType||''}`,equipmentStaticRules)}
function classifyStaticComponent(c){return matchRules(`${c?.name||''} ${c?.componentType||''}`,componentStaticRules)}
function componentReferenced(db,id){return (db.lubricationPoints||[]).some(p=>String(p.componentBinding?.sourceComponentId||'')===String(id)||String(p.candidateOriginKey||'').startsWith(`component:${id}:`))}
function equipmentHasDirectService(db,id){
 if((db.lubricationPoints||[]).some(p=>String(p.equipmentId||'')===String(id)))return true;
 if((db.nodes||[]).some(n=>String(n.equipmentId||'')===String(id)))return true;
 return false;
}
function isDirectRelevant(db,e){
 if(!e)return false;
 if(e.origin&&e.origin!=='import')return true;
 if(equipmentHasDirectService(db,e.id))return true;
 if(e.maintenanceCandidateState==='confirmed')return true;
 if(e.fanBearingArrangement||e.fanBearingArrangementStatus)return true;
 return false;
}
function computeDomainStatuses(db){
 const byParent=new Map();for(const e of (db.equipment||[])){const k=e.parentEquipmentId||'ROOT';if(!byParent.has(k))byParent.set(k,[]);byParent.get(k).push(e)}
 const memo=new Map();
 function visit(e){
   if(memo.has(e.id))return memo.get(e.id);
   const children=byParent.get(e.id)||[];
   const direct=isDirectRelevant(db,e);
   const childRelevant=children.some(ch=>visit(ch).visible);
   const staticRule=classifyStaticEquipment(e);
   let status='PENDING_REVIEW';
   if(direct)status='RELEVANT';
   else if(childRelevant)status='STRUCTURE_ONLY';
   else if(staticRule||e.maintenanceCandidateState==='excluded'||e.maintenanceCandidateState==='rejected')status='EXCLUDED_AUTO';
   const result={status,visible:status==='RELEVANT'||status==='STRUCTURE_ONLY'};memo.set(e.id,result);return result;
 }
 for(const e of (db.equipment||[]))visit(e);
 return memo;
}
function apply(db){
 if(!db)return {database:db,summary:{}};
 const now=new Date().toISOString();
 let excludedComponents=0,excludedEquipment=0,structureOnly=0,relevant=0,pending=0;
 for(const c of (db.components||[])){
   if(['confirmed','rejected'].includes(c.candidateState)||c.lubricationDomainOverride==='REVIEW'||componentReferenced(db,c.id))continue;
   const r=classifyStaticComponent(c);if(!r)continue;
   c.candidateState='excluded';c.candidateKind='exclude';c.candidateCategory=null;c.candidateEquipmentType=null;c.candidateConfidence=Math.max(Number(c.candidateConfidence)||0,.98);c.candidateLabel='Исключено автоматически';c.candidateReason=r.reason;c.lubricationDomainStatus='EXCLUDED_AUTO';c.lubricationDomainRule=r.code;c.lubricationDomainReviewedAt=now;excludedComponents++;
 }
 for(const e of (db.equipment||[])){
   if(['confirmed','rejected'].includes(e.maintenanceCandidateState)||e.lubricationDomainOverride==='REVIEW'||equipmentHasDirectService(db,e.id))continue;
   const r=classifyStaticEquipment(e);if(!r)continue;
   e.maintenanceCandidateState='excluded';e.maintenanceCandidateKind='exclude';e.maintenanceEquipmentType=null;e.maintenanceEquipmentSubtype=null;e.maintenanceConfidence=Math.max(Number(e.maintenanceConfidence)||0,.98);e.maintenanceLabel='Исключено автоматически';e.maintenanceReason=r.reason;e.maintenanceTemplate=null;e.lubricationDomainRule=r.code;e.lubricationDomainReviewedAt=now;excludedEquipment++;
 }
 const statuses=computeDomainStatuses(db);
 for(const e of (db.equipment||[])){
   const s=statuses.get(e.id)?.status||'PENDING_REVIEW';e.lubricationDomainStatus=s;
   if(s==='STRUCTURE_ONLY')structureOnly++;else if(s==='RELEVANT')relevant++;else if(s==='PENDING_REVIEW')pending++;
 }
 db.meta={...(db.meta||{}),lubricationDomainCleanupAt:now,lubricationDomainCleanupVersion:'1.0'};
 return {database:db,summary:{equipmentTotal:(db.equipment||[]).length,componentsTotal:(db.components||[]).length,excludedEquipment,excludedComponents,structureOnly,relevant,pending,points:(db.lubricationPoints||[]).length}};
}
function getVisibleEquipmentSet(db){
 if(showFullStructure)return new Set((db?.equipment||[]).map(e=>String(e.id)));
 const statuses=computeDomainStatuses(db||{});return new Set([...statuses.entries()].filter(([,v])=>v.visible).map(([id])=>String(id)));
}
function setShowFullStructure(v){showFullStructure=!!v;return showFullStructure}
function toggleShowFullStructure(){showFullStructure=!showFullStructure;return showFullStructure}
function isShowFullStructure(){return showFullStructure}
function cleanupCurrentDatabase(){
 const db=global.LubricaCore?.State?.getDatabase?.();if(!db)return null;
 const r=apply(db);global.LubricaCore.State.setDatabase(db);return r;
}

function bindUi(){
 const cleanupBtn=document.getElementById('structureCleanupBtn');
 if(cleanupBtn&&!cleanupBtn.dataset.bound){cleanupBtn.dataset.bound='1';cleanupBtn.addEventListener('click',()=>{const r=cleanupCurrentDatabase();if(!r)return;global.LubricaApp?.showToast?.(`Исключено ${r.summary.excludedEquipment+r.summary.excludedComponents}. Структурных контейнеров: ${r.summary.structureOnly}. Точек удалено: 0.`,'ok');global.LubricaStructure?.render?.()})}
 const toggleBtn=document.getElementById('structureDomainToggleBtn');
 if(toggleBtn&&!toggleBtn.dataset.bound){toggleBtn.dataset.bound='1';toggleBtn.addEventListener('click',()=>{const full=toggleShowFullStructure();toggleBtn.textContent=full?'Рабочее дерево':'Полная структура';global.LubricaStructureTree?.renderTree?.(global.LubricaCore?.State?.getDatabase?.())})}
}
if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',bindUi,{once:true});
API.apply=apply;API.cleanupCurrentDatabase=cleanupCurrentDatabase;API.classifyStaticEquipment=classifyStaticEquipment;API.classifyStaticComponent=classifyStaticComponent;API.computeDomainStatuses=computeDomainStatuses;API.getVisibleEquipmentSet=getVisibleEquipmentSet;API.setShowFullStructure=setShowFullStructure;API.toggleShowFullStructure=toggleShowFullStructure;API.isShowFullStructure=isShowFullStructure;
})(window);
