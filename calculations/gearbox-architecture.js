(function(global){
'use strict';
const FAMILY_MAINTENANCE=Object.freeze({
  SEW_EURODRIVE:Object.freeze({inspectionHours:3000,inspectionMonths:6,mineralOilMaxMonths:36,syntheticOilMaxMonths:60,sourceId:'SEW-GEARBOX-MAINTENANCE'}),
  ROSSI:Object.freeze({syntheticNormalHours:18000,syntheticHighHours:12500,syntheticVeryHighHours:9000,syntheticExtremeHours:6300,mineralNormalHours:8000,mineralHighHours:4000,mineralVeryHighHours:2000,sourceId:'ROSSI-A-GEARBOX-MAINTENANCE'}),
  BONFIGLIOLI:Object.freeze({firstChangeHours:300,mineralNormalHours:8000,mineralHighHours:4000,mineralVeryHighHours:2000,syntheticNormalHours:25000,syntheticHighHours:15000,syntheticVeryHighHours:12500,sourceId:'BONFIGLIOLI-GEARBOX-MAINTENANCE'})
});
const METHODS=Object.freeze({
  SEW_OEM_FILL:Object.freeze({id:'SEW_OEM_FILL',manufacturer:'SEW-EURODRIVE',label:'SEW-EURODRIVE · объём по монтажному положению',sourceId:'SEW-GEARBOX-FILL',evidenceLevel:'A/B'}),
  SEW_OEM_MAINTENANCE:Object.freeze({id:'SEW_OEM_MAINTENANCE',manufacturer:'SEW-EURODRIVE',label:'SEW-EURODRIVE · регламент замены масла',sourceId:'SEW-GEARBOX-MAINTENANCE',evidenceLevel:'A/B'}),
  UNIT_DRIVE_OEM_FILL:Object.freeze({id:'UNIT_DRIVE_OEM_FILL',manufacturer:'UNIT DRIVE',label:'UNIT DRIVE · табличный объём масла',sourceId:'UNIT-DRIVE-WORM',evidenceLevel:'A/B'}),
  BONFIGLIOLI_OEM_FILL:Object.freeze({id:'BONFIGLIOLI_OEM_FILL',manufacturer:'BONFIGLIOLI',label:'Bonfiglioli · OEM-объём конкретного исполнения',sourceId:'BONFIGLIOLI-GEARBOX-FILL',evidenceLevel:'A'}),
  BONFIGLIOLI_OEM_MAINTENANCE:Object.freeze({id:'BONFIGLIOLI_OEM_MAINTENANCE',manufacturer:'BONFIGLIOLI',label:'Bonfiglioli · OEM-интервал по серии, маслу и температуре',sourceId:'BONFIGLIOLI-GEARBOX-MAINTENANCE',evidenceLevel:'A'}),
  ROSSI_OEM_FILL:Object.freeze({id:'ROSSI_OEM_FILL',manufacturer:'ROSSI',label:'Rossi · объём масла MR V по типоразмеру/положению',sourceId:'ROSSI-A-GEARBOX-FILL',evidenceLevel:'A/B'}),
  ROSSI_OEM_MAINTENANCE:Object.freeze({id:'ROSSI_OEM_MAINTENANCE',manufacturer:'ROSSI',label:'Rossi · интервал замены масла по основе и температуре',sourceId:'ROSSI-A-GEARBOX-MAINTENANCE',evidenceLevel:'A/B'}),
  FRANCIA_LONG_LIFE_GREASE:Object.freeze({id:'FRANCIA_LONG_LIFE_GREASE',manufacturer:'FRANCIA',label:'FRANCIA · долговременная смазка редукторной полости',sourceId:'FRANCIA-SCREW-JACK',evidenceLevel:'A'}),
  MANUAL_CONFIRMED_FILL:Object.freeze({id:'MANUAL_CONFIRMED_FILL',manufacturer:null,label:'Подтверждённый рабочий объём',sourceId:null,evidenceLevel:'USER'}),
  MANUAL_CONFIRMED_INTERVAL:Object.freeze({id:'MANUAL_CONFIRMED_INTERVAL',manufacturer:null,label:'Подтверждённый пользователем интервал',sourceId:null,evidenceLevel:'USER'}),
  CONDITION_BASED:Object.freeze({id:'CONDITION_BASED',manufacturer:null,label:'Обслуживание по состоянию / анализу масла',sourceId:null,evidenceLevel:'POLICY'}),
  UNSPECIFIED:Object.freeze({id:'UNSPECIFIED',manufacturer:null,label:'Методика не определена',sourceId:null,evidenceLevel:'X'})
});
const norm=s=>String(s||'').trim().toUpperCase();
function familyFor(entry,manufacturer){const t=norm((manufacturer||'')+' '+(entry?.manufacturer||'')+' '+(entry?.sourceReference||''));if(t.includes('SEW-EURODRIVE'))return 'SEW_EURODRIVE';if(t.includes('ROSSI'))return 'ROSSI';if(t.includes('UNIT DRIVE')||t.includes('ПТЦ'))return 'UNIT_DRIVE';if(t.includes('FRANCIA'))return 'FRANCIA';if(t.includes('BONFIGLIOLI'))return 'BONFIGLIOLI';if(t.includes('BREVINI')||t.includes('DANA'))return 'BREVINI';return 'GENERIC'}
function buildContext({point=null,entry=null,input={}}={}){
  const td=entry?.technicalData||{},ld=entry?.lubricationData||{};
  const manufacturer=String(input.manufacturer||entry?.manufacturer||point?.gearboxOil?.manufacturer||'').trim();
  const model=String(input.model||entry?.designation||entry?.model||point?.gearboxOil?.model||'').trim();
  const family=familyFor(entry,manufacturer);
  const provenance=global.LubricaNonBearingProvenance?.gearbox?.(entry)||null;
  const familyMaintenance=FAMILY_MAINTENANCE[family]||{};
  return Object.freeze({
    schemaVersion:'1.0',domain:'gearbox',family,manufacturer,model,
    mountingPosition:String(input.mountingPosition||point?.gearboxOil?.mountingPosition||'').trim(),
    gearboxType:td.gearboxType||'',lubricationMethod:input.lubricationMethod||'',levelMethod:input.levelMethod||'',
    maintenancePolicy:ld.maintenancePolicy||'',recommendedOil:ld.recommendedOil||null,
    hasMountingFillTable:!!td.mountingFillLiters,hasFillOptions:!!td.mountingFillOptionsLiters,hasFixedFill:Number(td.fixedFillLiters)>0,
    oilBaseType:String(input.oilBaseType||'').trim(),intervalMode:String(input.intervalMode||'').trim(),
    oemInspectionHours:Number(ld.inspectionIntervalHours)||familyMaintenance.inspectionHours||null,oemInspectionMonths:Number(ld.inspectionIntervalMonths)||familyMaintenance.inspectionMonths||null,oemMineralOilMaxMonths:Number(ld.mineralOilMaxMonths)||familyMaintenance.mineralOilMaxMonths||null,oemSyntheticOilMaxMonths:Number(ld.syntheticOilMaxMonths)||familyMaintenance.syntheticOilMaxMonths||null,oemSyntheticNormalHours:Number(ld.rossiSyntheticChangeHours?.normal)||familyMaintenance.syntheticNormalHours||null,oemSyntheticHighHours:Number(ld.rossiSyntheticChangeHours?.high)||familyMaintenance.syntheticHighHours||null,oemSyntheticVeryHighHours:Number(ld.rossiSyntheticChangeHours?.veryHigh)||familyMaintenance.syntheticVeryHighHours||null,oemSyntheticExtremeHours:Number(ld.rossiSyntheticChangeHours?.extreme)||familyMaintenance.syntheticExtremeHours||null,oemMineralNormalHours:Number(ld.rossiMineralChangeHours?.normal)||familyMaintenance.mineralNormalHours||null,oemMineralHighHours:Number(ld.rossiMineralChangeHours?.high)||familyMaintenance.mineralHighHours||null,oemMineralVeryHighHours:Number(ld.rossiMineralChangeHours?.veryHigh)||familyMaintenance.mineralVeryHighHours||null,oemFirstChangeHours:Number(ld.firstChangeHours)||familyMaintenance.firstChangeHours||null,
    provenance
  });
}
function sourceIdsForContext(ctx){const out=[];if(ctx?.family==='SEW_EURODRIVE'){out.push('SEW-GEARBOX-FILL');if(ctx.oemMineralOilMaxMonths||ctx.oemSyntheticOilMaxMonths||ctx.oemInspectionHours||ctx.oemInspectionMonths)out.push('SEW-GEARBOX-MAINTENANCE');}if(ctx?.family==='UNIT_DRIVE')out.push('UNIT-DRIVE-WORM');if(ctx?.family==='ROSSI'){if(ctx.hasMountingFillTable||ctx.hasFixedFill)out.push('ROSSI-A-GEARBOX-FILL');if(ctx.oemSyntheticNormalHours||ctx.oemSyntheticHighHours||ctx.oemMineralNormalHours||ctx.oemMineralHighHours)out.push('ROSSI-A-GEARBOX-MAINTENANCE');}if(ctx?.family==='BONFIGLIOLI'){if(ctx.hasFixedFill)out.push('BONFIGLIOLI-GEARBOX-FILL');out.push('BONFIGLIOLI-GEARBOX-MAINTENANCE');}if(ctx?.family==='FRANCIA')out.push('FRANCIA-SCREW-JACK');return out}
function resolveMethods(ctx,input={},result={}){
  let fill=METHODS.UNSPECIFIED;
  if(Number(input.approvedFillLiters)>0)fill=METHODS.MANUAL_CONFIRMED_FILL;
  else if(ctx?.family==='SEW_EURODRIVE'&&(ctx.hasMountingFillTable||ctx.hasFixedFill))fill=METHODS.SEW_OEM_FILL;
  else if(ctx?.family==='UNIT_DRIVE'&&ctx.hasFixedFill)fill=METHODS.UNIT_DRIVE_OEM_FILL;
  else if(ctx?.family==='BONFIGLIOLI'&&ctx.hasFixedFill)fill=METHODS.BONFIGLIOLI_OEM_FILL;
  else if(ctx?.family==='ROSSI'&&(ctx.hasMountingFillTable||ctx.hasFixedFill))fill=METHODS.ROSSI_OEM_FILL;
  else if(ctx?.family==='FRANCIA'&&ctx.maintenancePolicy==='long_life_refill_if_needed')fill=METHODS.FRANCIA_LONG_LIFE_GREASE;
  else if(Number(input.oemFillLiters)>0)fill=METHODS.MANUAL_CONFIRMED_FILL;
  const hasInterval=Number(input.changeHours)>0||Number(input.changeMonths)>0;
  const intervalText=norm(input.intervalSource||'');
  const sewAuto=ctx?.family==='SEW_EURODRIVE'&&hasInterval&&((ctx.oemMineralOilMaxMonths&&Number(input.changeMonths)===ctx.oemMineralOilMaxMonths)||(ctx.oemSyntheticOilMaxMonths&&Number(input.changeMonths)===ctx.oemSyntheticOilMaxMonths)||intervalText.includes('SEW-EURODRIVE'));
  const rossiAuto=ctx?.family==='ROSSI'&&hasInterval&&norm(input.intervalSource||'').includes('ROSSI');
  const bonfiglioliAuto=ctx?.family==='BONFIGLIOLI'&&hasInterval&&norm(input.intervalSource||'').includes('BONFIGLIOLI');
  const interval=sewAuto?METHODS.SEW_OEM_MAINTENANCE:(rossiAuto?METHODS.ROSSI_OEM_MAINTENANCE:(bonfiglioliAuto?METHODS.BONFIGLIOLI_OEM_MAINTENANCE:(hasInterval?METHODS.MANUAL_CONFIRMED_INTERVAL:(input.conditionBased?METHODS.CONDITION_BASED:METHODS.UNSPECIFIED))));
  const topup=Number(input.topupLiters)>0?METHODS.MANUAL_CONFIRMED_FILL:fill;
  return Object.freeze({schemaVersion:'1.0',fill:fill.id,oilChangeInterval:interval.id,topup:topup.id,sourceIds:sourceIdsForContext(ctx)});
}
function method(id){return METHODS[id]||METHODS.UNSPECIFIED}
function parameter(value,unit,methodId,ctx,sourceOverride){const m=method(methodId),sid=sourceOverride||m.sourceId||((m.evidenceLevel!=='USER'&&m.evidenceLevel!=='X')?ctx?.provenance?.sourceId:null)||null,ds=sid?(global.LubricaOfflineEvidence?.bySource?.(sid)||[])[0]:null;return Object.freeze({value:value??null,unit:unit||'',method:methodId,sourceManufacturer:m.manufacturer||(m.evidenceLevel==='USER'||m.evidenceLevel==='X'?null:ctx?.manufacturer||null),sourceId:sid,datasetId:ds?.id||((sid===ctx?.provenance?.sourceId)?ctx?.provenance?.datasetId:null)||null,datasetVersion:ds?.version||((sid===ctx?.provenance?.sourceId)?ctx?.provenance?.datasetVersion:null)||null,evidenceLevel:m.evidenceLevel})}
function buildPackage(ctx,plan,result,input={}){
  const fillMethod=plan.fill,intervalMethod=plan.oilChangeInterval;
  return Object.freeze({
    schemaVersion:'1.0',packageVersion:'1.0.33.39',context:ctx,methodPlan:plan,
    operations:Object.freeze({
      oilFill:Object.freeze({quantity:parameter(result?.fill?.effectiveFillLiters,'л',fillMethod,ctx),state:result?.fill?.effectiveFillLiters!=null?'CALCULATED':'REVIEW_REQUIRED'}),
      oilChange:Object.freeze({hours:parameter(result?.interval?.hours,'ч',intervalMethod,ctx),months:parameter(result?.interval?.months,'мес.',intervalMethod,ctx),conditionBased:!!result?.interval?.conditionBased,state:(result?.interval?.hours||result?.interval?.months)?'CALCULATED':result?.interval?.conditionBased?'CONDITION_BASED':'REVIEW_REQUIRED'}),
      oilTopup:Object.freeze({quantity:parameter(result?.fill?.topupLiters,'л',plan.topup,ctx),state:result?.fill?.topupLiters!=null?'CALCULATED':'CONDITION_BASED'})
    }),
    isolation:Object.freeze({ok:true,rule:'OEM product data and maintenance interval are resolved separately; no cross-OEM substitution is automatic.'})
  });
}
function summarize(ctx,plan){const fill=method(plan?.fill),interval=method(plan?.oilChangeInterval);return {fillLabel:fill.label,intervalLabel:interval.label,sourceIds:sourceIdsForContext(ctx)}}
global.LubricaGearboxArchitecture=Object.freeze({methods:METHODS,buildContext,resolveMethods,buildPackage,sourceIdsForContext,summarize,method});
global.LubricaSystem?.registerModule?.('Gearbox Calculation Architecture','ok','Context / OEM Resolver / Package v1.0.33.39');
})(window);
