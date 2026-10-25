const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const database={
  componentLibraryEntries:[],
  equipment:[
    {id:'EQ-1',name:'Конвейер 1'},
    {id:'EQ-2',name:'Конвейер 2'}
  ],
  components:[
    {id:'COMP-1',equipmentId:'EQ-1',manufacturer:'BONFIGLIOLI',name:'Редуктор C412/P 1:25 B3 PAM 100',externalCode:'10108109'},
    {id:'COMP-2',equipmentId:'EQ-2',manufacturer:'BONFIGLIOLI',name:'Редуктор C412/P 1:25 B3 PAM 100',externalCode:'10110059'}
  ],
  lubricationPoints:[
    {id:'LP-1',equipmentId:'EQ-1',category:'gearbox_oil',componentBinding:{sourceComponentId:'COMP-1',sourceEquipmentId:'EQ-1',libraryCategory:'gearbox_oil',libraryEntryId:null,actualLibraryEntryId:null,matchStatus:'unmatched',matchConfidence:0,matchReason:'Совпадение в Справочнике не найдено',structuralText:'BONFIGLIOLI Редуктор C412/P 1:25 B3 PAM 100 10108109 Конвейер 1'},gearboxOil:{manufacturer:'',model:'',mountingPosition:'',calculation:{}}},
    {id:'LP-2',equipmentId:'EQ-2',category:'gearbox_oil',componentBinding:{sourceComponentId:'COMP-2',sourceEquipmentId:'EQ-2',libraryCategory:'gearbox_oil',libraryEntryId:'STD-GBX-UNITDRIVE-UDRV110',actualLibraryEntryId:null,matchStatus:'suggested',matchConfidence:.86,matchReason:'Найдено вероятное совпадение после нормализации',structuralText:'BONFIGLIOLI Редуктор C412/P 1:25 B3 PAM 100 10110059 Конвейер 2'},linkedTechnicalData:{gearboxType:'Червячный редуктор',series:'UD-RV',size:'110',mountingFillLiters:{B3:3}},linkedLubricationData:{fillPolicy:'catalog_by_mounting_position'},gearboxOil:{manufacturer:'UNIT DRIVE / ООО ПТЦ «Привод»',model:'UD-RV110',mountingPosition:'',calculation:{oemFillLiters:null,fillOptionsLiters:[],fillSource:'',viscosityGrade:''},fillOptionsLiters:[]}}
  ]
};
const window={LubricaSystem:{registerModule(){}},LubricaCore:{State:{getDatabase(){return database}}}};window.window=window;
const ctx={window,console,Object,Number,String,JSON,Date,Map,Set};vm.createContext(ctx);
for(const f of ['components/registry.js','components/starter-data.js','components/starter-adapter.js','components/matcher.js','components/binding.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f});
const B=window.LubricaComponentBinding;
const parsed=B.parseBonfiglioliCSeries('BONFIGLIOLI Редуктор C412/P 1:25 B3 PAM 100');
assert.deepEqual({family:parsed.family,execution:parsed.execution,ratio:parsed.ratio,mountingPosition:parsed.mountingPosition,adapter:parsed.adapter},{family:'C412',execution:'P',ratio:25,mountingPosition:'B3',adapter:100});
assert.equal(B.inferGearboxMountingPosition('C412/P 1:25 B3 PAM 100'),'B3');
assert.equal(B.inferGearboxMountingPosition('MW75/U 1:80 B5PAM 80'),'B5');
assert.equal(B.inferGearboxMountingPosition('MRV 50 1:15 V6 PAM 80'),'V6');
assert.equal(B.inferGearboxMountingPosition('F603 H60 1:32,1 H1 PAM 132'),'H1');
assert.equal(B.inferGearboxMountingPosition('R77DR63L6/M1'),'M1');
let r=B.resolve('BONFIGLIOLI Редуктор C412/P 1:25 B3 PAM 100','gearbox_oil');
assert.equal(r.status,'matched');assert.equal(r.entry.id,'STD-GBX-BONF-C412-P-25-P100-B3');assert.equal(r.confidence,1);
assert.equal(r.entry.technicalData.fillVerificationRequired,true);assert(!('fixedFillLiters' in r.entry.technicalData));
r=B.resolve('BONFIGLIOLI Редуктор C412/P 1:26 B3 PAM 100','gearbox_oil');
assert.equal(r.status,'unmatched');assert.equal(r.entry,null);assert(/чужое семейство не подставляется/.test(r.reason));
r=B.resolve('C412/UFB 1:9,6 B5 PAM 100','gearbox_oil');
assert.equal(r.entry.id,'STD-GBX-BONF-C412-UFB-9_6-P100-B5');assert.equal(r.entry.technicalData.fixedFillLiters,2.4);
const rec=B.reconcileDatabase(database);assert(rec.changed>=2);
for(const p of database.lubricationPoints){
  assert.equal(p.componentBinding.libraryEntryId,'STD-GBX-BONF-C412-P-25-P100-B3');
  assert.equal(p.componentBinding.matchStatus,'matched');assert.equal(p.componentBinding.matchConfidence,1);
  assert.equal(p.gearboxOil.manufacturer,'BONFIGLIOLI');assert.equal(p.gearboxOil.model,'C 41 2 P 25 P100 B3');assert.equal(p.gearboxOil.mountingPosition,'B3');
  assert.equal(p.gearboxOil.calculation.oemFillLiters,null);assert.equal(p.gearboxOil.calculation.fillSource,'');
  assert.equal(p.linkedTechnicalData.execution,'P');assert.equal(p.linkedTechnicalData.ratio,25);assert.equal(p.linkedTechnicalData.motorAdapter,'PAM100');
}
console.log('PASS 1.0.33.56 Bonfiglioli C412/P structured recognition + safe migration');
