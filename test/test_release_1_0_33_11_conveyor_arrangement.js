const fs=require('fs'),vm=require('vm'),assert=require('assert');
const sandbox={window:{}}; sandbox.window.window=sandbox.window; sandbox.window.LubricaLubricationDomainCleanup={classifyStaticEquipment:()=>null}; vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(require('path').join(__dirname,'../import/component-classifier.js'),'utf8'),sandbox);
const C=sandbox.window.LubricaClassifier;
const db={components:[
{id:'C1',equipmentId:'E2',name:'Подшипник 22210 E',candidateState:'candidate',candidateCategory:'bearing',candidateLabel:'Подшипник'},
{id:'C2',equipmentId:'E2',name:'Цепь роликовая 12B-2',candidateState:'candidate',candidateCategory:'chain',candidateLabel:'Цепь'},
{id:'C3',equipmentId:'E2',name:'Мотор-редуктор R67DRE132S4',candidateState:'equipment',candidateEquipmentType:'motor_gearbox',candidateLabel:'Мотор-редуктор'},
{id:'C4',equipmentId:'E2',name:'Вал приводной',candidateState:'review',candidateEquipmentType:'rotating_shaft',candidateLabel:'Вал / вращающийся узел'},
{id:'C5',equipmentId:'E2',name:'Звездочка 12B-2',candidateState:'excluded',candidateReason:'Звёздочка сама по себе не является точкой смазки'},
{id:'C6',equipmentId:'E2',name:'Вал натяжной',candidateState:'review',candidateEquipmentType:'rotating_shaft',candidateEquipmentSubtype:'tension',candidateLabel:'Вал / вращающийся узел'}
],equipment:[
{id:'E1',name:'Конвейеры',equipmentType:'conveyor',parentEquipmentId:null},
{id:'E2',name:'Конвейер ленточный приемный',equipmentType:'conveyor',parentEquipmentId:'E1'}
],meta:{}};
const result=C.classifyDatabase(db).database;
const group=result.equipment.find(e=>e.id==='E1'),conv=result.equipment.find(e=>e.id==='E2');
assert.equal(result.meta.classificationVersion,'2.7');
assert.equal(group.maintenanceCandidateKind,'structure_container');
assert.equal(group.maintenanceTemplate,null);
assert.equal(conv.maintenanceCandidateState,'equipment');
assert.equal(conv.maintenanceEquipmentType,'conveyor');
assert.equal(conv.maintenanceTemplate.id,'conveyor_arrangement');
const ev=conv.maintenanceTemplate.evidence;
assert.equal(ev.byCategory.bearing,1);assert.equal(ev.byCategory.chain,1);assert.equal(ev.assets.length,1);
assert(ev.context.some(x=>/вал/i.test(x.name)));assert(ev.excluded.some(x=>/звезд/i.test(x.name)));
assert(ev.supportLayout,'four-support layout missing');assert.equal(ev.supportLayout.supports.length,4);assert.equal(ev.supportLayout.bearingReference.id,'C1');
console.log('1.0.33.11 conveyor arrangement classifier: OK');
