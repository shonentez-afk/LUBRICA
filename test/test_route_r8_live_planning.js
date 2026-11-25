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


// R8: one selected batch, fixed weekly phase, no projected repeat writes.
const A=LubricaRouteAutoGrouping,base=clone(d),plus=n=>P.addInterval(today,{kind:'days',value:n});
const reset=()=>{d=clone(base);writes=0};
const groups=()=>M.candidates({lineId:'L',areaId:'A'},d).groups;
const key=n=>groups().find(g=>g.scheduleKey==='days:'+n).key;
const op=(batch)=>({lineId:'L',areaId:'A',batch,activateReady:true,recoverHistory:true,forecast:false});
const row=(n,extra={})=>({key:key(n),pprMode:'normal',cycleMode:'actual',initial:{mode:'next',date:today},...extra});
function apply(o){const before=clone(d),p=M.preview(o,d);assert(p.ok,p.reason);assert.deepEqual(d,before);const w=writes;assert(M.apply(o,p.token,d).ok);assert.equal(writes,w+1);return p;}
reset();
assert.equal(groups().length,4);
assert.equal(M.preview(op([]),d).code,'GROUP_SCOPE');
assert.equal(M.preview(op([row(7),row(7)]),d).code,'GROUP_SCOPE');
const batch=[row(7,{cycleMode:'fixed_weekly'}),row(14,{initial:{mode:'next',date:tomorrow}})],o=op(batch);
const result=apply(o);assert.equal(result.report.summary.create,2);assert.equal(d.routes.length,2);assert.equal(getRoute('days:7').cycleMode,'fixed_weekly');
assert.equal(d.routePlanItems.length,0);assert.equal(t('C1').routeDue.nextDate,today);assert.equal(t('C1').routeDue.cycleAnchor,today);
const tBefore=clone(d),projection=M.projectRange({startDate:today,endDate:plus(28)},d);assert(projection.ok);
assert(projection.occurrences.some(x=>x.date===today&&!x.repeat));assert(projection.occurrences.some(x=>x.date===plus(7)&&x.repeat));assert(projection.occurrences.some(x=>x.date===tomorrow));assert.deepEqual(d,tBefore);
assert.equal(W.load({startDate:today,endDate:today},d).days[0].working,null);
assert.equal(W.previewPlan({startDate:today,endDate:today},d).code,'CAPACITY_REQUIRED');
assert.equal(M.preview(o,d).report.summary.create+M.preview(o,d).report.summary.update,0);
const fixed=getRoute('days:7'),entry0={kind:'days',interval:7,dueDate:today};
let step=D.calendarStep(plus(-1),entry0,fixed,{cycleAnchor:today,cycleTarget:today});
assert.equal(step.nextDate,plus(6),'early work never extends technical interval');
assert.equal(step.cycleTarget,plus(7),'nominal phase advances once');
step=D.calendarStep(plus(6),{...entry0,dueDate:plus(6)},fixed,step);
assert.equal(step.nextDate,plus(13),'do not invent extra work next day to rejoin phase');
assert.equal(step.cycleTarget,plus(14));
const drift=clone(d);Object.assign(drift.tasks.find(x=>x.id==='C1').routeDue,{nextDate:plus(6),cycleTarget:plus(7)});const driftView=M.projectRange({startDate:today,endDate:plus(10)},drift);assert(driftView.occurrences.some(x=>x.taskIds.includes('C1')&&x.cycleConflict&&x.cycleTarget===plus(7)));
assert.equal(D.nextCalendarDate(tomorrow,entry0,fixed,{cycleAnchor:today}),plus(7),'late execution returns to safe fixed phase');
assert.equal(D.nextCalendarDate(tomorrow,entry0,{cycleMode:'actual'}),plus(8));
reset();
const ppr=row(14,{pprMode:'ppr',cycleMode:'fixed_weekly',initial:{mode:'next',date:''}});
assert.equal(M.preview(op([ppr]),d).code,'PPR_ANCHOR_REQUIRED');
assert(W.saveSettings({...cfg,shifts:[]},d,{allowUnconfigured:true}).ok);
assert.equal(W.settings(d),null);assert(W.pprOn('L',today,d));
assert.equal(M.preview(op([ppr,row(7,{pprMode:'ppr',initial:{mode:'next',date:''}})]),d).code,'PPR_CYCLE');
assert.equal(d.routes.length,0);apply(op([ppr,row(7)]));
const pprForecast=M.projectRange({startDate:today,endDate:plus(28)},d);
assert(pprForecast.occurrences.some(x=>x.date===plus(7)&&!x.ppr&&!x.pprConflict));
assert(pprForecast.occurrences.some(x=>x.date===plus(14)&&x.ppr&&!x.pprConflict));
assert.equal(d.routePlanItems.length,0);
assert(W.saveSettings({...cfg,pprRouteIds:W.pprSettings(d).pprRouteIds,shifts:[{id:'1',workers:2,minutesPerWorker:480}]},d).ok);
const po={startDate:today,endDate:plus(28)},beforePlan=clone(d),preview=W.previewPlan(po,d);
assert(preview.ok,preview.message);assert(preview.created>0);assert.deepEqual(d,beforePlan);
assert.equal(W.applyPlan(po,'bad',d).code,'STALE_PREVIEW');
const writesBefore=writes;assert(W.applyPlan(po,preview.token,d).ok);assert.equal(writes,writesBefore+1);
const planned=d.routePlanItems.flatMap(x=>x.taskIds);assert.equal(new Set(planned).size,planned.length,'only next obligation committed');
const live=M.projectRange(po,d);assert(live.occurrences.every(x=>x.repeat||!x.taskIds.some(id=>planned.includes(id))),'pending jobs not duplicated in forecast');
assert(M.preview(op([row(7,{cycleMode:'fixed_weekly'})]),d).code==='ROUTE_LOCKED');
console.log('R8 LIVE PLANNING PASS — checked batch, PPR without staff, safe fixed phase, forecasts vs real obligations, one atomic allocation');
