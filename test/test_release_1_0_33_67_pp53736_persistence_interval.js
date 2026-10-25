const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const window={LubricaSystem:{registerModule(){}}};window.window=window;
const ctx={window,console,Object,Number,String,JSON,Date,Map,Set,Math,RegExp};vm.createContext(ctx);
for(const f of ['components/registry.js','components/starter-data.js','components/gearbox-oem-data-1.0.33.59.js','components/gearbox-oem-data-1.0.33.60.js','components/gearbox-oem-data-1.0.33.61.js','components/gearbox-oem-data-1.0.33.66.js','components/gearbox-oem-data-1.0.33.67.js','components/starter-adapter.js','components/matcher.js','components/binding.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f});
const B=window.LubricaComponentBinding;
assert.equal(window.LubricaGearboxOemDatasetVersion,'1.0.33.67-pp53736-persistence-audit');

// Persisted false M4 from DRE80 M4 must be cleared if it was never user-confirmed/applied.
const db={equipment:[{id:'ROOT',name:'Гофрировщик-подпрессовщик',pp53736Configuration:{r77Count:8}},{id:'E-S37',name:'Конвейер роликовый верхний'}],components:[{id:'C-S37',equipmentId:'E-S37',manufacturer:'SEW EURODRIVE',name:'Мотор-редуктор S37 DRE80 M4/TF'}],lubricationPoints:[
 {id:'P-S37',equipmentId:'E-S37',name:'Привод наклона верхнего транспортера S37',category:'gearbox_oil',machineProfileId:'IZOTEH-PP53736',componentBinding:{sourceComponentId:'C-S37',sourceEquipmentId:'E-S37',libraryCategory:'gearbox_oil',libraryEntryId:null,matchStatus:'unmatched',structuralText:'SEW EURODRIVE Мотор-редуктор S37 DRE80 M4/TF'},gearboxOil:{mountingPosition:'M4',calculation:{oilBaseType:'auto',intervalMode:'auto'}}},
 // Persisted R77 M1=3.0 was an auto-applied value from the old compound-option dataset.
 {id:'P-R77',equipmentId:'E-R77',name:'Привод сжимающих валков R77 №5',machineProfileOriginKey:'machine:IZOTEH-PP53736:ROOT:r77_5',category:'gearbox_oil',machineProfileId:'IZOTEH-PP53736',componentBinding:{sourceComponentId:'C-R77',sourceEquipmentId:'E-R77',libraryCategory:'gearbox_oil',libraryEntryId:'STD-GBX-SEW-R77',matchStatus:'matched',structuralText:'SEW EURODRIVE Мотор-редуктор R77DRE132S4/TF/ES7C/V i=23,37'},gearboxOil:{mountingPosition:'M1',calculation:{approvedFillLiters:3,effectiveFillLiters:3,appliedFillLiters:3,appliedAt:'2026-09-23T04:48:35.166Z',fillSource:'OEM dataset 1.0.33.60 · SEW-EURODRIVE R77',provenance:{sourceId:'SEW-GEARBOX-FILL'}}},calculations:{'gearbox-oil':{status:'calculated'}}}
],tasks:[
 {id:'T-S37',lubricationPointId:'P-S37',activityType:'oil_change',operation:'Замена масла',quantity:{approved:'',unit:'л'},schedule:{legacyText:'5000 ч',strategy:'По наработке',runtimeHours:5000,approvedHours:5000,machineOemRawInterval:'5000/500 h'}},
 {id:'T-R77',lubricationPointId:'P-R77',activityType:'oil_change',operation:'Замена масла',approvalStatus:'review',verified:false,quantity:{approved:'3',calculated:3,unit:'л',source:'OEM dataset 1.0.33.60 · SEW-EURODRIVE R77'},schedule:{legacyText:'36 мес.',strategy:'По календарю',approvedHours:5000,calculatedCalendarMonths:36,calendarValue:36,calendarUnit:'months',source:'SEW-EURODRIVE · OEM регламент замены масла',machineOemRawInterval:'5000/500 h',firstChangeHours:500}}
]};
db.equipment.push({id:'E-R77',name:'Гофрировщик-подпрессовщик'});db.components.push({id:'C-R77',equipmentId:'E-R77',manufacturer:'SEW EURODRIVE',name:'Мотор-редуктор R77DRE132S4/TF/ES7C/V i=23,37'});
B.reconcileDatabase(db);
const s37=db.lubricationPoints.find(x=>x.id==='P-S37');
assert.equal(s37.componentBinding.libraryEntryId,'STD-GBX-SEW-S37');
assert.equal(s37.gearboxOil.mountingPosition,'','motor pole token must not survive as gearbox M4');
assert.equal(s37.gearboxOil.mountingPositionSource,'migration_cleared_motor_pole');
assert.equal(s37.gearboxOil.calculation.oemFillLiters,null);
const r77=db.lubricationPoints.find(x=>x.id==='P-R77');
assert.equal(r77.gearboxOil.mountingPosition,'M1');
assert.equal(r77.machineOemMountingPositionHint,'M3');
assert.equal(r77.machineOemMountingPositionReviewRequired,true,'drawing M3 vs persisted M1 must be flagged, not silently overwritten');
assert.equal(r77.gearboxOil.calculation.oemFillLiters,1.2);
assert.equal(r77.gearboxOil.calculation.approvedFillLiters,undefined,'stale 3.0 L approval must be invalidated');
assert.equal(db.tasks.find(x=>x.id==='T-R77').quantity.approved,'','stale task quantity must be cleared');
const sch=db.tasks.find(x=>x.id==='T-R77').schedule;
assert.equal(sch.runtimeHours,5000);assert.equal(sch.calendarValue,null);assert.equal(sch.firstChangeHours,null);assert.equal(sch.machineOemRawInterval,'5000/500 h');assert(/значение 500 не интерпретировано/.test(sch.source));

// A1/B1/EA1 cross-family guards.
let r=B.resolve('TANDLER STD B1 1:1 I','gearbox_oil');assert.equal(r.entry?.id,'STD-GBX-TANDLER-STDB1');
r=B.resolve('TANDLER STD EA1 1:1 I','gearbox_oil');assert.notEqual(r.entry?.id,'STD-GBX-TANDLER-STDB1');
r=B.resolve('TANDLER A1 1:1 III','gearbox_oil');assert.notEqual(r.entry?.id,'STD-GBX-TANDLER-STDB1');

const adapter=fs.readFileSync(path.join(root,'calculations/gearbox-oil-adapter.js'),'utf8');
assert(adapter.includes("form.elements.firstChangeHours.value=''"));
assert(!adapter.includes("PP-53736: рабочий цикл замены 5000 ч; исходная паспортная запись 5000/500 h сохранена, 500 ч — первичный сервисный интервал."));
assert(adapter.includes("mountingPositionSource:form.elements.mountingPosition.value.trim()?'user_confirmed':''"));
assert(adapter.includes('сборочный чертёж указывает монтажное положение'));
const machine=fs.readFileSync(path.join(root,'machines/izoteh-pp53736-arrangement.js'),'utf8');
assert(machine.includes("gearboxFirstChangeHours:null"));
assert(machine.includes("gearbox500Meaning:'unresolved'"));
assert(machine.includes('без недоказанной трактовки'));
console.log('PASS 1.0.33.67 PP53736 persistence/interval: stale R77 fill reset, false SEW M4 cleared, 500 h left unresolved');
