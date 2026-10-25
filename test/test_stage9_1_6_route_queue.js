const fs=require('fs'),vm=require('vm');
global.window=global;global.SCOPE_LABELS={};global.taskKey=p=>p.taskId||p.id;
let saved=null,toasts=[];
const db={
 lines:[{id:'L1',name:'Линия 1'}],areas:[{id:'A1',lineId:'L1',name:'Упаковка'}],
 equipment:[{id:'E1',lineId:'L1',areaId:'A1',name:'Конвейер',externalCode:'100'},{id:'E2',lineId:'L1',areaId:'A1',name:'Вентилятор',externalCode:'200'}],
 nodes:[{id:'N1',equipmentId:'E1',name:'Привод'},{id:'N2',equipmentId:'E2',name:'Подшипниковый узел'}],
 lubricationPoints:[
  {id:'LP1',equipmentId:'E1',nodeId:'N1',name:'Подшипник DE',category:'bearing'},
  {id:'LP2',equipmentId:'E1',nodeId:'N1',name:'Цепь',category:'chain'},
  {id:'LP3',equipmentId:'E2',nodeId:'N2',name:'Подшипник NDE',category:'bearing'}
 ],
 tasks:[
  {id:'T1A',lubricationPointId:'LP1',operation:'Осмотр',approvalStatus:'approved',schedule:{legacyText:'4 недели'}},
  {id:'T1B',lubricationPointId:'LP1',operation:'Досмазывание',approvalStatus:'approved',schedule:{legacyText:'4 недели'}},
  {id:'T2',lubricationPointId:'LP2',operation:'Нанесение смазки',approvalStatus:'approved',schedule:{legacyText:'4 недели'}},
  {id:'T3',lubricationPointId:'LP3',operation:'Досмазывание',approvalStatus:'approved',schedule:{legacyText:'4 недели'}},
  {id:'T3M',lubricationPointId:'LP3',operation:'Месячный осмотр',approvalStatus:'approved',schedule:{legacyText:'1 месяц'}}
 ],routes:[]
};
global.LubricaCore={State:{getDatabase:()=>db,setDatabase:d=>{saved=d}},Database:{toLegacy:d=>({points:d.tasks.map(t=>{const lp=d.lubricationPoints.find(x=>x.id===t.lubricationPointId),eq=d.equipment.find(x=>x.id===lp.equipmentId),node=d.nodes.find(x=>x.id===lp.nodeId);return{id:t.id,taskId:t.id,lubricationPointId:lp.id,pointDisplayId:lp.id,equipment:eq.name,position:eq.externalCode,unit:node.name,operation:t.operation,interval:t.schedule.legacyText,status:'ready',line:'Линия 1',area:'Упаковка'}})})}};
global.LubricaApp={refreshFromCore(){},showToast:m=>toasts.push(m)};global.LubricaSystem={registerModule(){}};
vm.runInThisContext(fs.readFileSync('routes/route-engine.js','utf8'),{filename:'route-engine.js'});
const E=LubricaRouteEngine,a=(x,m)=>{if(!x)throw new Error(m)};
E.syncRoutes(db);
const r4=db.routes.find(r=>r.interval==='4 недели'),r1=db.routes.find(r=>r.interval==='1 месяц');
a(r4&&r1,'routes by periodicity');
a(r4.taskIds.join(',')==='T1A,T1B,T2,T3','initial tasks');
let groups=E.pointGroupsForRoute(r4.id,db);a(groups.length===3,'three point groups');a(groups[0].pointId==='LP1'&&groups[0].taskIds.join(',')==='T1A,T1B','LP1 tasks stay grouped');
E.movePoint(r4.id,'LP3',-2,db);a(r4.taskIds.join(',')==='T3,T1A,T1B,T2','moving point moves all its task block');
E.movePointToIndex(r4.id,'LP1',2,db);a(r4.taskIds.join(',')==='T3,T2,T1A,T1B','move point to index preserves task order inside point');
E.removePointFromRoute(r4.id,'LP2',db);a(!r4.taskIds.includes('T2')&&r4.excludedTaskIds.includes('T2'),'remove native point excludes it');
let avail=E.availablePoints(r4.id,db);let lp2=avail.find(x=>x.pointId==='LP2');a(lp2&&lp2.state==='excluded','excluded point appears in add list');
let add=E.addPointToRoute(r4.id,'LP2',db);a(add.ok&&r4.taskIds.includes('T2')&&!r4.excludedTaskIds.includes('T2'),'restore point through add');
// Different periodicity task from the same point must not leak into 4-week route.
a(!r4.taskIds.includes('T3M'),'different interval task did not leak');
// Point-level move before preserves both LP1 tasks together.
E.movePointBefore(r4.id,'LP1','LP3',db);const idxA=r4.taskIds.indexOf('T1A'),idxB=r4.taskIds.indexOf('T1B');a(idxB===idxA+1,'point tasks remain contiguous after drag-style move');
// Queue state uses points, not individual tasks.
const q=E.queueState(r4.id,db);a(q.current.length===3&&q.current.reduce((n,g)=>n+g.taskIds.length,0)===4,'queue state point/task counts');
// Sync must preserve manual point order and exclusions.
const before=r4.taskIds.join(',');E.syncRoutes(db);a(r4.taskIds.join(',')===before,'sync preserves manual point queue order');
console.log('STAGE 9.1.6 ROUTE POINT QUEUE TEST PASS');
