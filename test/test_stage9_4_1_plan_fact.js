const fs=require('fs'),vm=require('vm');
const db={};
global.window=global;global.LubricaCore={State:{getDatabase:()=>db}};
const run={id:'RUN-1',routeId:'R1',executionNo:2,routeRevision:3,status:'completed',date:'2026-09-04',performer:'Иванов',shift:'1',actualDurationMinutes:75,
 taskResults:{T1:{done:true,resultStatus:'completed',actualQuantity:'12'},T2:{done:false,resultStatus:'skipped',actualQuantity:'',deviationReason:'Нет доступа'}},
 routeSnapshot:{estimatedMinutes:60,groups:[{tasks:[
 {taskId:'T1',pointId:'LP-1',pointName:'DE',operation:'Досмазка',materialCode:'M1',materialName:'Grease',quantityPrimary:'10 г'},
 {taskId:'T2',pointId:'LP-2',pointName:'NDE',operation:'Досмазка',materialCode:'M1',materialName:'Grease',quantityPrimary:'20 г'}
 ]}]}
};
global.LubricaChecklistEngine={routeRuns:()=>[run],modelForRun:()=>run.routeSnapshot};
vm.runInThisContext(fs.readFileSync('routes/route-plan-fact.js','utf8'));
const A=global.LubricaRoutePlanFact,a=(x,m)=>{if(!x)throw Error(m)};
const x=A.analyzeRun(run,{id:'R1',estimatedMinutes:60});
a(x.plannedMinutes===60&&x.actualMinutes===75&&x.timeDelta===15&&x.timeDeltaPercent===25,'time plan fact');
a(x.tasks.total===2&&x.tasks.completed===1&&x.tasks.skipped===1,'task results');
a(x.materials.length===1&&x.materials[0].planned===30&&x.materials[0].actual===12&&x.materials[0].delta===-18,'material aggregation');
const r=A.routeAnalysis('R1',{id:'R1',estimatedMinutes:60},db);
a(r.summary.executions===1&&r.runs[0].runId==='RUN-1','route analysis');
console.log('STAGE 9.4.1 PLAN/FACT ENGINE TEST PASS');