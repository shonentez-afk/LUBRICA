const fs=require('fs'),vm=require('vm'),assert=require('assert');
const db={components:[{id:'COMP-M1',equipmentId:'EQ1',name:'Электродвигатель DRE132MC4/FL/TF N=7,5кВт, n=1470мин-1',candidateEquipmentType:'motor'}],equipment:[{id:'EQ1',name:'Конвейер'}],lubricationPoints:[],tasks:[]};
const w={LubricaSystem:{registerModule(){}},LubricaCore:{State:{getDatabase(){return db}}},LubricaStructureContext:{save(){}}};w.window=w;const s={window:w,console};vm.createContext(s);
for(const f of ['calculations/registry.js','motors/motor-oem-data.js','motors/motor-method-resolver.js','motors/motor-calculator.js','motors/motor-ui.js','motors/motor-adapter.js','calculations/bearing-adapter.js'])vm.runInContext(fs.readFileSync(f,'utf8'),s,{filename:f});
const point={id:'LP1',category:'bearing',equipmentId:'EQ1',positionLabel:'DE',componentBinding:{sourceComponentId:'COMP-M1'}};const mod=w.LubricaCalculationRegistry.resolve({point,category:'bearing'});assert.equal(mod.id,'motor-bearing');
const generic={id:'LP2',category:'bearing',equipmentId:'EQ1'};const mod2=w.LubricaCalculationRegistry.resolve({point:generic,category:'bearing'});assert.equal(mod2.id,'bearing');
console.log('Motor Calculation Framework Integration: PASS');
