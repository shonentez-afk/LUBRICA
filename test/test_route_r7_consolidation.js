'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
global.window=global;global.state={points:[]};global.SCOPE_LABELS={};
global.LubricaSystem={registerModule(){}};
let d={lines:[{id:'L',name:'Линия'}],areas:[{id:'A',lineId:'L',name:'Участок'}],equipment:[],nodes:[],lubricationPoints:[],tasks:[],routes:[],routeRevisions:[],routePlanItems:[],checklistRuns:[],materials:[{id:'MAT',code:'GR-01',name:'Смазка'}],tools:[]};
let writes=0;
const clone=x=>JSON.parse(JSON.stringify(x));
global.LubricaCore={State:{getDatabase:()=>d,setDatabase:v=>{d=v;writes++}},Database:{toLegacy:db=>({points:db.tasks.map(t=>{
 const lp=db.lubricationPoints.find(p=>p.id===t.lubricationPointId),e=db.equipment.find(x=>x.id===lp.equipmentId);
 return{id:t.id,taskId:t.id,lubricationPointId:lp.id,pointDisplayId:lp.id,pointName:lp.name,type:lp.category,position:e.externalCode,equipment:e.name,unit:'Опора',operation:t.operation,material:t.materialName,qty:t.quantity.approved,measure:t.quantity.unit,interval:t.schedule.legacyText};
})})}};
global.LubricaApp={refreshFromCore(){},showToast(){}};
global.LubricaTaskReadiness={summarize:db=>({items:db.tasks.map(t=>({taskId:t.id,status:'ready',steps:[{ok:true}]}))})};
global.LubricaProgramQA={audit:()=>({issues:[]})};
for(const p of ['core/database-schema.js','structure/context.js','routes/route-auto-grouping.js','routes/route-due.js','routes/route-engine.js','routes/route-planning.js','checklist/checklist-engine.js','routes/route-preparation.js','routes/route-plan-fact.js','routes/route-workload.js','routes/route-automation.js'])vm.runInThisContext(fs.readFileSync(p,'utf8'),{filename:p});
const E=LubricaRouteEngine,D=LubricaRouteDue,P=LubricaRoutePlanning,C=LubricaChecklistEngine,R=LubricaRoutePreparation,F=LubricaRoutePlanFact;
const today=D.today(),yesterday=P.addInterval(today,{kind:'days',value:-1}),tomorrow=P.addInterval(today,{kind:'days',value:1}),later=P.addInterval(today,{kind:'days',value:20});
function task(id,interval,qty){
 const eq='E'+id,node='N'+id,lp='P'+id;
 d.equipment.push({id:eq,lineId:'L',areaId:'A',name:'Машина '+id,externalCode:id,equipmentType:id==='C1'?'fan':'conveyor'});
 d.nodes.push({id:node,equipmentId:eq,name:'Вал'});
 d.lubricationPoints.push({id:lp,equipmentId:eq,nodeId:node,category:'bearing',name:'Опора '+id,targetMaterialId:'MAT',status:'confirmed'});
 d.tasks.push({id,lubricationPointId:lp,activityType:'regrease',operation:'Досмазывание',schedule:{legacyText:interval},approvalStatus:'approved',materialMode:'explicit',materialId:'MAT',materialName:'Смазка',quantity:{approved:String(qty),unit:'г'}});
}

const M=LubricaRouteAutomation,W=LubricaRouteWorkload;
const t=id=>d.tasks.find(x=>x.id===id),getRoute=kind=>d.routes.find(r=>r.scheduleKey===kind&&r.status!=='archived'),entry=id=>E.routeEntries(d,{preview:false}).find(r=>r.id===id);
for(const id of ['C1','C2','C3','C4','C5'])task(id,'7 дней',10);
task('M1','14 дней',20);task('H1','500 ч',5);task('H2','1000 ч',6);
const scope={lineId:'L',areaId:'A',serviceKey:'bearing:regrease'},initial={mode:'next',date:tomorrow},cfg={weekdays:[1,2,3,4,5,6,7],shifts:[1,2,3].map(i=>({id:String(i),workers:1,minutesPerWorker:45})),ppr:[{lineId:'L',anchorDate:today}],pprRouteIds:[]};

// R7 reproduces defects found in the R6.5 audit.
for(const f of ['routes/route-analytics.js','routes/management-dashboard.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
const baseline=clone(d);
const reset=()=>{d=clone(baseline);writes=0};
const one=()=>({lineId:'L',areaId:'A',groupKey:[...M.eligible(d).valid.values()].find(g=>g.scheduleKey==='days:7').key,activateReady:true,initial:{mode:'next',date:tomorrow},forecast:false});
const apply=o=>{const original=clone(d),x=M.preview(o,d);assert(x.ok,x.reason);assert.deepEqual(d,original);const y=M.apply(o,x.token,d);assert(y.ok,y.reason);return y};
reset();apply(one());const r=d.routes[0],fingerprint=r.automationContent,before=clone(r);
assert.equal(M.preview(one(),d).report.summary.update,0);
const manual=E.createRoute({lineId:'L',areaId:'A',interval:'14 дней',name:'Manual',fillMode:'empty',status:'draft'},d);assert(manual.ok,manual.reason);
assert.deepEqual(d.routes.find(x=>x.id===r.id),before);
assert.equal(d.routes.find(x=>x.id===r.id).automationContent,fingerprint);
assert.equal(M.preview(one(),d).report.summary.update,0);
const c=E.previewRouteCandidates({lineId:'L',areaId:'A',interval:'1 неделя'},d);assert.equal(c.taskCount,0);
const blocked=E.createRoute({lineId:'L',areaId:'A',interval:'7 дней',taskIds:r.taskIds,status:'draft'},d);assert.equal(blocked.code,'TASK_UNAVAILABLE');
const copyRoute=E.cloneRoute(r.id,{name:'Copy'},d);assert.equal(copyRoute.code,'GROUP_EXISTS','same group cannot be copied into a duplicate manual route');
assert.equal(new Set(d.routes.flatMap(x=>x.taskIds)).size,d.routes.flatMap(x=>x.taskIds).length);
reset();apply({...one(),initial:undefined});d.routes[0].taskIds=d.routes[0].taskIds.filter(id=>id!=='C1');d.routes[0].excludedTaskIds=['C1'];
const bulk={lineId:'L',areaId:'A',initial:{mode:'next',date:tomorrow},activateReady:true,forecast:false};
const excluded=M.preview(bulk,d);assert(excluded.ok,excluded.reason);assert(!excluded.prep.changes.some(x=>x.taskId==='C1'));assert(excluded.report.issues.some(x=>x.taskId==='C1'&&x.code==='MANUALLY_EXCLUDED'));assert(M.apply(bulk,excluded.token,d).ok);assert.equal(t('C1').routeDue,undefined);
// R8.2: seven-day work cannot be restricted to a fourteen-day shutdown phase.
reset();const incompatible={...one(),pprMode:'ppr',pprAnchorDate:today,initial:{mode:'next',date:today}},beforePpr=clone(d);
const rejected=M.preview(incompatible,d);assert(!rejected.ok,'7-day route must not run only every 14 days');assert.equal(rejected.code,'PPR_CYCLE');assert.deepEqual(d,beforePpr);assert.equal(writes,0);
// Exercise all existing PPR-lock tests on the compatible 14-day group instead.
const compatible={...incompatible,groupKey:[...M.eligible(d).valid.values()].find(g=>g.scheduleKey==='days:14').key};
apply(compatible);const pr=d.routes[0];assert.equal(pr.scheduleKey,'days:14');
d.routePlanItems.push({id:'JOB',routeId:pr.id,status:'planned',taskIds:[pr.taskIds[0]],plannedDate:today});
assert.equal(W.saveRoutePpr(pr.id,'normal','',d,{persist:false}).code,'PPR_ROUTE_LOCKED');
assert.equal(W.saveSettings({...cfg,pprRouteIds:[]},d,{persist:false}).code,'PPR_MODE_ROUTE');
assert(W.requiresPpr(pr.id,d));assert.equal(W.nextPpr('L',tomorrow,d),W.nextPprFromAnchor(today,tomorrow));
assert.equal(P.parseRuntimeInterval('5000/500 ч'),null);assert.equal(P.parseInterval('7 дней / 14 дней'),null);assert.equal(P.parseInterval('2 недели').value,2);
assert.equal(P.addInterval(today,P.parseInterval('2 недели')),P.addInterval(today,{kind:'days',value:14}));
assert.equal(F.baseQty(F.parseQty('0,5 кг')).value,500);assert.equal(F.baseQty(F.parseQty('500 г')).value,500);
assert.equal(F.baseQty(F.parseQty('0,5 л')).value,500);assert.equal(F.baseQty(F.parseQty('500 мл')).value,500);
assert.equal(F.parseQty('10–20 г'),null);assert.equal(LubricaRouteUnits.convert(1,'л','кг'),null);
const completed={id:'OLD',routeId:pr.id,status:'completed',date:'2020-01-01',actualDurationMinutes:null,routeSnapshot:{estimatedMinutes:20,groups:[{tasks:[{taskId:'X',pointId:'P',materialName:'Grease',quantityPrimary:'0,5 кг'}]}]},taskResults:{X:{done:true,resultStatus:'completed',actualQuantity:'500 г'}}};
const f=F.analyzeRun(completed,pr,d);assert.equal(f.materials[0].delta,0);assert.equal(f.actualMinutes,null);assert.equal(f.timeDelta,null);
const skipped=clone(completed);skipped.id='SKIP';skipped.taskResults.X={done:false,resultStatus:'skipped',deviationReason:'No access'};d.checklistRuns=[skipped];const analytics=LubricaRouteAnalytics.analyzeRoute(pr,d);assert.equal(analytics.problemPoints[0].issueRate,100);
d.routePlanItems=[];
const month=LubricaManagementDashboard.build({startDate:'2026-11-01',endDate:'2026-11-30'},d);assert.equal(month.executions,0);assert.equal(month.analytics.find(x=>x.routeId===pr.id).executions,0);assert.equal(month.avgTimeDeltaPercent,null);
console.log('R7 CONSOLIDATION PASS — canonical grouping, immutable unrelated routes, single ownership, excluded due, shared PPR protection, exact interval, quantity units, unknown time, period analytics');
