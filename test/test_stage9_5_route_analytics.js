const fs=require('fs'),vm=require('vm');
global.window=global;
const runs=[
{id:'R1-1',routeId:'R1',status:'completed',completedAt:'2026-09-01T09:00:00Z',actualDurationMinutes:90,
 taskResults:{T1:{done:true,resultStatus:'completed',actualQuantity:'12'},T2:{done:false,resultStatus:'skipped',deviationReason:'Нет доступа'}},
 routeSnapshot:{estimatedMinutes:60,groups:[{tasks:[
 {taskId:'T1',pointId:'LP1',pointName:'DE',equipment:'Machine',operation:'Досмазка',materialCode:'M1',materialName:'Grease',quantityPrimary:'10 г'},
 {taskId:'T2',pointId:'LP2',pointName:'NDE',equipment:'Machine',operation:'Досмазка',materialCode:'M1',materialName:'Grease',quantityPrimary:'20 г'}]}]},
 executionFact:{frv:{observedMinutes:80,productiveMinutes:50,lossMinutes:30,productivePercent:62.5,byCategory:[
 {id:'movement',label:'Перемещение',productive:false,minutes:20,count:2},
 {id:'lubrication',label:'Смазочные работы',productive:true,minutes:50,count:2},
 {id:'search',label:'Поиск инструмента / материала',productive:false,minutes:10,count:1}]}}},
{id:'R1-2',routeId:'R1',status:'completed',completedAt:'2026-09-08T09:00:00Z',actualDurationMinutes:84,
 taskResults:{T1:{done:true,resultStatus:'completed',actualQuantity:'11'},T2:{done:false,resultStatus:'skipped',deviationReason:'Нет доступа'}},
 routeSnapshot:{estimatedMinutes:60,groups:[{tasks:[
 {taskId:'T1',pointId:'LP1',pointName:'DE',equipment:'Machine',operation:'Досмазка',materialCode:'M1',materialName:'Grease',quantityPrimary:'10 г'},
 {taskId:'T2',pointId:'LP2',pointName:'NDE',equipment:'Machine',operation:'Досмазка',materialCode:'M1',materialName:'Grease',quantityPrimary:'20 г'}]}]},
 executionFact:{frv:{observedMinutes:78,productiveMinutes:48,lossMinutes:30,productivePercent:61.5,byCategory:[
 {id:'movement',label:'Перемещение',productive:false,minutes:18,count:2},
 {id:'lubrication',label:'Смазочные работы',productive:true,minutes:48,count:2},
 {id:'search',label:'Поиск инструмента / материала',productive:false,minutes:12,count:1}]}}}
];
const db={checklistRuns:runs};global.LubricaCore={State:{getDatabase:()=>db}};
global.LubricaChecklistEngine={routeRuns:(id)=>runs.filter(x=>x.routeId===id),modelForRun:(route,run)=>run.routeSnapshot};
vm.runInThisContext(fs.readFileSync('routes/route-plan-fact.js','utf8'));
vm.runInThisContext(fs.readFileSync('routes/route-analytics.js','utf8'));
const A=global.LubricaRouteAnalytics,a=(x,m)=>{if(!x)throw Error(m)};
const route={id:'R1',code:'M-001',name:'Маршрут',status:'active',estimatedMinutes:60};
const x=A.analyzeRoute(route,db);
a(x.executions===2,'runs');
a(x.avgTimeDeltaPercent>20,'time delta');
a(x.frv.runsWithFrv===2&&x.frv.categories.find(c=>c.id==='movement').share>15,'frv');
a(x.problemPoints.find(p=>p.pointId==='LP2').skipped===2,'problem point');
a(x.recommendations.some(r=>r.code==='TIME_OVER'),'time recommendation');
a(x.recommendations.some(r=>r.code==='MOVEMENT'),'movement recommendation');
a(x.recommendations.some(r=>r.code==='POINT_ISSUE'),'point recommendation');
console.log('STAGE 9.5 ROUTE ANALYTICS ENGINE TEST PASS');