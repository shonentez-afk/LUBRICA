const fs=require('fs'),vm=require('vm');
global.window=global;
vm.runInThisContext(fs.readFileSync('qa/qa-engine.js','utf8'));
const QA=global.LubricaProgramQA;
const db={
 lines:[{id:'L1',name:'Линия 1'}],areas:[{id:'A1',name:'Участок'}],
 equipment:[{id:'E1',lineId:'L1',areaId:'A1',name:'Машина'}],
 nodes:[{id:'N1',name:'Узел'}],
 componentLibraryEntries:[{id:'LIB1',name:'Подшипник'}],
 lubricationPoints:[
  {id:'LP1',legacyId:'LP-001',name:'DE',equipmentId:'E1',nodeId:'N1',targetMaterialId:'MAT1',componentBinding:{libraryEntryId:'LIB1'}},
  {id:'LP2',legacyId:'LP-002',name:'NDE',equipmentId:'E1',nodeId:'N1',componentBinding:{libraryEntryId:'LIB1'}}
 ],
 materials:[{id:'MAT1',code:'GR1',name:'Grease'}],
 tools:[{id:'TOOL1',code:'GUN1',name:'Шприц'}],
 tasks:[
  {id:'T1',lubricationPointId:'LP1',operation:'Досмазывание',materialMode:'point_target',toolId:'TOOL1',approvalStatus:'approved',
   quantity:{approved:'10',unit:'г',source:'OEM'},schedule:{legacyText:'2 недели',source:'OEM'}},
  {id:'T2',lubricationPointId:'LP2',operation:'Досмазывание',materialMode:'point_target',approvalStatus:'approved',
   quantity:{approved:'',unit:'г',source:''},schedule:{legacyText:'',source:''}},
  {id:'T3',lubricationPointId:'DELETED',operation:'Проверка уровня',materialMode:'none',approvalStatus:'approved',schedule:{legacyText:'1 неделя',source:'Инструкция'}}
 ],
 routes:[{id:'R1',code:'R-001',lineId:'L1',areaId:'A1',status:'active',taskIds:['T1','T2','MISSING']}]
};
const r=QA.audit(db),a=(x,m)=>{if(!x)throw Error(m)};
a(r.totalApplicable>0,'applicable checks');
a(r.readiness<100&&r.readiness>0,'real readiness');
a(r.categories.length===7,'seven readiness categories');
a(r.issues.some(x=>x.code==='TASK_QUANTITY_MISSING'&&x.entityId==='T2'),'missing norm');
a(r.issues.some(x=>x.code==='TASK_INTERVAL_MISSING'&&x.entityId==='T2'),'missing interval');
a(r.issues.some(x=>x.code==='QUANTITY_SOURCE_MISSING'&&x.entityId==='T2'),'missing source');
a(!r.issues.some(x=>x.code==='COMPONENT_BOUND_TO_MULTIPLE_POINTS'),'shared catalogue entry is not a duplicate physical point');
a(r.issues.some(x=>x.code==='TASK_ORPHAN_POINT'&&x.entityId==='T3'),'orphan task');
a(r.issues.some(x=>x.code==='ROUTE_TASK_MISSING'),'missing route task');
a(r.issues.some(x=>x.code==='ROUTE_TASK_TOOL_MISSING'&&x.entityId==='T2'),'route tool missing');
a(r.issues.some(x=>x.code==='APPROVED_TASK_NOT_ROUTED'&&x.entityId==='T3'),'approved task not routed');
const total=r.categories.reduce((s,x)=>s+x.applicable,0),passed=r.categories.reduce((s,x)=>s+x.passed,0);
a(total===r.totalApplicable&&passed===r.totalPassed,'readiness math inputs');
a(Math.abs(r.readiness-Math.round(passed/total*1000)/10)<1e-9,'readiness exact formula');
console.log('PROGRAM QA ENGINE TEST PASS',r.readiness,r.issues.length);