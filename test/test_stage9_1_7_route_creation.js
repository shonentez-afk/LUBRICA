const fs=require('fs'),vm=require('vm');
global.window=global;global.SCOPE_LABELS={};global.taskKey=p=>p.taskId||p.id;
const db={
 lines:[{id:'L1',name:'Линия 1'},{id:'L2',name:'Линия 2'}],
 areas:[{id:'A1',lineId:'L1',name:'Упаковка'},{id:'A2',lineId:'L1',name:'Распиловка'},{id:'A3',lineId:'L2',name:'Упаковка'}],
 equipment:[{id:'E1',lineId:'L1',areaId:'A1',name:'Конвейер',externalCode:'100'},{id:'E2',lineId:'L1',areaId:'A2',name:'Пила',externalCode:'200'},{id:'E3',lineId:'L2',areaId:'A3',name:'Упаковщик',externalCode:'300'}],
 nodes:[{id:'N1',equipmentId:'E1',name:'Привод'},{id:'N2',equipmentId:'E2',name:'Вал'},{id:'N3',equipmentId:'E3',name:'Привод'}],
 lubricationPoints:[{id:'LP1',equipmentId:'E1',nodeId:'N1',name:'DE'},{id:'LP2',equipmentId:'E2',nodeId:'N2',name:'NDE'},{id:'LP3',equipmentId:'E3',nodeId:'N3',name:'DE'}],
 tasks:[
  {id:'T1',lubricationPointId:'LP1',operation:'Смазка',approvalStatus:'approved',schedule:{legacyText:'4 недели'}},
  {id:'T1W',lubricationPointId:'LP1',operation:'Осмотр',approvalStatus:'approved',schedule:{legacyText:'1 неделя'}},
  {id:'T2',lubricationPointId:'LP2',operation:'Смазка',approvalStatus:'approved',schedule:{legacyText:'4 недели'}},
  {id:'T3',lubricationPointId:'LP3',operation:'Смазка',approvalStatus:'approved',schedule:{legacyText:'4 недели'}}
 ],routes:[]
};
global.LubricaCore={State:{getDatabase:()=>db,setDatabase:()=>{}},Database:{toLegacy:d=>({points:d.tasks.map(t=>{const lp=d.lubricationPoints.find(x=>x.id===t.lubricationPointId),eq=d.equipment.find(x=>x.id===lp.equipmentId),node=d.nodes.find(x=>x.id===lp.nodeId),line=d.lines.find(x=>x.id===eq.lineId),area=d.areas.find(x=>x.id===eq.areaId);return{id:t.id,taskId:t.id,pointDisplayId:lp.id,equipment:eq.name,position:eq.externalCode,unit:node.name,operation:t.operation,interval:t.schedule.legacyText,status:'ready',line:line.name,area:area.name}})})}};
global.LubricaApp={refreshFromCore(){},showToast(){}};global.LubricaSystem={registerModule(){}};
vm.runInThisContext(fs.readFileSync('routes/route-engine.js','utf8'),{filename:'route-engine.js'});
const E=LubricaRouteEngine,a=(x,m)=>{if(!x)throw new Error(m)};
E.syncRoutes(db);
const auto4=db.routes.find(r=>r.source==='auto'&&r.lineId==='L1'&&r.areaId==='A1'&&r.interval==='4 недели');a(auto4,'auto route exists');
const created=E.createRoute({lineId:'L1',areaId:'A1',interval:'4 недели',name:'Ручной 4 недели',fillMode:'automatic'});a(created.ok,'manual route created');const manual=created.route;a(manual.source==='manual'&&manual.status==='draft','manual draft semantics');a(manual.taskIds.join(',')==='T1','automatic fill respects route scope');
const before=manual.taskIds.join(',');E.syncRoutes(db);let manualFresh=db.routes.find(r=>r.id===manual.id);a(manualFresh.taskIds.join(',')===before,'sync does not mutate manual route');
const whole=E.createRoute({lineId:'L1',areaId:'',interval:'4 недели',name:'Вся линия 4 недели',fillMode:'automatic'});a(whole.ok&&whole.route.taskIds.includes('T1')&&whole.route.taskIds.includes('T2'),'whole-line auto fill works');
manualFresh=db.routes.find(r=>r.id===manual.id);const candidates=E.candidatePointVariants(manual.id,db);const mismatch=candidates.find(x=>x.pointId==='LP1'&&x.interval==='1 неделя');a(mismatch&&!mismatch.sameInterval&&mismatch.warnings.includes('Другая периодичность'),'interval mismatch candidate classified');
const otherArea=candidates.find(x=>x.pointId==='LP2');a(otherArea&&!otherArea.sameArea,'other area candidate classified');
const add=E.addPointVariantToRoute(manual.id,otherArea.variantKey,{position:'start'},db);manualFresh=db.routes.find(r=>r.id===manual.id);a(add.ok&&manualFresh.taskIds[0]==='T2','mismatch point can be deliberately inserted at start');
const report=E.validateRoute(manual.id,db);a(report.warnings.some(x=>x.code==='AREA_MISMATCH'),'validation catches area mismatch');
const target=E.createRoute({lineId:'L1',areaId:'A1',interval:'1 неделя',name:'Недельный',fillMode:'empty'}).route;const moved=E.movePointToRoute(manual.id,target.id,'LP1',{position:'end'},db);manualFresh=db.routes.find(r=>r.id===manual.id);a(moved.ok===false&&manualFresh.taskIds.includes('T1')&&!target.taskIds.includes('T1'),'point activities cannot be moved to a route with another periodicity');
const copy=E.cloneRoute(target.id,{name:'Копия недельного'});a(copy.ok&&copy.route.source==='copy'&&copy.route.id!==target.id&&copy.route.taskIds.join(',')===target.taskIds.join(','),'route copy works');
console.log('STAGE 9.1.7 ROUTE CREATION TEST PASS');
