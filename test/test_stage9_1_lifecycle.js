const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');
let database={materials:[],tools:[],equipment:[],nodes:[],lubricationPoints:[{id:'LP1',legacyId:'LP-001',name:'Точка 1',category:'bearing'},{id:'LP2',legacyId:'LP-002',name:'Точка 2',category:'bearing'},{id:'LP3',legacyId:'LP-003',name:'Точка 3',category:'chain'}],tasks:[{id:'T1',lubricationPointId:'LP1',activityType:'regrease',operation:'Досмазывание',quantity:{approved:'10',unit:'г'}},{id:'T2',lubricationPointId:'LP2',activityType:'regrease',operation:'Досмазывание',quantity:{approved:'12',unit:'г'}},{id:'T3',lubricationPointId:'LP3',activityType:'lubricant_apply',operation:'Нанесение смазки',quantity:{approved:'15',unit:'мл'}}],checklistRuns:[]};
const window={LubricaSystem:{registerModule(){}},LubricaCore:{State:{getDatabase:()=>database,setDatabase:d=>database=d}},taskKey:p=>p.taskId||p.id};window.window=window;
const ctx={window,console};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,'checklist/checklist-engine.js'),'utf8'),ctx);
const E=window.LubricaChecklistEngine,a=(x,m)=>{if(!x)throw new Error(m)};
const route={id:'M-100',name:'смазочных работ маршрут',line:'Линия 1',area:'Упаковка',assignee:'Смазчик',interval:'4 недели',updatedAt:'2026-09-04T08:00:00Z',estimatedMinutes:30,points:[
 {taskId:'T1',pointDisplayId:'LP-001',equipment:'Машина',position:'1001',unit:'Узел A',operation:'Досмазывание',material:'Grease A',type:'bearing'},
 {taskId:'T2',pointDisplayId:'LP-002',equipment:'Машина',position:'1001',unit:'Узел B',operation:'Досмазывание',material:'Grease B',type:'bearing'}
]};
// 1. Not started -> start creates a frozen snapshot.
let run=E.createRun(route.id,{route,date:'2026-09-04'});a(run&&run.status==='in_progress','start route');a(run.routeTaskIds.length===2,'snapshot task ids');a(run.routeSnapshot.groups.length===2,'snapshot model');
// 2. Duplicate start returns same active run.
let same=E.createRun(route.id,{route});a(same.id===run.id&&database.checklistRuns.length===1,'duplicate start blocked');
// 3. Empty metadata and unfinished tasks block completion with explicit reasons.
let v=E.validateCompletion(run,route);a(!v.ok&&v.missing.some(x=>x.includes('Выполнить все задачи'))&&v.missing.some(x=>x.includes('ФИО'))&&v.missing.some(x=>x.includes('смену')),'completion validation reasons');
// 4. Partial completion remains in progress.
E.updateRun(run.id,{performer:'Иванов',shift:'1'});E.updateTask(run.id,'T1',{done:true,observations:'Норма'});v=E.validateCompletion(run,route);a(!v.ok&&v.progress.percent===50,'partial route cannot finish');
// 4a. Route/task edits made while the run is active must not alter the running checklist.
const originalOperation=E.modelForRun(route,run,database).groups[0].tasks[0].operation;database.tasks[0].operation='ИЗМЕНЕНО ПОСЛЕ ЗАПУСКА';route.points.push({taskId:'T3',pointDisplayId:'LP-003',equipment:'Машина',position:'1001',unit:'Цепь',operation:'Нанесение смазки',material:'Oil',type:'chain'});a(E.modelForRun(route,run,database).groups.flatMap(g=>g.tasks).length===2,'active snapshot ignores added route task');a(E.modelForRun(route,run,database).groups[0].tasks[0].operation===originalOperation,'active snapshot ignores task edits');a(E.progress(run,route).total===2,'active progress uses frozen task ids');route.points.pop();database.tasks[0].operation='Досмазывание';
// 5. 100% + required metadata completes and becomes immutable.
E.updateTask(run.id,'T2',{done:true});v=E.validateCompletion(run,route);a(v.ok,'route ready to complete');const done=E.completeRun(run.id,route);a(done?.status==='completed'&&done.completedAt,'route completed');a(E.updateRun(run.id,{comments:'after'})===null,'completed run immutable');a(E.updateTask(run.id,'T1',{done:false})===null,'completed task result immutable');
// 6. Change current route after completion: historical checklist must remain 2 tasks.
route.points.push({taskId:'T3',pointDisplayId:'LP-003',equipment:'Машина',position:'1001',unit:'Цепь',operation:'Нанесение смазки',material:'Oil',type:'chain'});route.updatedAt='2026-09-05T08:00:00Z';const historical=E.modelForRun(route,done,database);a(historical.groups.flatMap(g=>g.tasks).length===2,'completed snapshot not changed by route edit');a(E.progress(done,route).total===2&&E.progress(done,route).percent===100,'completed progress frozen');
// 7. New execution uses current 3-task route and starts blank.
let next=E.createRun(route.id,{route,date:'2026-09-05',performer:'Петров',shift:'2'});a(next.id!==done.id&&next.executionNo===2,'new execution number');a(next.routeTaskIds.length===3,'new route snapshot contains current tasks');a(E.progress(next,route).done===0&&E.progress(next,route).total===3,'new execution blank');a(E.modelForRun(route,next,database).groups.flatMap(g=>g.tasks).length===3,'new model uses updated route');
// 8. Cancelling preserves entered data and history, then a later run can start.
E.updateTask(next.id,'T1',{done:true,observations:'Прервано'});E.updateRun(next.id,{comments:'Остановлено из-за доступа'});const cancelled=E.cancelRun(next.id);a(cancelled.status==='cancelled'&&cancelled.taskResults.T1.observations==='Прервано','cancel preserves data');a(E.latestRun(route.id,{includeCompleted:false})===null,'no active after cancellation');a(E.routeRuns(route.id).some(x=>x.status==='cancelled'),'cancelled retained in history');
let third=E.createRun(route.id,{route,date:'2026-09-06',performer:'Сидоров',shift:'1'});a(third.executionNo===3&&third.status==='in_progress','restart after cancellation');
// 9. Force new supersedes current active run cleanly.
let forced=E.createRun(route.id,{route,forceNew:true,date:'2026-09-06',performer:'Орлов',shift:'3'});a(forced.id!==third.id&&third.status==='superseded','force new supersedes active');a(E.latestRun(route.id,{includeCompleted:false}).id===forced.id,'forced run is sole active');
// 10. Empty route cannot be started.
const empty={id:'M-EMPTY',points:[]};a(E.createRun(empty.id,{route:empty})===null,'empty route start rejected');
console.log('STAGE 9.1 LIFECYCLE TEST PASS');
