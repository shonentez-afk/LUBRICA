const fs=require('fs'), vm=require('vm'), assert=require('assert');
const code=fs.readFileSync(__dirname+'/../import/component-classifier.js','utf8');
const sandbox={window:{},console}; vm.createContext(sandbox); vm.runInContext(code,sandbox);
const C=sandbox.window.LubricaClassifier;
let r=C.classifyEquipmentText('Вентилятор центробежный V22011','fan');
assert.equal(r.equipmentType,'fan'); assert.equal(r.template.id,'fan_bearings');
for(const name of ['Рама вентилятора','Газоход вентилятора V22011 к трубе','Воздуховод вентилятора','Кожух вентилятора']){
  r=C.classifyEquipmentText(name,'fan');
  assert.notEqual(r.equipmentType,'fan',name+' must not be fan');
}
const db=JSON.parse(fs.readFileSync('/mnt/data/Филиал_завода__Техно__г._Юрга(7).json','utf8'));
C.classifyDatabase(db);
const byCode=Object.fromEntries(db.equipment.map(e=>[e.externalCode,e]));
assert.equal(byCode['10103015'].maintenanceEquipmentType,'fan','actual fan must remain fan');
assert.equal(byCode['10103019'].equipmentType,'other','fan frame stale type must be repaired');
assert.notEqual(byCode['10103019'].maintenanceEquipmentType,'fan','fan frame must not receive fan template');
assert.equal(byCode['10103020'].equipmentType,'other','fan gas duct stale type must be repaired');
assert.notEqual(byCode['10103020'].maintenanceEquipmentType,'fan','fan gas duct must not receive fan template');
// Actual support names must be retained by evidence discovery when present.
const testDb={components:[{id:'C1',equipmentId:'E1',name:'Подшипник со стороны рабочего колеса'},{id:'C2',equipmentId:'E1',name:'Подшипник со стороны муфты'}],equipment:[{id:'E1',name:'Вентилятор центробежный TEST',equipmentType:'fan'}]};
const rr=C.classifyEquipment(testDb,testDb.equipment[0]);
assert.equal(rr.maintenanceTemplate.mode,'use_actual');
assert.deepEqual(Array.from(rr.maintenanceTemplate.evidence.actual,x=>x.name),['Подшипник со стороны рабочего колеса','Подшипник со стороны муфты']);
console.log('PASS fan classifier actual-support logic');
