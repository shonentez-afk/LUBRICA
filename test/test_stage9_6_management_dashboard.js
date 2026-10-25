const fs=require('fs'),vm=require('vm');
global.window=global;
const routes=[{id:'R1',status:'active',line:'Л1',area:'КВО',code:'R-1',name:'Маршрут 1'},{id:'R2',status:'archived',line:'Л1',area:'КВО'}];
const db={routes,checklistRuns:[{id:'RUN1',routeId:'R1',status:'completed',date:'2026-09-03'}]};
global.LubricaCore={State:{getDatabase:()=>db}};
global.LubricaRouteEngine={routeEntries:()=>routes};
global.LubricaRoutePlanning={items:()=>[
{id:'P1',routeId:'R1',status:'completed',displayStatus:'completed',plannedDate:'2026-09-03'},
{id:'P2',routeId:'R1',status:'planned',displayStatus:'overdue',plannedDate:'2026-09-04'}]};
global.LubricaRouteAnalytics={analyzeAll:()=>[{routeId:'R1',routeCode:'R-1',name:'Маршрут 1',line:'Л1',area:'КВО',executions:2,avgTimeDeltaPercent:25,frv:{observedMinutes:100,productiveMinutes:70,productivePercent:70,runsWithFrv:2},recommendations:[{severity:'warn'}]}]};
vm.runInThisContext(fs.readFileSync('routes/management-dashboard.js','utf8'));
const x=global.LubricaManagementDashboard.build({startDate:'2026-09-01',endDate:'2026-09-30'},db),a=(v,m)=>{if(!v)throw Error(m)};
a(x.routes.current===1&&x.routes.archived===1,'routes');
a(x.plan.total===2&&x.plan.completed===1&&x.plan.overdue===1&&x.plan.completionPercent===50,'plan');
a(x.executions===1,'executions');
a(x.problemRoutes===1,'problems');
a(x.frv.productivePercent===70,'frv');
a(x.areas[0].line==='Л1'&&x.areas[0].overdue===1,'area');
console.log('STAGE 9.6 MANAGEMENT DASHBOARD ENGINE TEST PASS');