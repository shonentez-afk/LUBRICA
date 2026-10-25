const fs=require('fs'),vm=require('vm');
global.window=global;global.SCOPE_LABELS={};global.taskKey=p=>p.taskId||p.id;
const db={
 lines:[{id:'L1',name:'Линия 1'}],areas:[{id:'A1',lineId:'L1',name:'Упаковка'}],
 equipment:[{id:'E1',lineId:'L1',areaId:'A1',name:'Конвейер',externalCode:'100'}],
 nodes:[{id:'N1',equipmentId:'E1',name:'Привод'}],lubricationPoints:[{id:'LP1',legacyId:'LP-001',equipmentId:'E1',nodeId:'N1',name:'Подшипник DE'}],
 tasks:[
  {id:'T-W',lubricationPointId:'LP1',operation:'Осмотр',approvalStatus:'approved',schedule:{legacyText:'1 неделя'}},
  {id:'T-4W-A',lubricationPointId:'LP1',operation:'Досмазка',approvalStatus:'approved',schedule:{legacyText:'4 недели'}},
  {id:'T-4W-B',lubricationPointId:'LP1',operation:'Очистка штуцера',approvalStatus:'approved',schedule:{legacyText:'4 недели'}}
 ],routes:[]
};
global.LubricaCore={State:{getDatabase:()=>db,setDatabase:()=>{}},Database:{toLegacy:d=>({points:d.tasks.map(t=>({id:t.id,taskId:t.id,pointDisplayId:'LP-001',equipment:'Конвейер',position:'100',unit:'Привод',operation:t.operation,interval:t.schedule.legacyText,status:'ready',line:'Линия 1',area:'Упаковка'}))})}};
global.LubricaApp={refreshFromCore(){},showToast(){}};global.LubricaSystem={registerModule(){}};
vm.runInThisContext(fs.readFileSync('routes/route-engine.js','utf8'),{filename:'route-engine.js'});
const E=LubricaRouteEngine,a=(x,m)=>{if(!x)throw new Error(m)};
const preview1=E.previewRouteCandidates({lineId:'L1',areaId:'A1',interval:'1 неделя'},db);a(preview1.pointCount===1&&preview1.taskIds.join(',')==='T-W','weekly preview contains only weekly activity');
const preview4=E.previewRouteCandidates({lineId:'L1',areaId:'A1',interval:'4 недели'},db);a(preview4.pointCount===1&&preview4.taskIds.length===2&&!preview4.taskIds.includes('T-W'),'4-week preview combines same-time activities only');
const mixed=E.createRoute({lineId:'L1',areaId:'A1',interval:'',intervalMode:'mixed',name:'Смешанный тест',fillMode:'empty',taskIds:['T-W','T-4W-A','T-4W-B']},db).route;
const visits=E.pointGroupsForRoute(mixed.id,db);a(visits.length===2,'same physical point is split into two route visits by interval');
const weekly=visits.find(v=>v.interval==='1 неделя'),four=visits.find(v=>v.interval==='4 недели');a(weekly&&weekly.taskIds.length===1&&four&&four.taskIds.length===2,'visit grouping is interval-safe');
const target=E.createRoute({lineId:'L1',areaId:'A1',interval:'1 неделя',name:'Недельный',fillMode:'empty'},db).route;
const moved=E.movePointToRoute(mixed.id,target.id,weekly.visitKey,{position:'end'},db);a(moved.ok&&target.taskIds.join(',')==='T-W','weekly visit moved alone');
a(db.routes.find(r=>r.id===mixed.id).taskIds.includes('T-4W-A')&&db.routes.find(r=>r.id===mixed.id).taskIds.includes('T-4W-B'),'4-week activities remain in source route');
const ui=fs.readFileSync('routes/routes-ui.js','utf8'),css=fs.readFileSync('assets/app.css','utf8');
for(const token of ['Выбрать точки сейчас','Создать и перейти к наполнению','Посещение:','Другие мероприятия той же физической точки'])a(ui.includes(token),`UX token missing: ${token}`);
for(const token of ['route-create-layout','route-fill-card','route-manual-picker','#actionDialog.route-create-dialog'])a(css.includes(token),`CSS token missing: ${token}`);
console.log('STAGE 9.1.8 ROUTE VISITS + UX TEST PASS');
