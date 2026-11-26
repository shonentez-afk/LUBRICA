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



const A=LubricaRouteAutoGrouping,base=clone(d),plus=n=>P.addInterval(today,{kind:'days',value:n});
const reset=()=>{d=clone(base);writes=0};
function apply(o){const p=M.preview(o,d);assert(p.ok,p.message||p.reason);const r=M.apply(o,p.token,d);assert(r.ok,r.message||r.reason);return r}
const opts=batch=>({lineId:'L',areaId:'A',batch,activateReady:true,recoverHistory:true,forecast:false});
const row=(n,extra={})=>({key:M.candidates({},d).groups.find(g=>g.scheduleKey===n).key,pprMode:'normal',cycleMode:'actual',initial:{mode:'next',date:today},...extra});
const calendar={mode:'next',date:today,planningMode:'calendar_runtime',maxHoursPerDay:24,confirmCalendar:true};
assert.equal(D.calendarRule(2250,24).days,91);assert.equal(D.calendarRule(2250,24,true).days,84);assert(!D.calendarRule(200,24,true).ok);assert.equal(D.calendarRule(5000,24,true).days,196);
assert(!D.calendarRule(2250,25).ok);assert(!D.calendarRule(2250,0).ok);
reset();task('R2250','2250 ч',10);const rt=row('runtime_hours:2250',{initial:calendar});
assert.equal(M.preview(opts([{...rt,initial:{...calendar,confirmCalendar:false}}]),d).code,'RUNTIME_CONFIRM');
apply(opts([rt]));const r=getRoute('runtime_hours:2250');assert.equal(r.status,'active');assert.equal(t('R2250').schedule.legacyText,'2250 ч');assert.equal(D.parseBasis(t('R2250'),d).interval,91);
let pr=P.preview({startDate:today,endDate:plus(200)},d);assert.equal(pr.items.length,1);assert.equal(pr.items[0].dueEntries[0].kind,'days');assert.equal(pr.items[0].dueEntries[0].basis,'runtime_calendar');
assert(P.commit({startDate:today,endDate:plus(200)},d).ok);let job=d.routePlanItems[0],run=C.createRun(r.id,{route:entry(r.id),date:today,performer:'Test',shift:'1',planItemId:job.id});assert(run,'calendar without meter must start');C.updateTask(run.id,'R2250',{done:true,actualQuantity:'10 г'});assert(C.completeRun(run.id,entry(r.id)));assert.equal(t('R2250').routeDue.nextDate,plus(91));assert.equal(t('R2250').routeDue.nextHours,undefined);
reset();W.saveSettings(cfg,d);task('R2250','2250 ч',10);apply(opts([row('runtime_hours:2250',{pprMode:'ppr',initial:calendar})]));assert.equal(D.parseBasis(t('R2250'),d).interval,84);assert(W.requiresPpr(getRoute('runtime_hours:2250').id,d));
reset();W.saveSettings(cfg,d);assert.equal(M.preview(opts([row('days:7',{pprMode:'ppr'})]),d).code,'PPR_CYCLE');assert.equal(d.routes.length,0);
reset();const rr=E.createRoute({lineId:'L',areaId:'A',interval:'7 дней',taskIds:['C1'],status:'draft'},d);assert(rr.ok,rr.reason);assert(D.typed(rr.route));const before=clone(d);assert(!E.updateRouteSettings(rr.route.id,{name:'bad'},'active',d).ok);assert.deepEqual(d,before);assert(D.configureRoute(rr.route.id,{date:today},d).ok);assert.equal(P.preview({startDate:today,endDate:plus(28)},d).items.length,1);assert.equal(M.projectRange({startDate:today,endDate:plus(28)},d).occurrences.length,5);
reset();apply(opts([row('days:7')]));const id=getRoute('days:7').id;task('NEW','7 дней',10);let p=M.preview({activateReady:true,forecast:false},d);assert(p.ok,p.message);assert(p.report.issues.some(x=>x.taskId==='NEW'&&x.code==='NEW_TASK_DUE_REQUIRED'));assert.equal(p.report.groups.find(x=>x.routeId===id).nextStatus,'active');assert(!p.report.groups.find(x=>x.routeId===id).taskIds.includes('NEW'));
reset();apply(opts([row('days:7'),row('days:14')]));delete t('C1').routeDue;assert(P.commit({startDate:today,endDate:today,skipBlocked:true},d).ok);assert(d.routePlanItems.some(x=>x.taskIds.includes('M1')));
reset();apply({activateReady:true,forecast:false,initial:{mode:'next',date:tomorrow},policy:{taskIds:['C1'],access:'normal',earlyDays:1,earlyReason:'confirmed'}});assert(M.projectRange({startDate:today,endDate:today},d).occurrences.some(x=>x.taskIds.includes('C1')));
reset();task('H3','500 ч',5);const lp=d.lubricationPoints.find(x=>x.id==='PH3');lp.equipmentId='EH1';lp.nodeId='NH1';apply(opts([row('runtime_hours:500',{initial:{}})]));const meter=getRoute('runtime_hours:500');assert(D.configureMeter(meter.id,'EH1',{lastHours:500,readingHours:1000,readingDate:today,confirmMeter:true},d,{activate:true}).ok);assert.equal(t('H1').routeDue.nextHours,1000);assert.equal(t('H3').routeDue.nextHours,1000);assert.equal(getRoute('runtime_hours:500').status,'active');
console.log('R8.1 PASS — shared calendar, grouped meters, manual routes, safe PPR, partial planning and atomic activation');
