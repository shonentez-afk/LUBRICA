const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const source=path.join(root,'project','sources','pp53736','Филиал_завода__Техно__г._Юрга(20260923-051134).json');
assert(fs.existsSync(source),'production PP-53736 JSON source is required');
const db=JSON.parse(fs.readFileSync(source,'utf8'));

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
  State:{getDatabase:()=>db,setDatabase:x=>x},
  Database:{normalize:x=>x,toLegacy:legacyRows}
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

// Downstream route compatibility.
load('routes/route-engine.js');
const R=window.LubricaRouteEngine;
const sync=R.syncRoutes(db);
assert(sync.routes.length>0,'route engine must create/sync routes from approved tasks');
const assignments=new Map();
for(const route of db.routes||[]) for(const id of route.taskIds||[]) assignments.set(String(id),(assignments.get(String(id))||0)+1);
for(const id of allMachineTaskIds){
  if(blockedTaskIds.has(id)){assert(!assignments.has(id),`field-review task ${id} must not enter an approved route`);continue;}
  assert.strictEqual(assignments.get(id),1,`approved PP-53736 task ${id} must belong to exactly one auto route`);
}
for(const route of db.routes||[]){
  if(!(route.taskIds||[]).some(id=>allMachineTaskIds.has(String(id)))) continue;
  const v=R.validateRoute(route.id,db);
  assert(v.valid,`route ${route.id} has structural errors: ${JSON.stringify(v.errors)}`);
}

// Planning must not silently convert runtime-hour intervals to calendar dates.
load('routes/route-planning.js');
const machineRoutes=(db.routes||[]).filter(route=>(route.taskIds||[]).some(id=>allMachineTaskIds.has(String(id))));
for(const route of machineRoutes){route.planningAnchorDate='2026-01-01';route.runtimePlanningHoursPerDay=0;}
let plan=window.LubricaRoutePlanning.preview({startDate:'2026-01-01',endDate:'2026-12-31'},db);
const manualRuntimeItems=plan.items.filter(x=>(x.taskIds||[]).some(id=>allMachineTaskIds.has(String(id))));
assert.strictEqual(manualRuntimeItems.length,machineRoutes.length,'without hours/day each runtime route must get only its explicitly entered first date');
assert(manualRuntimeItems.every(x=>x.planningBasis==='runtime_explicit_anchor'&&x.runtimeForecast===false),'explicit runtime anchor must be labelled as non-forecast');
assert.strictEqual(plan.warnings.filter(w=>w.code==='RUNTIME_FORECAST_MISSING').length,machineRoutes.length,'every runtime route without hours/day must warn that recurrence is not forecast');
for(const route of machineRoutes)route.runtimePlanningHoursPerDay=16;
plan=window.LubricaRoutePlanning.preview({startDate:'2026-01-01',endDate:'2026-12-31'},db);
const forecastItems=plan.items.filter(x=>(x.taskIds||[]).some(id=>allMachineTaskIds.has(String(id))));
assert(forecastItems.length>machineRoutes.length,'hours/day basis must create repeated runtime forecast dates');
assert(forecastItems.every(x=>x.planningBasis==='runtime_forecast'&&x.runtimeForecast===true&&x.runtimePlanningHoursPerDay===16),'runtime forecast provenance must be explicit');
assert.strictEqual(plan.warnings.filter(w=>w.code==='RUNTIME_FORECAST_MISSING'||w.code==='INTERVAL_UNSUPPORTED').length,0,'runtime routes with explicit forecast basis must be fully plannable');

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
  runtimePlanning:'explicit first date + optional hours/day recurrence forecast',
  excelTraceRows:legacy.length
},null,2));
