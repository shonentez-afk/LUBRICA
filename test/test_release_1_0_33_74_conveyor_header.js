const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const eq={id:'EQ-1',name:'Конвейер роликовый охлаждающий',externalCode:'10108574',
 equipmentType:'conveyor',maintenanceCandidateState:'unclassified',maintenanceLabel:'Не классифицировано',
 status:'active',origin:'import'};
let database={equipment:[eq],components:[],lubricationPoints:[],nodes:[],tasks:[],routes:[],
 routePlanItems:[],checklistRuns:[],meta:{}};
let saveButton={onclick:null}, opened=0, closed=0;
const form={elements:{conveyorSubtypeChoice:{value:'roller'}},
 querySelector:(query)=>query==='[data-save]'?saveButton:null,
 querySelectorAll:()=>[]};
const dlg={innerHTML:'',classList:{add(){},remove(){}},
 querySelector:()=>form,showModal(){opened++},close(){closed++}};
const document={getElementById:(id)=>id==='structureDialog'?dlg:null};
const win={};win.window=win;
win.LubricaCore={
 State:{getDatabase:()=>database,setDatabase:(value)=>{database=value}},
 DatabaseSchema:{clone:value=>JSON.parse(JSON.stringify(value))},
 Database:{normalize:value=>value}
};
win.LubricaLubricationDomainCleanup={classifyStaticEquipment:()=>null};
win.LubricaStructureContext={categoryLabels:{bearing:'Подшипник',chain:'Цепь'},
 operationOptions:()=>['Досмазывание'],
 activityOptions:()=>[],
 activityTypeForLabel:()=> 'regrease',
 activityLabel:()=> 'Досмазывание',
 activityNeedsMaterial:()=>true};
win.LubricaApp={showToast(){},refreshFromCore(){},renderAll(){}};
win.LubricaStructure={render(){}};
const sandbox={window:win,document,console,Date,JSON};
vm.createContext(sandbox);
for(const file of ['import/component-classifier.js','conveyors/conveyor-arrangement.js','import/candidate-finalizer.js'])
 vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),sandbox,{filename:file});
const Finalizer=win.LubricaCandidateFinalizer;
const before=JSON.stringify(database);
Finalizer.open('equipment','EQ-1');
assert(dlg.innerHTML.includes('<h2>Роликовый конвейер</h2>'),'Header must reflect effective type');
assert(dlg.innerHTML.includes('<b>Конвейер роликовый охлаждающий</b>'),'Actual machine name is retained');
assert(!dlg.innerHTML.includes('<h2>Не классифицировано</h2>'),'Stale import label must never be used as header');
assert.equal(JSON.stringify(database),before,'Opening a constructor must not change DB');
assert.equal(opened,1);
assert.equal(typeof saveButton.onclick,'function','Save subtype with zero points remains available');
Finalizer.open('equipment','EQ-1',null,'chain');
assert(dlg.innerHTML.includes('<h2>Цепной конвейер</h2>'),'Header must follow selected subtype');
assert.equal(JSON.stringify(database),before,'Changing subtype preview does not mutate DB');
const prevSave=saveButton.onclick;
const priorOpen=opened;
Finalizer.open('equipment','EQ-1');
console.log('DEBUG header third open',opened,priorOpen,saveButton.onclick===prevSave,dlg.innerHTML.includes('<h2>Роликовый конвейер</h2>'));
const previewTyped=win.LubricaClassifier.classifyEquipment(database,database.equipment[0]);
console.log('DEBUG Stage 5B.9 old header: typed',previewTyped.maintenanceEquipmentType,previewTyped.maintenanceTemplate?.id,'specs',Finalizer.specsFor(previewTyped,'equipment').map(x=>x.key),'save',typeof saveButton.onclick);
saveButton.onclick();
console.log('DEBUG Stage 5B.9 after save:',database.equipment[0].maintenanceEquipmentType,database.equipment[0].maintenanceLabel,database.equipment[0].confirmedConveyorSubtype);

assert.equal(database.equipment[0].maintenanceLabel,'Роликовый конвейер','saved maintenance label');
assert.equal(database.equipment[0].confirmedConveyorSubtype,'roller','saved subtype');
assert.equal(database.equipment[0].maintenanceCandidateState,'review','unconfirmed points remain in review');
assert.equal(database.equipment[0].name,'Конвейер роликовый охлаждающий','actual name cannot change');
assert.equal(database.lubricationPoints.length,0,'no phantom service point');
assert.equal(database.tasks.length,0,'no phantom maintenance tasks');
assert(closed>0,'save closes dialog');
console.log('PASS Stage 5B: detected conveyor title, read-only subtype preview and persisted label without virtual points');
