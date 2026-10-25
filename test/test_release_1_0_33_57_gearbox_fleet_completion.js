const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const database={componentLibraryEntries:[],equipment:[{id:'EQ1',name:'Drive 1'},{id:'EQ2',name:'Drive 2'},{id:'EQ3',name:'Drive 3'}],components:[
 {id:'C1',equipmentId:'EQ1',manufacturer:'SEW EURODRIVE',name:'Мотор-редуктор R97 DRE132M4/TF/ES7C/V i=25,03'},
 {id:'C2',equipmentId:'EQ2',manufacturer:'BONFIGLIOLI',name:'Редуктор MRV 63UO3A 1:16'},
 {id:'C3',equipmentId:'EQ3',manufacturer:'LENZE',name:'Мотор-редуктор GST05-2M VBR 063C42 i=50,05'}
],lubricationPoints:[
 {id:'LP1',equipmentId:'EQ1',category:'gearbox_oil',componentBinding:{sourceComponentId:'C1',sourceEquipmentId:'EQ1',libraryCategory:'gearbox_oil',libraryEntryId:'STD-GBX-UNITDRIVE-UDPC080',actualLibraryEntryId:null,matchStatus:'suggested',matchConfidence:.86,structuralText:'SEW EURODRIVE Мотор-редуктор R97 DRE132M4/TF/ES7C/V i=25,03 Drive 1'},linkedTechnicalData:{series:'UD-PC',fixedFillLiters:.15},linkedLubricationData:{},gearboxOil:{manufacturer:'UNIT DRIVE / ООО ПТЦ «Привод»',model:'UD-PC080',mountingPosition:'',calculation:{oemFillLiters:.15,fillSource:'legacy'}}},
 {id:'LP2',equipmentId:'EQ2',category:'gearbox_oil',componentBinding:{sourceComponentId:'C2',sourceEquipmentId:'EQ2',libraryCategory:'gearbox_oil',libraryEntryId:'STD-GBX-ROSSI-MRV63-16',actualLibraryEntryId:null,matchStatus:'matched',matchConfidence:1,structuralText:'BONFIGLIOLI Редуктор MRV 63UO3A 1:16 Drive 2'},linkedTechnicalData:{series:'MR V',mountingFillLiters:{B3:.8}},linkedLubricationData:{},gearboxOil:{manufacturer:'ROSSI',model:'MR V 63 UO3A / 16',mountingPosition:'B3',calculation:{oemFillLiters:.8,fillSource:'legacy'}}},
 {id:'LP3',equipmentId:'EQ3',category:'gearbox_oil',componentBinding:{sourceComponentId:'C3',sourceEquipmentId:'EQ3',libraryCategory:'gearbox_oil',libraryEntryId:null,actualLibraryEntryId:null,matchStatus:'unmatched',matchConfidence:0,structuralText:'LENZE Мотор-редуктор GST05-2M VBR 063C42 i=50,05 Drive 3'},gearboxOil:{manufacturer:'',model:'',mountingPosition:'',calculation:{}}},
 {id:'LP4',equipmentId:'EQ1',category:'gearbox_oil',componentBinding:{sourceComponentId:'C1',sourceEquipmentId:'EQ1',libraryCategory:'gearbox_oil',libraryEntryId:'STD-GBX-UNITDRIVE-UDPC080',actualLibraryEntryId:'STD-GBX-UNITDRIVE-UDPC080',matchStatus:'matched',matchConfidence:1,structuralText:'SEW EURODRIVE Мотор-редуктор R97 DRE132M4/TF/ES7C/V i=25,03 Drive 1'},gearboxOil:{manufacturer:'UNIT DRIVE / ООО ПТЦ «Привод»',model:'UD-PC080',mountingPosition:'',calculation:{approvedFillLiters:.15,oemFillLiters:.15}}}
]};
const window={LubricaSystem:{registerModule(){}},LubricaCore:{State:{getDatabase(){return database}}}};window.window=window;
const ctx={window,console,Object,Number,String,JSON,Date,Map,Set};vm.createContext(ctx);
for(const f of ['components/registry.js','components/starter-data.js','components/starter-adapter.js','components/matcher.js','components/binding.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f});
const B=window.LubricaComponentBinding,all=window.LubricaComponents.all('gearbox_oil');
assert(all.length>=99,'gearbox fleet library not expanded');
const check=(text,oem,id)=>{const r=B.resolve(text,'gearbox_oil');assert(r.entry,`unmatched ${text}: ${r.reason}`);assert.equal(B.entryGearboxIdentity(r.entry).oem,oem,`wrong OEM for ${text}`);if(id)assert.equal(r.entry.id,id);return r};
check('SEW EURODRIVE Мотор-редуктор R97 DRE132M4/TF/ES7C/V i=25,03','SEW-EURODRIVE','STD-GBX-SEW-R97');
check('SEW EURODRIVE Мотор-редуктор SA47DRS80M4/TF/M1-A/270°','SEW-EURODRIVE','STD-GBX-SEW-SA47');
check('Мотор-редуктор K57TDRS90L4/TF/M3-B/90°','SEW-EURODRIVE','STD-GBX-SEW-K57');
check('BONFIGLIOLI Редуктор C413/P 1:31,2 B6 PAM 100','BONFIGLIOLI');
check('BONFIGLIOLI Редуктор A503/UH50 1:32,4 VA PAM 90','BONFIGLIOLI');
check('BREVINI RIDUTTORI Редуктор SL8504FAR 1:233,5 EPIC. PAM 200','BREVINI RIDUTTORI','STD-GBX-BREVINI-SL8504');
check('LENZE Мотор-редуктор GST05-2M VBR 063C42 i=50,05','LENZE','STD-GBX-LENZE-GST05');
check('ROSSI MOTORIDUTTORI Редуктор MRIV 80UO3A 1:11,2 B5','ROSSI','STD-GBX-ROSSI-MRIV80');
check('TANDLER Редуктор STD B1 1:1 I','TANDLER','STD-GBX-TANDLER-STDB1');
check('Редуктор угловой Z-50-SN i=7:1 ZIMM','ZIMM','STD-GBX-ZIMM-Z50SN');
let r=B.resolve('BONFIGLIOLI Редуктор MRV 81UO3A 1:50 B6 PAM 100','gearbox_oil');assert.equal(r.status,'unmatched');assert.equal(r.entry,null);assert(/Конфликт производителя/.test(r.reason));
r=B.resolve('ABB Редуктор RV-450E 3HAC022644-001','gearbox_oil');assert.equal(r.status,'unmatched');assert.equal(r.entry,null);assert(/cross-OEM|модель не найдена|семейство ABBRV/i.test(r.reason));
r=B.resolve('Редуктор Линия №1','gearbox_oil');assert.equal(r.status,'unmatched');assert.equal(r.entry,null);assert(/fuzzy-подстановка/.test(r.reason));
r=B.resolve('BONFIGLIOLI Редуктор C412/P 1:26 B3 PAM 100','gearbox_oil');assert.equal(r.status,'unmatched');assert.equal(r.entry,null);
assert.equal(B.inferGearboxMountingPosition('A503/UH50 1:32,4 VA PAM 90'),'VA');
assert.equal(B.inferGearboxMountingPosition('A202/UH30 1:29,2 VB PAM 90'),'VB');
const rec=B.reconcileDatabase(database);assert(rec.changed>=3);
assert.equal(database.lubricationPoints[0].componentBinding.libraryEntryId,'STD-GBX-SEW-R97');
assert.equal(database.lubricationPoints[0].gearboxOil.manufacturer,'SEW-EURODRIVE');
assert.equal(database.lubricationPoints[0].gearboxOil.calculation.oemFillLiters,null,'stale UNIT DRIVE fill must be cleared');
assert.equal(database.lubricationPoints[1].componentBinding.libraryEntryId,null,'OEM-conflict MRV must not retain Rossi binding');
assert.equal(database.lubricationPoints[1].gearboxOil.manufacturer,'','OEM-conflict MRV technical data must be cleared');
assert.equal(database.lubricationPoints[2].componentBinding.libraryEntryId,'STD-GBX-LENZE-GST05');
assert.equal(database.lubricationPoints[3].componentBinding.actualLibraryEntryId,'STD-GBX-UNITDRIVE-UDPC080','manual actual binding must be preserved');
assert.equal(database.lubricationPoints[3].componentBinding.libraryEntryId,'STD-GBX-UNITDRIVE-UDPC080','manual actual binding must not be auto-rewritten');
const r97=all.find(x=>x.id==='STD-GBX-SEW-R97');assert(r97);assert.deepEqual(JSON.parse(JSON.stringify(r97.technicalData.mountingFillOptionsLiters.M1)),[4.6,9.8]);assert.equal(r97.technicalData.mountingFillLiters.M4,13.4);
console.log('PASS 1.0.33.57 gearbox fleet completion + cross-OEM guard + stale binding migration');
