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
    if(driveMode==='motor_gearbox')upsert('drive',clean(setup.driveName),'motor_gearbox');
    else if(driveMode==='gearbox')upsert('drive_gearbox',clean(setup.gearboxName),'gearbox');
    else if(driveMode==='separate'){
      upsert('drive_motor',clean(setup.motorName),'motor');
      upsert('drive_gearbox',clean(setup.gearboxName),'gearbox');
    }
    // A family name does not prove the presence of any lubricated chain or oil cavity.
    if(setup.chainEnabled!==false&&clean(setup.chainName))upsert('chain',clean(setup.chainName),'chain');
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
API.identifyManualComponents=identifyManualComponents;API.ensureManualComponents=ensureManualComponents;
})(window);
