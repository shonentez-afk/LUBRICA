const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const window={LubricaSystem:{registerModule(){}}};window.window=window;
const ctx={window,console,Object,Number,String,JSON,Date,Map,Set};vm.createContext(ctx);
for(const f of ['components/registry.js','components/starter-data.js','components/gearbox-oem-data-1.0.33.59.js','components/gearbox-oem-data-1.0.33.60.js','components/gearbox-oem-data-1.0.33.61.js','components/gearbox-oem-data-1.0.33.66.js','components/starter-adapter.js','components/matcher.js','components/binding.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f});
const B=window.LubricaComponentBinding,all=window.LubricaComponents.all('gearbox_oil'),by=id=>all.find(e=>e.id===id);
assert.equal(window.LubricaGearboxOemDatasetVersion,'1.0.33.66-pp53736-gearbox-audit');

// PP-53736 passport designations must resolve without interpreting motor pole codes as mounting positions.
assert.equal(B.inferGearboxMountingPosition('K37DRE100M4/TF'),'');
assert.equal(B.inferGearboxMountingPosition('S37 DRE80 M4/TF'),'');
assert.equal(B.inferGearboxMountingPosition('KF37R17DR63S4/TF'),'');
assert.equal(B.inferGearboxMountingPosition('R77DRE132S4/TF/ES7C/V i=23,37'),'');
assert.equal(B.inferGearboxMountingPosition('R77DV100M4/M2/0'),'M2');
assert.equal(B.inferGearboxMountingPosition('KHF47DRE100M4/TF/V/M1B'),'M1');

let e=by('STD-GBX-SEW-K37');assert(e);assert.deepStrictEqual(JSON.parse(JSON.stringify(e.technicalData.mountingPositions)),['M1','M2','M3','M4','M5','M6']);assert.equal(e.technicalData.mountingFillLiters.M4,1.4);assert.equal(e.technicalData.mountingFillLiters.M6,1.0);

e=by('STD-GBX-SEW-R77');assert(e);assert.equal(Object.keys(e.technicalData.mountingFillOptionsLiters||{}).length,0,'standalone PP-53736 R77 must not inherit compound R..R parenthesized alternatives');assert.equal(e.technicalData.mountingFillLiters.M1,1.2);assert.equal(e.technicalData.mountingFillLiters.M2,3.8);assert.equal(e.technicalData.mountingFillLiters.M4,4.1);

e=by('STD-GBX-SEW-KF37R17');assert(e);assert.equal(e.technicalData.compoundGearUnit,true);assert.equal(e.technicalData.recognitionOnly,false);assert.equal(e.technicalData.mountingFillLiters.M1,0.75);assert.equal(e.technicalData.mountingFillLiters.M4,2.05);assert.equal(e.technicalData.compoundSections.length,2);assert.equal(e.technicalData.compoundSections[0].mountingFillLiters.M2,1.1);assert.equal(e.technicalData.compoundSections[1].mountingFillLiters.M2,0.55);

e=by('STD-GBX-SEW-S37');assert(e);assert.equal(e.technicalData.mountingFillLiters.M1,0.25);assert.equal(e.technicalData.mountingFillLiters.M4,0.55);assert.equal(e.technicalData.mountingFillLiters.M6,0.40);assert.equal(e.lubricationData.recommendedOil.isoViscosity,'VG680');

let r=B.resolve('SEW EURODRIVE Мотор-редуктор KF37R17DR63S4/TF','gearbox_oil');assert.equal(r.entry?.id,'STD-GBX-SEW-KF37R17');
r=B.resolve('SEW EURODRIVE Мотор-редуктор K37DRE100M4/TF','gearbox_oil');assert.equal(r.entry?.id,'STD-GBX-SEW-K37');
r=B.resolve('SEW EURODRIVE Мотор-редуктор R77DRE132S4/TF/ES7C/V i=23,37','gearbox_oil');assert.equal(r.entry?.id,'STD-GBX-SEW-R77');
r=B.resolve('SEW EURODRIVE Мотор-редуктор S37 DRE80 M4/TF','gearbox_oil');assert.equal(r.entry?.id,'STD-GBX-SEW-S37');
r=B.resolve('TANDLER Редуктор HW A1 1:1 III','gearbox_oil');assert.equal(r.entry?.id,'STD-GBX-TANDLER-HWA1');assert.equal(r.entry.technicalData.fixedFillLiters,0.6);

// Static UI contract: compound cavity breakdown + PP-53736 machine-OEM priority.
// 1.0.33.67 intentionally stopped interpreting the undocumented 500 h token as a first-service interval.
const adapter=fs.readFileSync(path.join(root,'calculations/gearbox-oil-adapter.js'),'utf8');
assert(adapter.includes('data-gearbox-compound-breakdown'));
assert(adapter.includes('Составной редуктор · две отдельные масляные полости'));
assert(adapter.includes("form.elements.changeHours.value='5000'"));
assert(adapter.includes('5000/500 h'));
assert(adapter.includes('PP-53736: назначенный материал'));

const machine=fs.readFileSync(path.join(root,'machines/izoteh-pp53736-arrangement.js'),'utf8');
assert(machine.includes("gearboxFirstChangeHours:null"));
assert(machine.includes("machineOemViscosity:'VG46'"));
assert(machine.includes("machineOemOilExecutionConfirmed:true"));

console.log('PASS 1.0.33.66 gearbox data regression under current interval semantics: KF37R17 compound fills, K37/R77/S37 and motor-pole parser');
