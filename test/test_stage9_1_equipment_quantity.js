const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');
let database={
 materials:[{id:'M1',code:'GRE-001',name:'Grease'},{id:'M2',code:'OIL-001',name:'Oil'}],
 tools:[
  {id:'G1',code:'GG-001',name:'Шприц',calibrationValue:5,calibrationUnit:'г/качок'},
  {id:'O1',code:'OC-001',name:'Маслёнка',calibrationValue:3,calibrationUnit:'мл/ход'},
  {id:'P1',code:'OTP-001',name:'Насос',calibrationValue:3,calibrationUnit:'л/мин'},
  {id:'MOG1',code:'MOG-001',name:'Счётчик',calibrationValue:25,calibrationUnit:'мл/импульс'},
  {id:'DR1',code:'CD-001',name:'Капельная маслёнка',calibrationValue:20,calibrationUnit:'кап/мин'}
 ],
 lubricationPoints:[
  {id:'LP1',legacyId:'LP-001',name:'Подшипник',category:'bearing',targetMaterialId:'M1'},
  {id:'LP2',legacyId:'LP-002',name:'Цепь',category:'chain',targetMaterialId:'M2'}
 ],
 tasks:[
  {id:'T1',lubricationPointId:'LP1',activityType:'regrease',operation:'Досмазывание',materialMode:'point_target',toolId:'G1',quantity:{approved:'25',unit:'г'}},
  {id:'T2',lubricationPointId:'LP2',activityType:'lubricant_apply',operation:'Нанесение масла',materialMode:'point_target',toolId:'O1',quantity:{approved:'45',unit:'мл'}}
 ],checklistRuns:[]
};
const window={LubricaSystem:{registerModule(){}},LubricaCore:{State:{getDatabase:()=>database,setDatabase:d=>database=d}},taskKey:p=>p.taskId||p.id};window.window=window;
const ctx={window,console};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,'checklist/checklist-engine.js'),'utf8'),ctx);
const E=window.LubricaChecklistEngine,a=(x,m)=>{if(!x)throw new Error(m)};
const route={id:'R1',name:'Маршрут',line:'L1',area:'A1',interval:'1 неделя',estimatedMinutes:10,points:[
 {taskId:'T1',pointDisplayId:'LP-001',equipment:'Машина',position:'1001',unit:'Подшипник',operation:'Досмазывание',type:'bearing'},
 {taskId:'T2',pointDisplayId:'LP-002',equipment:'Машина',position:'1001',unit:'Цепь',operation:'Нанесение масла',type:'chain'}
]};
let m=E.model(route,database),t1=m.groups[0].tasks[0],t2=m.groups[1]?.tasks?.[0]||m.groups[0].tasks[1];
a(t1.quantityPrimary==='25 г','grease primary');
a(t1.equipmentQuantity==='5 кач. · 5 г/качок','grease strokes from tool calibration');
a(t2.quantityPrimary==='45 мл','oil primary');
a(t2.equipmentQuantity==='15 ход. · 3 мл/ход','oil strokes from tool calibration');
let x=E.toolDeliveryDetails(database.tools[2],{},12,'л');a(x.displayText==='4 мин подачи · 3 л/мин','pump runtime');
x=E.toolDeliveryDetails(database.tools[3],{},0.5,'л');a(x.displayText==='20 имп. · 25 мл/импульс','meter impulses');
x=E.toolDeliveryDetails(database.tools[4],{},45,'мл');a(x.displayText==='Настройка: 20 кап/мин','unconvertible rate shown as setting');
const run=E.createRun(route.id,{route,date:'2026-09-04',performer:'Иванов',shift:'1'});
a(run.routeSnapshot.groups[0].tasks[0].equipmentQuantity==='5 кач. · 5 г/качок','snapshot freezes equipment parameter');
database.tools[0].calibrationValue=10;
a(E.model(route,database).groups[0].tasks[0].equipmentQuantity==='2,5 кач. · 10 г/качок','live route uses new calibration');
a(E.modelForRun(route,run,database).groups[0].tasks[0].equipmentQuantity==='5 кач. · 5 г/качок','historical run retains old calibration');
console.log('STAGE 9.1 EQUIPMENT QUANTITY TEST PASS');
