const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const root=path.join(__dirname,'..');
const win={};win.window=win;win.LubricaLubricationDomainCleanup={classifyStaticEquipment:()=>null};
win.LubricaCore={IDs:{nextFrom(rows,prefix,digits){let x=1;while((rows||[]).some(v=>v.id===prefix+'-'+String(x).padStart(digits,'0')))x++;return prefix+'-'+String(x).padStart(digits,'0')}}};
win.LubricaStructureContext={activityCatalog:{regrease:{label:'Досмазывание'},oil_level_check:{label:'Проверка уровня'},oil_change:{label:'Замена масла'}},
 activityLabel:k=>({regrease:'Досмазывание',oil_level_check:'Проверка уровня',oil_change:'Замена масла'}[k]||k),
 activityTypeForLabel:label=>({'Досмазывание':'regrease','Проверка уровня':'oil_level_check','Замена масла':'oil_change'}[label]||'custom'),
 activityNeedsMaterial:k=>k==='regrease'||k==='oil_change',
 operationOptions:()=>['Досмазывание']
};
const box=vm.createContext({window:win,console,Date,JSON});box.LubricaCore=win.LubricaCore;
for(const rel of ['import/component-classifier.js','conveyors/conveyor-arrangement.js','import/candidate-finalizer.js']){
 const code=fs.readFileSync(path.join(root,rel),'utf8');
 new vm.Script(code,{filename:rel});vm.runInContext(code,box,{filename:rel});
}
const C=win.LubricaClassifier,F=win.LubricaCandidateFinalizer,Arr=win.LubricaConveyorArrangement;
const cases=[
 ['10107255','Конвейер ленточный приемный','belt'],
 ['10107181','Конвейер скребковый L=25150 мм Линия №1','chain_scraper'],
 ['10111009','Конвейер ременный RET-11-200xL=925','belt'],
 ['10108215','Конвейер роликовый нижний','roller'],
 ['10208276','Конвейер ламельный верхний','lamella'],
 ['10112094','Конвейер цепной KTR3250xL=3600','chain'],
 ['10110511','Конвейер шнековый','screw'],
 ['10111293','Конвейер поворотный поз. 111','turning'],
 ['10111262','Конвейер угловой поз. 110','turning'],
 ['10111014','Конвейер весовой поз. 101','weighing'],
 ['10212029','Конвейер ленточно-роликовый','hybrid'],
 ['10101093','Конвейер отсева каменного материала','unknown']
];
for(const [externalCode,name,subtype] of cases){
 const result=C.classifyEquipmentText(name,'conveyor');
 assert.equal(result.equipmentType,'conveyor',externalCode+' type');
 assert.equal(result.equipmentSubtype,subtype,externalCode+' subtype');
 assert.equal(result.template.id,'conveyor_arrangement',externalCode+' template');
 assert.equal(result.template.conveyorSubtype,subtype,externalCode+' subtype in constructor');
 const identity=C.conveyorIdentity(name,'conveyor');
 assert.equal(identity.twoShaft,['belt','chain_scraper'].includes(subtype),externalCode+' layout policy');
}
assert.equal(C.conveyorIdentity('Конвейеры роликовые','conveyor').role,'group');
assert.equal(C.conveyorIdentity('Система смазки цепей конвейера ламельного','conveyor').role,'ancillary');
assert.equal(C.classifyEquipmentText('Система смазки цепей конвейера ламельного','conveyor').template,null);
function equipment(id,name,parent=null){return{id,name,equipmentType:'conveyor',parentEquipmentId:parent,lineId:'L1',areaId:'A1',status:'active'}}
function component(id,equipmentId,name,category=null,type=null){return {id,equipmentId,name,status:'active',candidateCategory:category,candidateEquipmentType:type,
 candidateState:category?'candidate':'review'}}
const group=equipment('GROUP','Конвейеры роликовые');
const roller=equipment('R','Конвейер роликовый SPZ1400xL=3700','GROUP');
const accessory=equipment('OIL','Система смазки цепей конвейера ламельного','LAM');
const lamella=equipment('LAM','Конвейер ламельный верхний','GROUP');
const nested=equipment('OTHER','Конвейер роликовый вспомогательный','LAM');
const rollerBearing=component('RB','R','Подшипник корпуса ролика','bearing');
const chain=component('CH','OIL','Цепь конвейерная 12B-2','chain');
const nestedBearing=component('NB','OTHER','Подшипник ролика','bearing');
const db={meta:{},equipment:[group,roller,lamella,accessory,nested],components:[rollerBearing,chain,nestedBearing],
 nodes:[],lubricationPoints:[],tasks:[],routes:[],checklistRuns:[],routePlanItems:[]};
const snap=JSON.stringify(db);
const grouped=C.classifyEquipment(db,group);
assert.equal(grouped.maintenanceCandidateKind,'structure_container');
assert.equal(grouped.maintenanceTemplate,null);
const ev=C.conveyorEvidence(db,lamella);
assert.equal(ev.conveyorSubtype,'lamella');
assert.equal(ev.descendantEquipmentCount,1,'oil-system child is included');
assert.equal(ev.byCategory.chain,1,'lubricated chain from nested ancillary system is visible');
assert.equal(ev.byCategory.bearing||0,0,'neighbor independent roller cannot leak into lamella');
assert.equal(ev.supportLayout,null,'lamella must not infer a four support layout');
const rEv=C.conveyorEvidence(db,roller);
assert.equal(rEv.count,1);
assert.equal(rEv.supportLayout,null);
let typed=C.classifyEquipment(db,lamella);
assert.equal(typed.maintenanceTemplate.evidence.byCategory.chain,1);
assert.equal(JSON.stringify(db),snap,'classification and evidence are read-only');
const breaker=equipment('B','Конвейер ленточный');
db.equipment.push(breaker);
db.components.push(component('B1','B','Подшипник 1','bearing'),component('B2','B','Подшипник 2','bearing'));
assert.equal(C.conveyorEvidence(db,breaker).supportLayout,null,'two bearings alone cannot prove two physical shafts');
db.components.push(component('S1','B','Вал приводной',null,'rotating_shaft'),component('S2','B','Вал натяжной',null,'rotating_shaft'));
const layout=C.conveyorEvidence(db,breaker).supportLayout;
assert(layout&&layout.supports.length===4,'two physical shafts can enable a four-place belt layout');
const rollerWithShaft=equipment('R2','Конвейер роликовый');
db.equipment.push(rollerWithShaft);
db.components.push(component('R1','R2','Вал приводной',null,'rotating_shaft'),
 component('R2B','R2','Вал натяжной',null,'rotating_shaft'),
 component('R3','R2','Подшипник 6205','bearing'));
assert.equal(C.conveyorEvidence(db,rollerWithShaft).supportLayout,null,'roller not forced into belt layout');
const manual=equipment('M','Конвейер роликовый');
manual.origin='manual';manual.externalCode='MAN-ROLL';db.equipment.push(manual);
Arr.ensureManualComponents(db,manual,{conveyorSubtype:'roller',chainEnabled:false,driveMode:'motor_gearbox',driveName:''});
assert.equal(manual.manualConveyorSetup.layout,'ACTUAL_COMPONENTS_ONLY');
assert.equal(db.components.filter(x=>x.equipmentId==='M').length,0,'no shaft/roller/drive/chain created from type alone');
Arr.ensureManualComponents(db,manual,{conveyorSubtype:'chain',chainEnabled:true,chainName:'Цепь роликовая 12B-2',
 driveMode:'gearbox',gearboxName:'SEW R37'});
assert.equal(manual.manualConveyorSetup.layout,'ACTUAL_COMPONENTS_ONLY');
assert.equal(db.components.filter(x=>x.equipmentId==='M'&&x.status==='active').length,2,'explicit chain and gearbox only');
assert.equal(db.components.filter(x=>x.equipmentId==='M'&&x.manualConveyorSupport).length,0);
const selected=F.specsFor(typed,'equipment');
assert.equal(selected.length,1,'one actual chain should give one actual chain proposal');
assert.equal(selected[0].sourceRef.id,'CH');
assert.equal(selected[0].category,'chain');
assert(selected[0].key.includes('CH'),'stable actual component key');
const ui=fs.readFileSync(path.join(root,'structure/entity-dialogs.js'),'utf8');
for(const subtype of ['roller','lamella','chain','screw','turning','hybrid','weighing']){
 assert(ui.includes('value="'+subtype+'"'),subtype+' shown in manual creator');
}
const finalizer=fs.readFileSync(path.join(root,'import/candidate-finalizer.js'),'utf8');
assert(finalizer.includes('transactionalConveyor'),'conveyor save uses cloned database');
assert(finalizer.includes('usedTaskIds'),'approved/route/fact reapply protection');
assert(finalizer.includes('физическое место обслуживания'),'service positions required');
console.log('PASS Stage 5B conveyor families: 12 real naming examples, groups, nested lube, layouts, manual, physical specs, guards');
