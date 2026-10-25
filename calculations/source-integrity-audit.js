(function(global){
'use strict';

const CALCULATOR_CONTRACTS=Object.freeze([
  {id:'bearing',sourceMode:'registry',sourceIds:['SKF-RELUBE','SKF-SNL','NSK-EMH','NSK-GREASE','NSK-BEARING-UNITS','INA-SLEWING-TPI13','FAG-TPI228','FAG-WL81115','NTN-LUB','NTN-HOUSED','NTN-ZLG-2024','REITZ-KXE-SINGLE','REITZ-KXE-ZLG','VENTAPP-MACHINE-LUBRICATION','TROESTER-BLOCK-BEARING','TROESTER-31-33-TL-DATASHEET','FERRARI-FAN-BEARINGS','TIMKEN-HELP','LUBRICA-LUBM','ENG-FALLBACK']},
  {id:'motor-bearing',sourceMode:'registry',sourceIds:['MOTOR-ABB-LV-MANUAL','MOTOR-ABB-GPM-2004','MOTOR-ABB-M2BAX-2024','MOTOR-OEMER-HQL-2024','MOTOR-INTERROLL-138I','MOTOR-SEW-DR','MOTOR-SEW-LEGACY-DR-DT-DV','MOTOR-OLI-MVE','MOTOR-SIEMENS-1LE','MOTOR-SIEMENS-D81-2023','MOTOR-LAMMERS-1TZ-2023','MOTOR-EMOD-WK-OFFICIAL']},
  {id:'chain',sourceMode:'mixed',sourceIds:['IWIS-CHAIN-LUBRICATION','TSUBAKI-CHAIN-LUBRICATION','CHAIN-ISO606-RENOLD','LUBRICA-CHAIN-ENGINEERING']},
  {id:'screw-jack',sourceMode:'mixed',sourceIds:['FRANCIA-SCREW-JACK','LUBRICA-SCREW-JACK-PROFILE']},
  {id:'gearbox-oil',sourceMode:'mixed',sourceIds:['SEW-GEARBOX-FILL','SEW-GEARBOX-MAINTENANCE','BONFIGLIOLI-GEARBOX-FILL','UNIT-DRIVE-WORM','FRANCIA-SCREW-JACK']},
  {id:'ball-screw',sourceMode:'user_or_registry',sourceIds:['THK-BALL-SCREW-JPF','THK-LINEAR-LUBRICATION']},
  {id:'linear-bearing',sourceMode:'user_or_registry',sourceIds:['THK-LINEAR-BEARING','THK-LINEAR-LUBRICATION','HIWIN-LINEAR-GUIDE']},
  {id:'coupling',sourceMode:'user_or_registry',sourceIds:['FALK-REXNORD-COUPLING']},
  {id:'grease-point',sourceMode:'user_input',sourceIds:[]},
  {id:'oil-system',sourceMode:'user_input',sourceIds:[]},
  {id:'open-gear',sourceMode:'user_input',sourceIds:[]},
  {id:'wire-rope',sourceMode:'user_input',sourceIds:[]},
  {id:'central-lubrication',sourceMode:'measurement',sourceIds:['LUBRICA-DIAGNOSTIC-THRESHOLDS']}
]);

const CLAIMS=Object.freeze([
  {id:'motor.abb.l1',kind:'oem-table',sourceIds:['MOTOR-ABB-LV-MANUAL'],datasetIds:['MOTOR-ABB-L1-V1'],parameters:['relubeQuantity','relubeInterval']},
  {id:'motor.abb.construction',kind:'oem-family-policy',sourceIds:['MOTOR-ABB-GPM-2004'],datasetIds:['MOTOR-ABB-CONSTRUCTION-V1'],parameters:['productData','maintenanceProcedure']},
  {id:'motor.sew.sealed',kind:'oem-family-policy',sourceIds:['MOTOR-SEW-DR'],datasetIds:['MOTOR-SEW-SEALED-V1'],parameters:['productData','maintenanceProcedure']},
  {id:'motor.sew.legacy',kind:'oem-family-policy',sourceIds:['MOTOR-SEW-LEGACY-DR-DT-DV'],datasetIds:['MOTOR-SEW-LEGACY-BEARINGS-V1'],parameters:['productData','maintenanceProcedure']},
  {id:'motor.oli.mve',kind:'oem-product-policy',sourceIds:['MOTOR-OLI-MVE'],datasetIds:['MOTOR-OLI-MVE-V1'],parameters:['productData','maintenanceProcedure']},
  {id:'motor.siemens.plate',kind:'oem-procedure',sourceIds:['MOTOR-SIEMENS-1LE'],datasetIds:['MOTOR-SIEMENS-PLATE-V1'],parameters:['maintenanceProcedure']},
  {id:'motor.siemens.construction',kind:'oem-family-policy',sourceIds:['MOTOR-SIEMENS-D81-2023'],datasetIds:['MOTOR-SIEMENS-D81-BEARINGS-V1'],parameters:['productData','maintenanceProcedure']},
  {id:'motor.lammers.1tz',kind:'oem-table+policy',sourceIds:['MOTOR-LAMMERS-1TZ-2023'],datasetIds:['MOTOR-LAMMERS-1TZ-V1'],parameters:['productData','relubeQuantity','relubeInterval','maintenanceProcedure']},
  {id:'motor.emod.wk.guard',kind:'oem-scope-guard',sourceIds:['MOTOR-EMOD-WK-OFFICIAL'],datasetIds:['MOTOR-EMOD-WK-GUARD-V1'],parameters:['productData']},
  {id:'motor.abb.m2bax',kind:'oem-product-policy',sourceIds:['MOTOR-ABB-M2BAX-2024'],datasetIds:['MOTOR-ABB-M2BAX-BEARINGS-V1'],parameters:['productData','maintenanceProcedure']},
  {id:'motor.oemer.hql160',kind:'oem-construction-reference',sourceIds:['MOTOR-OEMER-HQL-2024'],datasetIds:['MOTOR-OEMER-HQL160-BEARINGS-V1'],parameters:['productData']},
  {id:'motor.interroll.138i',kind:'oem-product-policy',sourceIds:['MOTOR-INTERROLL-138I'],datasetIds:['MOTOR-INTERROLL-138I-V1'],parameters:['productData','maintenanceProcedure']},
  {id:'bearing.skf.relube',kind:'formula',sourceIds:['SKF-RELUBE'],datasetIds:['SKF-RELUBRICATION-RULES-V1'],parameters:['relubeQuantity']},
  {id:'bearing.skf.snl',kind:'table+method',sourceIds:['SKF-SNL'],datasetIds:['SKF-SNL-HOUSING-V1'],parameters:['productData','relubeQuantity','renewalQuantity','renewalInterval']},
  {id:'bearing.nsk.exact',kind:'table',sourceIds:['NSK-EMH'],datasetIds:['NSK-EMH-6200-V1','NSK-EMH-CYL200-V1'],parameters:['relubeQuantity','relubeInterval']},
  {id:'bearing.nsk.conditions',kind:'coefficients',sourceIds:['NSK-GREASE'],datasetIds:['NSK-LOAD-CORRECTION-V1','NSK-FILL-GUIDANCE-V1'],parameters:['renewalQuantity','conditionCorrection']},
  {id:'bearing.nsk.housed',kind:'product-data',sourceIds:['NSK-BEARING-UNITS'],datasetIds:['NSK-HOUSED-UNITS-V1'],parameters:['productData']},
  {id:'bearing.ina.slewing',kind:'procedure+interval',sourceIds:['INA-SLEWING-TPI13'],datasetIds:['INA-SLEWING-PROCEDURE-V1'],parameters:['maintenanceProcedure','relubeInterval']},
  {id:'bearing.schaeffler.tpi228',kind:'formula',sourceIds:['FAG-TPI228'],datasetIds:['SCHAEFFLER-TPI228-RULES-V1'],parameters:['relubeQuantity','relubeInterval']},
  {id:'bearing.ntn.conditions',kind:'coefficients',sourceIds:['NTN-LUB'],datasetIds:['NTN-CONDITION-CORRECTION-V1'],parameters:['relubeQuantity','conditionCorrection']},
  {id:'bearing.ntn.housed',kind:'table',sourceIds:['NTN-HOUSED'],datasetIds:['NTN-HOUSED-RELUBE-V1'],parameters:['relubeQuantity','relubeInterval']},
  {id:'bearing.ntn.zlg',kind:'table',sourceIds:['NTN-ZLG-2024'],datasetIds:['NTN-SNR-ZLG-2024-V1'],parameters:['relubeQuantity','relubeInterval']},
  {id:'bearing.ventapp.machine',kind:'application-oem-input',sourceIds:['VENTAPP-MACHINE-LUBRICATION'],datasetIds:[],parameters:['relubeQuantity','relubeInterval','lubricant']},
  {id:'bearing.troester.block',kind:'oem-method',sourceIds:['TROESTER-BLOCK-BEARING'],datasetIds:['TROESTER-BLOCK-LUBRICATION-V1'],parameters:['relubeQuantity','relubeInterval','temperatureCorrection','orientationCorrection']},
  {id:'bearing.troester.reference',kind:'product-data-reference',sourceIds:['TROESTER-31-33-TL-DATASHEET'],datasetIds:['TROESTER-31-33-TL-REFERENCE-V1'],parameters:['productData']},
  {id:'bearing.ferrari.cart01',kind:'application-oem',sourceIds:['FERRARI-FAN-BEARINGS'],datasetIds:['FERRARI-FAN-BEARING-RULES-V1'],parameters:['relubeQuantity','relubeInterval','applicationPriority']},
  {id:'bearing.ferrari.chart82',kind:'application-oem-table',sourceIds:['FERRARI-FAN-BEARINGS'],datasetIds:['FERRARI-CHART-8-2-V1'],parameters:['relubeQuantity','relubeInterval']},
  {id:'bearing.reitz.single',kind:'application-table',sourceIds:['REITZ-KXE-SINGLE'],datasetIds:['REITZ-KXE-SINGLE-V1'],parameters:['relubeQuantity','relubeInterval','renewalQuantity']},
  {id:'bearing.reitz.zlg',kind:'application-table',sourceIds:['REITZ-KXE-ZLG'],datasetIds:['REITZ-KXE-ZLG-AAAK-V1','REITZ-KXE-ZLG-AC-V1','REITZ-KXE-TEMPERATURE-V1'],parameters:['relubeQuantity','relubeInterval','temperatureCorrection']},
  {id:'bearing.timken',kind:'method-passport',sourceIds:['TIMKEN-HELP'],datasetIds:['TIMKEN-GREASE-METHOD-V1'],parameters:['maintenanceProcedure']},
  {id:'bearing.lubrica',kind:'engineering-method',sourceIds:['LUBRICA-LUBM'],datasetIds:[],parameters:['relubeQuantity','relubeInterval','renewalQuantity','renewalInterval']},
  {id:'chain.dimensions',kind:'product-data',sourceIds:['CHAIN-ISO606-RENOLD'],datasetIds:['CHAIN-B-SERIES-V1'],parameters:['productData']},
  {id:'chain.iwis.base-dose',kind:'oem-reference',sourceIds:['IWIS-CHAIN-LUBRICATION'],datasetIds:['IWIS-CHAIN-LUBRICATION-V1'],parameters:['relubeQuantity']},
  {id:'chain.tsubaki',kind:'oem-reference',sourceIds:['TSUBAKI-CHAIN-LUBRICATION'],datasetIds:['TSUBAKI-CHAIN-LUBRICATION-V1'],parameters:['relubeQuantity','relubeInterval']},
  {id:'chain.lubrica.scaling',kind:'engineering-coefficients',sourceIds:['LUBRICA-CHAIN-ENGINEERING'],datasetIds:['LUBRICA-CHAIN-ENGINEERING-V1'],parameters:['relubeQuantity','relubeInterval']},
  {id:'screw-jack.francia',kind:'application-data+procedure',sourceIds:['FRANCIA-SCREW-JACK'],datasetIds:['FRANCIA-M42VR-V1'],parameters:['productData','maintenanceProcedure']},
  {id:'screw-jack.lubrica.interval',kind:'engineering-coefficients',sourceIds:['LUBRICA-SCREW-JACK-PROFILE'],datasetIds:['LUBRICA-SCREW-JACK-PROFILE-V1'],parameters:['relubeInterval']},
  {id:'gearbox.sew.fill',kind:'table',sourceIds:['SEW-GEARBOX-FILL'],datasetIds:['SEW-GEARBOX-FILL-V1'],parameters:['oilFillQuantity']},
  {id:'gearbox.sew.maintenance',kind:'procedure+interval',sourceIds:['SEW-GEARBOX-MAINTENANCE'],datasetIds:['SEW-GEARBOX-MAINTENANCE-V1'],parameters:['oilChangeInterval','inspectionInterval']},
  {id:'gearbox.unit-drive.fill',kind:'table',sourceIds:['UNIT-DRIVE-WORM'],datasetIds:['UNIT-DRIVE-WORM-V1'],parameters:['oilFillQuantity']},
  {id:'linear.thk.product',kind:'product-data',sourceIds:['THK-LINEAR-BEARING'],datasetIds:['THK-LINEAR-BEARING-V1'],parameters:['productData']},
  {id:'linear.thk.interval',kind:'oem-reference',sourceIds:['THK-LINEAR-LUBRICATION'],datasetIds:['THK-LINEAR-LUBRICATION-V1'],parameters:['relubeInterval']},
  {id:'linear.hiwin.orientation',kind:'oem-coefficient',sourceIds:['HIWIN-LINEAR-GUIDE'],datasetIds:['HIWIN-LINEAR-GUIDE-RULES-V1'],parameters:['relubeQuantity']},
  {id:'ball-screw.thk.product',kind:'product-data',sourceIds:['THK-BALL-SCREW-JPF'],datasetIds:['THK-BALL-SCREW-JPF-V1'],parameters:['productData']},
  {id:'coupling.falk',kind:'application-table',sourceIds:['FALK-REXNORD-COUPLING'],datasetIds:['FALK-REXNORD-COUPLING-GREASE-V1'],parameters:['relubeQuantity']},
  {id:'central.balance-warning',kind:'diagnostic-threshold',sourceIds:['LUBRICA-DIAGNOSTIC-THRESHOLDS'],datasetIds:['LUBRICA-DIAGNOSTIC-THRESHOLDS-V1'],parameters:['diagnosticOnly']}
]);

const REFERENCE_ONLY=Object.freeze({
  'SKF-HOUSED':'product-reference',
  'FAG-HOUSED':'product-reference',
  'TIMKEN-HOUSED':'product-reference',
  'FAG-WL81115':'legacy-reference',
  'ENG-FALLBACK':'explicit-engineering-fallback',
  'LUBRICA-SOURCE-INVENTORY':'internal-audit',
  'IZOTEH-PP53736-MANUAL':'machine-profile-oem-reference',
  'IZOTEH-PP53736-DRAWING':'machine-profile-oem-reference'
});

function audit(){
  const srcApi=global.LubricaBearingSources, ev=global.LubricaOfflineEvidence, reg=global.LubricaCalculationRegistry;
  const sources=srcApi?.sources||[], datasets=Object.values(ev?.datasets||{}), modules=reg?.list?.()||[];
  const sourceIds=new Set(sources.map(s=>s.id)), datasetIds=new Set(datasets.map(d=>d.id));
  const missingSources=[],missingDatasets=[],supportMismatches=[];
  for(const c of CLAIMS){
    for(const id of c.sourceIds||[])if(!sourceIds.has(id))missingSources.push({claim:c.id,sourceId:id});
    for(const id of c.datasetIds||[])if(!datasetIds.has(id))missingDatasets.push({claim:c.id,datasetId:id});
    for(const sid of c.sourceIds||[]){const s=srcApi?.getById?.(sid);if(!s?.supports)continue;for(const p of c.parameters||[]){if(p in s.supports&&s.supports[p]===false)supportMismatches.push({claim:c.id,sourceId:sid,parameter:p});}}
  }
  const missingContractSources=[];
  for(const c of CALCULATOR_CONTRACTS)for(const sid of c.sourceIds||[])if(!sourceIds.has(sid))missingContractSources.push({calculator:c.id,sourceId:sid});
  const registeredIds=new Set(modules.map(m=>m.id));
  const contractIds=new Set(CALCULATOR_CONTRACTS.map(c=>c.id));
  const modulesWithoutContract=[...registeredIds].filter(id=>!contractIds.has(id));
  const contractsWithoutModule=[...contractIds].filter(id=>!registeredIds.has(id)&&!['bearing','linear-bearing'].includes(id));
  const usedSources=new Set(CLAIMS.flatMap(c=>c.sourceIds||[]).concat(CALCULATOR_CONTRACTS.flatMap(c=>c.sourceIds||[]),datasets.flatMap(d=>[d.sourceId].concat(d.sourceIds||[])).filter(Boolean)));
  const unexplainedRegistrySources=sources.filter(s=>!usedSources.has(s.id)&&!REFERENCE_ONLY[s.id]).map(s=>s.id);
  const classifiedReferenceOnly=Object.keys(REFERENCE_ONLY).filter(id=>sourceIds.has(id));
  const offline=ev?.auditCoverage?.()||{ok:false};
  const ok=!missingSources.length&&!missingDatasets.length&&!missingContractSources.length&&!modulesWithoutContract.length&&!contractsWithoutModule.length&&!unexplainedRegistrySources.length&&!supportMismatches.length&&offline.ok!==false;
  return Object.freeze({
    ok,version:'1.0.33.8',sourceCount:sources.length,datasetCount:datasets.length,calculatorContractCount:CALCULATOR_CONTRACTS.length,claimCount:CLAIMS.length,
    missingSources,missingDatasets,missingContractSources,modulesWithoutContract,contractsWithoutModule,unexplainedRegistrySources,classifiedReferenceOnly,supportMismatches,offline
  });
}
function summary(){const a=audit();return `${a.ok?'PASS':'FAIL'} · ${a.sourceCount} sources · ${a.datasetCount} datasets · ${a.calculatorContractCount} calculators · ${a.claimCount} traced claims`;}

global.LubricaSourceIntegrityAudit=Object.freeze({calculatorContracts:CALCULATOR_CONTRACTS,claims:CLAIMS,referenceOnly:REFERENCE_ONLY,audit,summary});
global.LubricaSystem?.registerModule?.('Source Integrity & Completeness Audit','ok',summary());
})(window);
