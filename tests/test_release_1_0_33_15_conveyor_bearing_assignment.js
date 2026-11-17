const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const sandbox={window:{}};sandbox.window.window=sandbox.window;sandbox.window.LubricaLubricationDomainCleanup={classifyStaticEquipment:()=>null};
sandbox.window.LubricaCore={IDs:{nextFrom(arr,prefix,digits){let n=1;while((arr||[]).some(x=>x.id===`${prefix}-${String(n).padStart(digits,'0')}`))n++;return `${prefix}-${String(n).padStart(digits,'0')}`}}};
vm.createContext(sandbox);
for(const rel of ['import/component-classifier.js','conveyors/conveyor-arrangement.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',rel),'utf8'),sandbox);
const C=sandbox.window.LubricaClassifier;
// Imported conveyor: two different bearing units, assignment must remain unknown until engineer maps them.
let db={equipment:[],components:[],meta:{}};
let eq={id:'EQ-1',name:'Конвейер ленточный приемный №1 Линия №2',equipmentType:'conveyor',origin:'import',status:'active'};db.equipment.push(eq);
const raw=[
{id:'C1',equipmentId:eq.id,name:'Вал приводной D=214x2828',candidateEquipmentType:'rotating_shaft',candidateEquipmentSubtype:'drive',candidateState:'review'},
{id:'C2',equipmentId:eq.id,name:'Вал натяжной D=214x2828',candidateEquipmentType:'rotating_shaft',candidateEquipmentSubtype:'tension',candidateState:'review'},
{id:'C3',equipmentId:eq.id,name:'Узел подшипниковый UCPA 210',candidateCategory:'bearing',candidateState:'candidate',candidateLabel:'Подшипник'},
{id:'C4',equipmentId:eq.id,name:'Узел подшипниковый UKHA 212',candidateCategory:'bearing',candidateState:'candidate',candidateLabel:'Подшипник'}
];db.components.push(...raw);
let classified=C.classifyEquipment(db,eq);let layout=classified.maintenanceTemplate.evidence.supportLayout;
assert(layout&&layout.supports.length===4,'four support layout required');
assert.equal(layout.bearings.length,2,'two imported bearing refs must be preserved');
assert(layout.supports.every(s=>!s.bearingRef&&!s.suggestedBearingRef),'two different imported bearings must not be auto-assigned');
// Manual conveyor: explicit, individually identified positions still map to four source TMCs.
db={equipment:[],components:[],meta:{}};eq={id:'EQ-2',name:'Конвейер ленточный ручной',equipmentType:'conveyor',origin:'manual',status:'active'};db.equipment.push(eq);
sandbox.window.LubricaConveyorArrangement.ensureManualComponents(db,eq,{driveShaftName:'Вал приводной',returnShaftRole:'driven',returnShaftName:'Вал ведомый',driveLeftBearing:'UCPA 210',driveRightBearing:'UCPA 210',returnLeftBearing:'UKHA 212',returnRightBearing:'UKHA 212',chainEnabled:false,driveEnabled:false});
db.components=db.components.map(c=>C.classifyComponent(c));classified=C.classifyEquipment(db,eq);layout=classified.maintenanceTemplate.evidence.supportLayout;
const m=Object.fromEntries(layout.supports.map(s=>[s.key,s.bearingRef?.name]));
assert.equal(m.drive_left,'UCPA 210');assert.equal(m.drive_right,'UCPA 210');assert.equal(m.return_left,'UKHA 212');assert.equal(m.return_right,'UKHA 212');
console.log('PASS 1.0.33.15 conveyor bearing assignment + manual four-support input');
