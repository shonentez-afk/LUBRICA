const fs=require('fs'),vm=require('vm');
global.window=global;global.SCOPE_LABELS={};global.taskKey=p=>p.taskId||p.id;
const db={
 lines:[{id:'L1',name:'Линия 1'}],areas:[{id:'A1',lineId:'L1',name:'Упаковка'}],
 equipment:[{id:'E1',lineId:'L1',areaId:'A1',name:'Конвейер',externalCode:'100'}],
 nodes:[{id:'N1',equipmentId:'E1',name:'Привод'}],lubricationPoints:[{id:'LP1',legacyId:'LP-001',equipmentId:'E1',nodeId:'N1',name:'Подшипник DE'}],
 tasks:[
  {id:'T-W',lubricationPointId:'LP1',operation:'Осмотр',activityType:'inspection',approvalStatus:'approved',schedule:{legacyText:'1 неделя'}},
  {id:'T-4W-A',lubricationPointId:'LP1',operation:'Досмазка',activityType:'regrease',approvalStatus:'approved',materialName:'Grease A',quantity:{approved:'10',unit:'г'},schedule:{legacyText:'4 недели'}},
  {id:'T-4W-B',lubricationPointId:'LP1',operation:'Очистка штуцера',activityType:'cleaning',approvalStatus:'approved',schedule:{legacyText:'4 недели'}}
 ],routes:[]
};
global.LubricaCore={State:{getDatabase:()=>db,setDatabase:()=>{}},Database:{toLegacy:d=>({points:d.tasks.map(t=>({id:t.id,taskId:t.id,lubricationPointId:t.lubricationPointId,pointDisplayId:'LP-001',equipment:'Конвейер',position:'100',unit:'Привод',operation:t.operation,interval:t.schedule.legacyText,status:'ready',line:'Линия 1',area:'Упаковка'}))})}};
global.LubricaApp={refreshFromCore(){},showToast(){}};global.LubricaSystem={registerModule(){}};
vm.runInThisContext(fs.readFileSync('routes/route-engine.js','utf8'),{filename:'route-engine.js'});
const E=LubricaRouteEngine,a=(x,m)=>{if(!x)throw new Error(m)};

const p1=E.previewRouteCandidates({lineId:'L1',areaId:'A1',interval:'1 неделя'},db);
a(p1.pointCount===1&&p1.taskIds.join(',')==='T-W','weekly route must use the existing weekly task only');
const p4=E.previewRouteCandidates({lineId:'L1',areaId:'A1',interval:'4 недели'},db);
a(p4.pointCount===1&&p4.taskIds.length===2&&p4.taskIds.includes('T-4W-A')&&p4.taskIds.includes('T-4W-B')&&!p4.taskIds.includes('T-W'),'4-week route must use the two existing 4-week tasks only');
const catalog=E.previewPointTaskCatalog({lineId:'L1',areaId:'A1',interval:'4 недели'},db);a(catalog.pointCount===1&&catalog.taskCount===3&&catalog.matchingTaskCount===2,'wizard catalog shows all point-card tasks but marks only matching-period tasks selectable');a(catalog.points[0].tasks.find(t=>t.id==='T-W').matchesInterval===false,'wizard keeps different-period point activity visible as context');

const r4=E.createRoute({lineId:'L1',areaId:'A1',interval:'4 недели',name:'4 недели',fillMode:'empty',taskIds:['T-4W-A']},db).route;
let candidates=E.pointTaskCandidates(r4.id,db);const point=candidates.find(x=>x.pointId==='LP1');
a(point,'candidate point must exist');
const weekly=point.tasks.find(x=>x.id==='T-W'),included=point.tasks.find(x=>x.id==='T-4W-A'),missing=point.tasks.find(x=>x.id==='T-4W-B');
a(weekly&&!weekly.sameInterval&&!weekly.inCurrent,'weekly task remains visible but is incompatible with 4-week route');
a(included&&included.inCurrent,'already included task is marked as included');
a(missing&&missing.sameInterval&&!missing.inCurrent,'second 4-week task is independently selectable');

const blocked=E.addTasksToRoute(r4.id,['T-W'],{},db);a(blocked.taskIds.length===0&&blocked.conflicts.some(x=>/периодичност/i.test(x.reason)),'different-period task must be blocked in a fixed route');
const added=E.addTasksToRoute(r4.id,['T-4W-B'],{},db);a(added.ok&&added.taskIds.join(',')==='T-4W-B','specific existing task can be added independently');
let groups=E.pointGroupsForRoute(r4.id,db);a(groups.length===1&&groups[0].pointId==='LP1'&&groups[0].taskIds.length===2,'route queue visually groups selected tasks by one physical point');
a(groups[0].tasks.some(t=>t.operation==='Досмазка')&&groups[0].tasks.some(t=>t.operation==='Очистка штуцера'),'group displays task data from point-card tasks');

const removed=E.removeTaskFromRoute(r4.id,'T-4W-B',db);a(removed.ok,'single task removal works');
groups=E.pointGroupsForRoute(r4.id,db);a(groups.length===1&&groups[0].taskIds.join(',')==='T-4W-A','removing one task does not remove the physical point or its other task');
a(db.tasks.length===3&&db.tasks.find(t=>t.id==='T-4W-B'),'removing from route never deletes task from point card');

const mixed=E.createRoute({lineId:'L1',areaId:'A1',interval:'',intervalMode:'mixed',name:'Смешанный',fillMode:'empty',taskIds:['T-W','T-4W-A','T-4W-B']},db).route;
groups=E.pointGroupsForRoute(mixed.id,db);a(groups.length===1&&groups[0].tasks.length===3,'mixed route still has one physical point containing its three selected existing tasks');
const weeklyRoute=E.createRoute({lineId:'L1',areaId:'A1',interval:'1 неделя',name:'Недельный',fillMode:'empty'},db).route;
const moveMixed=E.movePointToRoute(mixed.id,weeklyRoute.id,'LP1',{position:'end'},db);a(moveMixed.ok===false&&/соответствуют периодичности/i.test(moveMixed.reason),'point block with mixed-period tasks cannot be moved into fixed weekly route as a whole');

const ui=fs.readFileSync('routes/routes-ui.js','utf8');
for(const token of ['Мероприятия этой точки в маршруте','data-candidate-task','существующее мероприятие из карточки точки','removeTaskFromRoute','Выберите мероприятия из карточек точек'])a(ui.includes(token),`event-centric UX token missing: ${token}`);
a(!ui.includes('Посещение:'),'artificial visit terminology must not be used in route editor');
console.log('STAGE 9.1.9 EVENT-CENTRIC ROUTES TEST PASS');
