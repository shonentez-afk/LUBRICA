const fs=require('fs'),vm=require('vm'),path=require('path');
global.window=global;global.LubricaSystem={registerModule(){}};global.document={addEventListener(){}};
function load(f){vm.runInThisContext(fs.readFileSync(path.join(__dirname,'..',f),'utf8'),{filename:f});}
[
'components/starter-data.js','components/screw-jack-data.js','bearings/multi-oem-data.js','bearings/offline-evidence.js','bearings/source-registry.js',
'calculations/registry.js','calculations/chain-calculator.js','calculations/screw-jack-calculator.js','calculations/gearbox-oil-calculator.js','calculations/ball-screw-calculator.js','calculations/linear-bearing-calculator.js','calculations/coupling-calculator.js','calculations/grease-point-calculator.js','calculations/oil-system-calculator.js','calculations/open-gear-calculator.js','calculations/wire-rope-calculator.js','calculations/central-lubrication-calculator.js'
].forEach(load);
// Register calculation ids for the runtime contract test. Adapter source wiring is checked statically below.
['bearing','motor-bearing','chain','screw-jack','gearbox-oil','ball-screw','linear-bearing','coupling','grease-point','oil-system','open-gear','wire-rope','central-lubrication'].forEach(id=>LubricaCalculationRegistry.register({id,status:'ready',open(){}}));
load('calculations/source-integrity-audit.js');
const a=LubricaSourceIntegrityAudit.audit();
if(!a.ok)throw new Error('Source integrity audit failed: '+JSON.stringify(a));
if(a.sourceCount!==54)throw new Error('Unexpected source count '+a.sourceCount);
if(a.datasetCount!==52)throw new Error('Unexpected dataset count '+a.datasetCount);
if(a.claimCount!==46)throw new Error('Unexpected traced claim count '+a.claimCount);
if(a.offline.starterTableRows!==99)throw new Error('Starter table coverage changed: '+a.offline.starterTableRows);
const src=id=>{if(!LubricaBearingSources.getById(id))throw new Error('Missing registry source '+id)};
['THK-LINEAR-LUBRICATION','HIWIN-LINEAR-GUIDE','LUBRICA-CHAIN-ENGINEERING','LUBRICA-SCREW-JACK-PROFILE','LUBRICA-DIAGNOSTIC-THRESHOLDS','TROESTER-BLOCK-BEARING','TROESTER-31-33-TL-DATASHEET','FERRARI-FAN-BEARINGS','MOTOR-ABB-LV-MANUAL','MOTOR-ABB-GPM-2004','MOTOR-ABB-STEEL-2003','MOTOR-ABB-M3AA-2022','MOTOR-ABB-MARINE-2005','MOTOR-SEW-DR','MOTOR-SEW-LEGACY-DR-DT-DV','MOTOR-OLI-MVE','MOTOR-SIEMENS-1LE','MOTOR-SIEMENS-D81-2023','MOTOR-LAMMERS-1TZ-2023','MOTOR-EMOD-WK-OFFICIAL','MOTOR-ABB-M2BAX-2024','MOTOR-OEMER-HQL-2024','MOTOR-INTERROLL-138I'].forEach(src);
const ds=id=>{if(!LubricaOfflineEvidence.get(id))throw new Error('Missing local dataset '+id)};
['THK-LINEAR-LUBRICATION-V1','HIWIN-LINEAR-GUIDE-RULES-V1','LUBRICA-CHAIN-ENGINEERING-V1','LUBRICA-SCREW-JACK-PROFILE-V1','LUBRICA-DIAGNOSTIC-THRESHOLDS-V1','TROESTER-BLOCK-LUBRICATION-V1','TROESTER-31-33-TL-REFERENCE-V1','FERRARI-FAN-BEARING-RULES-V1','FERRARI-CHART-8-2-V1','MOTOR-ABB-L1-V1','MOTOR-ABB-CONSTRUCTION-V1','MOTOR-ABB-M2CA-BEARINGS-V1','MOTOR-ABB-M3AA-BEARINGS-V1','MOTOR-ABB-M2QA-CONSTRUCTION-V1','MOTOR-SEW-SEALED-V1','MOTOR-SEW-LEGACY-BEARINGS-V1','MOTOR-OLI-MVE-V1','MOTOR-SIEMENS-PLATE-V1','MOTOR-SIEMENS-D81-BEARINGS-V1','MOTOR-LAMMERS-1TZ-V1','MOTOR-EMOD-WK-GUARD-V1','MOTOR-ABB-M2BAX-BEARINGS-V1','MOTOR-OEMER-HQL160-BEARINGS-V1','MOTOR-INTERROLL-138I-V1'].forEach(ds);
const chain=LubricaChainCalculator.simpleRecommendation({applicationMethod:'manual',chainLengthM:10,pitchMm:25.4,strandCount:1,environment:'dusty',temperatureClass:'normal'});
if(chain.sourceQuantityId!=='LUBRICA-CHAIN-ENGINEERING'||chain.interval.sourceId!=='LUBRICA-CHAIN-ENGINEERING')throw new Error('Chain engineering provenance missing');
const jack=LubricaScrewJackCalculator.calculate({environment:'normal',usageMode:'normal'});
if(jack.interval.sourceId!=='LUBRICA-SCREW-JACK-PROFILE'||jack.interval.datasetId!=='LUBRICA-SCREW-JACK-PROFILE-V1')throw new Error('Screw-jack provenance missing');
const lin=LubricaLinearBearingCalculator.calculate({unitCount:1,qtyPerUnitCm3:1,orientation:'vertical',orientationRule:'hiwin_50',intervalSource:'thk_reference'});
if(lin.relube.sourceId!=='HIWIN-LINEAR-GUIDE'||lin.interval.sourceId!=='THK-LINEAR-LUBRICATION')throw new Error('Linear-guide provenance missing');
const cls=LubricaCentralLubricationCalculator.calculate({requiredPerCycle:10,meteringDose:1,outletCount:12,cyclesPerService:1,supplyConfirmed:'yes'});
if(cls.diagnosticSourceId!=='LUBRICA-DIAGNOSTIC-THRESHOLDS')throw new Error('Diagnostic threshold provenance missing');
const adapterChecks={
 'calculations/chain-adapter.js':['LUBRICA-CHAIN-ENGINEERING'],
 'calculations/screw-jack-adapter.js':['LUBRICA-SCREW-JACK-PROFILE'],
 'calculations/ball-screw-adapter.js':['THK-BALL-SCREW-JPF','THK-LINEAR-LUBRICATION'],
 'calculations/linear-bearing-adapter.js':['THK-LINEAR-BEARING','THK-LINEAR-LUBRICATION','HIWIN-LINEAR-GUIDE'],
 'calculations/coupling-adapter.js':['FALK-REXNORD-COUPLING'],
 'calculations/simple-service-adapters.js':['LUBRICA-DIAGNOSTIC-THRESHOLDS']
};
for(const [f,ids] of Object.entries(adapterChecks)){const t=fs.readFileSync(path.join(__dirname,'..',f),'utf8');for(const id of ids)if(!t.includes(id))throw new Error(`${f} does not expose ${id}`);}
console.log('PASS 1.0.31.11 Source Integrity & Completeness');
console.log(LubricaSourceIntegrityAudit.summary());
