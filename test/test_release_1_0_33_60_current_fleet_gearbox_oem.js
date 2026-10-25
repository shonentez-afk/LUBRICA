const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const window={LubricaSystem:{registerModule(){}}};window.window=window;
const ctx={window,console,Object,Number,String,JSON,Date,Map,Set};vm.createContext(ctx);
for(const f of ['components/registry.js','components/starter-data.js','components/gearbox-oem-data-1.0.33.60.js','components/starter-adapter.js','components/matcher.js','components/binding.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f});
const B=window.LubricaComponentBinding, all=window.LubricaComponents.all('gearbox_oil');
const by=id=>all.find(x=>x.id===id);
assert.equal(window.LubricaGearboxOemDatasetVersion,'1.0.33.60-current-fleet-oem');

// P0: Tandler EA1 must never fall through to the B1 fuzzy candidate.
let r=B.resolve('TANDLER Редуктор STD EА1 1:1 1','gearbox_oil');
assert.equal(r.status,'unmatched');
assert.equal(r.entry,null);
assert.equal(r.parsedGearbox?.family,'STDEA1UNCONFIRMED');
assert(/семейство STDEA1UNCONFIRMED/.test(r.reason));
// A persisted automatic B1 link for an EA1 structural designation must be invalidated on database activation/reconcile.
const migratedDb={equipment:[{id:'EQ-T',name:'Test'}],components:[{id:'COMP-T',equipmentId:'EQ-T',manufacturer:'TANDLER',name:'Редуктор STD EА1 1:1 1'}],lubricationPoints:[{id:'LP-T',equipmentId:'EQ-T',category:'gearbox_oil',componentBinding:{sourceComponentId:'COMP-T',sourceEquipmentId:'EQ-T',libraryCategory:'gearbox_oil',libraryEntryId:'STD-GBX-TANDLER-STDB1',actualLibraryEntryId:null,matchStatus:'matched',matchConfidence:.9,structuralText:'TANDLER Редуктор STD EА1 1:1 1'},gearboxOil:{manufacturer:'TANDLER',model:'STD B1',mountingPosition:'',calculation:{oemFillLiters:.8,approvedFillLiters:.8,effectiveFillLiters:.8,fillSource:'Tandler B1'}}}],tasks:[{id:'TASK-T',lubricationPointId:'LP-T',activityType:'oil_change',quantity:{approved:'0.8',calculated:.8,unit:'л',source:'Tandler B1'},schedule:{},approvalStatus:'approved',verified:true}]};
B.reconcileDatabase(migratedDb);
assert.equal(migratedDb.lubricationPoints[0].componentBinding.libraryEntryId,null);
assert.equal(migratedDb.lubricationPoints[0].componentBinding.matchStatus,'unmatched');
assert.equal(migratedDb.lubricationPoints[0].gearboxOil.calculation.oemFillLiters,undefined);
assert.equal(migratedDb.tasks[0].quantity.approved,'');
assert.equal(migratedDb.tasks[0].quantity.calculated,null);
r=B.resolve('TANDLER Редуктор STD B1 1:1 I','gearbox_oil');
assert.equal(r.entry?.id,'STD-GBX-TANDLER-STDB1');
assert.equal(r.entry.technicalData.fixedFillLiters,0.8);

// SEW suffixes A/B are mounting variants, not a different M-position.
assert.equal(B.inferGearboxMountingPosition('KH47/DRE80M4/TF/M1A-180 i=75,20'),'M1');
assert.equal(B.inferGearboxMountingPosition('KHF47DRE100M4/TF/V/M1B i=16,86'),'M1');
assert.equal(B.inferGearboxMountingPosition('SF67DRS71M4/TF/M6A i=217,41'),'M6');

// New current-fleet OEM coverage.
r=B.resolve('UNIMEC Редуктор XRC 54 S1 1:1','gearbox_oil');
assert.equal(r.entry?.id,'STD-GBX-UNIMEC-XRC54');
assert.equal(r.entry.technicalData.fixedFillLiters,0.02);

r=B.resolve('SEW EURODRIVE Редуктор планетарный PSF822 EPH07/22/14 i=20,00','gearbox_oil');
assert.equal(r.entry?.id,'STD-GBX-SEW-PSF822');
assert.equal(r.entry.technicalData.mountingFillLiters.M1,1.55);
assert.equal(r.entry.technicalData.mountingFillLiters.M2,2.55);
assert.equal(r.entry.technicalData.mountingFillLiters.M4,3.35);

r=B.resolve('SEW EURODRIVE Мотор-редуктор FH77/G DRE132S4/TF i=58.32','gearbox_oil');
assert.equal(r.entry?.id,'STD-GBX-SEW-FH77');
assert.equal(r.entry.technicalData.mountingFillLiters.M4,8.0);
r=B.resolve('SEW EURODRIVE Мотор-редуктор FH87/GDRE132M4/TF i=56,75','gearbox_oil');
assert.equal(r.entry?.id,'STD-GBX-SEW-FH87');
assert.equal(r.entry.technicalData.mountingFillLiters.M6,11.0);

r=B.resolve('SEW EURODRIVE Мотор-редуктор KHF47DRE100M4/TF/V/M1B i=16,86','gearbox_oil');
assert.equal(r.entry?.id,'STD-GBX-SEW-KHF47');
assert.equal(r.entry.technicalData.mountingFillLiters.M1,0.8);
r=B.resolve('SEW EURODRIVE Мотор-редуктор KHF87DRE132M4/TF i=49,16','gearbox_oil');
assert.equal(r.entry?.id,'STD-GBX-SEW-KHF87');
assert.equal(r.entry.technicalData.recognitionOnly,true);
r=B.resolve('SEW EURODRIVE Мотор-редуктор KA87/TDRS100M4BE5 i=49,16','gearbox_oil');
assert.equal(r.entry?.id,'STD-GBX-SEW-KA87');
assert.equal(r.entry.technicalData.mountingFillLiters.M4,10.9);
r=B.resolve('SEW EURODRIVE Мотор-редуктор SF67DRS71M4/TF/M6A i=217,41','gearbox_oil');
assert.equal(r.entry?.id,'STD-GBX-SEW-SF67');
assert.equal(r.entry.technicalData.mountingFillLiters.M6,2.7);

// Existing KH47 now has the audited M1 fill.
r=B.resolve('SEW EURODRIVE Мотор-редуктор KH47/DRE80M4/TF/M1A-180 i=75,20','gearbox_oil');
assert.equal(r.entry?.id,'STD-GBX-SEW-KH47');
assert.equal(r.entry.technicalData.mountingFillLiters.M1,0.8);

// Rossi MRIV63 is recognition-only: no guessed fill.
r=B.resolve('Редуктор MRIV 63UO2A 1:101,6 B3PAM 80','gearbox_oil');
assert.equal(r.entry?.id,'STD-GBX-ROSSI-MRIV63');
assert.equal(r.entry.technicalData.recognitionOnly,true);
assert.equal(r.entry.technicalData.fixedFillLiters,undefined);

// Bonfiglioli new exact P execution is recognized but OEM fill remains deliberately absent.
r=B.resolve('BONFIGLIOLI Редуктор C412/P 1:31,4 B6 PAM100','gearbox_oil');
assert.equal(r.entry?.id,'STD-GBX-BONF-C412-P-31_4-P100-B6');
assert.equal(r.entry.technicalData.technicalSupportRequired,true);
assert.equal(r.entry.technicalData.fixedFillLiters,undefined);

// Existing safety policies remain intact.
r=B.resolve('Редуктор угловой Z-50-SN i=7:1 ZIMM','gearbox_oil');
assert.equal(r.status,'unmatched'); assert.equal(r.wrongDomain,true);
r=B.resolve('Редуктор RV-450E 3HAC022644-001','gearbox_oil');
assert.equal(r.status,'unmatched'); assert.equal(r.wrongDomain,true); assert.equal(r.serviceDomain,'robot_joint_grease');
r=B.resolve('BONFIGLIOLI Редуктор MRV 81UO3A 1:50 B6 PAM 100','gearbox_oil');
assert.equal(r.status,'unmatched'); assert.equal(r.entry,null); assert(/Конфликт производителя/.test(r.reason));

console.log('PASS 1.0.33.60 current-fleet gearbox OEM coverage + Tandler EA1 guard + SEW mounting suffix parser');
