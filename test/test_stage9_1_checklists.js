const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');
let database={
 materials:[{id:'MAT-1',code:'GR-001',name:'Mobilux EP2'}],
 tools:[{id:'TOOL-1',code:'GUN-001',name:'Шприц №1',calibrationUnit:'г/качок',calibrationValue:5}],
 equipment:[{id:'E1',name:'Конвейер',externalCode:'678543'},{id:'E2',name:'Вентилятор',externalCode:'678545'}],
 nodes:[{id:'N1',equipmentId:'E1',name:'Приводный и паразитный валы'},{id:'N2',equipmentId:'E2',name:'Блок подшипников, DE'}],
 lubricationPoints:[{id:'LP1',legacyId:'LP-001',equipmentId:'E1',nodeId:'N1',name:'Правый подшипник',category:'bearing',targetMaterialId:'MAT-1'},{id:'LP2',legacyId:'LP-002',equipmentId:'E2',nodeId:'N2',name:'Подшипник DE',category:'bearing',targetMaterialId:'MAT-1'}],
 tasks:[
  {id:'T1',lubricationPointId:'LP1',activityType:'regrease',operation:'Досмазывание',materialMode:'point_target',toolId:'TOOL-1',quantity:{approved:'25',unit:'г',calculatedStrokes:5}},
  {id:'T2',lubricationPointId:'LP2',activityType:'regrease',operation:'Досмазывание',materialMode:'point_target',toolId:'TOOL-1',quantity:{approved:'20',unit:'г',calculatedStrokes:4}}
 ],checklistRuns:[]
};
const window={LubricaSystem:{registerModule(){}},LubricaCore:{State:{getDatabase:()=>database,setDatabase:d=>database=d}},taskKey:p=>p.taskId||p.id};window.window=window;
const ctx={window,console};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,'checklist/checklist-engine.js'),'utf8'),ctx);
const E=window.LubricaChecklistEngine,a=(x,m)=>{if(!x)throw new Error(m)};
const route={id:'M-001',name:'Маршрут',line:'Линия 1',area:'Упаковка',assignee:'Смазчик',interval:'4 недели',estimatedMinutes:20,points:[
 {taskId:'T1',pointDisplayId:'LP-001',equipment:'Конвейер',position:'678543',unit:'Приводный и паразитный валы',operation:'Досмазывание',material:'Mobilux EP2',type:'bearing'},
 {taskId:'T2',pointDisplayId:'LP-002',equipment:'Вентилятор',position:'678545',unit:'Блок подшипников, DE',operation:'Досмазывание',material:'Mobilux EP2',type:'bearing'}
]};
const model=E.model(route,database);a(model.groups.length===2,'equipment grouping');a(model.groups[0].tasks[0].materialCode==='GR-001','grease code');a(model.groups[0].tasks[0].toolCode==='GUN-001','tool code');a(model.groups[0].tasks[0].quantity==='25 г (5 кач. · 5 г/качок)','quantity + strokes + gun calibration');a(model.groups[0].tasks[0].quantityPrimary==='25 г','primary material quantity');a(model.groups[0].tasks[0].equipmentQuantity==='5 кач. · 5 г/качок','equipment dosing detail');

// Assigned lubrication equipment must enrich the checklist quantity with its configured dosing/rate parameter.
let dd=E.toolDeliveryDetails({calibrationValue:3,calibrationUnit:'мл/ход'},{},45,'мл');a(dd.displayText==='15 ход. · 3 мл/ход','oil can strokes');
dd=E.toolDeliveryDetails({calibrationValue:3,calibrationUnit:'л/мин'},{},12,'л');a(dd.displayText==='4 мин подачи · 3 л/мин','oil pump runtime');
dd=E.toolDeliveryDetails({calibrationValue:25,calibrationUnit:'мл/импульс'},{},0.5,'л');a(dd.displayText==='20 имп. · 25 мл/импульс','metered oil impulses with l-to-ml conversion');
dd=E.toolDeliveryDetails({calibrationValue:10,calibrationUnit:'г/цикл'},{},50,'г');a(dd.displayText==='5 цикл. · 10 г/цикл','grease pump cycles');
dd=E.toolDeliveryDetails({calibrationValue:10,calibrationUnit:'мл/сутки'},{},30,'мл');a(dd.displayText==='3 сут подачи · 10 мл/сутки','single-point lubricator duration');
dd=E.toolDeliveryDetails({calibrationValue:20,calibrationUnit:'кап/мин'},{},45,'мл');a(dd.displayText==='Настройка: 20 кап/мин','non-convertible drip rate retained');
dd=E.toolDeliveryDetails({calibrationValue:5,calibrationUnit:'л'},{},12,'л');a(dd.displayText==='Параметр оборудования: 5 л','plain equipment parameter retained');

const tpl=E.templateFor(route.points[0],database.tasks[0]);a(tpl.steps.some(x=>x.includes('кодировку смазочного пистолета')),'bearing checklist code verification');a(tpl.steps.some(x=>x.includes('пресс-маслёнки')),'bearing grease nipple instruction');
// Legacy route can contain material/tool names without IDs; checklist must still recover codes from the library.
database.tasks[0].materialId=null;database.tasks[0].materialName='Mobilux EP2';database.tasks[0].materialMode='explicit';database.tasks[0].toolId=null;route.points[0].material='Mobilux EP2';route.points[0].toolName='Шприц №1';const fallback=E.model(route,database).groups[0].tasks[0];a(fallback.materialCode==='GR-001','material code fallback by name');a(fallback.toolCode==='GUN-001','tool code fallback by name');
database.tasks[0].materialMode='point_target';database.tasks[0].toolId='TOOL-1';
let run=E.createRun(route.id,{date:'2026-09-04',performer:'Иванов',shift:'1'});a(run&&database.checklistRuns.length===1,'run persistence');
const same=E.createRun(route.id);a(same.id===run.id&&database.checklistRuns.length===1,'do not create duplicate active run');
E.updateTask(run.id,'T1',{done:true,observations:'Норма'});let p=E.progress(run,route);a(p.done===1&&p.total===2&&p.percent===50&&!p.complete,'progress 50');
a(E.completeRun(run.id,route)===null,'cannot complete unfinished route');
E.updateTask(run.id,'T2',{done:true});p=E.progress(run,route);a(p.percent===100&&p.complete,'progress 100');
E.updateRun(run.id,{comments:'Без замечаний'});const completed=E.completeRun(run.id,route);a(completed&&database.checklistRuns[0].status==='completed'&&database.checklistRuns[0].comments==='Без замечаний','complete + comments');
a(E.latestRun(route.id,{includeCompleted:false})===null,'no active run after completion');
const next=E.createRun(route.id);a(next.id!==run.id&&next.status==='in_progress','new cycle after completion');
// Legacy/conflict scenario: two active runs must collapse to newest instead of making completion look ineffective.
database.checklistRuns.push({id:'CHK-LEGACY',routeId:route.id,status:'in_progress',startedAt:'2020-01-01T00:00:00.000Z',taskResults:{}});
const active=E.latestRun(route.id,{includeCompleted:false});a(active.id===next.id,'newest active run retained');a(database.checklistRuns.find(x=>x.id==='CHK-LEGACY').status==='superseded','stale active run superseded');
console.log('STAGE 9.1 CHECKLISTS TEST PASS');
