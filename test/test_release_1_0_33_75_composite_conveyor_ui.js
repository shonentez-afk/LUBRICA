const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const parent={id:'EQ-PARENT',name:'Конвейер поворотный поз. 111',externalCode:'10111293',
 equipmentType:'conveyor',status:'active',maintenanceCandidateState:'unclassified',maintenanceLabel:'Не классифицировано'};
const roller={id:'EQ-ROLLER',parentEquipmentId:'EQ-PARENT',name:'Конвейер роликовый SPZ1600xL=5500',
 externalCode:'10111294',equipmentType:'conveyor',status:'active',maintenanceCandidateState:'unclassified'};
const belt={id:'EQ-BELT',parentEquipmentId:'EQ-PARENT',name:'Конвейер ленточный вертикальный PTM800xL=4650',
 externalCode:'10111321',equipmentType:'conveyor',status:'active',maintenanceCandidateState:'unclassified',
 maintenanceTemplate:{id:'conveyor_arrangement',evidence:{supportLayout:{confirmedBy:'legacy_four_supports',supports:[{},{},{},{}]}}}};
let database={equipment:[parent,roller,belt],components:[],nodes:[],lubricationPoints:[],
 tasks:[],routes:[],routePlanItems:[],checklistRuns:[]};
const buttons=['EQ-ROLLER','EQ-BELT'].map(id=>({
 id,onclick:null,getAttribute:key=>key==='data-open-conveyor-child'?id:null
}));
const form={elements:{conveyorSubtypeChoice:{value:'turning'}},
 querySelector:q=>q==='[data-save]'?{onclick:null}:null,
 querySelectorAll:q=>q==='[data-open-conveyor-child]'?buttons:[]};
let opened=0,closed=0;
const dialog={innerHTML:'',classList:{add(){},remove(){}},querySelector:q=>q==='form'?form:null,
 showModal(){opened++},close(){closed++}};
const document={getElementById:key=>key==='structureDialog'?dialog:null};
const win={};win.window=win;
win.LubricaCore={
 State:{getDatabase:()=>database,setDatabase:d=>{database=d}},
 DatabaseSchema:{clone:d=>JSON.parse(JSON.stringify(d))},
 Database:{normalize:d=>d}
};
win.LubricaLubricationDomainCleanup={classifyStaticEquipment:()=>null};
win.LubricaStructureContext={categoryLabels:{bearing:'Подшипник'},
 operationOptions:()=>['Досмазывание'],activityOptions:()=>[],
 activityCatalog:{},activityTypeForLabel:()=> 'regrease',activityLabel:()=> 'Досмазывание',
 activityNeedsMaterial:()=>true};
win.LubricaApp={showToast(){},refreshFromCore(){},renderAll(){}};
win.LubricaStructure={render(){}};
const sandbox={window:win,document,console,Date,JSON};
vm.createContext(sandbox);
for(const file of ['import/component-classifier.js','conveyors/conveyor-arrangement.js','import/candidate-finalizer.js'])
 vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),sandbox,{filename:file});
const api=win.LubricaCandidateFinalizer;
const original=JSON.stringify(database);
api.open('equipment','EQ-PARENT');
assert(dialog.innerHTML.includes('data-conveyor-assembly="true"'));
assert(dialog.innerHTML.includes('Дочерних конвейеров: 2'));
assert(dialog.innerHTML.includes('Конвейер роликовый SPZ1600xL=5500'));
assert(dialog.innerHTML.includes('Конвейер ленточный вертикальный PTM800xL=4650'));
assert(dialog.innerHTML.includes('10111294')&&dialog.innerHTML.includes('10111321'));
assert(dialog.innerHTML.includes('У родителя нет собственных точек смазки.'));
assert(!dialog.innerHTML.includes('4 места для проверки подшипников'),'parent gets no child support layout');
assert.equal(JSON.stringify(database),original,'opening parent is read-only');
assert.equal(typeof buttons[0].onclick,'function','roller constructor button wired');
assert.equal(typeof buttons[1].onclick,'function','belt constructor button wired');
buttons[0].onclick();
assert(dialog.innerHTML.includes('<h2>Роликовый конвейер</h2>'));
assert(dialog.innerHTML.includes('<b>Конвейер роликовый SPZ1600xL=5500</b>'));
assert(!dialog.innerHTML.includes('СОСТАВНОЙ КОНВЕЙЕР'),'roller is its own machine');
assert.equal(JSON.stringify(database),original,'child switch does not persist changes');
api.open('equipment','EQ-PARENT');
buttons[1].onclick();
assert(dialog.innerHTML.includes('<h2>Ленточный / ременный конвейер</h2>'));
assert(dialog.innerHTML.includes('<b>Конвейер ленточный вертикальный PTM800xL=4650</b>'));
assert(!dialog.innerHTML.includes('4 места для проверки подшипников'),'stale legacy support layout ignored');
assert(!dialog.innerHTML.includes('СОСТАВНОЙ КОНВЕЙЕР'),'belt is its own machine');
assert.equal(JSON.stringify(database),original);
assert(opened>=4 && closed>=2,'navigation runs without persistence');
console.log('PASS Stage 5B composite conveyor: parent+2 child wizard buttons, read-only ownership and stale legacy support guard');
