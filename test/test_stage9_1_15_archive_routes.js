const fs=require('fs'),vm=require('vm');
global.window=global;global.SCOPE_LABELS={};global.taskKey=p=>p.taskId||p.id;
const db={
 lines:[{id:'L1',name:'Линия 1'}],
 areas:[{id:'A1',lineId:'L1',name:'Силос'}],
 equipment:[{id:'E1',lineId:'L1',areaId:'A1',name:'Конвейер',externalCode:'100'}],
 nodes:[{id:'N1',equipmentId:'E1',name:'Привод'}],
 lubricationPoints:[{id:'LP1',equipmentId:'E1',nodeId:'N1',name:'DE'}],
 tasks:[{id:'T1',lubricationPointId:'LP1',operation:'Досмазывание',approvalStatus:'approved',schedule:{legacyText:'2 недели'}}],
 routes:[{id:'М-001',code:'R-001',name:'Рабочий',lineId:'L1',areaId:'A1',interval:'2 недели',status:'active',source:'manual',taskIds:['T1']},{id:'М-002',code:'R-002',name:'Архивный',lineId:'L1',areaId:'A1',interval:'2 недели',status:'archived',source:'manual',taskIds:['T1']}]
};
global.LubricaCore={State:{getDatabase:()=>db,setDatabase:()=>{}},Database:{toLegacy:d=>({points:d.tasks.map(t=>({id:t.id,taskId:t.id,pointDisplayId:'LP1',equipment:'Конвейер',position:'100',unit:'Привод',operation:t.operation,interval:t.schedule.legacyText,status:'ready',line:'Линия 1',area:'Силос'}))})}};
global.LubricaApp={refreshFromCore(){},showToast(){}};global.LubricaSystem={registerModule(){}};
vm.runInThisContext(fs.readFileSync('routes/route-engine.js','utf8'),{filename:'route-engine.js'});
const E=LubricaRouteEngine,assert=(x,m)=>{if(!x)throw new Error(m)};
assert(E.routeEntries(db).length===1,'default working list must hide archived');
const all=E.routeEntries(db,{includeArchived:true});assert(all.length===2,'includeArchived must return archived routes');
assert(all.some(r=>r.id==='М-002'&&r.status==='archived'),'archived route must remain queryable');
const restored=E.restoreRoute('М-002',db);assert(restored.ok,'restore must succeed');
assert(db.routes.find(r=>r.id==='М-002').status==='draft','restore must return route to draft');
assert(E.routeEntries(db).some(r=>r.id==='М-002'),'restored route must return to working list');
console.log('STAGE 9.1.15 ARCHIVE ROUTES TEST PASS');
