const fs=require('fs'), vm=require('vm'), assert=require('assert');
const code=fs.readFileSync(__dirname+'/../import/candidate-finalizer.js','utf8');
const C={operationOptions:()=>['Досмазывание'],activityCatalog:{},activityTypeForLabel:()=> 'regrease',activityLabel:()=> 'Досмазывание',activityOptions:()=>[{type:'regrease',label:'Досмазывание'}],categoryLabels:{bearing:'Подшипник'}};
const sandbox={window:{LubricaCore:{},LubricaStructureContext:C},console}; vm.createContext(sandbox); vm.runInContext(code,sandbox);
const F=sandbox.window.LubricaCandidateFinalizer;
let rec={maintenanceTemplate:{id:'fan_bearings',evidence:{actual:[{id:'C1',source:'component',name:'Подшипник со стороны рабочего колеса'},{id:'C2',source:'component',name:'Подшипник со стороны муфты'}]}},maintenanceEquipmentType:'fan',maintenanceLabel:'Вентилятор'};
let specs=F.specsFor(rec,'equipment');
assert.equal(specs.length,2);assert.equal(specs[0].name,'Подшипник со стороны рабочего колеса');assert.equal(specs[1].name,'Подшипник со стороны муфты');
rec={maintenanceTemplate:{id:'fan_bearings',evidence:{actual:[]}},maintenanceEquipmentType:'fan',maintenanceLabel:'Вентилятор'};
specs=F.specsFor(rec,'equipment');
assert.equal(specs.length,0); // 1.0.27.31: no virtual supports when actual supports are absent
console.log('PASS fan finalizer names');
