const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const source=path.join(root,'project','sources','pp53736','Филиал_завода__Техно__г._Юрга(20260923-051134).json');
assert(fs.existsSync(source),'production PP-53736 JSON source is required');
let db=JSON.parse(fs.readFileSync(source,'utf8'));

const nextFrom=(arr,prefix,width)=>{let m=0;for(const x of arr||[]){const q=String(x.id||'').match(new RegExp('^'+prefix+'-(\\d+)$'));if(q)m=Math.max(m,Number(q[1]));}return `${prefix}-${String(m+1).padStart(width,'0')}`;};
const legacyRows=d=>(d.tasks||[]).map(t=>{
  const p=(d.lubricationPoints||[]).find(x=>x.id===t.lubricationPointId)||{};
  const e=(d.equipment||[]).find(x=>x.id===p.equipmentId)||{};
  const n=(d.nodes||[]).find(x=>x.id===p.nodeId)||{};
  const line=(d.lines||[]).find(x=>x.id===e.lineId)||{};
  const area=(d.areas||[]).find(x=>x.id===e.areaId)||{};
  return {id:t.id,taskId:t.id,pointDisplayId:p.legacyId||p.id,position:e.externalCode||'',equipment:e.name||'',unit:n.name||p.name||'',component:p.installedComponent?.name||'',operation:t.operation||'',interval:t.schedule?.legacyText||'',material:t.materialName||'',line:line.name||'',area:area.name||''};
});

const window={console};window.window=window;
window.LubricaSystem={registerModule(){}};
window.LubricaCore={
  IDs:{nextFrom},
  State:{getDatabase:()=>db,setDatabase:x=>{db=x;return x}},
  Database:{normalize:x=>x,toLegacy:d=>({points:legacyRows(d).map(row=>({...row,lubricationPointId:d.tasks.find(t=>String(t.id)===String(row.taskId))?.lubricationPointId}))})}
};
window.LubricaStructureContext={
  activityLabel:t=>({oil_change:'Замена масла',lubricant_apply:'Нанесение смазки',regrease:'Досмазывание'})[t]||t,
  activityNeedsMaterial:t=>['oil_change','lubricant_apply','regrease'].includes(t)
};
window.LubricaApp={refreshFromCore(){},showToast(){}};
const ctx=vm.createContext(window);
function load(f){vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f});}

// Real binding/migration layer first.
for(const f of [
  'components/registry.js','components/starter-data.js',
  'components/gearbox-oem-data-1.0.33.59.js','components/gearbox-oem-data-1.0.33.60.js',
  'components/gearbox-oem-data-1.0.33.61.js','components/gearbox-oem-data-1.0.33.66.js',
  'components/gearbox-oem-data-1.0.33.67.js','components/starter-adapter.js',
  'components/matcher.js','components/binding.js'
]) load(f);
load('machines/izoteh-pp53736-arrangement.js');

const A=window.LubricaPP53736Arrangement,B=window.LubricaComponentBinding;
assert(A&&B,'PP-53736 arrangement and binding must load');
const roots=['10108190','10208190'].map(code=>(db.equipment||[]).find(e=>e.externalCode===code));
assert(roots.every(Boolean),'both PP-53736 production roots must exist');

const before={equipment:db.equipment.length,components:db.components.length,points:db.lubricationPoints.length,tasks:db.tasks.length};
for(const r of roots) A.applyConfiguration(db,r,{r77Count:8,s37State:'installed',chainsEnabled:true,jacksEnabled:true,bearingsEnabled:true});
B.reconcileDatabase(db);
const after1={equipment:db.equipment.length,components:db.components.length,points:db.lubricationPoints.length,tasks:db.tasks.length};
for(const r of roots) A.applyConfiguration(db,r,{r77Count:8,s37State:'installed',chainsEnabled:true,jacksEnabled:true,bearingsEnabled:true});
B.reconcileDatabase(db);
const after2={equipment:db.equipment.length,components:db.components.length,points:db.lubricationPoints.length,tasks:db.tasks.length};
assert.deepStrictEqual(after1,after2,'repeat apply/reconcile must be idempotent');
assert.deepStrictEqual(after1,before,'accepted production DB entity totals must stay stable');

const allMachineTaskIds=new Set(), blockedTaskIds=new Set();
for(const r of roots){
  const prefix=`machine:IZOTEH-PP53736:${r.id}:`;
  const pts=(db.lubricationPoints||[]).filter(p=>p.machineProfileId==='IZOTEH-PP53736'&&String(p.machineProfileOriginKey||'').startsWith(prefix));
  const tasks=(db.tasks||[]).filter(t=>t.machineProfileId==='IZOTEH-PP53736'&&String(t.machineProfileOriginKey||'').startsWith(prefix));
  const cats=pts.reduce((m,p)=>(m[p.category]=(m[p.category]||0)+1,m),{});
  assert.strictEqual(pts.length,131,`${r.externalCode}: expected 131 machine-profile points`);
  assert.strictEqual(tasks.length,131,`${r.externalCode}: expected 131 machine-profile tasks`);
  assert.deepStrictEqual(cats,{gearbox_oil:13,chain:8,screw:4,open_gear:2,bearing:104},`${r.externalCode}: category matrix`);
  assert.strictEqual(new Set(pts.map(p=>p.machineProfileOriginKey)).size,131,`${r.externalCode}: duplicate point origin key`);
  assert.strictEqual(new Set(tasks.map(t=>t.machineProfileOriginKey)).size,131,`${r.externalCode}: duplicate task origin key`);
  assert.strictEqual(pts.filter(p=>/roller_bearing_/.test(p.machineProfileOriginKey||'')).length,102,`${r.externalCode}: physical roller bearings`);
  assert.strictEqual(pts.filter(p=>/chain12b2_/.test(p.machineProfileOriginKey||'')).length,8,`${r.externalCode}: chain circuits`);
  assert.strictEqual(pts.filter(p=>/lift_screw_/.test(p.machineProfileOriginKey||'')).length,4,`${r.externalCode}: lift screws`);
  assert(!pts.some(p=>/6015-2RS1/.test(p.installedComponent?.name||'')),`${r.externalCode}: sealed 6015-2RS1 must not be a routine relube point`);
  for(const t of tasks) allMachineTaskIds.add(String(t.id));
}

const line1=roots[0],line2=roots[1];
const line1Prefix=`machine:IZOTEH-PP53736:${line1.id}:r77_`;
const line2Prefix=`machine:IZOTEH-PP53736:${line2.id}:r77_`;
const line1R77=(db.lubricationPoints||[]).filter(p=>String(p.machineProfileOriginKey||'').startsWith(line1Prefix));
const line2R77=(db.lubricationPoints||[]).filter(p=>String(p.machineProfileOriginKey||'').startsWith(line2Prefix));
assert.strictEqual(line1R77.filter(p=>p.machineOemMountingPositionReviewRequired===true).length,4,'Line 1 R77 #5-#8 must remain field-review items');
assert.strictEqual(line2R77.filter(p=>p.machineOemMountingPositionReviewRequired===true).length,0,'Line 2 must not invent a persisted M1/M3 conflict');

for(const t of db.tasks||[]){
  if(!allMachineTaskIds.has(String(t.id))) continue;
  const p=(db.lubricationPoints||[]).find(x=>x.id===t.lubricationPointId);
  if(p?.machineOemMountingPositionReviewRequired===true){
    blockedTaskIds.add(String(t.id));
    t.approvalStatus='review';t.verified=false;
  } else {
    t.approvalStatus='approved';t.verified=true;
  }
}
assert.strictEqual(blockedTaskIds.size,4,'exactly four current field-confirmation tasks should be held from automatic routing');

// Downstream integration against the sole current automatic route master.
 // This fixture explicitly simulates engineering-ready PP-53736 tasks, as above.
 // No approval, meter reading or date is written back to the source file.
db.routes=[];db.routeRevisions=[];db.routePlanItems=[];db.checklistRuns=[];
window.LubricaTaskReadiness={summarize:d=>({items:d.tasks.filter(t=>allMachineTaskIds.has(String(t.id))).map(t=>({taskId:t.id,status:blockedTaskIds.has(String(t.id))?'attention':'ready',steps:[{ok:!blockedTaskIds.has(String(t.id))}]}))})};
window.LubricaProgramQA={audit:()=>({issues:[]})};
for(const f of ['core/database-schema.js','structure/context.js','routes/route-auto-grouping.js','routes/route-due.js','routes/route-engine.js','routes/route-planning.js','checklist/checklist-engine.js','routes/route-workload.js','routes/route-automation.js'])load(f);
const R=window.LubricaRouteEngine,M=window.LubricaRouteAutomation,D=window.LubricaRouteDue,P=window.LubricaRoutePlanning,G=window.LubricaRouteAutoGrouping;
const info=M.eligible(db);
assert(info.ok,'canonical readiness index');
const eligibilityMismatches=[...allMachineTaskIds].filter(id=>info.valid.has(id)===blockedTaskIds.has(id)).map(id=>({id,expected:!blockedTaskIds.has(id),actual:info.valid.has(id),code:info.issues.find(x=>x.taskId===id)?.code||'UNKNOWN'}));
assert.strictEqual(eligibilityMismatches.length,0,'PP eligibility mismatches: '+JSON.stringify(eligibilityMismatches));
const options={activateReady:true,forecast:false};
const beforePreview=JSON.stringify(db),preview=M.preview(options,db);
assert(preview.ok,preview.reason);assert(preview.report.summary.create>0,'new automatic groups');
assert.strictEqual(JSON.stringify(db),beforePreview,'preview must never write');
assert.strictEqual(db.routes.length,0,'empty route list before confirmation');
const result=M.apply(options,preview.token,db);assert(result.ok,result.reason);
const assignments=new Map();
for(const route of db.routes)for(const id of route.taskIds||[])assignments.set(String(id),(assignments.get(String(id))||0)+1);
for(const id of allMachineTaskIds){
  if(blockedTaskIds.has(id)){assert(!assignments.has(id),'field-review task excluded '+id);continue;}
  assert.strictEqual(assignments.get(id),1,'approved PP task belongs to one route '+id);
}
const machineRouteIds=db.routes.filter(r=>r.taskIds.some(id=>allMachineTaskIds.has(String(id)))).map(r=>r.id);
for(const id of machineRouteIds){
  const r=db.routes.find(x=>x.id===id),v=R.validateRoute(id,db);
  assert(v.valid,'route structural errors '+JSON.stringify(v.errors));
  assert.strictEqual(r.status,'draft','no activation without confirmed meter basis');
  assert(r.scheduleKey.startsWith('runtime_hours:'),'runtime cadence must remain runtime');
  assert(r.taskIds.every(tid=>info.valid.get(String(tid))?.key===G.routeKey(r)),'area/service/cadence grouping');
}
const repeat=M.preview(options,db);assert(repeat.ok,repeat.reason);
assert.strictEqual(repeat.report.summary.create+repeat.report.summary.update+repeat.report.summary.archive,0,'idempotent reconciliation');
// Explicit synthetic meter readings for this in-memory test only.
// One next obligation per task, not a fabricated series of future work orders.
const readingDate=D.today(),end=P.addInterval(readingDate,{kind:'days',value:366});
function configureMeter(rate,confirmedTaskId=''){
 // Confirm a physical equipment meter once; every task on that equipment
 // uses the same synthetic reading, but keeps its own technical threshold.
 const ix=R.contextIndex(db),confirmedEq=confirmedTaskId?ix.get(String(confirmedTaskId))?.eq?.id:null;
 const confirmedReading=confirmedTaskId?D.rows(db.routes.find(r=>r.taskIds.includes(confirmedTaskId)),db).find(x=>x.id===confirmedTaskId).spec.value:0;
 for(const id of machineRouteIds){
  const r=db.routes.find(x=>x.id===id);
  const rows=D.rows(r,db).map(x=>({id:x.id,key:x.key,nextHours:x.spec.value,readingHours:confirmedEq&&ix.get(x.id)?.eq?.id===confirmedEq?confirmedReading:0,readingDate,hoursPerDay:rate,confirmMeter:true}));
  const saved=D.configure(id,rows,db);assert(saved.ok,saved.message);
  for(const row of rows){const task=db.tasks.find(t=>String(t.id)===row.id),basis=D.parseBasis(task,db);assert(basis.ok&&basis.meterKey,'physical meter must be linked');assert.strictEqual(basis.readingHours,row.readingHours,'shared confirmed reading');assert.strictEqual(basis.nextHours,row.nextHours,'individual threshold retained')}
  const active=R.setRouteStatus(id,'active',db);assert(active.ok,active.reason);
 }
}
configureMeter(0);
let plan=P.preview({startDate:readingDate,endDate:end,routeIds:machineRouteIds},db);
assert.strictEqual(plan.items.length,0,'without rate or due reading no calendar job may be invented');
assert.strictEqual(plan.warnings.filter(w=>w.code==='TASK_METER_WAITING').length,allMachineTaskIds.size-blockedTaskIds.size,'each runtime task awaits its meter threshold');
configureMeter(16);
plan=P.preview({startDate:readingDate,endDate:end,routeIds:machineRouteIds},db);
const forecastIds=plan.items.flatMap(x=>x.taskIds);
assert.strictEqual(forecastIds.length,allMachineTaskIds.size-blockedTaskIds.size,'one next obligation per ready task');
assert.strictEqual(new Set(forecastIds).size,forecastIds.length,'no repeated hypothetical assignments');
assert(plan.items.every(x=>x.planningBasis==='task_due'&&x.runtimeForecast===true&&x.dueEntries.every(e=>e.basis==='meter_forecast'&&e.forecast===true)),'meter forecasts labelled explicitly');
const confirmedTaskId=forecastIds[0];configureMeter(16,confirmedTaskId);
plan=P.preview({startDate:readingDate,endDate:end,routeIds:machineRouteIds},db);
const confirmed=plan.items.flatMap(x=>x.dueEntries).find(x=>x.taskId===confirmedTaskId);
assert(confirmed&&confirmed.basis==='meter_confirmed'&&confirmed.dueDate===readingDate&&!confirmed.forecast,'actual meter threshold is separate from forecast');
assert.strictEqual(db.routePlanItems.length,0,'forecast preview never reserves tasks');

// Excel traceability precondition: one legacy row per task and unique taskId.
const legacy=legacyRows(db).filter(x=>allMachineTaskIds.has(String(x.taskId)));
assert.strictEqual(legacy.length,allMachineTaskIds.size,'legacy/export projection must keep one row per PP-53736 task');
assert.strictEqual(new Set(legacy.map(x=>String(x.taskId))).size,legacy.length,'taskId traceability must stay unique');

console.log(JSON.stringify({
  status:'PASS_WITH_BLOCKERS',
  source:path.basename(source),
  productionCounts:after2,
  machineTasks:allMachineTaskIds.size,
  fieldConfirmationTasks:blockedTaskIds.size,
  routesWithMachineTasks:(db.routes||[]).filter(r=>(r.taskIds||[]).some(id=>allMachineTaskIds.has(String(id)))).length,
  runtimePlanning:'individual meter threshold + one next forecast, without fabricated recurring assignments',
  excelTraceRows:legacy.length
},null,2));
