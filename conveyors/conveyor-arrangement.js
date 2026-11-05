(function(global){
'use strict';
const API=global.LubricaConveyorArrangement=global.LubricaConveyorArrangement||{};
const clean=v=>String(v??'').trim();
function identifyManualComponents(db,equipment){
 const items=(db?.components||[]).filter(c=>c.equipmentId===equipment?.id&&c.status!=='retired'&&c.manualConveyorRole);
 const byRole={};for(const c of items)byRole[c.manualConveyorRole]=c;
 return {items,byRole};
}
function ensureManualComponents(db,equipment,setup={}){
 if(equipment?.origin!=='manual')return identifyManualComponents(db,equipment);
 db.components=db.components||[];
 const now=()=>new Date().toISOString();
 const nextId=()=>global.LubricaCore?.IDs?.nextFrom?.(db.components,'COMP',7)||`COMP-MANUAL-${Date.now()}`;
 const upsert=(role,name,kind,extra={})=>{
   const cleaned=clean(name);let c=db.components.find(x=>x.equipmentId===equipment.id&&x.manualConveyorRole===role)||null;
   if(!cleaned){if(c)c.status='retired';return null}
   if(!c){c={id:nextId(),externalCode:'',equipmentId:equipment.id,parentEquipmentExternalCode:equipment.externalCode||'',name:cleaned,manufacturer:'',componentType:`manual_conveyor_${role}`,status:'active',sourceFile:'',origin:'manual',manualConveyorRole:role};db.components.push(c)}
   Object.assign(c,{name:cleaned,equipmentId:equipment.id,status:'active',origin:c.origin||'manual',componentType:c.componentType||`manual_conveyor_${role}`,manualConveyorRole:role,...extra,manualConveyorUpdatedAt:now()});
   if(kind==='bearing')Object.assign(c,{candidateState:'candidate',candidateCategory:'bearing',candidateEquipmentType:null,candidateConfidence:1,candidateLabel:'Подшипник',candidateReason:'Фактическая подшипниковая опора подтверждена при ручном создании конвейера',candidateClassifiedAt:now()});
   if(kind==='chain')Object.assign(c,{candidateState:'candidate',candidateCategory:'chain',candidateEquipmentType:null,candidateConfidence:1,candidateLabel:'Цепь',candidateReason:'Рабочая цепь подтверждена при ручном создании конвейера',candidateClassifiedAt:now()});
   if(kind==='shaft')Object.assign(c,{candidateState:'review',candidateCategory:null,candidateEquipmentType:'rotating_shaft',candidateEquipmentSubtype:extra.candidateEquipmentSubtype||null,candidateConfidence:1,candidateLabel:'Вал / вращающийся узел',candidateReason:'Конструктивный контекст ручного конвейера',candidateClassifiedAt:now()});
   if(kind==='motor_gearbox')Object.assign(c,{candidateState:'equipment',candidateCategory:null,candidateEquipmentType:'motor_gearbox',candidateConfidence:1,candidateLabel:'Мотор-редуктор',candidateReason:'Приводной агрегат ручного конвейера',candidateClassifiedAt:now()});
   if(kind==='gearbox')Object.assign(c,{candidateState:'equipment',candidateCategory:null,candidateEquipmentType:'gearbox',candidateConfidence:1,candidateLabel:'Редуктор',candidateReason:'Отдельный редуктор привода ручного конвейера',candidateClassifiedAt:now()});
   if(kind==='motor')Object.assign(c,{candidateState:'equipment',candidateCategory:null,candidateEquipmentType:'motor',candidateConfidence:1,candidateLabel:'Электродвигатель',candidateReason:'Отдельный электродвигатель привода ручного конвейера',candidateClassifiedAt:now()});
   return c;
 };
  const subtype=clean(setup.conveyorSubtype)||equipment.manualConveyorSetup?.conveyorSubtype||'belt';
  // Compound and multi-roller machines do not inherit the two-shaft, four-support layout.
  // Only explicitly identified drive / chain assets are allowed; bearings need real TMCs.
  if(!['belt','chain_scraper'].includes(subtype)){
    const driveMode=clean(setup.driveMode)||'none';
    const upsertDrive=(role,value,kind)=>upsert(role,value,kind);
    if(driveMode==='motor_gearbox'){
      upsertDrive('drive',clean(setup.driveName),'motor_gearbox');
      upsertDrive('drive_motor','','motor');upsertDrive('drive_gearbox','','gearbox');
    }else if(driveMode==='gearbox'){
      upsertDrive('drive_gearbox',clean(setup.gearboxName),'gearbox');
      upsertDrive('drive','','motor_gearbox');upsertDrive('drive_motor','','motor');
    }else if(driveMode==='separate'){
      upsertDrive('drive_motor',clean(setup.motorName),'motor');
      upsertDrive('drive_gearbox',clean(setup.gearboxName),'gearbox');
      upsertDrive('drive','','motor_gearbox');
    }else{
      upsertDrive('drive','','motor_gearbox');upsertDrive('drive_motor','','motor');upsertDrive('drive_gearbox','','gearbox');
    }
    // A family name does not prove the presence of any lubricated chain or oil cavity.
    upsert('chain',setup.chainEnabled!==false?clean(setup.chainName):'','chain');
    const prev=equipment.manualConveyorSetup||{};
    equipment.manualConveyorSetup={...prev,version:'1.0.33.72',conveyorSubtype:subtype,
      layout:'ACTUAL_COMPONENTS_ONLY',chainEnabled:setup.chainEnabled!==false,
      chainName:clean(setup.chainName),driveMode,driveName:clean(setup.driveName),
      gearboxName:clean(setup.gearboxName),motorName:clean(setup.motorName),
      updatedAt:now()};
    return identifyManualComponents(db,equipment);
  }
 const returnRole=setup.returnShaftRole==='driven'?'driven':'tension';
 const fallback=clean(setup.bearingDesignation);
 const driveLeft=clean(setup.driveLeftBearing)||fallback||'Подшипник приводного вала слева (уточнить)';
 const driveRight=clean(setup.driveRightBearing)||fallback||'Подшипник приводного вала справа (уточнить)';
 const returnLeft=clean(setup.returnLeftBearing)||fallback||`Подшипник ${returnRole==='driven'?'ведомого':'натяжного'} вала слева (уточнить)`;
 const returnRight=clean(setup.returnRightBearing)||fallback||`Подшипник ${returnRole==='driven'?'ведомого':'натяжного'} вала справа (уточнить)`;
 upsert('drive_shaft',clean(setup.driveShaftName)||'Вал приводной','shaft',{candidateEquipmentSubtype:'drive'});
 upsert('return_shaft',clean(setup.returnShaftName)||(returnRole==='driven'?'Вал ведомый':'Вал натяжной'),'shaft',{candidateEquipmentSubtype:returnRole});
 upsert('bearing_drive_left',driveLeft,'bearing',{manualConveyorSupport:'drive_left'});
 upsert('bearing_drive_right',driveRight,'bearing',{manualConveyorSupport:'drive_right'});
 upsert('bearing_return_left',returnLeft,'bearing',{manualConveyorSupport:'return_left'});
 upsert('bearing_return_right',returnRight,'bearing',{manualConveyorSupport:'return_right'});
 const legacy=db.components.find(x=>x.equipmentId===equipment.id&&x.manualConveyorRole==='bearing_ref');if(legacy)legacy.status='retired';
 upsert('chain',setup.chainEnabled===false?'':(clean(setup.chainName)||'Цепь роликовая (обозначение уточнить)'),'chain');
 const driveMode=clean(setup.driveMode)||(setup.driveEnabled===false?'none':'motor_gearbox');
 const retireRole=role=>{const c=db.components.find(x=>x.equipmentId===equipment.id&&x.manualConveyorRole===role);if(c)c.status='retired'};
 if(driveMode==='separate'){
   retireRole('drive');
   upsert('drive_gearbox',clean(setup.gearboxName)||'Редуктор (обозначение уточнить)','gearbox');
   upsert('drive_motor',clean(setup.motorName)||'Электродвигатель (обозначение уточнить)','motor');
 }else if(driveMode==='gearbox'){
   retireRole('drive');retireRole('drive_motor');
   upsert('drive_gearbox',clean(setup.gearboxName)||'Редуктор (обозначение уточнить)','gearbox');
 }else if(driveMode==='none'){
   retireRole('drive');retireRole('drive_gearbox');retireRole('drive_motor');
 }else{
   retireRole('drive_gearbox');retireRole('drive_motor');
   upsert('drive',clean(setup.driveName)||'Мотор-редуктор (обозначение уточнить)','motor_gearbox');
 }
 equipment.manualConveyorSetup={version:'1.0.33.47',conveyorSubtype:clean(setup.conveyorSubtype)||equipment.manualConveyorSetup?.conveyorSubtype||'belt',layout:'TWO_SHAFT_FOUR_SUPPORTS',returnShaftRole:returnRole,driveShaftName:clean(setup.driveShaftName)||'Вал приводной',returnShaftName:clean(setup.returnShaftName)||(returnRole==='driven'?'Вал ведомый':'Вал натяжной'),driveLeftBearing:clean(setup.driveLeftBearing)||fallback,driveRightBearing:clean(setup.driveRightBearing)||fallback,returnLeftBearing:clean(setup.returnLeftBearing)||fallback,returnRightBearing:clean(setup.returnRightBearing)||fallback,chainEnabled:setup.chainEnabled!==false,chainName:clean(setup.chainName),driveMode,driveEnabled:driveMode!=='none',driveName:clean(setup.driveName),gearboxName:clean(setup.gearboxName),motorName:clean(setup.motorName),updatedAt:now()};
 return identifyManualComponents(db,equipment);
}

// Stage 5B equipment composition: these are evidence buckets, not lubrication points.
// Each row is backed by an imported or explicitly entered TMC/equipment identity.
const SERVICE_FAMILIES=Object.freeze({
 belt:[['shafts','Приводной и натяжной валы'],['bearings','Физические опоры валов'],['drives','Привод / редуктор'],['chains','Цепи — если реально установлены']],
 chain_scraper:[['shafts','Фактические валы'],['bearings','Подшипниковые опоры'],['chains','Рабочие цепи скребков'],['drives','Приводы']],
 roller:[['shafts','Ролики, секции и валы'],['bearings','Обслуживаемые опоры роликов'],['drives','Привод секций'],['chains','Передачи между роликами']],
 lamella:[['chains','Несущие цепные контуры'],['shafts','Приводные/натяжные валы'],['bearings','Опоры конвейера'],['ancillary','Системы подачи смазки/охлаждения'],['drives','Приводы']],
 chain:[['chains','Фактические цепные контуры'],['shafts','Валы и механизмы натяжения'],['bearings','Обслуживаемые опоры'],['drives','Приводы']],
 screw:[['shafts','Шнек и вращающийся вал'],['bearings','Внешние обслуживаемые опоры'],['drives','Редуктор/привод'],['ancillary','Дополнительные системы']],
 turning:[['shafts','Поворотный механизм / оси'],['bearings','Опоры поворотного узла'],['drives','Привод секций'],['ancillary','Связанные системы']],
 hybrid:[['shafts','Валы и ролики отдельных секций'],['bearings','Фактические обслуживаемые опоры'],['drives','Независимые приводы секций'],['chains','Цепи передачи']],
 weighing:[['shafts','Валы и ролики транспортёра'],['bearings','Реальные подшипники'],['drives','Привод'],['ancillary','Весовое оборудование — контекст']],
 unknown:[['shafts','Распознанные валы/ролики'],['bearings','Фактические подшипники'],['chains','Цепи'],['drives','Приводы'],['ancillary','Вспомогательные системы']]
});
function composeEvidence(template){
 const subtype=template?.conveyorSubtype||template?.evidence?.conveyorSubtype||'unknown';
 const ev=template?.evidence||{},actual=Array.isArray(ev.actual)?ev.actual:[];
 const grouped={
  bearings:actual.filter(x=>['bearing','linear_bearing'].includes(x.category)),
  chains:actual.filter(x=>x.category==='chain'),
  other:actual.filter(x=>!['bearing','linear_bearing','chain'].includes(x.category)),
  shafts:Array.isArray(ev.context)?ev.context:[],
  drives:Array.isArray(ev.assets)?ev.assets:[],
  ancillary:Array.isArray(ev.ancillary)?ev.ancillary:[]
 };
 const sections=(SERVICE_FAMILIES[subtype]||SERVICE_FAMILIES.unknown).map(([role,label])=>({
  role,label,items:(grouped[role]||[]).map(x=>({id:x.id,name:x.name,source:x.source,equipmentId:x.equipmentId})),
  count:(grouped[role]||[]).length,
  note:(grouped[role]||[]).length?'Найденные элементы требуют подтверждения обслуживания':'Не подтверждено; элементы не создаются'
 }));
 if(grouped.other.length)sections.push({role:'other',label:'Другие смазываемые пары — требуют уточнения',
  items:grouped.other.map(x=>({id:x.id,name:x.name,source:x.source,equipmentId:x.equipmentId})),
  count:grouped.other.length,note:'Проверить фактическую конструкцию и способ подачи'});
 return {subtype,sections,actualCount:actual.length,
  unsupportedGeometry:!['belt','chain_scraper'].includes(subtype),
  requiresEngineerConfirmation:true,createsPoints:false};
}
API.identifyManualComponents=identifyManualComponents;API.ensureManualComponents=ensureManualComponents;API.composeEvidence=composeEvidence;API.SERVICE_FAMILIES=SERVICE_FAMILIES;
})(window);
